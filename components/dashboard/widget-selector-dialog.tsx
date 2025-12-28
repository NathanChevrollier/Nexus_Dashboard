"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createWidget } from "@/lib/actions/widgets";
import { 
  Link as LinkIcon, Activity, Frame, Clock, Cloud, StickyNote, BarChart3, 
  Calendar, CheckSquare, Eye, Timer, Bookmark, Quote, CalendarClock, 
  Film, CalendarRange 
} from "lucide-react";
import type { Widget, Category } from "@/lib/db/schema";
import { useAlert } from "@/components/ui/confirm-provider";

interface WidgetSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  categories?: Category[];
  onWidgetAdded?: (widget: Widget) => void;
}

type WidgetType = "link" | "ping" | "link-ping" | "iframe" | "datetime" | "weather" | "notes" | "chart" | "anime-calendar" | "todo-list" | "watchlist" | "timer" | "bookmarks" | "quote" | "countdown" | "universal-calendar" | "movies-tv-calendar";

const widgetTypes = [
  { type: "link", icon: LinkIcon, label: "Lien", description: "Lien rapide vers un site" },
  { type: "ping", icon: Activity, label: "Ping/Status", description: "Surveillance d'un serveur" },
  { type: "link-ping", icon: Activity, label: "Lien+", description: "Lien cliquable avec surveillance de disponibilité" },
  { type: "iframe", icon: Frame, label: "Iframe", description: "Intégration d'une page web" },
  { type: "datetime", icon: Clock, label: "Date/Heure", description: "Horloge en temps réel" },
  { type: "weather", icon: Cloud, label: "Météo", description: "Météo en temps réel" },
  { type: "notes", icon: StickyNote, label: "Notes", description: "Prise de notes rapide" },
  { type: "chart", icon: BarChart3, label: "Graphique", description: "Graphiques et statistiques" },
  { type: "anime-calendar", icon: Calendar, label: "Calendrier Anime", description: "Calendrier anime/manga" },
  { type: "todo-list", icon: CheckSquare, label: "Todo List", description: "Liste de tâches" },
  { type: "watchlist", icon: Eye, label: "Watchlist", description: "Films/Séries à voir" },
  { type: "timer", icon: Timer, label: "Timer", description: "Minuteur et chronomètre" },
  { type: "bookmarks", icon: Bookmark, label: "Favoris", description: "Favoris organisés" },
  { type: "quote", icon: Quote, label: "Citation", description: "Citation du jour" },
  { type: "countdown", icon: CalendarClock, label: "Compte à rebours", description: "Compte à rebours événement" },
  { type: "universal-calendar", icon: CalendarRange, label: "Calendrier Universel", description: "Tous vos médias et événements" },
  { type: "movies-tv-calendar", icon: Film, label: "Films & Séries", description: "Sorties cinéma et TV" },
  { type: "media-library", icon: Film, label: "Médiathèque", description: "Page complète films/séries/musiques" },
] as const;

export function WidgetSelectorDialog({ open, onOpenChange, dashboardId, categories = [], onWidgetAdded }: WidgetSelectorDialogProps) {
  const alert = useAlert();
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  
  // Forms for each widget type
  const [linkForm, setLinkForm] = useState({ title: "", url: "", icon: "🔗", openInNewTab: true });
  const [pingForm, setPingForm] = useState({ title: "", host: "", port: 80 });
  const [linkPingForm, setLinkPingForm] = useState({ title: "", url: "", openInNewTab: true, icon: "🔗", iconUrl: undefined });
  const [iframeForm, setIframeForm] = useState({ title: "", iframeUrl: "" });
  const [weatherForm, setWeatherForm] = useState({ city: "Paris" });

  const handleSelectWidget = (type: WidgetType) => {
    setSelectedType(type);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;

    setLoading(true);
    try {
      let options: any = {};
      let defaultSize = { w: 2, h: 2 };

      switch (selectedType) {
        case "link":
          options = linkForm;
          defaultSize = { w: 2, h: 1 };
          break;
        case "link-ping":
          options = linkPingForm;
          defaultSize = { w: 2, h: 1 };
          break;
          break;
        case "ping":
          options = pingForm;
          defaultSize = { w: 2, h: 1 };
          break;
        case "iframe":
          options = iframeForm;
          defaultSize = { w: 4, h: 3 };
          break;
        case "datetime":
          options = { format: "PPP", timezone: "Europe/Paris" };
          defaultSize = { w: 3, h: 1 };
          break;
        case "weather":
          options = weatherForm;
          defaultSize = { w: 2, h: 2 };
          break;
        default:
          options = { title: widgetTypes.find(w => w.type === selectedType)?.label || "" };
      }

      const newWidget = await createWidget(dashboardId, {
        type: selectedType,
        x: 0,
        y: 0,
        w: defaultSize.w,
        h: defaultSize.h,
        options,
        categoryId,
      });

      if (newWidget && onWidgetAdded) {
        onWidgetAdded(newWidget as Widget);
      }

      // Reset
      setLinkForm({ title: "", url: "", icon: "🔗", openInNewTab: true });
      setPingForm({ title: "", host: "", port: 80 });
      setLinkPingForm({ title: "", url: "", openInNewTab: true, icon: "🔗", iconUrl: undefined });
      setIframeForm({ title: "", iframeUrl: "" });
      setWeatherForm({ city: "Paris" });
      setSelectedType(null);
      setCategoryId(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la création du widget:", error);
      await alert("Erreur lors de la création du widget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedType ? `Configurer : ${widgetTypes.find(w => w.type === selectedType)?.label}` : "Choisir un Widget"}
          </DialogTitle>
          <DialogDescription>
            {selectedType ? "Remplissez les informations du widget" : "Sélectionnez le type de widget à ajouter"}
          </DialogDescription>
        </DialogHeader>

        {/* Widget Selection Grid */}
        {!selectedType && (
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-4">
              {widgetTypes.map((widget) => {
                const Icon = widget.icon;
                return (
                  <button
                    key={widget.type}
                    onClick={() => handleSelectWidget(widget.type as WidgetType)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent transition-all group"
                  >
                    <Icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm text-center">{widget.label}</span>
                    <span className="text-xs text-muted-foreground text-center line-clamp-2">{widget.description}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Widget Configuration Form */}
        {selectedType && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {/* Category Selector */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie (optionnel)</Label>
                  <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
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

              {/* Widget-specific forms */}
              {selectedType === "link" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={linkForm.title}
                      onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                      placeholder="Mon site"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      type="url"
                      value={linkForm.url}
                      onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icône (Emoji)</Label>
                    <Input
                      value={linkForm.icon}
                      onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                      placeholder="🔗"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="newtab"
                      type="checkbox"
                      checked={linkForm.openInNewTab}
                      onChange={(e) => setLinkForm({ ...linkForm, openInNewTab: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="newtab">Ouvrir dans un nouvel onglet</Label>
                  </div>
                </>
              )}

              {selectedType === "link-ping" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={linkPingForm.title}
                      onChange={(e) => setLinkPingForm({ ...linkPingForm, title: e.target.value })}
                      placeholder="Mon service"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      type="url"
                      value={linkPingForm.url}
                      onChange={(e) => setLinkPingForm({ ...linkPingForm, url: e.target.value })}
                      placeholder="https://example.com:8080/path"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="lp-newtab"
                      type="checkbox"
                      checked={linkPingForm.openInNewTab}
                      onChange={(e) => setLinkPingForm({ ...linkPingForm, openInNewTab: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="lp-newtab">Ouvrir dans un nouvel onglet</Label>
                  </div>
                </>
              )}

              {selectedType === "ping" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={pingForm.title}
                      onChange={(e) => setPingForm({ ...pingForm, title: e.target.value })}
                      placeholder="Mon serveur"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hôte (IP ou domaine)</Label>
                    <Input
                      value={pingForm.host}
                      onChange={(e) => setPingForm({ ...pingForm, host: e.target.value })}
                      placeholder="192.168.1.1 ou example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={pingForm.port}
                      onChange={(e) => setPingForm({ ...pingForm, port: parseInt(e.target.value) })}
                      placeholder="80"
                    />
                  </div>
                </>
              )}

              {selectedType === "iframe" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={iframeForm.title}
                      onChange={(e) => setIframeForm({ ...iframeForm, title: e.target.value })}
                      placeholder="Ma page"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de la page</Label>
                    <Input
                      type="url"
                      value={iframeForm.iframeUrl}
                      onChange={(e) => setIframeForm({ ...iframeForm, iframeUrl: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-sm">
                    <p className="text-muted-foreground">
                      ⚠️ Certains sites bloquent l'intégration en iframe pour des raisons de sécurité.
                    </p>
                  </div>
                </>
              )}

              {selectedType === "weather" && (
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={weatherForm.city}
                    onChange={(e) => setWeatherForm({ ...weatherForm, city: e.target.value })}
                    placeholder="Paris"
                  />
                </div>
              )}

              {selectedType === "datetime" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <p className="text-sm">
                    Le widget Date/Heure affichera l'heure actuelle en temps réel avec la date complète en français.
                  </p>
                </div>
              )}

              {!["link", "ping", "iframe", "weather", "datetime"].includes(selectedType) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <p className="text-sm">
                    Ce widget sera créé avec sa configuration par défaut. Vous pourrez le personnaliser après création.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          {selectedType ? (
            <>
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                ← Retour
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Création..." : "Créer le Widget"}
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">
              Annuler
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
