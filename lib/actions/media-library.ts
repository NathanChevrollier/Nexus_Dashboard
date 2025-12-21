"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function getMediaItems() {
  const session = await auth();
  if (!session) {
    throw new Error("Non authentifié");
  }

  const items = await db.query.mediaItems.findMany({
    where: eq(mediaItems.userId, session.user.id),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
  });

  return items;
}

interface UpsertMediaItemInput {
  id?: string;
  title: string;
  type: "movie" | "series" | "music";
  tmdbId?: number;
  year?: string;
  posterUrl?: string;
  backdropUrl?: string;
  streamUrl?: string;
}

export async function upsertMediaItem(input: UpsertMediaItemInput) {
  const session = await auth();
  if (!session) {
    throw new Error("Non authentifié");
  }

  const now = new Date();

  if (input.id) {
    const existing = await db.query.mediaItems.findFirst({
      where: and(eq(mediaItems.id, input.id), eq(mediaItems.userId, session.user.id)),
    });

    if (!existing) {
      throw new Error("Média introuvable ou accès refusé");
    }

    await db
      .update(mediaItems)
      .set({
        title: input.title,
        type: input.type,
        tmdbId: input.tmdbId,
        year: input.year,
        posterUrl: input.posterUrl,
        backdropUrl: input.backdropUrl,
        streamUrl: input.streamUrl,
        updatedAt: now,
      })
      .where(eq(mediaItems.id, input.id));

    return { id: input.id };
  }

  const id = generateId();

  await db.insert(mediaItems).values({
    id,
    userId: session.user.id,
    title: input.title,
    type: input.type,
    tmdbId: input.tmdbId,
    year: input.year,
    posterUrl: input.posterUrl,
    backdropUrl: input.backdropUrl,
    streamUrl: input.streamUrl,
    createdAt: now,
    updatedAt: now,
  });

  return { id };
}

export async function deleteMediaItem(id: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Non authentifié");
  }

  const existing = await db.query.mediaItems.findFirst({
    where: and(eq(mediaItems.id, id), eq(mediaItems.userId, session.user.id)),
  });

  if (!existing) {
    throw new Error("Média introuvable ou accès refusé");
  }

  await db.delete(mediaItems).where(eq(mediaItems.id, id));

  return { success: true };
}
