import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dashboards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const patchSchema = z.object({ name: z.string().min(1).optional(), position: z.number().int().optional() });

export async function PATCH(request: Request, context: any) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const id = context?.params?.id as string
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    // Ensure ownership
    const [d] = await db.select().from(dashboards).where(eq(dashboards.id, id)).limit(1);
    if (!d) return NextResponse.json({ error: 'Dashboard introuvable' }, { status: 404 });
    if (d.userId !== session.user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const updates: any = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (typeof parsed.data.position === 'number') {
      // store position inside themeConfig JSON to avoid schema changes
      const newTheme = { ...(d.themeConfig || {}), position: parsed.data.position };
      updates.themeConfig = newTheme;
    }

    await db.update(dashboards).set(updates).where(eq(dashboards.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/dashboards/[id]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const id = context?.params?.id as string
    const [d] = await db.select().from(dashboards).where(eq(dashboards.id, id)).limit(1);
    if (!d) return NextResponse.json({ error: 'Dashboard introuvable' }, { status: 404 });
    if (d.userId !== session.user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    await db.delete(dashboards).where(eq(dashboards.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/dashboards/[id]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
