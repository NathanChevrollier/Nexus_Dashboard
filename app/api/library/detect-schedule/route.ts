import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const requestSchema = z.object({
  title: z.string().min(1),
  type: z.string(),
});

const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * API route pour l'auto-détection des horaires de sortie
 * Recherche sur AniList (anime/manga) et TMDB (séries/films)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type } = requestSchema.parse(body);

    let result = null;

    // Essayer AniList pour anime/manga
    if (type === 'anime' || type === 'manga' || type === 'manhwa' || type === 'manhua') {
      result = await searchAnimeSchedule(title, type === 'anime');
    }

    // Essayer TMDB pour séries TV
    if (!result && (type === 'serie' || type === 'tv')) {
      result = await searchTVSchedule(title);
    }

    // Fallback: essayer anime puis TV si pas de type spécifique
    if (!result) {
      result = await searchAnimeSchedule(title, true);
      if (!result || result.confidence === 'low') {
        const tvResult = await searchTVSchedule(title);
        if (tvResult && tvResult.confidence !== 'low') {
          result = tvResult;
        }
      }
    }

    return NextResponse.json({ schedule: result });
  } catch (error) {
    console.error('Schedule detection error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la détection', schedule: null },
      { status: 500 }
    );
  }
}

async function searchAnimeSchedule(title: string, isAnime: boolean): Promise<any> {
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
        variables: { search: title, type: isAnime ? 'ANIME' : 'MANGA' },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.errors || !data.data?.Media) return null;

    const media = data.data.Media;

    // Mapper le type AniList vers nos types
    const typeMap: Record<string, string> = {
      'MANGA': 'manga',
      'NOVEL': 'novel',
      'ANIME': 'anime',
      'ONE_SHOT': 'manga',
      'MANHWA': 'manhwa',
      'MANHUA': 'manhua',
    };
    const detectedType = typeMap[media.format] || (isAnime ? 'anime' : 'manga');

    // Mapper le statut AniList vers nos statuts
    const statusMap: Record<string, string> = {
      'FINISHED': 'completed',
      'RELEASING': 'reading',
      'NOT_YET_RELEASED': 'plan_to_read',
      'CANCELLED': 'dropped',
      'HIATUS': 'paused',
    };
    const detectedStatus = statusMap[media.status] || 'reading';

    // Nombre total (épisodes pour anime, chapitres pour manga)
    const totalProgress = isAnime ? media.episodes : media.chapters;

    if (!media.nextAiringEpisode) {
      return {
        source: 'anilist',
        externalId: media.id,
        scheduleType: null,
        scheduleDay: null,
        confidence: 'low',
        title: media.title.english || media.title.romaji,
        coverUrl: media.coverImage.large,
        detectedType,
        detectedStatus,
        totalProgress,
      };
    }

    // Utiliser la timezone du serveur pour déterminer le jour de sortie
    const airingDate = new Date(media.nextAiringEpisode.airingAt * 1000);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[airingDate.getDay()];

    return {
      source: 'anilist',
      externalId: media.id,
      scheduleType: 'weekly',
      scheduleDay: dayOfWeek,
      nextEpisode: {
        number: media.nextAiringEpisode.episode,
        airingAt: media.nextAiringEpisode.airingAt,
      },
      confidence: 'high',
      title: media.title.english || media.title.romaji,
      coverUrl: media.coverImage.large,
      detectedType,
      detectedStatus,
      totalProgress,
    };
  } catch (error) {
    console.error('Failed to search anime schedule:', error);
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
