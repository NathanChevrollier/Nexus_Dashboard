import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markNotificationsRead, markAllReadForUser } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = body.ids || [];
    const all: boolean = !!body.all;

    if (all) {
      const ok = await markAllReadForUser(session.user.id as string);
      return NextResponse.json({ ok });
    }

    if (!ids.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
    const ok = await markNotificationsRead(session.user.id as string, ids);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('POST /api/notifications/mark-read error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
