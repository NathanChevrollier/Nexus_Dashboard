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

    const { integrationId, query, type = 'series' } = await req.json();

    if (!integrationId || !query) {
      return NextResponse.json(
        { error: 'Missing integrationId or query' },
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

    // Search in Sonarr
    const searchUrl = `${baseUrl}/api/v3/series/lookup?term=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Sonarr API error: ${response.statusText}`);
    }

    const results = await response.json();

    return NextResponse.json({
      results: (results || []).map((item: any) => ({
        id: item.tvdbId || item.id,
        title: item.title,
        year: item.year,
        overview: item.overview,
        image: item.images?.find((img: any) => img.coverType === 'poster')?.url,
        tvdbId: item.tvdbId,
      })),
    });
  } catch (error: any) {
    console.error('Sonarr search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
