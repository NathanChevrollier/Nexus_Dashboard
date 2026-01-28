import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { NextResponse } from "next/server";

// Seulement en dev
if (process.env.NODE_ENV === 'production') {
  throw new Error('API dev-db not allowed in production');
}

export async function GET() {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      is_owner: users.isOwner,
    }).from(users);

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
  }
}
