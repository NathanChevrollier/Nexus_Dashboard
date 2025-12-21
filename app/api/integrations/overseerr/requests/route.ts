import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  integrationId: z.string(),
  status: z.enum(["all", "pending", "approved", "declined"]).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { integrationId, status = "all", limit = 10 } = parsed.data;

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, session.user.id)
      ),
    });

    if (!integration) {
      return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });
    }

    if (integration.type !== "overseerr") {
      return NextResponse.json({ error: "Type d'intégration incompatible" }, { status: 400 });
    }

    if (!integration.baseUrl || !integration.apiKey) {
      return NextResponse.json({ error: "Intégration Overseerr incomplète" }, { status: 400 });
    }

    const url = new URL("/api/v1/request", integration.baseUrl);
    url.searchParams.set("take", String(Math.min(limit, 50)));
    url.searchParams.set("skip", "0");
    url.searchParams.set("sort", "added");

    const response = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": integration.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Overseerr error", response.status, text);
      return NextResponse.json(
        { error: `Erreur Overseerr (${response.status})` },
        { status: 502 }
      );
    }

    const data = await response.json();

    const allRequests = (data.results || data || []).map((req: any) => {
      const media = req.media || {};
      const mediaInfo = media.mediaInfo || media;

      return {
        id: req.id ?? media.id ?? `${req.requestedBy?.id}-${media.id}`,
        status: req.status ?? media.status ?? "UNKNOWN",
        createdAt: req.createdAt ?? req.createdAtUtc ?? new Date().toISOString(),
        requestedBy:
          req.requestedBy?.displayName ||
          req.requestedBy?.username ||
          req.requestedBy?.email ||
          "Inconnu",
        type: media.mediaType || mediaInfo.mediaType || "movie",
        title:
          media.title ||
          mediaInfo.title ||
          mediaInfo.name ||
          media.originalTitle ||
          media.originalName ||
          "Titre inconnu",
      };
    });

    let filtered = allRequests;

    if (status === "pending") {
      filtered = allRequests.filter((r: any) =>
        r.status && r.status.toString().toLowerCase().includes("pending")
      );
    } else if (status === "approved") {
      filtered = allRequests.filter((r: any) =>
        r.status && r.status.toString().toLowerCase().includes("approved")
      );
    } else if (status === "declined") {
      filtered = allRequests.filter((r: any) =>
        r.status &&
        (r.status.toString().toLowerCase().includes("declined") ||
          r.status.toString().toLowerCase().includes("rejected"))
      );
    }

    filtered = filtered.slice(0, limit);

    return NextResponse.json({ requests: filtered });
  } catch (error) {
    console.error("Erreur API Overseerr requests:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
