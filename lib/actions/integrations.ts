"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, type Integration } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function getIntegrations() {
  const session = await auth();

  if (!session) {
    throw new Error("Non authentifié");
  }

  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, session.user.id));

  return rows;
}

interface UpsertIntegrationInput {
  id?: string;
  name: string;
  type: Integration["type"];
  baseUrl?: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export async function upsertIntegration(input: UpsertIntegrationInput) {
  const session = await auth();

  if (!session) {
    throw new Error("Non authentifié");
  }

  const now = new Date();

  if (input.id) {
    // Update existing (ensure ownership)
    const existing = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, input.id), eq(integrations.userId, session.user.id)));

    if (!existing.length) {
      throw new Error("Intégration non trouvée ou accès refusé");
    }

    await db
      .update(integrations)
      .set({
        name: input.name,
        type: input.type,
        baseUrl: input.baseUrl ?? null,
        apiKey: input.apiKey ?? null,
        username: input.username ?? null,
        password: input.password ?? null,
        updatedAt: now,
      })
      .where(and(eq(integrations.id, input.id), eq(integrations.userId, session.user.id)));

    return { success: true, id: input.id };
  }

  const id = generateId();

  await db.insert(integrations).values({
    id,
    userId: session.user.id,
    name: input.name,
    type: input.type,
    baseUrl: input.baseUrl ?? null,
    apiKey: input.apiKey ?? null,
    username: input.username ?? null,
    password: input.password ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { success: true, id };
}

export async function deleteIntegration(id: string) {
  const session = await auth();

  if (!session) {
    throw new Error("Non authentifié");
  }

  await db
    .delete(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.userId, session.user.id)));

  return { success: true };
}
