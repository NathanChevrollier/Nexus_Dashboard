import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { iframeAllowlist } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Return only non-removed origins
    const rows = await db.select().from(iframeAllowlist).where(eq(iframeAllowlist.removed, false));
    const origins = rows.map(r => r.origin);
    return NextResponse.json({ origins });
  } catch (err) {
    console.error('Erreur GET /api/iframe/allowlist', err?.message || err);
    // If DB is not available (dev), return empty list so middleware and UI can continue.
    return NextResponse.json({ origins: [] });
  }
}
