import { NextResponse } from 'next/server';

// Very small proxy to serve images from homarr-labs/dashboard-icons raw.githubusercontent
// Only allow paths under png/ or svg/ to avoid open proxy abuse

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'path param required' }, { status: 400 });
    }

    // normalize and validate
    const normalized = path.replace(/^\/+/, '');
    if (!/^(png|svg)\/[^\s\/]+\.(png|svg|jpg|jpeg|gif)$/i.test(normalized)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const remote = `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/${encodeURIComponent(normalized)}`;

    const res = await fetch(remote, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Remote fetch failed' }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
