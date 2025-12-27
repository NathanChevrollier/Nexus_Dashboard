"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { getLayoutTemplates, applyLayoutTemplate } from "@/lib/actions/layout-templates";
import { useAlert } from "@/components/ui/confirm-provider";

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export function LayoutTemplatesDialog() {
  const alert = useAlert();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getLayoutTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setApplying(true);
    try {
      const result = await applyLayoutTemplate(selectedTemplate, dashboardName);
      
      if (result.success && result.dashboardId) {
        // Redirect to new dashboard
        window.location.href = `/dashboard/${result.dashboardId}`;
      } else {
        await alert(result.error || "Erreur lors de l'application du template");
      }
    } catch (error) {
      console.error("Apply template error:", error);
      await alert("Erreur lors de l'application du template");
    } finally {
      setApplying(false);
    }
  };

  const categories = [
    { id: "all", label: "Tous", icon: "✨" },
    { id: "productivity", label: "Productivité", icon: "⚡" },
    { id: "monitoring", label: "Monitoring", icon: "🔧" },
    { id: "personal", label: "Personnel", icon: "🏠" },
    { id: "dev", label: "Développeur", icon: "👨‍💻" },
    { id: "entertainment", label: "Loisirs", icon: "🎮" },
  ];

  const filteredTemplates = category === "all" 
    ? templates 
    : templates.filter(t => t.category === category);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Layouts Prédéfinis
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau dashboard à partir d'un template configuré
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={category} onValueChange={setCategory} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 pr-2">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 border-2 rounded-xl transition-all hover:scale-105 hover:shadow-lg text-left ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-3xl mb-2">{template.icon}</div>
                      <div className="font-semibold text-sm mb-1">{template.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun template dans cette catégorie
                  </div>
                )}
              </div>
            </Tabs>

            {selectedTemplate && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="dashboard-name">Nom du Dashboard (optionnel)</Label>
                  <Input
                    id="dashboard-name"
                    placeholder="Mon Dashboard Pro"
                    value={dashboardName}
                    onChange={(e) => setDashboardName(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyTemplate}
                    className="flex-1"
                    disabled={applying}
                  >
                    {applying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Créer le Dashboard
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setDashboardName("");
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
