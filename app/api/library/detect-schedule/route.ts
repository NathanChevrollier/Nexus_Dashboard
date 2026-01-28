import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const requestSchema = z.object({
  title: z.string().min(1),
  type: z.string(),
});

const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * ============================================================================
 * CONSTANTES DE VALIDATION - Basées sur audit complet des APIs
 * ============================================================================
 */

// Formats AniList possibles
const ANILIST_FORMATS = {
  ANIME: 'anime',        // Série TV anime standard
  TV: 'anime',           // Television - format standard
  ONA: 'anime',          // Online Anime - diffusé en ligne
  TV_SHORT: 'anime',     // Court métrage TV
  MOVIE: 'anime',        // Film anime (pas d'horaire)
  SPECIAL: 'anime',      // OVA/ONA (pas d'horaire)
  MANGA: 'manga',        // Manga (pas d'horaire)
  ONE_SHOT: 'manga',     // One-shot (pas d'horaire)
  NOVEL: 'novel',        // Light novel (pas d'horaire)
} as const;

// Format pour lesquels on s'attend à avoir nextAiringEpisode
const FORMATS_WITH_SCHEDULE = ['ANIME', 'TV', 'ONA', 'TV_SHORT'];

// Formats pour lesquels on peut avoir des liens streaming
const FORMATS_WITH_STREAMING = ['ANIME', 'TV', 'ONA', 'TV_SHORT', 'MOVIE'];

// Statuts AniList possibles
const ANILIST_STATUS_MAP: Record<string, string> = {
  'FINISHED': 'completed',
  'RELEASING': 'reading',
  'NOT_YET_RELEASED': 'plan_to_read',
  'CANCELLED': 'dropped',
  'HIATUS': 'paused',
};

// Statuts TMDB possibles
const TMDB_STATUS_MAP: Record<string, string> = {
  'Returning Series': 'reading',
  'Ended': 'completed',
  'Canceled': 'dropped',
  'In Production': 'reading',
  'Planned': 'plan_to_read',
};

// Jours de semaine valides
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
type Weekday = typeof WEEKDAYS[number];

// Types détectés finaux valides
const VALID_DETECTED_TYPES = ['anime', 'manga', 'manhwa', 'manhua', 'novel'] as const;
type DetectedType = typeof VALID_DETECTED_TYPES[number];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type } = requestSchema.parse(body);

    let result = null;

    if (type === 'anime') {
      result = await searchAnimeSchedule(title, 'ANIME');
    } 
    else if (type === 'manga') {
      result = await searchAnimeSchedule(title, 'MANGA');
    }
    else if (type === 'manhwa') {
      result = await searchAnimeSchedule(title, 'MANGA');
      if (result) {
        result.detectedType = 'manhwa';
      }
    }
    else if (type === 'manhua') {
      result = await searchAnimeSchedule(title, 'MANGA');
      if (result) {
        result.detectedType = 'manhua';
      }
    }
    else if (type === 'novel') {
      result = await searchAnimeSchedule(title, 'MANGA');
      if (result) {
        result.detectedType = 'novel';
      }
    }
    else if (type === 'serie' || type === 'tv') {
      result = await searchTVSchedule(title);
    }
    else {
      result = await searchAnimeSchedule(title, 'ANIME');
      
      if (!result || result.confidence === 'low') {
        const mangaResult = await searchAnimeSchedule(title, 'MANGA');
        if (mangaResult && mangaResult.confidence !== 'low') {
          result = mangaResult;
        }
      }
    }

    return NextResponse.json({ schedule: result });
  } catch (error) {
    console.error('[DETECT-SCHEDULE] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la détection', schedule: null },
      { status: 500 }
    );
  }
}

/**
 * Score de confiance pour comparer les résultats
 */
function getConfidenceScore(result: any): number {
  let score = 0;
  
  // Score basé sur la confiance déclarée
  if (result.confidence === 'high') score += 3;
  else if (result.confidence === 'medium') score += 2;
  else if (result.confidence === 'low') score += 1;
  
  // Bonus si on a un schedule complet
  if (result.scheduleDay && result.scheduleType) score += 3;
  
  // Bonus si on a des infos complètes
  if (result.totalProgress) score += 2;
  if (result.streamingLinks && Object.values(result.streamingLinks).some(link => link)) score += 2;
  
  // Pénalité si c'est un manga (moins probable dans les résultats de recherche)
  if (result.detectedType === 'manga' || result.detectedType === 'manhwa') score -= 1;
  
  return score;
}

async function searchAnimeSchedule(title: string, mediaType: 'ANIME' | 'MANGA'): Promise<any> {
  try {
    const query = `
      query ($search: String, $type: MediaType) {
        Media(search: $search, type: $type, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
          }
          status
          format
          episodes
          chapters
          nextAiringEpisode {
            airingAt
            episode
          }
          externalLinks {
            site
            url
            type
          }
        }
      }
    `;

    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { search: title, type: mediaType },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.errors || !data.data?.Media) {
      return null;
    }

    const media = data.data.Media;

    if (!media.id || !media.title) {
      return null;
    }

    const anilistFormat = media.format as keyof typeof ANILIST_FORMATS;
    let detectedType: DetectedType = ANILIST_FORMATS[anilistFormat] as DetectedType || 'anime';

    const anilistStatus = media.status as keyof typeof ANILIST_STATUS_MAP;
    const detectedStatus = ANILIST_STATUS_MAP[anilistStatus] || 'reading';

    const totalProgress = detectedType === 'anime' ? media.episodes : media.chapters;

    let scheduleDay: Weekday | null = null;
    let scheduleType: string | null = null;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (FORMATS_WITH_SCHEDULE.includes(media.format) && media.nextAiringEpisode) {
      const airingDate = new Date(media.nextAiringEpisode.airingAt * 1000);
      const dayIndex = airingDate.getDay();
      
      if (dayIndex >= 0 && dayIndex < WEEKDAYS.length) {
        scheduleDay = WEEKDAYS[dayIndex];
        scheduleType = 'weekly';
        confidence = 'high';
      }
    } else if (FORMATS_WITH_SCHEDULE.includes(media.format)) {
      confidence = 'medium';
    }

    let streamingLinks = null;
    if (FORMATS_WITH_STREAMING.includes(media.format)) {
      try {
        streamingLinks = await detectStreamingLinks(
          media.title.english || media.title.romaji || media.title.native || 'Unknown',
          detectedType,
          media.id,
          media.externalLinks || []
        );
      } catch (streamingError) {
        console.error('[DETECT-SCHEDULE] Streaming error:', streamingError);
        streamingLinks = { crunchyroll: null, voiranime: null };
      }
    } else {
      streamingLinks = { crunchyroll: null, voiranime: null };
    }

    return {
      source: 'anilist',
      externalId: media.id,
      scheduleType,
      scheduleDay,
      releaseDate: media.nextAiringEpisode ? {
        number: media.nextAiringEpisode.episode,
        airingAt: media.nextAiringEpisode.airingAt,
        date: new Date(media.nextAiringEpisode.airingAt * 1000).toISOString(),
      } : null,
      nextEpisode: media.nextAiringEpisode ? {
        number: media.nextAiringEpisode.episode,
        airingAt: media.nextAiringEpisode.airingAt,
      } : null,
      confidence,
      title: media.title.english || media.title.romaji || media.title.native || 'Unknown',
      coverUrl: media.coverImage?.large || media.coverImage?.medium || null,
      detectedType,
      detectedStatus,
      totalProgress,
      streamingLinks,
    };
  } catch (error) {
    console.error('[DETECT-SCHEDULE] Error:', error);
    return null;
  }
}

async function searchTVSchedule(title: string): Promise<any> {
  try {
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
    if (!apiKey) return null;

    const searchUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&language=fr-FR&api_key=${encodeURIComponent(apiKey)}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) return null;

    const show = searchData.results[0];

    const detailsUrl = `https://api.themoviedb.org/3/tv/${show.id}?language=fr-FR&api_key=${encodeURIComponent(apiKey)}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) return null;

    const details = await detailsRes.json();

    // Calculer le nombre total d'épisodes
    const totalEpisodes = details.number_of_episodes || null;

    // Mapper le statut TMDB vers nos statuts
    const tmdbStatusMap: Record<string, string> = {
      'Returning Series': 'reading',
      'Ended': 'completed',
      'Canceled': 'dropped',
      'In Production': 'reading',
      'Planned': 'plan_to_read',
    };
    const detectedStatus = tmdbStatusMap[details.status] || 'reading';

    if (details.status !== 'Returning Series') {
      return {
        source: 'tmdb',
        externalId: show.id,
        scheduleType: null,
        scheduleDay: null,
        confidence: 'low',
        title: show.name,
        coverUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
        detectedType: 'anime',
        detectedStatus,
        totalProgress: totalEpisodes,
      };
    }

    let scheduleDay: string | null = null;
    if (details.next_episode_to_air?.air_date) {
      const airDate = new Date(details.next_episode_to_air.air_date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      scheduleDay = days[airDate.getDay()];
    }

    return {
      source: 'tmdb',
      externalId: show.id,
      scheduleType: 'weekly',
      scheduleDay,
      confidence: scheduleDay ? 'high' : 'medium',
      title: show.name,
      coverUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
      detectedType: 'anime',
      detectedStatus,
      totalProgress: totalEpisodes,
    };
  } catch (error) {
    console.error('Failed to search TV schedule:', error);
    return null;
  }
}

/**
 * Détecte les liens de streaming: Crunchyroll (AniList) > VoirAnime
 */
async function detectStreamingLinks(
  title: string,
  type: string,
  anilistId?: number,
  externalLinks?: any[]
): Promise<any> {
  try {
    const links: any = {
      crunchyroll: null,
      voiranime: null,
    };

    if (externalLinks && externalLinks.length > 0) {
      const crunchyrollLink = externalLinks.find(
        link => link.site === 'Crunchyroll' || link.site?.toLowerCase().includes('crunchyroll')
      );
      
      if (crunchyrollLink?.url) {
        links.crunchyroll = crunchyrollLink.url;
      } else {
        const crunchyrollId = await scrapeCrunchyrollId(title);
        if (crunchyrollId) {
          links.crunchyroll = `https://www.crunchyroll.com/fr/series/${crunchyrollId}`;
        }
      }
    } else {
      const crunchyrollId = await scrapeCrunchyrollId(title);
      if (crunchyrollId) {
        links.crunchyroll = `https://www.crunchyroll.com/fr/series/${crunchyrollId}`;
      }
    }

    if (type === 'anime') {
      const voirAnimeUrl = await tryVoirAnimeUrl(title);
      if (voirAnimeUrl) {
        links.voiranime = voirAnimeUrl;
      }
    }

    return links;
  } catch (error) {
    console.error('[STREAMING] Error:', error);
    return {
      crunchyroll: null,
      voiranime: null,
    };
  }
}

/**
 * Scraper Crunchyroll pour obtenir l'ID de série
 * Fallback si AniList externalLinks ne retourne rien
 * Amélioration: cherche dans le HTML avec regex robustes
 */
async function scrapeCrunchyrollId(title: string): Promise<string | null> {
  try {
    console.log('[CRUNCHYROLL] Fallback scraping for:', title);
    const searchUrl = `https://www.crunchyroll.com/fr/search?q=${encodeURIComponent(title)}`;
    console.log('[CRUNCHYROLL] Search URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const foundIds = new Set<string>();

    const urlPattern = /\/fr\/series\/(GT\d{8})/gi;
    let match;
    while ((match = urlPattern.exec(html)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    const jsonSeriesIdPattern = /"series_id"\s*:\s*"(GT\d{8})"/gi;
    while ((match = jsonSeriesIdPattern.exec(html)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    const dataAttrPattern = /data-series-id=["\']?(GT\d{8})["\']?/gi;
    while ((match = dataAttrPattern.exec(html)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    const queryPattern = /[\?&]series_id=(GT\d{8})/gi;
    while ((match = queryPattern.exec(html)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    const dataJsonPattern = /data[^>]*=[\"\']?\{[^}]*"id"\s*:\s*"(GT\d{8})"[^}]*\}?/gi;
    while ((match = dataJsonPattern.exec(html)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    if (foundIds.size > 0) {
      return Array.from(foundIds)[0];
    }

    return null;
  } catch (error) {
    console.error('[CRUNCHYROLL] ✗ EXCEPTION:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('[CRUNCHYROLL] Stack:', error.stack);
    }
    return null;
  }
}

/**
 * Try to build and validate VoirAnime URL
 */
async function tryVoirAnimeUrl(title: string): Promise<string | null> {
  try {
    let baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    const slugVariants: string[] = [baseSlug];
    
    const withoutSuffix = baseSlug
      .replace(/-(?:season|saison|s|part|partie)-?\d+$/, '')
      .replace(/^(.*?)-\d+$/, '$1');
    if (withoutSuffix !== baseSlug) {
      slugVariants.push(withoutSuffix);
    }
    
    const shortSlug = baseSlug.split('-').slice(0, 4).join('-');
    if (shortSlug !== baseSlug) {
      slugVariants.push(shortSlug);
    }
    
    for (let i = 1; i <= 3; i++) {
      if (!baseSlug.endsWith(`-${i}`)) {
        slugVariants.push(`${baseSlug}-${i}`);
        if (withoutSuffix) slugVariants.push(`${withoutSuffix}-${i}`);
      }
    }
    
    const uniqueVariants = Array.from(new Set(slugVariants)).filter(s => s.length > 0);

    const results = await Promise.allSettled(
      uniqueVariants.map(async (slug) => {
        const url = `https://v6.voiranime.com/anime/${slug}/`;
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(3000),
          });
          
          if (response.ok || response.status === 301 || response.status === 302) {
            return { success: true, url, slug };
          }
          
          return { success: false, slug };
        } catch {
          return { success: false, slug };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.success && result.value.url) {
        return result.value.url;
      }
    }

    return null;
  } catch (error) {
    console.error('[VOIRANIME]', error instanceof Error ? error.message : String(error));
    return null;
  }
}
