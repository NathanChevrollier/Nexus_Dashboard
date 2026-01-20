import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
// import { games } from '@/lib/db/schema'; // DEPRECATED: games table no longer exists
import { eq, and } from 'drizzle-orm';

// PATCH /api/widgets/games/[id] - Update a game
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // DEPRECATED: games table no longer exists
    return NextResponse.json({ error: 'Games API deprecated' }, { status: 410 });

    // // Verify ownership
    // const existingGame = await db
    //   .select()
    //   .from(games)
    //   .where(and(eq(games.id, id), eq(games.userId, session.user.id)))
    //   .limit(1);

    // if (!existingGame.length) {
    //   return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    // }

    // await db
    //   .update(games)
    //   .set({
    //     ...body,
    //     updatedAt: new Date(),
    //   })
    //   .where(and(eq(games.id, id), eq(games.userId, session.user.id)));

    // const updatedGame = await db
    //   .select()
    //   .from(games)
    //   .where(eq(games.id, id))
    //   .limit(1);

    // return NextResponse.json(updatedGame[0]);
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}

// DELETE /api/widgets/games/[id] - Delete a game
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // DEPRECATED: games table no longer exists
    return NextResponse.json({ error: 'Games API deprecated' }, { status: 410 });

    // // Verify ownership
    // const existingGame = await db
    //   .select()
    //   .from(games)
    //   .where(and(eq(games.id, id), eq(games.userId, session.user.id)))
    //   .limit(1);

    // if (!existingGame.length) {
    //   return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    // }

    // await db
    //   .delete(games)
    //   .where(and(eq(games.id, id), eq(games.userId, session.user.id)));

    // return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
  }
}
