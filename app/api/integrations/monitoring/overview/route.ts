import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  integrationId: z.string(),
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

    const { integrationId } = parsed.data;

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, session.user.id)
      ),
    });

    if (!integration) {
      return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });
    }

    if (integration.type !== "monitoring") {
      return NextResponse.json({ error: "Type d'intégration incompatible" }, { status: 400 });
    }

    if (!integration.baseUrl) {
      return NextResponse.json({ error: "Intégration monitoring incomplète (URL)" }, { status: 400 });
    }

    const baseUrl = integration.baseUrl.replace(/\/$/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (integration.username && integration.password) {
      const token = Buffer.from(`${integration.username}:${integration.password}`).toString("base64");
      headers["Authorization"] = `Basic ${token}`;
    }

    const res = await fetch(`${baseUrl}/api/3/quicklook`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Monitoring quicklook error", res.status, text);
      return NextResponse.json(
        { error: `Erreur monitoring (${res.status})` },
        { status: 502 }
      );
    }

    const quicklook: any = await res.json();

    const cpu = typeof quicklook.cpu === "number" ? quicklook.cpu : 0;

    const mem = quicklook.mem || quicklook.memory || {};
    const used = typeof mem.used === "number" ? mem.used : 0;
    const total = typeof mem.total === "number" ? mem.total : 1;

    const load = quicklook.load || {};

    const result = {
      cpu,
      mem: {
        used,
        total,
      },
      load: {
        min1: typeof load.min1 === "number" ? load.min1 : 0,
        min5: typeof load.min5 === "number" ? load.min5 : 0,
        min15: typeof load.min15 === "number" ? load.min15 : 0,
      },
      uptime:
        typeof quicklook.uptime === "string"
          ? quicklook.uptime
          : typeof quicklook.uptime === "number"
          ? `${Math.floor(quicklook.uptime / 3600)}h${Math.floor((quicklook.uptime % 3600) / 60)
              .toString()
              .padStart(2, "0")}`
          : "-",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API Monitoring Overview:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
