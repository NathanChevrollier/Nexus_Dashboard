/**
 * Actions serveur pour gérer les événements du calendrier
 */

'use server';

import { db } from '@/lib/db';
import { calendarEvents, type NewCalendarEvent, type CalendarEvent } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { randomUUID } from 'crypto';

/**
 * Récupère tous les événements d'un utilisateur
 */
export async function getUserEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    let whereCondition = eq(calendarEvents.userId, session.user.id);

    // Filtrer par plage de dates si fournie
    if (startDate && endDate) {
      whereCondition = and(
        eq(calendarEvents.userId, session.user.id),
        gte(calendarEvents.startDate, startDate),
        lte(calendarEvents.startDate, endDate)
      ) as any;
    }

    const events = await db
      .select()
      .from(calendarEvents)
      .where(whereCondition)
      .orderBy(desc(calendarEvents.startDate));
    return events;
  } catch (error) {
    console.error('Error fetching user events:', error);
    throw new Error('Failed to fetch events');
  }
}

/**
 * Crée un nouvel événement
 */
export async function createEvent(eventData: Omit<NewCalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const newEvent: NewCalendarEvent = {
      id: randomUUID(),
      userId: session.user.id,
      ...eventData,
    };

    await db.insert(calendarEvents).values(newEvent);
    
    // Récupérer l'événement créé
    const [createdEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, newEvent.id));
    
    return createdEvent;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }
}

/**
 * Met à jour un événement existant
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<Omit<NewCalendarEvent, 'id' | 'userId'>>
): Promise<CalendarEvent> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    // Vérifier que l'événement appartient à l'utilisateur
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, eventId),
          eq(calendarEvents.userId, session.user.id)
        )
      );

    if (!existingEvent) {
      throw new Error('Event not found or unauthorized');
    }

    // Mettre à jour
    await db
      .update(calendarEvents)
      .set(updates)
      .where(eq(calendarEvents.id, eventId));

    // Récupérer l'événement mis à jour
    const [updatedEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    return updatedEvent;
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event');
  }
}

/**
 * Supprime un événement
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    // Vérifier que l'événement appartient à l'utilisateur
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, eventId),
          eq(calendarEvents.userId, session.user.id)
        )
      );

    if (!existingEvent) {
      throw new Error('Event not found or unauthorized');
    }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}

/**
 * Marque un événement comme complété/non complété
 */
export async function toggleEventComplete(eventId: string): Promise<CalendarEvent> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    // Récupérer l'événement actuel
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, eventId),
          eq(calendarEvents.userId, session.user.id)
        )
      );

    if (!event) {
      throw new Error('Event not found or unauthorized');
    }

    // Inverser le statut
    await db
      .update(calendarEvents)
      .set({ completed: !event.completed })
      .where(eq(calendarEvents.id, eventId));

    // Récupérer l'événement mis à jour
    const [updatedEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    return updatedEvent;
  } catch (error) {
    console.error('Error toggling event complete:', error);
    throw new Error('Failed to toggle event');
  }
}

/**
 * Récupère les événements pour une date spécifique
 */
export async function getEventsByDate(date: Date): Promise<CalendarEvent[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, session.user.id),
          gte(calendarEvents.startDate, startOfDay),
          lte(calendarEvents.startDate, endOfDay)
        )
      )
      .orderBy(calendarEvents.startDate);

    return events;
  } catch (error) {
    console.error('Error fetching events by date:', error);
    throw new Error('Failed to fetch events');
  }
}

/**
 * Récupère les événements à venir (prochains X jours)
 */
export async function getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, session.user.id),
          gte(calendarEvents.startDate, now),
          lte(calendarEvents.startDate, future),
          eq(calendarEvents.completed, false)
        )
      )
      .orderBy(calendarEvents.startDate);

    return events;
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    throw new Error('Failed to fetch upcoming events');
  }
}
