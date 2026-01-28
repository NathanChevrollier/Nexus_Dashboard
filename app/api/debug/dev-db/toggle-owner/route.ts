import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// Seulement en dev
if (process.env.NODE_ENV === 'production') {
  throw new Error('API dev-db not allowed in production');
}

export async function POST(req: Request) {
  try {
    const { userId, isOwner } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    await db.update(users)
      .set({ isOwner: isOwner })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}
