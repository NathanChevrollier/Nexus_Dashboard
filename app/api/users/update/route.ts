import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const { email, currentPassword, newPassword } = parsed.data;
    const userId = session.user.id;

    if (email) {
      await db.update(users).set({ email }).where(eq(users.id, userId));
    }

    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: "Mot de passe actuel requis" }, { status: 400 });
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!u || !u.password) return NextResponse.json({ error: "Impossible de vérifier le mot de passe" }, { status: 400 });
      const match = await bcrypt.compare(currentPassword, u.password);
      if (!match) return NextResponse.json({ error: "Mot de passe actuel invalide" }, { status: 403 });
      const hashed = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ password: hashed }).where(eq(users.id, userId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
