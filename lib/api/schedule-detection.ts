
/**
 * Auto-detection des horaires de sortie pour la Library
 * Recherche sur AniList (anime/manga) et TMDB (séries/films)
 */

export interface ScheduleInfo {
  source: 'anilist' | 'tmdb' | 'manual';
  externalId?: number;
  scheduleType: 'weekly' | 'biweekly' | 'monthly' | null;
  scheduleDay: string | null; // 'monday', 'tuesday', etc.
  nextEpisode?: {
    number: number;
    airingAt: number; // timestamp
  };
  releaseDate?: {
    number: number;
    airingAt: number;
    date: string;
  };
  confidence: 'high' | 'medium' | 'low';
  title?: string;
  coverUrl?: string;
  detectedType?: string; // 'anime', 'manga', 'manhwa', etc.
  detectedStatus?: string; // 'reading', 'completed', 'plan_to_read', etc.
  totalProgress?: number | null; // Nombre total d'épisodes/chapitres
  streamingLinks?: {
    crunchyroll?: string | null;
    voiranime?: string | null;
  };
}

/**
 * Fonction principale : détecte automatiquement l'horaire selon le type
 * Appelle l'API serveur pour éviter les problèmes CORS et proxy
 */
export async function detectSchedule(title: string, type: string): Promise<ScheduleInfo | null> {
  console.log('[detectSchedule] Called with:', { title, type });
  
  if (!title || title.trim().length < 2) {
    console.log('[detectSchedule] Invalid title');
    return null;
  }

  try {
    console.log('[detectSchedule] Fetching API...');
    const response = await fetch('/api/library/detect-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title.trim(),
        type,
      }),
    });

    console.log('[detectSchedule] Response status:', response.status);

    if (!response.ok) {
      console.error('Schedule detection API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[detectSchedule] Response data:', data);
    return data.schedule || null;
  } catch (error) {
    console.error('Schedule detection failed:', error);
    return null;
  }
}

/**
 * Formate l'info de schedule pour affichage utilisateur
 */
export function formatScheduleInfo(info: ScheduleInfo | null): string {
  if (!info) return 'Aucun horaire détecté';

  const dayLabels: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  };

  if (info.scheduleDay && info.scheduleType) {
    const day = dayLabels[info.scheduleDay] || info.scheduleDay;
    const freq = info.scheduleType === 'weekly' ? 'Hebdomadaire' : 
                 info.scheduleType === 'biweekly' ? 'Bimensuel' : 'Mensuel';
    return `${freq} - ${day}`;
  }

  return 'Horaire irrégulier';
}
