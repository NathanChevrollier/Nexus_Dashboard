"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, widgets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getValidSpotifyToken } from "@/lib/api/spotify-auth";
import { revalidatePath } from "next/cache";

export async function updateSpotifyWidgetOptions(widgetId: string, options: any) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(widgets)
    .set({ options })
    .where(eq(widgets.id, widgetId));
    
  return { success: true };
}


export async function getSpotifyStatus() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const [user] = await db
    .select({ accessToken: users.spotifyAccessToken })
    .from(users)
    .where(eq(users.id, session.user.id));

  return !!user?.accessToken;
}

export async function disconnectSpotify() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(users)
    .set({
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
    })
    .where(eq(users.id, session.user.id));
    
  revalidatePath("/settings");
  return { success: true };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  image: string | null;
  uri: string;
  ownerName: string;
}

export async function getUserPlaylists(): Promise<SpotifyPlaylist[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const token = await getValidSpotifyToken(session.user.id);
  if (!token) return [];

  try {
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store' 
    });
    
    if (!res.ok) {
        console.error("Spotify Playlists Error", res.status);
        return [];
    }
    
    const data = await res.json();
    return data.items.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      image: p.images?.[0]?.url || null,
      ownerName: p.owner.display_name,
      uri: p.uri,
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artist: string;
    album: string;
    image: string | null;
    uri: string;
    spotifyUrl: string;
    addedAt: string;
}

export async function getReleaseRadar(): Promise<SpotifyTrack[] | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const token = await getValidSpotifyToken(session.user.id);
  if (!token) return null;

  try {
    // 1. Search for Release Radar playlist in user's library
    // The "Release Radar" is usually created by Spotify, but "Spotify" as owner.
    
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    
    // Check for "Release Radar" or localised names if possible. 
    // Best way is checking name "Release Radar" and owner "Spotify"
    const releaseRadar = data.items.find((p: any) => 
        (p.name === "Release Radar" || p.name === "Radar des sorties") && 
        p.owner.id === "spotify"
    );

    if (!releaseRadar) return null;

    // 2. Get tracks
    const tracksRes = await fetch(`https://api.spotify.com/v1/playlists/${releaseRadar.id}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    });

    if (!tracksRes.ok) return null;
    const tracksData = await tracksRes.json();

    return tracksData.items.map((item: any) => {
        const track = item.track;
        if (!track) return null;
        return {
            id: track.id,
            name: track.name,
            artist: track.artists.map((a: any) => a.name).join(", "),
            album: track.album.name,
            image: track.album.images?.[0]?.url || null,
            uri: track.uri,
            spotifyUrl: track.external_urls.spotify,
            addedAt: item.added_at
        };
    }).filter(Boolean); // Filter nulls

  } catch (e) {
    console.error("Error fetching Release Radar", e);
    return null;
  }
}
