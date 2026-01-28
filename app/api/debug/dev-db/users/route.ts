import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in non-production at request time
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  // Dev-only endpoint: return all users
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
