import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dashboards, widgets, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId, generateSlug } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const sourceId = body.dashboardId;
    const name = body.name || `Clone de ${Date.now()}`;
    if (!sourceId) return NextResponse.json({ error: 'dashboardId manquant' }, { status: 400 });

    const [src] = await db.select().from(dashboards).where(eq(dashboards.id, sourceId)).limit(1);
    if (!src) return NextResponse.json({ error: 'Dashboard source introuvable' }, { status: 404 });

    // Allow cloning public dashboards or user's own dashboards
    if (!src.isPublic && src.userId !== session.user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const newId = generateId();
    const slug = generateSlug(name);

    await db.insert(dashboards).values({ id: newId, userId: session.user.id, name, slug, isPublic: false, format: src.format, themeConfig: src.themeConfig || null, customCss: src.customCss || null });

    // clone categories
    const cats = await db.select().from(categories).where(eq(categories.dashboardId, sourceId));
    for (const c of cats) {
      const cid = generateId();
      await db.insert(categories).values({ ...c, id: cid, dashboardId: newId });
    }

    // clone widgets (without copying createdAt/updatedAt)
    const wids = await db.select().from(widgets).where(eq(widgets.dashboardId, sourceId));
    for (const w of wids) {
      const wid = generateId();
      await db.insert(widgets).values({ id: wid, dashboardId: newId, categoryId: null, type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, categoryX: w.categoryX, categoryY: w.categoryY, options: w.options });
    }

    return NextResponse.json({ ok: true, id: newId, slug });
  } catch (err) {
    console.error('POST /api/dashboards/clone', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
