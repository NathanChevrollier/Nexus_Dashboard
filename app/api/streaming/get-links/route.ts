import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const requestSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  anilistId: z.number().optional(),
});

/**
 * API route pour récupérer les liens de streaming pour un anime/manga
 * Supporte Crunchyroll, VoirAnime, et autres plateformes
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type = 'anime', anilistId } = requestSchema.parse(body);

    const links: any = {
      crunchyroll: null,
      voiranime: null,
      anilist: null,
    };

    // Lien AniList (toujours disponible si on a l'ID)
    if (anilistId) {
      const typePrefix = type === 'anime' ? 'anime' : 'manga';
      links.anilist = `https://anilist.co/${typePrefix}/${anilistId}`;
    }

    // Uniquement pour les animes
    if (type === 'anime') {
      // Crunchyroll : scraper pour obtenir l'ID de série
      try {
        const crunchyrollId = await scrapeCrunchyrollId(title);
        if (crunchyrollId) {
          links.crunchyroll = `https://www.crunchyroll.com/fr/series/${crunchyrollId}`;
        }
      } catch (error) {
        console.error('Crunchyroll scraping failed:', error);
      }

      // VoirAnime : essayer de construire l'URL avec le slug
      try {
        const voirAnimeUrl = await tryVoirAnimeUrl(title);
        if (voirAnimeUrl) {
          links.voiranime = voirAnimeUrl;
        }
      } catch (error) {
        console.error('VoirAnime URL generation failed:', error);
      }
    }

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Get streaming links error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des liens', links: null },
      { status: 500 }
    );
  }
}

/**
 * Scraper Crunchyroll pour obtenir l'ID de série
 * L'URL Crunchyroll fonctionne sans slug : www.crunchyroll.com/fr/series/{ID}
 */
async function scrapeCrunchyrollId(title: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.crunchyroll.com/fr/search?q=${encodeURIComponent(title)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error('Crunchyroll search failed:', response.status);
      return null;
    }

    const html = await response.text();

    // Rechercher le pattern de lien série : /fr/series/{ID}
    // Pattern: href="/fr/series/GRMG8ZQZR" ou href="https://www.crunchyroll.com/fr/series/GRMG8ZQZR"
    const patterns = [
      /href=["'](?:https?:\/\/www\.crunchyroll\.com)?\/fr\/series\/([A-Z0-9]+)["']/i,
      /\/fr\/series\/([A-Z0-9]{9,})(?:\/|")/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        console.log('Crunchyroll ID found:', match[1]);
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Crunchyroll scraping error:', error);
    return null;
  }
}

/**
 * Essayer de construire et valider l'URL VoirAnime
 * Pattern: v6.voiranime.com/anime/{slug}/
 */
async function tryVoirAnimeUrl(title: string): Promise<string | null> {
  try {
    // Générer le slug à partir du titre
    const slug = generateSlug(title);
    const possibleUrl = `https://v6.voiranime.com/anime/${slug}/`;

    // Vérifier si la page existe (HEAD request)
    const response = await fetch(possibleUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // Timeout de 5 secondes
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      console.log('VoirAnime URL validated:', possibleUrl);
      return possibleUrl;
    }

    return null;
  } catch (error) {
    console.error('VoirAnime URL validation error:', error);
    return null;
  }
}

/**
 * Générer un slug à partir d'un titre
 * Exemple: "One Piece" -> "one-piece"
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    // Normaliser les caractères Unicode (enlever les accents)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacer les espaces et caractères spéciaux par des tirets
    .replace(/[^a-z0-9]+/g, '-')
    // Enlever les tirets en début/fin
    .replace(/^-+|-+$/g, '')
    // Limiter la longueur
    .substring(0, 100);
}
