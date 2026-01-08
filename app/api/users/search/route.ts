import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { like } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json([], { status: 200 });

    // search by email or name
    const rows = await db.select().from(users).where(like(users.email, `%${q}%`)).limit(20).catch(() => []);
    if ((rows || []).length === 0) {
      // try name
      const byName = await db.select().from(users).where(like(users.name, `%${q}%`)).limit(20).catch(() => []);
      return NextResponse.json(byName || []);
    }

    return NextResponse.json(rows || []);
  } catch (e) {
    console.error("GET /api/users/search error", e);
    return NextResponse.json([], { status: 500 });
  }
}
