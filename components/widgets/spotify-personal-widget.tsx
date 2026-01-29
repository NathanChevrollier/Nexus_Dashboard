"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSpotifyStatus, getUserPlaylists, getReleaseRadar, updateSpotifyWidgetOptions, SpotifyPlaylist, SpotifyTrack } from "@/lib/actions/spotify-user";
import { Loader2, Music, PlayCircle, LogIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface SpotifyPersonalWidgetProps {
  widget: {
    id: string;
    options?: {
      lastPlaylistId?: string;
      [key: string]: any;
    };
  };
  updateWidget?: (id: string, options: any) => void;
}

export function SpotifyPersonalWidget({ widget, updateWidget }: SpotifyPersonalWidgetProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>(widget.options?.lastPlaylistId);
  const [releaseRadarTracks, setReleaseRadarTracks] = useState<SpotifyTrack[]>([]);
  const [loadingRadar, setLoadingRadar] = useState(false);
  
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await getSpotifyStatus();
      setIsConnected(status);
      if (status) {
          loadPlaylists();
          loadReleaseRadar();
      }
    } catch (error) {
      console.error("Spotify widget connection check error", error);
      setIsConnected(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = await getUserPlaylists();
      setPlaylists(data);
      // If no playlist selected but we have some, select the first one or last used
      if (!selectedPlaylistId && data.length > 0) {
          // Default to first found
          const firstId = data[0].id;
          setSelectedPlaylistId(firstId);
          // Don't auto-save just yet unless user interacts
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadReleaseRadar = async () => {
    setLoadingRadar(true);
    try {
      const tracks = await getReleaseRadar();
      if (tracks) setReleaseRadarTracks(tracks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRadar(false);
    }
  };

  const handlePlaylistChange = async (val: string) => {
    setSelectedPlaylistId(val);
    const newOptions = { ...widget.options, lastPlaylistId: val };
    if (updateWidget) {
        updateWidget(widget.id, newOptions);
    } else {
        await updateSpotifyWidgetOptions(widget.id, newOptions);
    }
  };

  if (isConnected === false) {
    return (
        <Card className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Music className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Spotify non connecté</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Liez votre compte dans les paramètres pour accéder à votre musique.
            </p>
            <Link href="/settings">
                <Button variant="outline" size="sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    Aller aux réglages
                </Button>
            </Link>
        </Card>
    );
  }

  if (isConnected === null) {
      return (
        <Card className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </Card>
      );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
        <Tabs defaultValue="player" className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-3 pt-3 flex items-center justify-between border-b bg-card shrink-0">
                 <div className="flex items-center gap-2 pb-2">
                    <Music className="w-4 h-4 text-[#1DB954]" />
                    <span className="font-semibold text-sm">Spotify</span>
                 </div>
                 <TabsList className="h-7 mb-2">
                    <TabsTrigger value="player" className="text-[10px] px-2 h-6">Lecteur</TabsTrigger>
                    <TabsTrigger value="new" className="text-[10px] px-2 h-6">Nouveautés</TabsTrigger>
                 </TabsList>
            </div>

            <TabsContent value="player" className="flex-1 p-0 m-0 flex flex-col h-full overflow-hidden data-[state=inactive]:hidden">
                <div className="p-2 border-b shrink-0 bg-background/50">
                    <Select value={selectedPlaylistId} onValueChange={handlePlaylistChange}>
                        <SelectTrigger className="h-8 text-xs w-full">
                             <SelectValue placeholder="Choisir une playlist" />
                        </SelectTrigger>
                        <SelectContent>
                             {playlists.length > 0 ? playlists.map(p => (
                                 <SelectItem key={p.id} value={p.id} className="text-xs">
                                     {p.name}
                                 </SelectItem>
                             )) : (
                                <div className="p-2 text-xs text-muted-foreground text-center">Aucune playlist trouvée</div>
                             )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 bg-black/5 dark:bg-black/20 relative min-h-0">
                     {selectedPlaylistId ? (
                         <iframe 
                            src={`https://open.spotify.com/embed/playlist/${selectedPlaylistId}?utm_source=generator&theme=0`} 
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy" 
                            className="absolute inset-0 w-full h-full"
                         />
                     ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4 text-center">
                             Sélectionnez une playlist pour commencer l'écoute
                         </div>
                     )}
                </div>
            </TabsContent>
            
            <TabsContent value="new" className="flex-1 p-0 m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden bg-background">
                <ScrollArea className="h-full w-full">
                    <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Release Radar</h4>
                            {loadingRadar && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </div>
                        
                        {releaseRadarTracks.length === 0 && !loadingRadar && (
                            <p className="text-xs text-center p-4 text-muted-foreground border border-dashed rounded-md">
                                Aucune sortie récente trouvée.<br/>Vérifiez que vous avez bien la playlist "Release Radar" dans votre bibliothèque Spotify.
                            </p>
                        )}
                        
                        <div className="space-y-1 pb-4">
                            {releaseRadarTracks.map(track => (
                                <a 
                                    key={track.id} 
                                    href={track.spotifyUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/80 transition group border border-transparent hover:border-border"
                                >
                                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-muted border">
                                        {track.image ? (
                                            <Image 
                                                src={track.image} 
                                                alt={track.album} 
                                                fill 
                                                className="object-cover" 
                                                sizes="40px"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                                                <Music className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-[1px]">
                                            <PlayCircle className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium leading-none truncate mb-1.5">{track.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </TabsContent>
        </Tabs>
    </Card>
  );
}
