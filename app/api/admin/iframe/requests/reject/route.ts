import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/actions/permissions';

const bodySchema = z.object({ requestId: z.string() });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    
    const {allowed, error: permError} = await requirePermission('MANAGE_IFRAME_ALLOWLIST');
    if (!allowed) return NextResponse.json({ error: permError || 'Accès refusé' }, { status: 403 });

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { requestId } = parsed.data;

    const [req] = await db.select().from(iframeRequests).where(eq(iframeRequests.id, requestId)).limit(1);
    if (!req) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

    await db.update(iframeRequests).set({ status: 'REJECTED', adminId: session.user.id }).where(eq(iframeRequests.id, requestId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /api/admin/iframe/requests/reject', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
