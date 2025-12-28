import { NextResponse } from 'next/server';

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

    // joinedPath already contains the full TMDb path (often starts with "3/"),
    // so avoid duplicating the /3 segment. Build the target using joinedPath directly.
    const target = `https://api.themoviedb.org/${joinedPath}${q}${q ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}`;
    console.debug('TMDb proxy forwarding to', target);

    const res = await fetch(target, { method: 'GET' });
    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    console.error('TMDb proxy error', err);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
