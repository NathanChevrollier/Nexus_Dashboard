import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dashboards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const userId = session.user.id;
    const rows = await db.select().from(dashboards).where(eq(dashboards.userId, userId));

    const out = [] as any[];
    for (const r of rows) {
      const widgetsCount = await db.select().from((await import('@/lib/db/schema')).widgets).where(eq((await import('@/lib/db/schema')).widgets.dashboardId, r.id));
      const categoriesCount = await db.select().from((await import('@/lib/db/schema')).categories).where(eq((await import('@/lib/db/schema')).categories.dashboardId, r.id));
      const position = (r.themeConfig && (r.themeConfig as any).position) || null;
      out.push({ id: r.id, name: r.name, slug: r.slug, isPublic: r.isPublic, widgets: widgetsCount.length, categories: categoriesCount.length, position });
    }

    return NextResponse.json({ dashboards: out });
  } catch (err) {
    console.error('GET /api/dashboards/me error', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
