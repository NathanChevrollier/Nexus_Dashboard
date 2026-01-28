import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/actions/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    
    const {allowed, error: permError} = await requirePermission('MANAGE_IFRAME_ALLOWLIST');
    if (!allowed) return NextResponse.json({ error: permError || 'Accès refusé' }, { status: 403 });

    const rows = await db.select().from(iframeRequests).where(eq(iframeRequests.status, 'PENDING')).orderBy(iframeRequests.createdAt);
    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error('Erreur GET /api/admin/iframe/requests', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
