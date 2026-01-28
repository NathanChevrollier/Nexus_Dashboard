"use server";

import { db } from "@/lib/db";
import { libraryItems } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateId } from "@/lib/utils";

export async function getLibraryItems() {
  const session = await auth();
  if (!session?.user) return [];

  return await db.select()
    .from(libraryItems)
    .where(eq(libraryItems.userId, session.user.id))
    .orderBy(desc(libraryItems.updatedAt));
}

export async function addLibraryItem(data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");

  await db.insert(libraryItems).values({
    id: generateId(),
    userId: session.user.id,
    ...data,
    currentProgress: parseInt(data.currentProgress) || 0,
    totalProgress: data.totalProgress ? parseInt(data.totalProgress) : null,
    additionalUrl: data.additionalUrl ? data.additionalUrl : null,
  });

  revalidatePath("/dashboard/library");
}

export async function updateLibraryItem(id: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");

  await db.update(libraryItems)
    .set({ ...data, additionalUrl: data.additionalUrl ? data.additionalUrl : null, updatedAt: new Date() })
    .where(and(eq(libraryItems.id, id), eq(libraryItems.userId, session.user.id)));

  revalidatePath("/dashboard/library");
}

export async function deleteLibraryItem(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");

  await db.delete(libraryItems)
    .where(and(eq(libraryItems.id, id), eq(libraryItems.userId, session.user.id)));

  revalidatePath("/dashboard/library");
}

/**
 * Récupère les animes de l'utilisateur avec le prochain épisode calculé
 * pour "Aujourd'hui" et "Cette semaine"
 */
export async function getUserAnimeSchedule() {
  const session = await auth();
  if (!session?.user) return [];

  const items = await db.select()
    .from(libraryItems)
    .where(and(
      eq(libraryItems.userId, session.user.id),
      eq(libraryItems.type, 'anime')
    ))
    .orderBy(desc(libraryItems.updatedAt));

  // Enrichir avec le calcul du prochain épisode
  const enriched = items.map(item => {
    const nextEpisode = calculateNextEpisode(item);
    return {
      ...item,
      nextEpisode,
      timeUntilAiring: nextEpisode ? calculateTimeUntilAiring(nextEpisode.airingAt) : null,
    };
  });

  // Filtrer et trier par heure de sortie
  return enriched
    .filter(item => item.nextEpisode && item.nextEpisode.airingAt)
    .sort((a, b) => (a.nextEpisode?.airingAt || 0) - (b.nextEpisode?.airingAt || 0));
}

/**
 * Calcule le prochain épisode basé sur:
 * - release_start_date (ou createdAt par défaut)
 * - scheduleType (weekly, biweekly, monthly)
 * - scheduleDay (lundi, mardi, etc)
 * - currentProgress
 */
function calculateNextEpisode(item: any) {
  if (!item.scheduleDay || !item.scheduleType) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Date de référence (quand le planning a commencé)
  const releaseStart = item.releaseSchedule 
    ? new Date(item.releaseSchedule)
    : item.createdAt
    ? new Date(item.createdAt)
    : today;

  const dayMapping: Record<string, number> = {
    'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
    'friday': 5, 'saturday': 6, 'sunday': 0,
  };

  const targetDayOfWeek = dayMapping[item.scheduleDay.toLowerCase()] || 1;
  const freqDays = item.scheduleType === 'weekly' ? 7 : 
                   item.scheduleType === 'biweekly' ? 14 : 30;

  // Trouver la prochaine date de sortie
  let nextDate = new Date(releaseStart);
  while (nextDate <= today) {
    nextDate = new Date(nextDate.getTime() + freqDays * 24 * 60 * 60 * 1000);
  }

  // Ajuster pour le bon jour de la semaine
  const daysUntilTarget = (targetDayOfWeek - nextDate.getDay() + 7) % 7 || freqDays;
  nextDate = new Date(nextDate.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);

  // Estimer le numéro d'épisode (currentProgress + 1)
  const nextEpisodeNum = (item.currentProgress || 0) + 1;

  return {
    airingAt: Math.floor(nextDate.getTime() / 1000),
    episode: nextEpisodeNum,
    date: nextDate,
  };
}

/**
 * Calcule le temps restant jusqu'à la sortie en secondes
 */
function calculateTimeUntilAiring(airingAtTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, airingAtTimestamp - now);
}