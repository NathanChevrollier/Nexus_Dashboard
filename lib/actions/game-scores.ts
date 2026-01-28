"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gameScores, users } from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
  sql,
  inArray,
} from "drizzle-orm";
import { nanoid } from "nanoid";

// ============= PERMISSIONS CHECK =============
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && !session.user.isOwner) {
    throw new Error("Unauthorized: Admin access required");
  }
}

// ============= GAME SCORES MANAGEMENT =============

// Récupérer tous les scores d'un jeu
export async function getAllGameScores(gameId: string) {
  await requireAdmin();

  const scores = await db
    .select({
      id: gameScores.id,
      userId: gameScores.userId,
      userName: sql<string>`(SELECT name FROM users WHERE id = ${gameScores.userId})`,
      score: gameScores.score,
      metadata: gameScores.metadata,
      createdAt: gameScores.createdAt,
    })
    .from(gameScores)
    .where(eq(gameScores.gameId, gameId))
    .orderBy(desc(gameScores.score));

  return scores;
}

// Récupérer les stats d'un jeu
export async function getGameStats(gameId: string) {
  await requireAdmin();

  const stats = await db
    .select({
      totalPlayers: sql<number>`COUNT(DISTINCT ${gameScores.userId})`,
      totalScores: sql<number>`COUNT(*)`,
      highestScore: sql<number>`MAX(${gameScores.score})`,
      averageScore: sql<number>`AVG(${gameScores.score})`,
      lowestScore: sql<number>`MIN(${gameScores.score})`,
    })
    .from(gameScores)
    .where(eq(gameScores.gameId, gameId));

  return stats[0] || null;
}

// Ajouter un score pour un utilisateur
export async function addScoreToUser(
  userId: string,
  gameId: string,
  score: number,
  metadata?: Record<string, any>
) {
  await requireAdmin();

  const newScore = await db.insert(gameScores).values({
    id: nanoid(),
    userId,
    gameId,
    score,
    metadata: metadata || {},
  });

  return { success: true };
}

// Modifier un score existant
export async function updateScore(
  scoreId: string,
  newScore: number
) {
  await requireAdmin();

  await db
    .update(gameScores)
    .set({ score: newScore })
    .where(eq(gameScores.id, scoreId));

  return { success: true };
}

// Supprimer un score
export async function deleteScore(scoreId: string) {
  await requireAdmin();

  await db.delete(gameScores).where(eq(gameScores.id, scoreId));

  return { success: true };
}

// Supprimer tous les scores d'un utilisateur pour un jeu
export async function deleteUserGameScores(userId: string, gameId: string) {
  await requireAdmin();

  await db
    .delete(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.gameId, gameId)
      )
    );

  return { success: true };
}

// Clear tous les scores d'un jeu
export async function clearGameScores(gameId: string) {
  await requireAdmin();

  await db.delete(gameScores).where(eq(gameScores.gameId, gameId));

  return { success: true };
}

// ============= MONEYMAKER SPECIFIC =============

// Ajouter/soustraire de l'argent à NetWorth (stocké dans metadata)
export async function adjustMoneyMakerCash(
  userId: string,
  amount: number,
  reason?: string
) {
  await requireAdmin();

  // Récupérer le score actuel (ou créer un nouveau)
  const existing = await db
    .select()
    .from(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.gameId, "moneymaker")
      )
    )
    .orderBy(desc(gameScores.score))
    .limit(1);

  const currentScore = existing[0]?.score || 10000;
  const newScore = Math.max(0, currentScore + amount); // Ne pas aller en négatif

  if (existing.length > 0) {
    await db
      .update(gameScores)
      .set({
        score: newScore,
        metadata: {
          ...existing[0].metadata,
          lastAdjustment: reason || "Admin adjustment",
          adjustedAt: new Date().toISOString(),
        },
      })
      .where(eq(gameScores.id, existing[0].id));
  } else {
    await db.insert(gameScores).values({
      id: nanoid(),
      userId,
      gameId: "moneymaker",
      score: newScore,
      metadata: {
        lastAdjustment: reason || "Admin adjustment",
        adjustedAt: new Date().toISOString(),
      },
    });
  }

  return { success: true, newScore };
}

// ============= BULK OPERATIONS =============

// Supprimer tous les scores d'un utilisateur (tous les jeux)
export async function deleteAllUserScores(userId: string) {
  await requireAdmin();

  await db.delete(gameScores).where(eq(gameScores.userId, userId));

  return { success: true };
}

// Récupérer tous les jeux avec leurs stats
export async function getAllGamesStats() {
  await requireAdmin();

  const games = await db
    .selectDistinct({ gameId: gameScores.gameId })
    .from(gameScores);

  const stats = await Promise.all(
    games.map(async (game) => {
      const gameStats = await getGameStats(game.gameId);
      return {
        gameId: game.gameId,
        stats: gameStats,
      };
    })
  );

  return stats;
}

// Obtenir les utilisateurs avec scores pour un jeu (pour filtrer les joueurs actifs)
export async function getActivePlayersForGame(gameId: string) {
  await requireAdmin();

  const players = await db
    .selectDistinct({ userId: gameScores.userId })
    .from(gameScores)
    .where(eq(gameScores.gameId, gameId));

  return players;
}
