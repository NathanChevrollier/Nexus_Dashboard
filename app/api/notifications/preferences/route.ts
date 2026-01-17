import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPreferencesForUser, setPreferencesForUser } from '@/lib/notificationPreferences';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const prefs = await getPreferencesForUser(session.user.id as string);
    return NextResponse.json(prefs || {});
  } catch (e) {
    console.error('GET /api/notifications/preferences error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const prefs = body.prefs || {};
    const ok = await setPreferencesForUser(session.user.id as string, prefs);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('POST /api/notifications/preferences error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
