import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeAllowlist } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/actions/permissions';

const postSchema = z.object({ origin: z.string().min(3) });
const patchSchema = z.object({ id: z.string(), removed: z.boolean().optional() });

// short in-memory cache to reduce DB hits on cold starts
const ALLOWLIST_CACHE_TTL = Number(process.env.ALLOWLIST_CACHE_TTL_SECONDS || 30);
let allowlistCache: { ts: number; rows: any[] } | null = null;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    
    const {allowed, error: permError} = await requirePermission('MANAGE_IFRAME_ALLOWLIST');
    if (!allowed) return NextResponse.json({ error: permError || 'Accès refusé' }, { status: 403 });

    // serve cached response when fresh
    if (allowlistCache && (Date.now() - allowlistCache.ts) / 1000 < ALLOWLIST_CACHE_TTL) {
      return NextResponse.json({ ok: true, origins: allowlistCache.rows });
    }

    const rows = await db.select().from(iframeAllowlist).orderBy(iframeAllowlist.addedAt);
    allowlistCache = { ts: Date.now(), rows };
    return NextResponse.json({ ok: true, origins: rows });
  } catch (err) {
    console.error('Erreur GET /api/admin/iframe/allowlist', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    
    const {allowed, error: permError} = await requirePermission('MANAGE_IFRAME_ALLOWLIST');
    if (!allowed) return NextResponse.json({ error: permError || 'Accès refusé' }, { status: 403 });

    const json = await request.json().catch(() => ({}));
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { origin } = parsed.data;
    // normalize origin
    let normalized = origin;
    try {
      const u = new URL(origin);
      normalized = `${u.protocol}//${u.host}`;
    } catch (e) {
      normalized = origin.includes('://') ? origin : `https://${origin}`;
    }

    // check exists
    const existing = await db.select().from(iframeAllowlist).where(eq(iframeAllowlist.origin, normalized)).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: 'Origine déjà présente' }, { status: 409 });

    const id = `alw-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    await db.insert(iframeAllowlist).values({ id, origin: normalized, addedBy: session.user.id });
    return NextResponse.json({ ok: true, id, origin: normalized });
  } catch (err) {
    console.error('Erreur POST /api/admin/iframe/allowlist', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    
    const {allowed, error: permError} = await requirePermission('MANAGE_IFRAME_ALLOWLIST');
    if (!allowed) return NextResponse.json({ error: permError || 'Accès refusé' }, { status: 403 });

    const json = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { id, removed } = parsed.data;
    const updates: any = {};
    if (removed !== undefined) updates.removed = removed;
    if (!removed) updates.approvedAt = new Date();

    await db.update(iframeAllowlist).set(updates).where(eq(iframeAllowlist.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erreur PATCH /api/admin/iframe/allowlist', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    
    const {allowed, error: permError} = await requirePermission('MANAGE_IFRAME_ALLOWLIST');
    if (!allowed) return NextResponse.json({ error: permError || 'Accès refusé' }, { status: 403 });

    const json = await request.json().catch(() => ({}));
    const id = json.id as string | undefined;
    if (!id) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    await db.delete(iframeAllowlist).where(eq(iframeAllowlist.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erreur DELETE /api/admin/iframe/allowlist', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
