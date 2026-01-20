import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnreadNotificationsForUser } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const onlyUnread = url.searchParams.get('unread') === '1' || url.searchParams.get('unread') === 'true';

    if (onlyUnread) {
      const rows = await getUnreadNotificationsForUser(session.user.id as string);
      return NextResponse.json(rows || []);
    }

    // For now, fallback to unread only
    const rows = await getUnreadNotificationsForUser(session.user.id as string);
    return NextResponse.json(rows || []);
  } catch (e) {
    console.error('GET /api/notifications error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
