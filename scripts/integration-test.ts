import 'dotenv/config';
import { createNotification, getUnreadNotificationsForUser } from '../lib/notifications';

async function run() {
  const testUserId = process.env.TEST_USER_ID || 'test-integration-user';
  console.log('Using TEST_USER_ID =', testUserId);

  const title = 'Integration test notification';
  const message = 'This is a test notification created by integration-test script.';

  try {
    const id = await createNotification({ userId: testUserId, type: 'test:integration', title, message, emit: false });
    console.log('Created notification id:', id);

    const unread = await getUnreadNotificationsForUser(testUserId);
    const found = unread.some((n: any) => n.id === id);

    if (found) {
      console.log('PASS: Notification persisted and returned by getUnreadNotificationsForUser');
      process.exit(0);
    } else {
      console.error('FAIL: Notification not found in unread results');
      console.error('Unread count:', unread.length);
      process.exit(2);
    }
  } catch (e) {
    console.error('ERROR running integration test', e);
    process.exit(3);
  }
}

run();
