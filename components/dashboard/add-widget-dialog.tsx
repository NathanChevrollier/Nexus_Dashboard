"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createWidget } from "@/lib/actions/widgets";
import { Link as LinkIcon, Activity, Frame, Clock } from "lucide-react";
import type { Widget, Category } from "@/lib/db/schema";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  categories?: Category[];
  onWidgetAdded?: (widget: Widget) => void;
}

export function AddWidgetDialog({ open, onOpenChange, dashboardId, categories = [], onWidgetAdded }: AddWidgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [widgetType, setWidgetType] = useState<"link" | "ping" | "iframe" | "datetime">("link");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Link Widget Form
  const [linkForm, setLinkForm] = useState({
    title: "",
    url: "",
    icon: "🔗",
    openInNewTab: true,
  });

  // Ping Widget Form
  const [pingForm, setPingForm] = useState({
    title: "",
    host: "",
    port: 80,
  });

  // Iframe Widget Form
  const [iframeForm, setIframeForm] = useState({
    title: "",
    iframeUrl: "",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let options = {};
      
      switch (widgetType) {
        case "link":
          options = linkForm;
          break;
        case "ping":
          options = pingForm;
          break;
        case "iframe":
          options = iframeForm;
          break;
        case "datetime":
          options = { format: "PPP", timezone: "Europe/Paris" };
          break;
      }

      const newWidget = await createWidget(dashboardId, {
        type: widgetType,
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        options,
        categoryId: selectedCategoryId,
      });

      if (newWidget && onWidgetAdded) {
        onWidgetAdded({
          ...newWidget,
          categoryId: selectedCategoryId,
        });
      }

      // Reset forms
      setLinkForm({ title: "", url: "", icon: "🔗", openInNewTab: true });
      setPingForm({ title: "", host: "", port: 80 });
      setIframeForm({ title: "", iframeUrl: "" });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la création du widget:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un Widget</DialogTitle>
          <DialogDescription>
            Choisissez le type de widget à ajouter à votre dashboard
          </DialogDescription>
        </DialogHeader>

        <Tabs value={widgetType} onValueChange={(v) => setWidgetType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="ping" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Ping
            </TabsTrigger>
            <TabsTrigger value="iframe" className="flex items-center gap-2">
              <Frame className="h-4 w-4" />
              Iframe
            </TabsTrigger>
            <TabsTrigger value="datetime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date/Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="link-title">Titre</Label>
              <Input
                id="link-title"
                placeholder="Mon site"
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-icon">Icône (Emoji)</Label>
              <Input
                id="link-icon"
                placeholder="🔗"
                value={linkForm.icon}
                onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="link-newtab"
                type="checkbox"
                checked={linkForm.openInNewTab}
                onChange={(e) => setLinkForm({ ...linkForm, openInNewTab: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="link-newtab">Ouvrir dans un nouvel onglet</Label>
            </div>
          </TabsContent>

          <TabsContent value="ping" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ping-title">Titre</Label>
              <Input
                id="ping-title"
                placeholder="Mon serveur"
                value={pingForm.title}
                onChange={(e) => setPingForm({ ...pingForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ping-host">Hôte (IP ou domaine)</Label>
              <Input
                id="ping-host"
                placeholder="192.168.1.1 ou example.com"
                value={pingForm.host}
                onChange={(e) => setPingForm({ ...pingForm, host: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ping-port">Port (optionnel)</Label>
              <Input
                id="ping-port"
                type="number"
                placeholder="80"
                value={pingForm.port}
                onChange={(e) => setPingForm({ ...pingForm, port: parseInt(e.target.value) })}
              />
            </div>
          </TabsContent>

          <TabsContent value="iframe" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="iframe-title">Titre</Label>
              <Input
                id="iframe-title"
                placeholder="Ma page"
                value={iframeForm.title}
                onChange={(e) => setIframeForm({ ...iframeForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iframe-url">URL de la page</Label>
              <Input
                id="iframe-url"
                type="url"
                placeholder="https://example.com"
                value={iframeForm.iframeUrl}
                onChange={(e) => setIframeForm({ ...iframeForm, iframeUrl: e.target.value })}
              />
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                ⚠️ Certains sites bloquent l'intégration en iframe pour des raisons de sécurité.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="datetime" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                Le widget Date/Heure affichera l'heure actuelle en temps réel avec la date complète en français.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Sélecteur de catégorie */}
        {categories.length > 0 && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="category">Catégorie (optionnel)</Label>
            <Select value={selectedCategoryId || "none"} onValueChange={(v) => setSelectedCategoryId(v === "none" ? null : v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Aucune catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune catégorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer le Widget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
