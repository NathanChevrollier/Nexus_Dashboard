/**
 * Client API pour The Movie Database (TMDb)
 * Permet de récupérer les films, séries TV, et leurs calendriers de sortie
 */

// Configuration
const TMDB_PROXY_BASE = '/api/proxy/tmdb/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// --- Interfaces ---

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
  // Helper properties (Enrichissement pour le front)
  posterUrl?: string | null;
  backdropUrl?: string | null; // <--- Ajouté pour le design Media Request
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
  posterUrl?: string | null;
  backdropUrl?: string | null; // <--- Ajouté
  firstAirDate?: string;
  voteAverage?: number;
  genres?: string[];
}

export interface TMDbGenre {
  id: number;
  name: string;
}

interface TMDbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// --- Constantes Genres ---

const MOVIE_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantastique', 36: 'Histoire',
  27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction',
  10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
};

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 10762: 'Enfants', 9648: 'Mystère',
  10763: 'News', 10764: 'Réalité', 10765: 'SF & Fantastique', 10766: 'Soap',
  10767: 'Talk', 10768: 'Guerre & Politique', 37: 'Western',
};

// --- Helper Fetch Générique (DRY) ---

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T | null> {
  try {
    const searchParams = new URLSearchParams({
      language: 'fr-FR',
      region: 'FR',
      ...params
    });

    const relativeUrl = `${TMDB_PROXY_BASE}${endpoint}?${searchParams.toString()}`;

    // Some server runtimes (Node) require absolute URLs for fetch(). Prefer calling TMDb
    // directly from the server when an API key is available to avoid proxying to localhost
    // during build-time (which can produce ECONNREFUSED if Next dev server isn't running).
    const isServer = typeof window === 'undefined';

    let finalUrl: string;
    const serverApiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (isServer && serverApiKey) {
      // Query TMDb directly from the server using the API key
      finalUrl = `https://api.themoviedb.org/3${endpoint}?${searchParams.toString()}&api_key=${encodeURIComponent(serverApiKey)}`;
    } else {
      // Fallback to proxying through the app (useful for client-side or when no server key present)
      const url = relativeUrl;
      const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      finalUrl = isServer && url.startsWith('/') ? `${base.replace(/\/$/, '')}${url}` : url;
    }

    // On utilise le cache de Next.js pour éviter de spammer l'API
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate },
    });

    if (!response.ok) {
      console.warn(`TMDb Warning [${response.status}]: ${url}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`TMDb Error: ${endpoint}`, error);
    return null;
  }
}

// --- Fonctions Principales ---

export async function getUpcomingMovies(page = 1): Promise<TMDbMovie[]> {
  const data = await fetchTMDB<TMDbResponse<TMDbMovie>>('/movie/upcoming', { page: String(page) });
  return (data?.results || []).map(enrichMovie);
}

export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TMDbMovie[]> {
  const data = await fetchTMDB<TMDbResponse<TMDbMovie>>(`/trending/movie/${timeWindow}`, {}, 3600);
  return (data?.results || []).map(enrichMovie);
}

export async function getTVAiringToday(): Promise<TMDbTVShow[]> {
  const data = await fetchTMDB<TMDbResponse<TMDbTVShow>>('/tv/airing_today', {}, 1800); // Cache plus court (30min)
  return (data?.results || []).map(enrichTVShow);
}

export async function getTVOnTheAir(): Promise<TMDbTVShow[]> {
  const data = await fetchTMDB<TMDbResponse<TMDbTVShow>>('/tv/on_the_air', {});
  return (data?.results || []).map(enrichTVShow);
}

export async function getTrendingTVShows(timeWindow: 'day' | 'week' = 'week'): Promise<TMDbTVShow[]> {
  const data = await fetchTMDB<TMDbResponse<TMDbTVShow>>(`/trending/tv/${timeWindow}`, {});
  return (data?.results || []).map(enrichTVShow);
}

export async function getTVShowDetails(showId: number) {
  return await fetchTMDB<any>(`/tv/${showId}`, {}, 86400); // Cache long (24h)
}

export async function getUpcomingEpisodes(showId: number, seasonNumber: number) {
  const data = await fetchTMDB<any>(`/tv/${showId}/season/${seasonNumber}`, {}, 3600);
  return data?.episodes || [];
}

// --- UTILITAIRES CRITIQUES ---

/**
 * Construit une URL d'image valide pour TMDB.
 * Gère les cas nuls, les chemins relatifs et les URLs absolues.
 */
export function getTMDbImageUrl(path: string | null | undefined, size: 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
  // 1. Si pas de chemin, on retourne null (le composant gérera le placeholder)
  if (!path || path === 'null' || path === 'undefined') {
    return null; 
  }

  // 2. Si le chemin est déjà une URL complète (ex: renvoyé par Overseerr depuis Fanart.tv)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 3. Nettoyage du chemin (ajout du slash manquant si besoin)
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 4. Construction URL TMDB standard
  return `${TMDB_IMAGE_BASE}/${size}${cleanPath}`;
}

export function getMovieGenres(genreIds: number[]): string[] {
  return (genreIds || []).map(id => MOVIE_GENRES[id]).filter(Boolean);
}

export function getTVGenres(genreIds: number[]): string[] {
  return (genreIds || []).map(id => TV_GENRES[id]).filter(Boolean);
}

export function formatReleaseDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

// --- Enrichisseurs (Mapping) ---

export function enrichMovie(movie: TMDbMovie): TMDbMovie {
  return {
    ...movie,
    posterUrl: getTMDbImageUrl(movie.poster_path, 'w500'),
    backdropUrl: getTMDbImageUrl(movie.backdrop_path, 'w780'), // Pour la bannière
    releaseDate: formatReleaseDate(movie.release_date),
    genres: getMovieGenres(movie.genre_ids),
  };
}

export function enrichTVShow(show: TMDbTVShow): TMDbTVShow {
  return {
    ...show,
    posterUrl: getTMDbImageUrl(show.poster_path, 'w500'),
    backdropUrl: getTMDbImageUrl(show.backdrop_path, 'w780'), // Pour la bannière
    firstAirDate: formatReleaseDate(show.first_air_date),
    genres: getTVGenres(show.genre_ids),
  };
}

/**
 * Combine films et séries pour un calendrier unifié.
 * Utilise Promise.allSettled pour ne pas crasher si une des deux requêtes échoue.
 */
export async function getUpcomingContent(daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const [moviesRes, tvRes] = await Promise.allSettled([
    getUpcomingMovies(),
    getTVOnTheAir(),
  ]);

  const movies = moviesRes.status === 'fulfilled' ? moviesRes.value : [];
  const tvShows = tvRes.status === 'fulfilled' ? tvRes.value : [];

  const filteredMovies = movies
    .filter(m => m.release_date && new Date(m.release_date) >= now && new Date(m.release_date) <= futureDate)
    .map(m => ({ ...m, type: 'movie' as const, date: m.release_date }));

  const filteredTV = tvShows
    .filter(t => t.first_air_date && new Date(t.first_air_date) >= now && new Date(t.first_air_date) <= futureDate)
    .map(t => ({ ...t, type: 'tv' as const, date: t.first_air_date }));

  return [...filteredMovies, ...filteredTV].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// Récupère les détails d'un film (pour l'enrichissement)
export async function getMovieDetails(movieId: number) {
  // Cache long (24h) car les infos d'un film sorti ne changent pas
  return await fetchTMDB<any>(`/movie/${movieId}`, {}, 86400);
}