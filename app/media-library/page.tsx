"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMediaItems, upsertMediaItem, deleteMediaItem } from "@/lib/actions/media-library";
import { getIntegrations } from "@/lib/actions/integrations";
import type { MediaItem } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-provider";
import { 
  Play, 
  Plus, 
  Trash2, 
  Film, 
  Tv, 
  Music2, 
  ArrowLeft, 
  MoreVertical, 
  Edit, 
  RefreshCw,
  Server
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [remoteMode, setRemoteMode] = useState(false);
  const [jellyfinIntegrationId, setJellyfinIntegrationId] = useState<string | null>(null);
  
  // États d'édition et lecture
  const [editing, setEditing] = useState<EditableMediaItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  
  const confirm = useConfirm();

  useEffect(() => {
    // Initialize active tab from URL ?tab= if present, then load library
    const param = searchParams?.get("tab");
    const valid = param === "movie" || param === "series" || param === "music";
    const initTab = valid ? (param as "movie" | "series" | "music") : "movie";
    setActiveTab(initTab);
    (async () => {
      await loadLibrary(initTab);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadLibrary = async (initialTab?: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Détection de l'intégration Jellyfin
      const integrations = await getIntegrations();
      const jellyfin = (integrations || []).find((i: any) => i.type === "jellyfin");

      if (jellyfin) {
        setRemoteMode(true);
        setJellyfinIntegrationId(jellyfin.id);
        const tabToUse = initialTab || activeTab;
        await fetchJellyfinLibrary(jellyfin.id, tabToUse);
      } else {
        // 2. Mode Local
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

  const fetchJellyfinLibrary = async (integrationId: string, type: string) => {
    const res = await fetch("/api/integrations/jellyfin/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        integrationId: integrationId,
        type: type,
        limit: 60,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Erreur communication Jellyfin");
    }

    const body = await res.json();
    setItems(body.items || []);
  };

  const handleTabChange = async (v: string) => {
    const newTab = v as "movie" | "series" | "music";
    setActiveTab(newTab);
    // Update URL so widgets linking with ?tab= work
    try {
      router.replace(`/media-library?tab=${newTab}`);
    } catch (e) {
      // ignore router errors
    }

    if (remoteMode && jellyfinIntegrationId) {
      setLoading(true);
      try {
        await fetchJellyfinLibrary(jellyfinIntegrationId, newTab);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const openForm = (item?: MediaItem) => {
    if (item) {
      setEditing({
        id: item.id,
        title: item.title,
        type: item.type as any,
        year: item.year || "",
        posterUrl: item.posterUrl || "",
        streamUrl: item.streamUrl || "",
      });
    } else {
      setEditing({
        title: "",
        type: activeTab,
        year: "",
        posterUrl: "",
        streamUrl: "",
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editing || !editing.title.trim()) return;

    try {
      await upsertMediaItem({
        id: editing.id,
        title: editing.title.trim(),
        type: editing.type,
        year: editing.year || undefined,
        posterUrl: editing.posterUrl || undefined,
        streamUrl: editing.streamUrl || undefined,
      });

      // Rechargement local optimiste
      if (!remoteMode) {
        const data = await getMediaItems();
        setItems(data || []);
      } else {
        // Si on est en mode remote, on ne peut généralement pas éditer sauf si l'API le permet
        // Ici on suppose que l'édition est locale par dessus le remote ou désactivée
        await loadLibrary();
      }
      
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      console.error("Erreur sauvegarde", e);
      setError("Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Êtes-vous sûr de vouloir supprimer ce média ?"))) return;
    try {
      await deleteMediaItem(id);
      if (!remoteMode) {
        const data = await getMediaItems();
        setItems(data || []);
      } else {
        await loadLibrary();
      }
    } catch (e) {
      console.error("Erreur suppression", e);
      setError("Impossible de supprimer");
    }
  };

  // Filtrage local (seulement utile en mode local, car en remote l'API filtre déjà)
  const displayItems = remoteMode ? items : items.filter((item) => item.type === activeTab);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* HEADER */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 pl-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold hidden sm:block">Médiathèque</h1>
              {remoteMode && (
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Server className="h-3 w-3" />
                  Jellyfin
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => loadLibrary()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={() => openForm()}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* TABS Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto sm:mx-0">
            <TabsTrigger value="movie" className="gap-2">
              <Film className="h-4 w-4" /> Films
            </TabsTrigger>
            <TabsTrigger value="series" className="gap-2">
              <Tv className="h-4 w-4" /> Séries
            </TabsTrigger>
            <TabsTrigger value="music" className="gap-2">
              <Music2 className="h-4 w-4" /> Musique
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md flex items-center gap-2">
            Alert: {error}
          </div>
        )}

        {/* GRID LAYOUT */}
        {loading && items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
             <p>Chargement de votre bibliothèque...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
             {displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground border-2 border-dashed rounded-xl">
                  <Film className="h-12 w-12 mb-4 opacity-20" />
                  <p>Votre bibliothèque est vide.</p>
                  <Button variant="link" onClick={() => openForm()}>Ajouter votre premier média</Button>
                </div>
             ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                {displayItems.map((item) => (
                  <MediaCard 
                    key={item.id} 
                    item={item} 
                    onPlay={() => setPlayingItem(item)}
                    onEdit={() => openForm(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
             )}
          </ScrollArea>
        )}
      </main>

      {/* MODALS */}
      <MediaFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        editing={editing} 
        setEditing={setEditing} 
        onSave={handleSave} 
      />

      <MediaPlayerDialog 
        item={playingItem} 
        onClose={() => setPlayingItem(null)} 
      />
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function MediaCard({ item, onPlay, onEdit, onDelete }: { item: MediaItem, onPlay: () => void, onEdit: () => void, onDelete: () => void }) {
  return (
    <div className="group relative flex flex-col gap-2">
      {/* Poster Image Container */}
      <div 
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm hover:shadow-xl transition-all cursor-pointer"
        onClick={item.streamUrl ? onPlay : undefined}
      >
        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.posterUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
             {item.type === 'movie' ? <Film className="h-10 w-10 opacity-20" /> : 
              item.type === 'series' ? <Tv className="h-10 w-10 opacity-20" /> : 
              <Music2 className="h-10 w-10 opacity-20" />}
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           {item.streamUrl ? (
             <div className="rounded-full bg-white/20 backdrop-blur-sm p-3 hover:scale-110 transition-transform">
               <Play className="h-8 w-8 text-white fill-white" />
             </div>
           ) : (
             <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">No stream</span>
           )}
        </div>

        {/* Menu Contextuel (3 points) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Text */}
      <div className="space-y-0.5">
        <h3 className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors" title={item.title}>
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground">{item.year || (item.type === 'series' ? 'TV Series' : 'Unknown Year')}</p>
      </div>
    </div>
  );
}

function MediaFormDialog({ open, onOpenChange, editing, setEditing, onSave }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing?.id ? "Modifier le média" : "Ajouter un média"}</DialogTitle>
        </DialogHeader>
        {editing && (
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Ex: Inception"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                 <Label htmlFor="year">Année</Label>
                 <Input
                  id="year"
                  value={editing.year || ""}
                  onChange={(e) => setEditing({ ...editing, year: e.target.value })}
                  placeholder="2010"
                />
              </div>
              <div className="grid gap-2">
                 <Label>Type</Label>
                 <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground capitalize">
                   {editing.type}
                 </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poster">URL Affiche</Label>
              <Input
                id="poster"
                value={editing.posterUrl || ""}
                onChange={(e) => setEditing({ ...editing, posterUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stream">Flux Vidéo (URL)</Label>
              <Input
                id="stream"
                value={editing.streamUrl || ""}
                onChange={(e) => setEditing({ ...editing, streamUrl: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-[10px] text-muted-foreground">Lien direct vers le fichier MP4/MKV ou flux HLS.</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MediaPlayerDialog({ item, onClose }: { item: MediaItem | null, onClose: () => void }) {
  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden bg-black border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{item.title}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-video bg-black">
          {item.streamUrl ? (
            <video
              src={item.streamUrl}
              controls
              autoPlay
              className="w-full h-full"
              controlsList="nodownload"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              Source introuvable
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}