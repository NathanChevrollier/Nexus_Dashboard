import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simple in-memory TTL cache for TMDb responses to reduce repeated calls
const tmdbCache = new Map<string, { ts: number; ttl: number; body: string; status: number; contentType: string | null }>();
const DEFAULT_TTL = 60 * 5; // 5 minutes

export async function GET(request: Request, context: any) {
  try {
    const params = await Promise.resolve(context?.params);
    const { path } = params as { path: string[] };
    const joinedPath = path.join('/');
    const url = new URL(request.url);
    const q = url.search;

    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

    if (!apiKey) {
      console.error('TMDb proxy: API key not configured (TMDB_API_KEY or NEXT_PUBLIC_TMDB_API_KEY)');
      return NextResponse.json({ error: 'TMDb API key not configured on server' }, { status: 500 });
    }

    const target = `https://api.themoviedb.org/${joinedPath}${q}${q ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}`;
    // use a cache key based on the full target
    const cacheKey = crypto.createHash('sha256').update(target).digest('hex');

    // allow bypass via ?cache=0
    const bypassCache = url.searchParams.get('cache') === '0';

    if (!bypassCache && tmdbCache.has(cacheKey)) {
      const entry = tmdbCache.get(cacheKey)!;
      if (Date.now() - entry.ts < entry.ttl * 1000) {
        // Serve cached
        return new NextResponse(entry.body, {
          status: entry.status,
          headers: { 'content-type': entry.contentType || 'application/json', 'x-cache': 'HIT' },
        });
      }
      tmdbCache.delete(cacheKey);
    }

    console.debug('TMDb proxy forwarding to', target);

    const res = await fetch(target, { method: 'GET' });
    const text = await res.text();

    // Cache only successful responses (200)
    const contentType = res.headers.get('content-type');
    if (res.status === 200) {
      tmdbCache.set(cacheKey, { ts: Date.now(), ttl: DEFAULT_TTL, body: text, status: res.status, contentType });
    }

    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': contentType || 'application/json', 'x-cache': 'MISS' },
    });
  } catch (err) {
    console.error('TMDb proxy error', err);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
