/**
 * Client-side utilities pour récupérer les liens de streaming
 */

export interface StreamingLinks {
  crunchyroll: string | null;
  voiranime: string | null;
  anilist: string | null;
}

/**
 * Récupère les liens de streaming pour un titre donné
 */
export async function getStreamingLinks(
  title: string,
  type: string = 'anime',
  anilistId?: number
): Promise<StreamingLinks | null> {
  try {
    const response = await fetch('/api/streaming/get-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title.trim(),
        type,
        anilistId,
      }),
    });

    if (!response.ok) {
      console.error('Streaming links API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.links || null;
  } catch (error) {
    console.error('Failed to get streaming links:', error);
    return null;
  }
}

/**
 * Formate les liens de streaming pour affichage
 */
export function formatStreamingLinks(links: StreamingLinks | null): string {
  if (!links) return 'Aucun lien détecté';

  const available: string[] = [];
  
  if (links.crunchyroll) available.push('Crunchyroll');
  if (links.voiranime) available.push('VoirAnime');
  if (links.anilist) available.push('AniList');

  if (available.length === 0) return 'Aucun lien trouvé';
  
  return `Disponible sur : ${available.join(', ')}`;
}

/**
 * Obtient le lien prioritaire pour un anime
 * Ordre : Crunchyroll > VoirAnime > AniList
 */
export function getPrimaryStreamingLink(links: StreamingLinks | null): string | null {
  if (!links) return null;
  
  return links.crunchyroll || links.voiranime || links.anilist || null;
}
