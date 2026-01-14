import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Small proxy to serve images from homarr-labs/dashboard-icons raw.githubusercontent
// Adds a file-based server-side cache to avoid repeated slow fetches

const CACHE_DIR = path.resolve(process.cwd(), '.cache', 'assets');
const DEFAULT_TTL = Number(process.env.ASSETS_PROXY_CACHE_TTL_SECONDS || 86400); // 24h

async function ensureCacheDir() {
  try {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function cacheFilenameFor(key: string) {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(CACHE_DIR, `${hash}`);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParam = url.searchParams.get('path');
    if (!pathParam) {
      return NextResponse.json({ error: 'path param required' }, { status: 400 });
    }

    const normalized = pathParam.replace(/^\/+/, '');
    if (!/^(png|svg)\/[\S\/]+\.(png|svg|jpg|jpeg|gif)$/i.test(normalized)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    await ensureCacheDir();
    const cacheFile = cacheFilenameFor(normalized);

    // If cached and fresh, serve from disk
    try {
      const st = await fs.promises.stat(cacheFile);
      const age = (Date.now() - st.mtimeMs) / 1000;
      if (age < DEFAULT_TTL) {
        const data = await fs.promises.readFile(cacheFile);
        const contentType = guessContentType(normalized);
        return new NextResponse(data, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'X-Cache': 'HIT',
            'Cache-Control': `public, max-age=${Math.min(DEFAULT_TTL, 3600)}`
          }
        });
      }
    } catch (e) {
      // cache miss, continue to fetch
    }

    // fetch remote and write to cache
    const remote = `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/${encodeURIComponent(normalized)}`;
    const res = await fetch(remote, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Remote fetch failed' }, { status: 502 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    // write file asynchronously (don't await to speed response); but ensure write attempted
    fs.promises.writeFile(cacheFile, buffer).catch(() => undefined);

    const contentType = res.headers.get('content-type') || guessContentType(normalized);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${Math.min(DEFAULT_TTL, 3600)}`
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function guessContentType(p: string) {
  if (/\.svg$/i.test(p)) return 'image/svg+xml';
  if (/\.(jpg|jpeg)$/i.test(p)) return 'image/jpeg';
  if (/\.png$/i.test(p)) return 'image/png';
  if (/\.gif$/i.test(p)) return 'image/gif';
  return 'application/octet-stream';
}
