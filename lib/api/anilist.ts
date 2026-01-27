/**
 * AniList API Client
 * Documentation: https://anilist.gitbook.io/anilist-apiv2-docs/
 */

// Use server-side proxy to avoid CSP/client-side direct calls
const ANILIST_API_URL = '/api/proxy/anilist';

export interface AnimeSchedule {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
    color: string | null;
  };
  format: string; // TV, MOVIE, OVA, ONA, SPECIAL
  status: string; // RELEASING, FINISHED, NOT_YET_RELEASED
  nextAiringEpisode: {
    airingAt: number; // Unix timestamp
    timeUntilAiring: number; // Seconds
    episode: number;
  } | null;
  episodes: number | null;
  genres: string[];
  averageScore: number | null;
  siteUrl: string;
}

export interface MangaRelease {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
    color: string | null;
  };
  format: string; // MANGA, NOVEL, ONE_SHOT
  status: string;
  chapters: number | null;
  volumes: number | null;
  genres: string[];
  averageScore: number | null;
  siteUrl: string;
}

// GraphQL Query pour les animés en cours de diffusion
const AIRING_SCHEDULE_QUERY = `
query ($page: Int, $perPage: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
      id
      airingAt
      episode
      timeUntilAiring
      media {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          color
        }
        format
        status
        episodes
        nextAiringEpisode {
          airingAt
          timeUntilAiring
          episode
        }
        genres
        averageScore
        siteUrl
      }
    }
  }
}
`;

// GraphQL Query pour les mangas populaires en cours
const RELEASING_MANGA_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
    }
    media(type: MANGA, status: RELEASING, sort: POPULARITY_DESC) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
        color
      }
      format
      status
      chapters
      volumes
      genres
      averageScore
      siteUrl
    }
  }
}
`;

/**
 * Fetch airing schedule for a specific time range
 */
export async function getAiringSchedule(
  startTime: number,
  endTime: number,
  page: number = 1,
  perPage: number = 50
): Promise<AnimeSchedule[]> {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: {
          page,
          perPage,
          airingAt_greater: startTime,
          airingAt_lesser: endTime,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    // Extract media from airing schedules
    return data.data.Page.airingSchedules.map((schedule: any) => ({
      ...schedule.media,
      nextAiringEpisode: {
        airingAt: schedule.airingAt,
        timeUntilAiring: schedule.timeUntilAiring,
        episode: schedule.episode,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch airing schedule:', error);
    throw error;
  }
}

/**
 * Get anime airing today
 */
export async function getAiringToday(): Promise<AnimeSchedule[]> {
  const now = Math.floor(Date.now() / 1000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return getAiringSchedule(
    Math.floor(startOfDay.getTime() / 1000),
    Math.floor(endOfDay.getTime() / 1000)
  );
}

/**
 * Get anime airing this week
 */
export async function getAiringThisWeek(): Promise<AnimeSchedule[]> {
  const now = Math.floor(Date.now() / 1000);
  const weekFromNow = now + 7 * 24 * 60 * 60;

  return getAiringSchedule(now, weekFromNow);
}

/**
 * Get releasing manga (popular ongoing series)
 */
export async function getReleasingManga(
  page: number = 1,
  perPage: number = 20
): Promise<MangaRelease[]> {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: RELEASING_MANGA_QUERY,
        variables: {
          page,
          perPage,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data.Page.media;
  } catch (error) {
    console.error('Failed to fetch releasing manga:', error);
    throw error;
  }
}

/**
 * Group anime by day of the week
 */
export function groupByDay(schedules: AnimeSchedule[]): Record<string, AnimeSchedule[]> {
  const grouped: Record<string, AnimeSchedule[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  schedules.forEach((anime) => {
    if (anime.nextAiringEpisode) {
      const date = new Date(anime.nextAiringEpisode.airingAt * 1000);
      const dayName = dayNames[date.getDay()];
      grouped[dayName].push(anime);
    }
  });

  return grouped;
}

/**
 * Format time until airing
 */
export function formatTimeUntilAiring(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Get day color for styling
 */
export function getDayColor(dayName: string): string {
  // Return a combined background + text class so consumers can apply both
  const colors: Record<string, string> = {
    Monday: 'bg-blue-500/10 text-blue-500',
    Tuesday: 'bg-green-500/10 text-green-500',
    Wednesday: 'bg-yellow-500/10 text-yellow-500',
    Thursday: 'bg-purple-500/10 text-purple-500',
    Friday: 'bg-pink-500/10 text-pink-500',
    Saturday: 'bg-red-500/10 text-red-500',
    Sunday: 'bg-orange-500/10 text-orange-500',
  };

  return colors[dayName] || 'bg-gray-500/10 text-gray-500';
}

// GraphQL search query for media by text
const SEARCH_MEDIA_QUERY = `
query ($search: String, $type: MediaType, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total, currentPage, lastPage }
    media(search: $search, type: $type, sort: POPULARITY_DESC) {
      id
      title { romaji english native }
      coverImage { large medium color }
      format
      status
      episodes
      chapters
      volumes
      genres
      averageScore
      siteUrl
    }
  }
}
`;

/**
 * Search media on AniList (anime/manga)
 */
export async function searchMedia(
  search: string,
  type: 'ANIME' | 'MANGA' | undefined = undefined,
  page: number = 1,
  perPage: number = 10
): Promise<any[]> {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_MEDIA_QUERY,
        variables: { search, type, page, perPage },
      }),
    });

    if (!response.ok) throw new Error(`AniList API error: ${response.status}`);

    const data = await response.json();
    if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);

    return data.data.Page.media;
  } catch (error) {
    console.error('AniList search failed:', error);
    throw error;
  }
}

/**
 * Get full media details by AniList id (useful to fetch nextAiringEpisode for a specific media)
 */
export async function getMediaById(id: number): Promise<any | null> {
  try {
    const QUERY = `
      query ($id: Int) {
        Media(id: $id) {
          id
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format
          status
          episodes
          chapters
          nextAiringEpisode { airingAt episode timeUntilAiring }
          siteUrl
          genres
          averageScore
        }
      }
    `;

    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { id } }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.errors || !data.data?.Media) return null;
    return data.data.Media;
  } catch (error) {
    console.error('getMediaById failed:', error);
    return null;
  }
}
