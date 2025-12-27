import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ integrations: [] });

    const rows = await db.select().from(integrations).where(eq(integrations.userId, session.user.id));

    const safe = rows.map(r => ({ id: r.id, name: r.name, type: r.type }));
    return NextResponse.json({ integrations: safe });
  } catch (error) {
    console.error('List integrations error:', error);
    return NextResponse.json({ integrations: [] }, { status: 500 });
  }
}
