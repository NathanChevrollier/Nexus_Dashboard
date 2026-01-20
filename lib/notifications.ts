import { db } from "./db";
import { notifications } from "./db/schema";
import { getPreferencesForUser } from './notificationPreferences';
import { emitToUser } from './socket';
import { eq, and, desc, inArray } from 'drizzle-orm';

export async function createNotification(opts: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  payload?: any;
  link?: string;
  emit?: boolean;
}) {
  const { userId, type, title, message, payload, link, emit = true } = opts;
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  try {
    await db.insert(notifications).values({
      id,
      userId,
      type,
      title,
      message: message || '',
      payload: payload || {},
      link: link || null,
      read: false,
    });
  } catch (e) {
    console.warn('Failed to persist notification', e);
  }
  // Check user preferences before emitting in-app (socket)
  try {
    const prefs = await getPreferencesForUser(userId).catch(() => ({} as Record<string, any>));
    const inAppPrefs = (prefs as Record<string, any>).inApp || {};
    const allowed = inAppPrefs.hasOwnProperty(type) ? !!inAppPrefs[type] : true;
    if (emit && allowed) {
      try {
        await emitToUser(userId, type, { ...payload, title, message, link, id, timestamp: Date.now() });
      } catch (e) {
        console.warn('Failed to emit notification to socket server', e);
      }
    }
  } catch (e) {
    console.warn('Failed to check preferences before emit', e);
  }

  return id;
}

export async function getUnreadNotificationsForUser(userId: string) {
  return await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(200);
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  try {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), inArray(notifications.id, ids)));
    return true;
  } catch (e) {
    console.warn('markNotificationsRead error', e);
    return false;
  }
}

export async function markAllReadForUser(userId: string) {
  try {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
    return true;
  } catch (e) {
    console.warn('markAllReadForUser error', e);
    return false;
  }
}

export default { createNotification, getUnreadNotificationsForUser, markNotificationsRead, markAllReadForUser };
