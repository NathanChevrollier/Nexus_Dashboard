"use server";

import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function createAnnouncement(data: {
  title: string;
  content: string;
  type: "info" | "update" | "alert";
  isPublished: boolean;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  // Vérifier que l'utilisateur est admin
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (user?.role !== "ADMIN") {
    return { error: "Accès refusé. Seuls les admins peuvent créer des annonces." };
  }

  try {
    const newAnnouncement = await db.insert(announcements).values({
      id: nanoid(),
      title: data.title,
      content: data.content,
      type: data.type,
      isPublished: data.isPublished,
      createdBy: session.user.id,
    });

    // Si l'annonce est publiée, envoyer une notification à tous via le socket server
    if (data.isPublished) {
      const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:4001';
      const announcementPayload = {
        id: nanoid(),
        title: data.title,
        content: data.content,
        type: data.type,
        createdAt: new Date().toISOString(),
      };

      try {
        await fetch(`${socketUrl}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'announcement:new', data: announcementPayload }),
        });
      } catch (err) {
        console.error('Failed to broadcast announcement to socket server:', err);
      }
    }

    return { success: true, announcementId: newAnnouncement[0].insertId };
  } catch (error) {
    console.error("Error creating announcement:", error);
    return { error: "Erreur lors de la création de l'annonce" };
  }
}

export async function getLatestAnnouncements(limit: number = 5) {
  try {
    const result = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isPublished, true))
      .orderBy(desc(announcements.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
}

export async function getAllAnnouncements() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  // Vérifier que l'utilisateur est admin
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (user?.role !== "ADMIN") {
    return { error: "Accès refusé" };
  }

  try {
    const result = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));

    return { announcements: result };
  } catch (error) {
    console.error("Error fetching all announcements:", error);
    return { error: "Erreur lors de la récupération des annonces" };
  }
}

export async function updateAnnouncement(
  id: string,
  data: {
    title?: string;
    content?: string;
    type?: "info" | "update" | "alert";
    isPublished?: boolean;
  }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  // Vérifier que l'utilisateur est admin
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (user?.role !== "ADMIN") {
    return { error: "Accès refusé" };
  }

  try {
    await db
      .update(announcements)
      .set(data)
      .where(eq(announcements.id, id));

    // Si l'annonce passe en publiée, envoyer une notification
    if (data.isPublished === true) {
      // Récupérer l'annonce mise à jour
      const updatedAnnouncement = await db.query.announcements.findFirst({
        where: (announcements, { eq }) => eq(announcements.id, id),
      });

      if (updatedAnnouncement) {
        const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:4001';
        try {
          await fetch(`${socketUrl}/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'announcement:new',
              data: {
                id: updatedAnnouncement.id,
                title: updatedAnnouncement.title,
                content: updatedAnnouncement.content,
                type: updatedAnnouncement.type,
                createdAt: updatedAnnouncement.createdAt.toISOString(),
              }
            })
          });
        } catch (err) {
          console.error('Failed to broadcast announcement to socket server:', err);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating announcement:", error);
    return { error: "Erreur lors de la mise à jour de l'annonce" };
  }
}

export async function deleteAnnouncement(id: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  // Vérifier que l'utilisateur est admin
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (user?.role !== "ADMIN") {
    return { error: "Accès refusé" };
  }

  try {
    await db.delete(announcements).where(eq(announcements.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return { error: "Erreur lors de la suppression de l'annonce" };
  }
}
