import { ActionResponse } from "@/types/actions";
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { neuralNexusSaves, neuralNexusAchievements } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type GameSaveV2 = {
  version: 2;
  savedAt: number;
  entropy: number;
  lifetimeEntropy: number;
  shards: number;
  clicks: number;
  overcharge: number;
  isOvercharged: boolean;
  generators: Record<string, number>;
  upgrades: Record<string, boolean>;
  achievements: Record<string, boolean>;
  missions: Record<string, { completed: boolean; claimed: boolean }>;
  skills?: Record<string, boolean>;
  research?: Record<string, boolean>;
  challenges?: Record<string, { completed: boolean; claimed: boolean }>;
  firewallWinsToday?: number;
  firewallLevel?: number;
};

export async function saveGame(saveData: GameSaveV2): Promise<ActionResponse<void>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .insert(neuralNexusSaves)
      .values({
        userId: session.user.id,
        saveData,
        lifetimeEntropy: saveData.lifetimeEntropy,
        lastSavedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
            saveData,
            lifetimeEntropy: saveData.lifetimeEntropy,
            lastSavedAt: new Date(),
        }
      });

    return { success: true };
  } catch (error) {
    console.error("Failed to save game:", error);
    return { success: false, error: "Failed to save game" };
  }
}

export async function loadGame(): Promise<ActionResponse<GameSaveV2 | null>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const save = await db.query.neuralNexusSaves.findFirst({
      where: eq(neuralNexusSaves.userId, session.user.id),
    });

    if (!save) {
      return { success: true, data: null };
    }

    return { success: true, data: save.saveData as GameSaveV2 };
  } catch (error) {
    console.error("Failed to load game:", error);
    return { success: false, error: "Failed to load game" };
  }
}

export async function unlockAchievement(achievementId: string): Promise<ActionResponse<void>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db
        .insert(neuralNexusAchievements)
        .values({
            userId: session.user.id,
            achievementId,
        })
        .onDuplicateKeyUpdate({ set: { userId: session.user.id } }); // No-op if exists

    return { success: true };
  } catch (error) {
    console.error("Failed to unlock achievement:", error);
    return { success: false, error: "Failed to unlock achievement" };
  }
}

export async function getLeaderboard(): Promise<ActionResponse<Array<{ name: string; lifetimeEntropy: number; image: string | null }>>> {
  try {
    const topPlayers = await db.query.neuralNexusSaves.findMany({
      orderBy: [desc(neuralNexusSaves.lifetimeEntropy)],
      limit: 10,
      with: {
        user: true, 
      }
    });

    const formattedLeaderboard = topPlayers.map(player => ({
      name: player.user.name || "Anonymous User",
      lifetimeEntropy: player.lifetimeEntropy,
      image: player.user.image
    }));

    return { success: true, data: formattedLeaderboard };
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return { success: false, error: "Failed to fetch leaderboard" };
  }
}
