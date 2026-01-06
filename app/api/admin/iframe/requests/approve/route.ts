import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeRequests, iframeAllowlist } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

const bodySchema = z.object({ requestId: z.string() });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { requestId } = parsed.data;

    const [req] = await db.select().from(iframeRequests).where(eq(iframeRequests.id, requestId)).limit(1);
    if (!req) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

    // Extract origin from URL
    let origin = '';
    try {
      const u = new URL(req.url);
      origin = `${u.protocol}//${u.host}`;
    } catch (e) {
      origin = req.url;
    }

    // Update request status
    await db.update(iframeRequests).set({ status: 'APPROVED', adminId: session.user.id }).where(eq(iframeRequests.id, requestId));

    // Insert into allowlist if not exists
    const existing = await db.select().from(iframeAllowlist).where(and(eq(iframeAllowlist.origin, origin), eq(iframeAllowlist.removed, false))).limit(1);
    if (existing.length === 0) {
      const id = `alw-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      await db.insert(iframeAllowlist).values({ id, origin, addedBy: session.user.id });
    }

    // Notify requester (best-effort)
    (async () => {
      try {
        const socketUrl = process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4001';
        const payload = { requestId, origin };
        try {
          await fetch(`${socketUrl.replace(/\/$/, '')}/emit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'iframe_request_approved', targetUserId: req.userId, payload }),
          });
        } catch (e) {
          console.debug('notify requester failed', e);
        }
      } catch (e) {
        console.debug('Failed to notify requester about approval', e);
      }
    })();

    return NextResponse.json({ ok: true, origin });
  } catch (err) {
    console.error('Erreur POST /api/admin/iframe/requests/approve', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
