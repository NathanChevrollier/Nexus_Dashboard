"use server";

import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createNotification } from "@/lib/notifications";

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
    const announcementId = nanoid();
    await db.insert(announcements).values({
      id: announcementId,
      title: data.title,
      content: data.content,
      type: data.type,
      isPublished: data.isPublished,
      createdBy: session.user.id,
    });

    // Si l'annonce est publiée, créer les notifications pour tous les utilisateurs
    if (data.isPublished) {
      const allUsers = await db.query.users.findMany();
      
      const typeEmojis: Record<string, string> = {
        info: '📋',
        update: '🚀',
        alert: '⚠️'
      };

      for (const user of allUsers) {
        await createNotification({
          userId: user.id,
          type: "announcement:new",
          title: `${typeEmojis[data.type] || '📢'} ${data.title}`,
          message: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
          payload: {
            id: announcementId,
            title: data.title,
            content: data.content,
            type: data.type,
            createdAt: new Date().toISOString(),
          },
          link: `/announcements/${announcementId}`,
          emit: true,
        });
      }
    }

    return { success: true, announcementId };
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
    // Récupérer l'ancienne annonce avant mise à jour
    const oldAnnouncement = await db.query.announcements.findFirst({
      where: (announcements, { eq }) => eq(announcements.id, id),
    });

    await db
      .update(announcements)
      .set(data)
      .where(eq(announcements.id, id));

    // Si l'annonce passe en publiée (et ne l'était pas avant), créer les notifications
    if (data.isPublished === true && oldAnnouncement && !oldAnnouncement.isPublished) {
      const updatedAnnouncement = await db.query.announcements.findFirst({
        where: (announcements, { eq }) => eq(announcements.id, id),
      });

      if (updatedAnnouncement) {
        const allUsers = await db.query.users.findMany();
        
        const typeEmojis: Record<string, string> = {
          info: '📋',
          update: '🚀',
          alert: '⚠️'
        };

        for (const user of allUsers) {
          await createNotification({
            userId: user.id,
            type: "announcement:new",
            title: `${typeEmojis[updatedAnnouncement.type] || '📢'} ${updatedAnnouncement.title}`,
            message: updatedAnnouncement.content.substring(0, 100) + (updatedAnnouncement.content.length > 100 ? '...' : ''),
            payload: {
              id: updatedAnnouncement.id,
              title: updatedAnnouncement.title,
              content: updatedAnnouncement.content,
              type: updatedAnnouncement.type,
              createdAt: updatedAnnouncement.createdAt.toISOString(),
            },
            link: `/announcements/${updatedAnnouncement.id}`,
            emit: true,
          });
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
