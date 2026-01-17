import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.targetUserId;
    const eventType = body.eventType || 'message:new';
    const payload = body.payload || { test: true, text: 'Test message', timestamp: Date.now() };
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });

    const { emitToUser } = await import('@/lib/socket');
    await emitToUser(targetUserId, eventType, payload);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Debug message emit error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
