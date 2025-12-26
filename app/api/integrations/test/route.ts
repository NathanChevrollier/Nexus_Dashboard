import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  id: z.string().optional(),
  type: z.enum(["overseerr", "torrent-client", "monitoring", "jellyfin"]).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
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

    let cfg = parsed.data;

    if (cfg.id) {
      const integ = await db.query.integrations.findFirst({
        where: and(eq(integrations.id, cfg.id), eq(integrations.userId, session.user.id)),
      });
      if (!integ) {
        return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });
      }
      cfg = {
        type: integ.type as any,
        baseUrl: integ.baseUrl || undefined,
        apiKey: integ.apiKey || undefined,
        username: integ.username || undefined,
        password: integ.password || undefined,
      };
    }

    const baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");

    if (cfg.type === "overseerr") {
      if (!baseUrl || !cfg.apiKey) {
        return NextResponse.json({ error: "URL et API key requis pour Overseerr" }, { status: 400 });
      }
      const res = await fetch(`${baseUrl}/api/v1/status`, {
        headers: { "X-Api-Key": cfg.apiKey! },
        cache: "no-store",
      });
      if (!res.ok) {
        const txt = await res.text();
        return NextResponse.json({ error: `Overseerr inaccessible (${res.status})`, details: txt }, { status: 502 });
      }
      return NextResponse.json({ ok: true, message: "Connexion Overseerr OK" });
    }

    if (cfg.type === "torrent-client") {
      if (!baseUrl || !cfg.username || !cfg.password) {
        return NextResponse.json({ error: "URL, user et password requis" }, { status: 400 });
      }
      const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: cfg.username!, password: cfg.password! }),
        cache: "no-store",
      });
      if (!loginRes.ok) {
        const txt = await loginRes.text();
        return NextResponse.json({ error: `Login torrent échoué (${loginRes.status})`, details: txt }, { status: 502 });
      }
      return NextResponse.json({ ok: true, message: "Connexion client torrent OK" });
    }

    if (cfg.type === "monitoring") {
      if (!baseUrl) {
        return NextResponse.json({ error: "URL requise pour Monitoring" }, { status: 400 });
      }
      // Essayer quelques endpoints communs pour monitoring
      const tries = ["/metrics", "/metrics/", "/-/healthy", "/health", ""]; // dernier essai: racine
      for (const suffix of tries) {
        try {
          const url = `${baseUrl}${suffix}`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            return NextResponse.json({ ok: true, message: `Monitoring reachable (${suffix || '/'} )` });
          }
        } catch (e) {
          // ignore and try next
        }
      }
      return NextResponse.json({ error: "Monitoring inaccessible" }, { status: 502 });
    }

    if (cfg.type === "jellyfin") {
      if (!baseUrl) {
        return NextResponse.json({ error: "URL requise pour Jellyfin" }, { status: 400 });
      }
      // Jellyfin public info endpoint
      try {
        const res = await fetch(`${baseUrl}/System/Info/Public`, { cache: "no-store" });
        if (res.ok) {
          return NextResponse.json({ ok: true, message: "Connexion Jellyfin OK" });
        }
      } catch (e) {
        // fallback to root
      }
      try {
        const res2 = await fetch(baseUrl, { cache: "no-store" });
        if (res2.ok) return NextResponse.json({ ok: true, message: "Connexion Jellyfin OK" });
      } catch (e) {}
      return NextResponse.json({ error: "Jellyfin inaccessible" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Type non pris en charge pour test spécifique" });
  } catch (error) {
    console.error("Erreur API Test Integration:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
