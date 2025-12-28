import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const rows = await db.select().from(iframeRequests).orderBy(iframeRequests.createdAt);
    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error('Erreur GET /api/admin/iframe/requests', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
