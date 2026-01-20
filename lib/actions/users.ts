"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function dismissGuide() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  try {
    await db
      .update(users)
      .set({ hasSeenGuide: true })
      .where(eq(users.id, session.user.id));

    return { success: true };
  } catch (error) {
    console.error("Error dismissing guide:", error);
    return { error: "Erreur lors de la mise à jour" };
  }
}

export async function checkHasSeenGuide() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { hasSeenGuide: false };
  }

  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    return { hasSeenGuide: user?.hasSeenGuide || false };
  } catch (error) {
    console.error("Error checking guide status:", error);
    return { hasSeenGuide: false };
  }
}
