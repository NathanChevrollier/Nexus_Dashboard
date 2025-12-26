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

    const { integrationId, tvdbId, title, qualityProfileId = 1, rootFolderPath } = await req.json();

    if (!integrationId || !tvdbId || !title) {
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
        { error: 'Invalid Sonarr configuration' },
        { status: 400 }
      );
    }

    // First, lookup series details
    const lookupUrl = `${baseUrl}/api/v3/series/lookup?term=${encodeURIComponent(title)}`;
    const lookupRes = await fetch(lookupUrl, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    if (!lookupRes.ok) {
      throw new Error('Failed to lookup series');
    }

    const lookupResults = await lookupRes.json();
    const seriesData = lookupResults.find((s: any) => s.tvdbId === tvdbId || s.title === title);

    if (!seriesData) {
      return NextResponse.json(
        { error: 'Series not found' },
        { status: 404 }
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
        folder = folders[0]?.path || '/tv';
      }
    }

    // Add series to Sonarr
    const addUrl = `${baseUrl}/api/v3/series`;
    const addRes = await fetch(addUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...seriesData,
        qualityProfileId,
        rootFolderPath: folder,
        monitored: true,
        addOptions: {
          searchForMissingEpisodes: true,
        },
      }),
    });

    if (!addRes.ok) {
      const error = await addRes.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to add series');
    }

    const addedSeries = await addRes.json();

    return NextResponse.json({
      success: true,
      message: `${title} added to Sonarr!`,
      series: addedSeries,
    });
  } catch (error: any) {
    console.error('Sonarr add error:', error);
    return NextResponse.json(
      { error: error.message || 'Add failed' },
      { status: 500 }
    );
  }
}
