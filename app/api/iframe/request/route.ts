import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeRequests, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const bodySchema = z.object({
  url: z.string().min(3),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    let { url, reason } = parsed.data;

    // Allow URLs without protocol by trying to normalize
    try {
      new URL(url);
    } catch (e) {
      try {
        url = `https://${url}`;
        new URL(url);
      } catch (e2) {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
      }
    }

    // Prevent duplicate pending requests for same origin
    let origin = '';
    try {
      const u = new URL(url);
      origin = `${u.protocol}//${u.host}`;
    } catch (e) {
      origin = url;
    }

    const existing = await db.select().from(iframeRequests).where(eq(iframeRequests.url, url)).limit(1).catch(() => []);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Une demande pour cette URL existe déjà' }, { status: 409 });
    }

    const id = `ifr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    await db.insert(iframeRequests).values({
      id,
      userId: session.user.id,
      url,
      reason: reason || null,
      status: 'PENDING',
    });

    // Notify admins via socket server (best-effort)
    (async () => {
      try {
        const { emitToUser } = await import('@/lib/socket');
        // fetch admin users
        const adminRows = await db.select().from(users).where(eq(users.role, 'ADMIN'));
        const payload = { id, url, userId: session.user.id, reason: reason || null };
        for (const a of adminRows) {
          try {
            await emitToUser(a.id, 'iframe_request', payload);
          } catch (e) {
            // ignore individual notify errors
            console.debug('notify admin failed', e);
          }
        }
      } catch (e) {
        console.debug('Failed to notify admins about iframe request', e);
      }
    })();

    return NextResponse.json({ ok: true, id, origin });
  } catch (err) {
    console.error('Erreur POST /api/iframe/request', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
