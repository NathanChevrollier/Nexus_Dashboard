import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    console.error('AniList proxy error', err);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
