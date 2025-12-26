"use client";

import { useEffect, useState } from "react";
import { getMediaItems, upsertMediaItem, deleteMediaItem } from "@/lib/actions/media-library";
import { getIntegrations } from "@/lib/actions/integrations";
import type { MediaItem } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Play, Plus, Trash2, Film, Tv, Music2, MonitorPlay } from "lucide-react";

interface EditableMediaItem {
  id?: string;
  title: string;
  type: "movie" | "series" | "music";
  year?: string;
  posterUrl?: string;
  streamUrl?: string;
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"movie" | "series" | "music">("movie");
  const [remoteMode, setRemoteMode] = useState(false);
  const [jellyfinIntegrationId, setJellyfinIntegrationId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableMediaItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Vérifier s'il existe une intégration Jellyfin/Emby
        const integrations = await getIntegrations();
        const jellyfin = (integrations || []).find((i: any) => i.type === "jellyfin");

        if (jellyfin) {
          setRemoteMode(true);
          setJellyfinIntegrationId(jellyfin.id);

          // Charger la bibliothèque distante depuis Jellyfin/Emby
          const res = await fetch("/api/integrations/jellyfin/library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              integrationId: jellyfin.id,
              type: "movie",
              limit: 60,
            }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Impossible de charger la bibliothèque distante");
          }

          const body = await res.json();
          setItems(body.items || []);
        } else {
          // Mode local : utiliser la table media_items
          const data = await getMediaItems();
          setItems(data || []);
        }
      } catch (e: any) {
        console.error("Erreur chargement médiathèque", e);
        setError(e?.message || "Impossible de charger la médiathèque");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const openCreateForm = (type: "movie" | "series" | "music") => {
    setEditing({
      title: "",
      type,
      year: "",
      posterUrl: "",
      streamUrl: "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editing || !editing.title.trim()) return;

    try {
      const result = await upsertMediaItem({
        id: editing.id,
        title: editing.title.trim(),
        type: editing.type,
        year: editing.year || undefined,
        posterUrl: editing.posterUrl || undefined,
        streamUrl: editing.streamUrl || undefined,
      });

      const data = await getMediaItems();
      setItems(data || []);
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      console.error("Erreur sauvegarde média", e);
      setError("Impossible d'enregistrer ce média");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Supprimer ce média ?"))) return;
    try {
      await deleteMediaItem(id);
      const data = await getMediaItems();
      setItems(data || []);
    } catch (e) {
      console.error("Erreur suppression média", e);
      setError("Impossible de supprimer ce média");
    }
  };

  const filteredItems = items.filter((item: any) => item.type === activeTab);

  const renderCardIcon = (type: MediaItem["type"]) => {
    switch (type) {
      case "movie":
        return <Film className="h-4 w-4" />;
      case "series":
        return <Tv className="h-4 w-4" />;
      case "music":
        return <Music2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MonitorPlay className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Médiathèque</h1>
            <p className="text-xs text-muted-foreground">
              Gérez vos films, séries et musiques et lancez un lecteur vidéo 4K (qualité dépend de la source et de votre matériel).
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Source : {remoteMode ? "Serveur Jellyfin / Emby (intégration)" : "Bibliothèque locale (base de données)"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openCreateForm(activeTab)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un média
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={async (v: any) => {
        setActiveTab(v);

        // En mode Jellyfin, recharger la liste quand on change de type
        if (remoteMode && jellyfinIntegrationId) {
          try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/integrations/jellyfin/library", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                integrationId: jellyfinIntegrationId,
                type: v,
                limit: 60,
              }),
            });

            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || "Impossible de charger la bibliothèque distante");
            }

            const body = await res.json();
            setItems(body.items || []);
          } catch (e: any) {
            console.error("Erreur Jellyfin par type", e);
            setError(e?.message || "Impossible de mettre à jour la vue");
          } finally {
            setLoading(false);
          }
        }
      }}>
        <TabsList>
          <TabsTrigger value="movie">Films</TabsTrigger>
          <TabsTrigger value="series">Séries</TabsTrigger>
          <TabsTrigger value="music">Musiques</TabsTrigger>
        </TabsList>
        <TabsContent value="movie" className="mt-4" />
        <TabsContent value="series" className="mt-4" />
        <TabsContent value="music" className="mt-4" />
      </Tabs>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <ScrollArea className="flex-1 rounded-lg border bg-card/40">
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">
                Aucun média pour cette catégorie pour le moment. Ajoutez vos premiers contenus avec le bouton ci-dessus.
              </p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {item.posterUrl ? (
                    <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/3] w-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                      {renderCardIcon(item.type)}
                    </div>
                  )}
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        {item.year && (
                          <p className="text-[11px] text-muted-foreground">{item.year}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        onClick={() => setPlayingItem(item)}
                        disabled={!item.streamUrl}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Lire
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive/80 hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Formulaire ajout / édition */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier le média" : "Ajouter un média"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Titre</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Titre du film, de la série ou du morceau"
                />
              </div>
              <div className="space-y-1">
                <Label>Année (optionnel)</Label>
                <Input
                  value={editing.year || ""}
                  onChange={(e) => setEditing({ ...editing, year: e.target.value })}
                  placeholder="2024"
                />
              </div>
              <div className="space-y-1">
                <Label>URL de l'affiche (optionnel)</Label>
                <Input
                  value={editing.posterUrl || ""}
                  onChange={(e) => setEditing({ ...editing, posterUrl: e.target.value })}
                  placeholder="https://.../poster.jpg"
                />
              </div>
              <div className="space-y-1">
                <Label>URL du flux vidéo / audio</Label>
                <Input
                  value={editing.streamUrl || ""}
                  onChange={(e) => setEditing({ ...editing, streamUrl: e.target.value })}
                  placeholder="https://votre-serveur/media/mon-film-4k.mp4"
                />
                <p className="text-[11px] text-muted-foreground">
                  Fournissez une URL HTTP(s) accessible pointant vers votre fichier ou flux (HLS, MP4, etc.).
                  Le lecteur HTML5 peut lire la 4K si votre navigateur et votre machine le supportent.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lecteur vidéo plein écran */}
      <Dialog open={!!playingItem} onOpenChange={(open) => { if (!open) setPlayingItem(null); }}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle>{playingItem?.title}</DialogTitle>
          </DialogHeader>
          {playingItem?.streamUrl ? (
            <div className="mt-2">
              <div className="w-full aspect-video bg-black rounded-md overflow-hidden">
                <video
                  src={playingItem.streamUrl}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                  playsInline
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Lecture via le lecteur HTML5 du navigateur. La fluidité en 4K dépendra du débit de votre serveur,
                de votre réseau et des capacités matérielles de l'appareil.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun flux configuré pour ce média.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
