import { db } from './db';
import { notificationPreferences } from './db/schema';
import { eq } from 'drizzle-orm';

export async function getPreferencesForUser(userId: string): Promise<Record<string, any>> {
  try {
    const [row] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1).catch(() => []);
    return (row?.prefs as Record<string, any>) || {};
  } catch (e) {
    console.warn('getPreferencesForUser error', e);
    return {};
  }
}

export async function setPreferencesForUser(userId: string, prefs: Record<string, any>) {
  try {
    const [existing] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1).catch(() => []);
    if (existing) {
      await db.update(notificationPreferences).set({ prefs }).where(eq(notificationPreferences.userId, userId));
      return true;
    }
    await db.insert(notificationPreferences).values({ id: `np-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, userId, prefs });
    return true;
  } catch (e) {
    console.warn('setPreferencesForUser error', e);
    return false;
  }
}

export default { getPreferencesForUser, setPreferencesForUser };
