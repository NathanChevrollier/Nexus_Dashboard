import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integrationId, tmdbId, title, qualityProfileId = 1, rootFolderPath } = await req.json();

    if (!integrationId || !tmdbId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch integration
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, integrationId),
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const baseUrl = integration.baseUrl?.replace(/\/$/, '');
    const apiKey = integration.apiKey;

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Invalid Radarr configuration' },
        { status: 400 }
      );
    }

    // Get root folder if not provided
    let folder = rootFolderPath;
    if (!folder) {
      const foldersRes = await fetch(`${baseUrl}/api/v3/rootfolder`, {
        headers: {
          'X-Api-Key': apiKey,
        },
      });

      if (foldersRes.ok) {
        const folders = await foldersRes.json();
        folder = folders[0]?.path || '/movies';
      }
    }

    // Add movie to Radarr
    const addUrl = `${baseUrl}/api/v3/movie`;
    const addRes = await fetch(addUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tmdbId,
        title,
        qualityProfileId,
        rootFolderPath: folder,
        monitored: true,
        addOptions: {
          searchForMovie: true,
        },
      }),
    });

    if (!addRes.ok) {
      const error = await addRes.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to add movie');
    }

    const addedMovie = await addRes.json();

    return NextResponse.json({
      success: true,
      message: `${title} added to Radarr!`,
      movie: addedMovie,
    });
  } catch (error: any) {
    console.error('Radarr add error:', error);
    return NextResponse.json(
      { error: error.message || 'Add failed' },
      { status: 500 }
    );
  }
}
