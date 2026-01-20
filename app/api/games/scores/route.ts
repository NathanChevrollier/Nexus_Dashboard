import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gameScores } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - Récupérer les scores (leaderboard ou meilleur score utilisateur)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const userOnly = searchParams.get("userOnly") === "true";

    if (!gameId) {
      return NextResponse.json({ error: "gameId required" }, { status: 400 });
    }

    if (userOnly && session?.user?.id) {
      // Récupérer le meilleur score de l'utilisateur pour ce jeu
      const userBestScore = await db
        .select()
        .from(gameScores)
        .where(
          and(
            eq(gameScores.gameId, gameId),
            eq(gameScores.userId, session.user.id)
          )
        )
        .orderBy(desc(gameScores.score))
        .limit(1);

      return NextResponse.json(userBestScore[0] || null);
    }

    // Récupérer le leaderboard (meilleur score par utilisateur)
    const leaderboard = await db
      .select({
        userId: gameScores.userId,
        gameId: gameScores.gameId,
        bestScore: sql<number>`MAX(${gameScores.score})`,
        userName: sql<string>`(SELECT name FROM users WHERE id = ${gameScores.userId})`,
        createdAt: sql<Date>`MAX(${gameScores.createdAt})`,
      })
      .from(gameScores)
      .where(eq(gameScores.gameId, gameId))
      .groupBy(gameScores.userId, gameScores.gameId)
      .orderBy(desc(sql`MAX(${gameScores.score})`))
      .limit(limit);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 500 }
    );
  }
}

// POST - Sauvegarder un nouveau score
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gameId, score, metadata } = body;

    if (!gameId || typeof score !== "number") {
      return NextResponse.json(
        { error: "gameId and score required" },
        { status: 400 }
      );
    }

    // Vérifier si c'est un nouveau meilleur score
    const currentBest = await db
      .select()
      .from(gameScores)
      .where(
        and(
          eq(gameScores.gameId, gameId),
          eq(gameScores.userId, session.user.id)
        )
      )
      .orderBy(desc(gameScores.score))
      .limit(1);

    const isNewBest =
      currentBest.length === 0 || score > currentBest[0].score;

    // Sauvegarder le score
    const newScore = await db.insert(gameScores).values({
      id: nanoid(),
      userId: session.user.id,
      gameId,
      score,
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      isNewBest,
      previousBest: currentBest[0]?.score || 0,
      score,
    });
  } catch (error) {
    console.error("Error saving score:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }
}
