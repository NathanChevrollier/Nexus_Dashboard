import { NextResponse } from 'next/server';

// Simple in-memory cache to reduce TMDb calls during dev/runtime
const cache = new Map<string, { result: string; providers: string[] }>();

const VF_PROVIDERS = [
  'Netflix',
  'Amazon Prime Video',
  'Prime Video',
  'Disney Plus',
  'Canal+',
  'myCanal',
  'Hulu',
];

const VOSTFR_PROVIDERS = [
  'Crunchyroll',
  'Wakanim',
  'Anime Digital Network',
  'ADN',
  'Muse',
];

async function searchTmdb(title: string, apiKey: string) {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
    title
  )}&page=1&include_adult=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results || [];
}

async function getProviders(mediaType: string, id: number, apiKey: string) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key = (process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '').trim();
    if (!key) return NextResponse.json({ error: 'TMDb API key not configured' }, { status: 500 });

    // Accept either a single title or an array of titles for batching
    const titles: string[] = [];
    if (body?.title) titles.push(String(body.title));
    if (Array.isArray(body?.titles)) {
      body.titles.forEach((t: any) => { if (t) titles.push(String(t)); });
    }

    if (titles.length === 0) return NextResponse.json({ error: 'Missing title(s)' }, { status: 400 });

    // Process titles with limited concurrency and return results in order
    const concurrency = 5;
    const results: Array<{ title: string; result: string; providers: string[] }> = [];

    const work = titles.map((t) => async () => {
      const cacheKey = String(t).toLowerCase().trim();
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        return { title: t, result: cached.result, providers: cached.providers };
      }

      const searchResults = await searchTmdb(t, key);
      if (!searchResults || searchResults.length === 0) {
        cache.set(cacheKey, { result: 'unknown', providers: [] });
        return { title: t, result: 'unknown', providers: [] };
      }

      const picked = searchResults.find((r: any) => r.media_type === 'tv' || r.media_type === 'movie') || searchResults[0];
      const mediaType = picked.media_type === 'movie' ? 'movie' : 'tv';
      const tmdbId = picked.id;

      const provs = await getProviders(mediaType, tmdbId, key);
      const fr = provs?.FR;
      const providerNames: string[] = [];
      if (fr) {
        ['flatrate', 'rent', 'buy', 'free'].forEach((k) => {
          if (Array.isArray((fr as any)[k])) {
            (fr as any)[k].forEach((p: any) => providerNames.push(p.provider_name));
          }
        });
      }

      let detected: string = 'unknown';
      const namesLower = providerNames.map((n) => n.toLowerCase());
      if (namesLower.some((n) => VOSTFR_PROVIDERS.map((p) => p.toLowerCase()).includes(n))) detected = 'vostfr';
      else if (namesLower.some((n) => VF_PROVIDERS.map((p) => p.toLowerCase()).includes(n))) detected = 'vf';

      cache.set(cacheKey, { result: detected, providers: providerNames });
      return { title: t, result: detected, providers: providerNames };
    });

    // run with limited concurrency
    for (let i = 0; i < work.length; i += concurrency) {
      const slice = work.slice(i, i + concurrency).map((fn) => fn());
      // wait for the batch
      // eslint-disable-next-line no-await-in-loop
      const batchRes = await Promise.all(slice);
      batchRes.forEach((r) => results.push(r));
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('tmdb providers error', e);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
