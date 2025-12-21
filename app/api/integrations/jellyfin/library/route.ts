import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const requestSchema = z.object({
  integrationId: z.string().min(1),
  type: z.enum(["movie", "series", "music"]).default("movie"),
  limit: z.number().int().min(1).max(100).default(30),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const json = await req.json();
    const { integrationId, type, limit } = requestSchema.parse(json);

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, session.user.id),
        eq(integrations.type, "jellyfin" as any),
      ),
    });

    if (!integration || !integration.baseUrl || !integration.apiKey) {
      return NextResponse.json({ error: "Intégration Jellyfin/Emby invalide" }, { status: 400 });
    }

    const baseUrl = integration.baseUrl.replace(/\/$/, "");
    const apiKey = integration.apiKey;

    // On utilise l'API Emby/Jellyfin de haut niveau sur /Items avec un tri par date de création.
    const includeTypesParam = type === "music" ? "Audio" : type === "movie" ? "Movie" : "Series";
    const url = `${baseUrl}/Items?IncludeItemTypes=${encodeURIComponent(
      includeTypesParam,
    )}&SortBy=DateCreated&SortOrder=Descending&Recursive=true&Limit=${limit}&api_key=${encodeURIComponent(
      apiKey,
    )}`;

    const res = await fetch(url, {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Erreur Jellyfin/Emby API:", res.status, text);
      return NextResponse.json(
        { error: "Impossible de récupérer la bibliothèque distante" },
        { status: 502 },
      );
    }

    const data: any = await res.json();
    const items = (data.Items || []).map((item: any) => {
      // Emby/Jellyfin exposent généralement des chemins d'image via /Items/{Id}/Images/Primary etc.
      const imageUrl = item.ImageTags?.Primary
        ? `${baseUrl}/Items/${item.Id}/Images/Primary?maxWidth=400&tag=${item.ImageTags.Primary}&api_key=${apiKey}`
        : undefined;

      // URL de lecture : Emby/Jellyfin exposent /Videos/{Id}/stream ou /Audio/{Id}/stream.
      const mediaPathSegment = type === "music" ? "Audio" : "Videos";
      const streamUrl = `${baseUrl}/${mediaPathSegment}/${item.Id}/stream?api_key=${apiKey}`;

      return {
        id: String(item.Id),
        title: item.Name,
        year: item.ProductionYear ? String(item.ProductionYear) : undefined,
        type,
        posterUrl: imageUrl,
        streamUrl,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Erreur interne Jellyfin library:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
