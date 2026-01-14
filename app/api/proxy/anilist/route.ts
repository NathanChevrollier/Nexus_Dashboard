import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simple in-memory TTL cache for AniList GraphQL POST responses keyed by request body hash
const anilistCache = new Map<string, { ts: number; ttl: number; body: string; status: number; contentType: string | null }>();
const ANILIST_TTL = 60 * 2; // 2 minutes

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const key = crypto.createHash('sha256').update(body).digest('hex');

    // support cache bypass with header X-Cache-Bypass: 1
    const bypass = request.headers.get('x-cache-bypass') === '1';
    if (!bypass && anilistCache.has(key)) {
      const entry = anilistCache.get(key)!;
      if (Date.now() - entry.ts < entry.ttl * 1000) {
        return new NextResponse(entry.body, {
          status: entry.status,
          headers: { 'content-type': entry.contentType || 'application/json', 'x-cache': 'HIT' },
        });
      }
      anilistCache.delete(key);
    }

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    const text = await res.text();

    if (res.status === 200) {
      anilistCache.set(key, { ts: Date.now(), ttl: ANILIST_TTL, body: text, status: res.status, contentType: res.headers.get('content-type') });
    }

    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json', 'x-cache': 'MISS' },
    });
  } catch (err) {
    console.error('AniList proxy error', err);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
