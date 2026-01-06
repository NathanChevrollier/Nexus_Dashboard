import { NextResponse } from 'next/server';

type CheckBody = { url?: string };

async function probeUrl(url: string) {
  // Try HEAD first, fallback to GET
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res;
  } catch (e) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' });
      return res;
    } catch (err) {
      throw err;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckBody;
    const { url } = body;
    if (!url) return NextResponse.json({ ok: false, error: 'Missing url' }, { status: 400 });

    let res;
    try {
      res = await probeUrl(url);
    } catch (err) {
      console.error('Error probing url', err);
      return NextResponse.json({ ok: false, error: 'Network error' }, { status: 502 });
    }

    const headers: Record<string, string | null> = {
      'x-frame-options': res.headers.get('x-frame-options'),
      'content-security-policy': res.headers.get('content-security-policy'),
    };

    // Basic checks
    const xfo = headers['x-frame-options'];
    const csp = headers['content-security-policy'];

    if (xfo) {
      const lower = xfo.toLowerCase();
      if (lower.includes('deny') || lower.includes('sameorigin')) {
        return NextResponse.json({ ok: true, embeddable: false, reason: `X-Frame-Options: ${xfo}`, headers });
      }
    }

    if (csp) {
      const lab = csp.toLowerCase();
      const faIndex = lab.indexOf('frame-ancestors');
      if (faIndex !== -1) {
        const part = lab.slice(faIndex, lab.indexOf(';', faIndex) === -1 ? lab.length : lab.indexOf(';', faIndex));
        // if contains 'none' it's blocked
        if (part.includes("'none'") || part.includes('none')) {
          return NextResponse.json({ ok: true, embeddable: false, reason: `Content-Security-Policy: ${part}`, headers });
        }
      }
    }

    // Otherwise assume embeddable (best-effort)
    return NextResponse.json({ ok: true, embeddable: true, headers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
