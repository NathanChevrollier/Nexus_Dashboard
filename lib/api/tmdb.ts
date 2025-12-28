/**
 * Client API pour The Movie Database (TMDb)
 * Permet de récupérer les films, séries TV, et leurs calendriers de sortie
 */

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'demo_key';
// Use server-side proxy for client requests to avoid CSP issues
const TMDB_PROXY_BASE = '/api/proxy/tmdb/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  adult: boolean;
  // Helper properties
  posterUrl?: string;
  releaseDate?: string;
  voteAverage?: number;
  genres?: string[];
}

export interface TMDbTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  origin_country: string[];
  // Helper properties
  posterUrl?: string;
  firstAirDate?: string;
  voteAverage?: number;
  genres?: string[];
}

export interface TMDbTVEpisode {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  show_id: number;
  show_name: string;
  show_poster: string | null;
}

export interface TMDbGenre {
  id: number;
  name: string;
}

const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

/**
 * Récupère les films à venir (sorties cinéma)
 */
export async function getUpcomingMovies(page = 1): Promise<TMDbMovie[]> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/movie/upcoming?language=fr-FR&page=${page}&region=FR`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('TMDb API Error:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return (data.results || []).map(enrichMovie);
  } catch (error) {
    console.error('Error fetching upcoming movies:', error);
    return [];
  }
}

/**
 * Récupère les films populaires du moment
 */
export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TMDbMovie[]> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/trending/movie/${timeWindow}?language=fr-FR`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('TMDb API Error (trending movies):', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return (data.results || []).map(enrichMovie);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
}

/**
 * Récupère les séries TV qui diffusent aujourd'hui
 */
export async function getTVAiringToday(): Promise<TMDbTVShow[]> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/tv/airing_today?language=fr-FR&page=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('TMDb API Error (TV airing today):', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return (data.results || []).map(enrichTVShow);
  } catch (error) {
    console.error('Error fetching TV airing today:', error);
    return [];
  }
}

/**
 * Récupère les séries TV qui diffusent cette semaine
 */
export async function getTVOnTheAir(): Promise<TMDbTVShow[]> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/tv/on_the_air?language=fr-FR&page=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('TMDb API Error (TV on the air):', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return (data.results || []).map(enrichTVShow);
  } catch (error) {
    console.error('Error fetching TV on the air:', error);
    return [];
  }
}

/**
 * Récupère les séries TV populaires
 */
export async function getTrendingTVShows(timeWindow: 'day' | 'week' = 'week'): Promise<TMDbTVShow[]> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/trending/tv/${timeWindow}?language=fr-FR`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('TMDb API Error (trending TV):', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return (data.results || []).map(enrichTVShow);
  } catch (error) {
    console.error('Error fetching trending TV shows:', error);
    return [];
  }
}

/**
 * Récupère les détails d'une série TV
 */
export async function getTVShowDetails(showId: number) {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/tv/${showId}?language=fr-FR`
    );
    
    if (!response.ok) throw new Error('Failed to fetch TV show details');
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching TV show details:', error);
    return null;
  }
}

/**
 * Récupère les épisodes à venir pour une série
 */
export async function getUpcomingEpisodes(showId: number, seasonNumber: number) {
  try {
    const response = await fetch(
      `${TMDB_PROXY_BASE}/tv/${showId}/season/${seasonNumber}?language=fr-FR`
    );
    
    if (!response.ok) throw new Error('Failed to fetch episodes');
    
    const data = await response.json();
    return data.episodes || [];
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }
}

/**
 * Utilitaire pour construire l'URL d'une image
 */
export function getTMDbImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'w500'): string {
  if (!path) return '/placeholder-movie.png';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Convertit les IDs de genres en noms
 */
export function getMovieGenres(genreIds: number[]): string[] {
  return genreIds.map(id => MOVIE_GENRES[id] || 'Unknown').filter(Boolean);
}

export function getTVGenres(genreIds: number[]): string[] {
  return genreIds.map(id => TV_GENRES[id] || 'Unknown').filter(Boolean);
}

/**
 * Formate une date pour l'affichage
 */
export function formatReleaseDate(dateString: string): string {
  if (!dateString) return 'Date inconnue';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Date inconnue';

  const now = new Date();
  // Normalize to local midnight for day difference
  const utc1 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const utc2 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays > 0 && diffDays <= 7) return `Dans ${diffDays} jours`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Enrichit un film avec des propriétés helper
 */
export function enrichMovie(movie: TMDbMovie): TMDbMovie {
  return {
    ...movie,
    posterUrl: movie.poster_path ? getTMDbImageUrl(movie.poster_path, 'w500') : undefined,
    releaseDate: formatReleaseDate(movie.release_date),
    voteAverage: movie.vote_average,
    genres: getMovieGenres(movie.genre_ids),
  };
}

/**
 * Enrichit une série TV avec des propriétés helper
 */
export function enrichTVShow(show: TMDbTVShow): TMDbTVShow {
  return {
    ...show,
    posterUrl: show.poster_path ? getTMDbImageUrl(show.poster_path, 'w500') : undefined,
    firstAirDate: formatReleaseDate(show.first_air_date),
    voteAverage: show.vote_average,
    genres: getTVGenres(show.genre_ids),
  };
}

/**
 * Combine films et séries pour un calendrier unifié
 */
export async function getUpcomingContent(daysAhead = 30) {
  const [movies, tvShows] = await Promise.all([
    getUpcomingMovies(),
    getTVOnTheAir(),
  ]);

  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Filtrer les films à venir dans la période
  const filteredMovies = movies
    .filter(movie => {
      if (!movie.release_date) return false;
      const releaseDate = new Date(movie.release_date);
      return releaseDate >= now && releaseDate <= futureDate;
    })
    .map(movie => ({
      ...movie,
      type: 'movie' as const,
      date: movie.release_date,
    }));

  // Les séries TV (on prend leur première date de diffusion)
  const filteredTVShows = tvShows
    .filter(show => {
      if (!show.first_air_date) return false;
      const airDate = new Date(show.first_air_date);
      return airDate >= now && airDate <= futureDate;
    })
    .map(show => ({
      ...show,
      type: 'tv' as const,
      date: show.first_air_date,
    }));

  // Combiner et trier par date
  return [...filteredMovies, ...filteredTVShows].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}
