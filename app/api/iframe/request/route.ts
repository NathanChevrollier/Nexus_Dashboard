import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeRequests } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

const bodySchema = z.object({
  url: z.string().url(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { url, reason } = parsed.data;

    const id = `ifr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    await db.insert(iframeRequests).values({
      id,
      userId: session.user.id,
      url,
      reason: reason || null,
      status: 'PENDING',
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('Erreur POST /api/iframe/request', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
