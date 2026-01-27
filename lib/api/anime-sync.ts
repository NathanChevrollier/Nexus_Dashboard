/**
 * Utilitaires de synchronisation automatique des animés avec AniList
 * Met à jour les statuts et détecte les animés terminés
 */

import { getMediaById } from './anilist';
import { updateLibraryItem } from '@/lib/actions/library';

export interface AnimeSyncResult {
  id: string;
  updated: boolean;
  changes?: {
    status?: string;
    totalProgress?: number;
    scheduleDay?: string | null;
    scheduleType?: string | null;
  };
  error?: string;
}

/**
 * Synchronise un item anime avec les données AniList
 * Met à jour le statut si l'anime est terminé
 */
export async function syncAnimeItem(item: any): Promise<AnimeSyncResult> {
  if (!item.anilistId || item.type !== 'anime') {
    return { id: item.id, updated: false, error: 'Not an anime with AniList ID' };
  }

  try {
    const media = await getMediaById(item.anilistId);
    if (!media) {
      return { id: item.id, updated: false, error: 'Media not found on AniList' };
    }

    const changes: any = {};
    let needsUpdate = false;

    // Détecter si l'anime est terminé
    if (media.status === 'FINISHED' && item.status !== 'completed') {
      changes.status = 'completed';
      needsUpdate = true;
    }

    // Mettre à jour le nombre total d'épisodes si disponible
    if (media.episodes && (!item.totalProgress || item.totalProgress !== media.episodes)) {
      changes.totalProgress = media.episodes;
      needsUpdate = true;
    }

    // Si plus de prochain épisode et status RELEASING, nettoyer les horaires
    if (!media.nextAiringEpisode && media.status === 'FINISHED') {
      if (item.scheduleDay || item.scheduleType) {
        changes.scheduleDay = null;
        changes.scheduleType = null;
        needsUpdate = true;
      }
    }

    // Appliquer les changements
    if (needsUpdate) {
      await updateLibraryItem(item.id, changes);
      return { id: item.id, updated: true, changes };
    }

    return { id: item.id, updated: false };
  } catch (error) {
    console.error('Sync anime item failed:', error);
    return { id: item.id, updated: false, error: String(error) };
  }
}

/**
 * Synchronise tous les animés d'une liste
 */
export async function syncAllAnimeItems(items: any[]): Promise<AnimeSyncResult[]> {
  const animeItems = items.filter(item => item.type === 'anime' && item.anilistId);
  const results: AnimeSyncResult[] = [];

  for (const item of animeItems) {
    const result = await syncAnimeItem(item);
    results.push(result);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
