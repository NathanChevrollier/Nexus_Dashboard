import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { 
  getTMDbImageUrl, 
  getMovieDetails, 
  getTVShowDetails 
} from '@/lib/api/tmdb';

const bodySchema = z.object({
  integrationId: z.string(),
  status: z.enum(["all", "pending", "approved", "declined"]).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Nouvelle fonction d'extraction, plus robuste et propre
function extractMediaInfo(req: any) {
    const mediaObject = req.media 
        || req.movie 
        || req.tv 
        || (Array.isArray(req.media) ? req.media[0] : null) 
        || {};
    
    // Parfois, les détails sont dans un sous-objet mediaInfo
    const mediaInfo = mediaObject.mediaInfo || mediaObject;

    const title = [
        mediaInfo.title,
        mediaInfo.name,
        mediaInfo.originalTitle,
        mediaInfo.originalName,
        req.title, // Fallback sur la racine de la requête
        req.displayName
    ].find(t => typeof t === 'string' && t.trim().length > 0) || 'Titre inconnu';

    const tmdbId = [
        mediaInfo.tmdbId,
        mediaInfo.id, // L'ID du média est souvent le tmdbId
        req.tmdbId // Fallback
    ].find(v => v != null) ?? null;

    let type = 'movie';
    if (req.type === 'tv' || mediaObject.mediaType === 'tv' || mediaInfo.mediaType === 'tv' || req.tv) {
        type = 'tv';
    }

    const posterPath = [
        mediaInfo.posterPath,
        mediaInfo.poster_path
    ].find(p => typeof p === 'string' && p.trim().length > 0) || null;

    const backdropPath = [
        mediaInfo.backdropPath,
        mediaInfo.backdrop_path
    ].find(p => typeof p === 'string' && p.trim().length > 0) || null;

    return {
        id: req.id ?? mediaInfo.id ?? `${req.requestedBy?.id}-${Date.now()}`,
        status: String(req.status ?? mediaInfo.status ?? 'UNKNOWN'),
        createdAt: req.createdAt ?? req.createdAtUtc ?? req.addedAt ?? new Date().toISOString(),
        requestedBy: req.requestedBy?.displayName || req.requestedBy?.username || req.requestedBy?.email || 'Inconnu',
        type,
        title,
        posterUrl: getTMDbImageUrl(posterPath, 'w300'),
        backdropUrl: getTMDbImageUrl(backdropPath, 'w780'),
        tmdbId,
        // On enrichit si le titre est générique, ou si une des images manque
        needsEnrichment: (title === 'Titre inconnu' || !backdropPath || !posterPath) && !!tmdbId
    };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const { integrationId, status = "all", limit = 10 } = parsed.data;

    const integration = await db.query.integrations.findFirst({
      where: and(eq(integrations.id, integrationId), eq(integrations.userId, session.user.id)),
    });

    if (!integration || integration.type !== "overseerr") {
      return NextResponse.json({ error: "Config invalide" }, { status: 404 });
    }

    // Appel API Overseerr
    const cleanBaseUrl = integration.baseUrl!.replace(/\/$/, "");
    const url = new URL(`${cleanBaseUrl}/api/v1/request`);
    
    let apiFilter = "all";
    if (status === "approved") apiFilter = "approved";
    if (status === "pending") apiFilter = "pending";
    
    // On prend un peu plus d'items pour filtrer ensuite si besoin
    url.searchParams.set("take", String(limit + 5)); 
    url.searchParams.set("skip", "0");
    url.searchParams.set("sort", "added");
    if (apiFilter !== "all") url.searchParams.set("filter", apiFilter);

    // Timeout de sécurité pour l'appel Overseerr
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resOverseerr = await fetch(url.toString(), {
      headers: { "X-Api-Key": integration.apiKey!, "Content-Type": "application/json" },
      signal: controller.signal,
      next: { revalidate: 10 }, // Cache très court
    });
    clearTimeout(timeoutId);

    if (!resOverseerr.ok) throw new Error("Erreur Overseerr");

    const data = await resOverseerr.json();
    const rawList = (data.results || data || []) as any[];

    // 1. Premier passage : Extraction des données brutes
    let requests = rawList.map(extractMediaInfo);

    // 2. Filtrage JS (Sécurité supplémentaire)
    if (status !== "all") {
      requests = requests.filter(r => {
        const s = r.status.toLowerCase();
        if (status === "pending") return s.includes("pending");
        if (status === "approved") return s.includes("approved") || s.includes("available");
        return true;
      });
    }

    const finalRequests = requests.slice(0, limit);

    // 3. ENRICHISSEMENT DIRECT (Récupération des données manquantes via TMDB)
    const itemsToEnrich = finalRequests.filter(i => i.needsEnrichment);

    if (itemsToEnrich.length > 0) {
      // On lance toutes les récupérations en parallèle
      const enrichmentTasks = itemsToEnrich.map(async (item) => {
        try {
          let details: any = null;
          
          if (item.type === 'tv') {
            details = await getTVShowDetails(Number(item.tmdbId));
          } else {
            details = await getMovieDetails(Number(item.tmdbId));
          }

          if (details) {
            // Mise à jour de l'objet (mutabilité)
            // Si le titre était inconnu, on le remplace
            if (item.title === 'Titre inconnu') {
              item.title = details.title || details.name || details.original_title || 'Sans titre';
            }
            // Si on n'avait pas de bannière, on prend celle de TMDB
            if (!item.backdropUrl && details.backdrop_path) {
              item.backdropUrl = getTMDbImageUrl(details.backdrop_path, 'w780');
            }
            // Idem pour le poster
            if (!item.posterUrl && details.poster_path) {
              item.posterUrl = getTMDbImageUrl(details.poster_path, 'w300');
            }
          }
        } catch (e) {
          console.warn(`Impossible d'enrichir ${item.tmdbId}`);
        }
      });

      // On attend que tout soit fini, avec un timeout global de 4s pour ne pas bloquer l'UI
      const timeoutTask = new Promise(resolve => setTimeout(resolve, 4000));
      await Promise.race([Promise.all(enrichmentTasks), timeoutTask]);
    }

    return NextResponse.json({ requests: finalRequests });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}