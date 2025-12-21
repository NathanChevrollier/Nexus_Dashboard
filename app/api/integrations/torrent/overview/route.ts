import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  integrationId: z.string(),
  limitActive: z.number().min(1).max(50).optional(),
  showCompleted: z.boolean().optional(),
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

    const { integrationId, limitActive = 8, showCompleted = false } = parsed.data;

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, session.user.id)
      ),
    });

    if (!integration) {
      return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });
    }

    if (integration.type !== "torrent-client") {
      return NextResponse.json({ error: "Type d'intégration incompatible" }, { status: 400 });
    }

    if (!integration.baseUrl || !integration.username || !integration.password) {
      return NextResponse.json({ error: "Intégration torrent incomplète (URL, user, password)" }, { status: 400 });
    }

    const baseUrl = integration.baseUrl.replace(/\/$/, "");

    // Login qBittorrent
    const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: integration.username,
        password: integration.password,
      }),
      cache: "no-store",
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      console.error("qBittorrent login error", loginRes.status, text);
      return NextResponse.json(
        { error: `Impossible de se connecter au client torrent (${loginRes.status})` },
        { status: 502 }
      );
    }

    const cookie = loginRes.headers.get("set-cookie");

    if (!cookie) {
      return NextResponse.json(
        { error: "Réponse de connexion torrent invalide (pas de cookie)" },
        { status: 502 }
      );
    }

    const torrentsRes = await fetch(`${baseUrl}/api/v2/torrents/info`, {
      headers: {
        Cookie: cookie,
      },
      cache: "no-store",
    });

    if (!torrentsRes.ok) {
      const text = await torrentsRes.text();
      console.error("qBittorrent torrents error", torrentsRes.status, text);
      return NextResponse.json(
        { error: `Erreur lors de la récupération des torrents (${torrentsRes.status})` },
        { status: 502 }
      );
    }

    const list = (await torrentsRes.json()) as any[];

    let totalDownloadSpeed = 0;
    let totalUploadSpeed = 0;
    let activeCount = 0;
    let completedCount = 0;

    const active: any[] = [];
    const completed: any[] = [];

    for (const t of list) {
      const state = (t.state || "").toString().toLowerCase();
      const progress = typeof t.progress === "number" ? t.progress : 0;
      const isCompleted = progress >= 0.999 || state.includes("complete");
      const isActive = !isCompleted && (t.dlspeed > 0 || t.upspeed > 0);

      if (isActive) {
        active.push(t);
        activeCount++;
      }
      if (isCompleted) {
        completed.push(t);
        completedCount++;
      }

      totalDownloadSpeed += t.dlspeed || 0;
      totalUploadSpeed += t.upspeed || 0;
    }

    const selected: any[] = [];
    selected.push(...active.slice(0, limitActive));
    if (showCompleted) {
      selected.push(...completed.slice(0, Math.max(0, limitActive - active.length)));
    }

    const torrents = selected.map((t) => ({
      name: t.name as string,
      progress: typeof t.progress === "number" ? t.progress : 0,
      state: (t.state || "").toString(),
      downloadSpeed: t.dlspeed || 0,
      uploadSpeed: t.upspeed || 0,
      eta: t.eta || 0,
      size: t.size || 0,
    }));

    return NextResponse.json({
      totalDownloadSpeed,
      totalUploadSpeed,
      activeCount,
      completedCount,
      torrents,
    });
  } catch (error) {
    console.error("Erreur API Torrent Overview:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
