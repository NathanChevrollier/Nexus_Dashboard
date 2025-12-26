import { NextResponse } from 'next/server';

// Simple in-memory cache
let CACHE: { ts: number; items: any[] } | null = null;
const TTL = 1000 * 60 * 5; // 5 minutes

async function fetchFolder(path: string) {
  const apiUrl = `https://api.github.com/repos/homarr-labs/dashboard-icons/contents/${path}`;
  const res = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } });
  if (!res.ok) return [];
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json
    .filter((f: any) => f.type === 'file')
    .map((f: any) => ({ name: f.name, path: f.path, download_url: f.download_url }));
}

export async function GET() {
  if (CACHE && Date.now() - CACHE.ts < TTL) {
    return NextResponse.json({ items: CACHE.items });
  }

  try {
    const pngs = await fetchFolder('png');
    const svgs = await fetchFolder('svg');

    const items = [
      ...pngs.map((i: any) => ({ ...i, type: 'image' })),
      ...svgs.map((i: any) => ({ ...i, type: 'image' })),
    ];

    CACHE = { ts: Date.now(), items };
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [] });
  }
}
