"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSpotifyStatus, disconnectSpotify } from "@/lib/actions/spotify-user";
import { Loader2, Music, Check} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function SpotifyIntegrationCard() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkStatus();
  }, [searchParams]);

  const checkStatus = async () => {
    try {
      const status = await getSpotifyStatus();
      setIsConnected(status);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    router.push("/api/auth/spotify/login");
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnectSpotify();
    await checkStatus();
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[#1DB954]" />
            Spotify Personnel
        </CardTitle>
        <CardDescription>
            Connectez votre compte Spotify pour afficher vos playlists et votre Radar des sorties sur votre Dashboard personnel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Vérification du statut...
            </div>
        ) : isConnected ? (
            <div className="flex items-center justify-between p-4 rounded-md border bg-green-500/5 border-green-200 dark:border-green-900/50">
                <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Compte connecté avec succès</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-900/20">
                    Délier
                </Button>
            </div>
        ) : (
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                    Vous n'êtes pas connecté. Liez votre compte pour accéder à vos musiques directement depuis votre dashboard.
                </p>
                <Button onClick={handleConnect} className="w-full sm:w-auto bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold border-none">
                    <Music className="mr-2 h-4 w-4" />
                    Se connecter avec Spotify
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
