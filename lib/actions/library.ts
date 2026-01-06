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
  });

  revalidatePath("/dashboard/library");
}

export async function updateLibraryItem(id: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");

  await db.update(libraryItems)
    .set({ ...data, updatedAt: new Date() })
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