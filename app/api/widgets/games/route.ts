import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
// import { games } from '@/lib/db/schema'; // DEPRECATED: games table no longer exists
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/widgets/games - Get all games for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DEPRECATED: games table no longer exists
    return NextResponse.json({ error: 'Games API deprecated' }, { status: 410 });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

// POST /api/widgets/games - Create a new game
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // DEPRECATED: games table no longer exists
    return NextResponse.json({ error: 'Games API deprecated' }, { status: 410 });

    // const { title, description, icon, gameUrl, gameType, config, isActive, order } = body;

    // if (!title) {
    //   return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    // }

    // const gameId = nanoid();
    // await db.insert(games).values({
    //   id: gameId,
    //   userId: session.user.id,
    //   title,
    //   description: description || null,
    //   icon: icon || '🎮',
    //   gameUrl: gameUrl || null,
    //   gameType: gameType || 'internal',
    //   config: config || {},
    //   isActive: isActive !== undefined ? isActive : true,
    //   order: order || 0,
    // });

    // // Fetch the created game
    // const createdGame = await db
    //   .select()
    //   .from(games)
    //   .where(eq(games.id, gameId))
    //   .limit(1);

    // return NextResponse.json(createdGame[0] || { success: true });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
