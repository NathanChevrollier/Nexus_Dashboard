import { test, expect, APIRequestContext, Browser } from '@playwright/test';
import { signInAndGetCookie, applyCookieToContext } from '../helpers/auth';

test.describe('Chat integration', () => {
  test('register two users, create conversation and send message (API-driven)', async ({ request, browser, baseURL }: { request: APIRequestContext; browser: Browser; baseURL?: string }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || baseURL || 'http://localhost:3000';

    const emailA = `e2e-a+${Date.now()}@example.test`;
    const emailB = `e2e-b+${Date.now()}@example.test`;
    const password = 'password123';

    // Register users
    const r1 = await request.post(`${base}/api/auth/register`, { data: { name: 'E2E A', email: emailA, password } });
    expect([200,201]).toContain(r1.status());
    const r2 = await request.post(`${base}/api/auth/register`, { data: { name: 'E2E B', email: emailB, password } });
    expect([200,201]).toContain(r2.status());

    // Sign in user A and obtain cookies
    const cookieHeaderA = await signInAndGetCookie(request, base, emailA, password);
    // Use a browser context to perform authenticated API calls via page
    const ctxA = await browser.newContext();
    await applyCookieToContext(ctxA, cookieHeaderA, base);
    const pageA = await ctxA.newPage();

    // Retrieve session for user A to get id
    const sessionA = await pageA.evaluate(async () => fetch('/api/auth/session').then(r => r.json()).catch(() => null));
    expect(sessionA).not.toBeNull();
    const userAId = sessionA.user.id;

    // Sign in user B to obtain id
    const cookieHeaderB = await signInAndGetCookie(request, base, emailB, password);
    const ctxB = await browser.newContext();
    await applyCookieToContext(ctxB, cookieHeaderB, base);
    const pageB = await ctxB.newPage();
    const sessionB = await pageB.evaluate(async () => fetch('/api/auth/session').then(r => r.json()).catch(() => null));
    expect(sessionB).not.toBeNull();
    const userBId = sessionB.user.id;

    // Create a conversation as A with B
    const convRes = await pageA.evaluate(async (uB: any) => {
      const res = await fetch('/api/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantIds: [uB] }) });
      return res.ok ? res.json() : { error: true, status: res.status };
    }, userBId);
    expect(convRes).toHaveProperty('id');
    const convId = convRes.id;

    // Send a message as A
    const messageRes = await pageA.evaluate(async (cid: any) => {
      const res = await fetch(`/api/chat/conversations/${cid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'Hello from A' }) });
      return res.ok ? res.json() : { error: true, status: res.status };
    }, convId);
    expect(messageRes).toHaveProperty('id');

    // Fetch messages as B via pageB to ensure persistence
    const messages = await pageB.evaluate(async (cid: any) => {
      const res = await fetch(`/api/chat/conversations/${cid}/messages?limit=50`);
      return res.ok ? res.json() : [];
    }, convId);
    expect(messages.some((m: any) => m.content && m.content.includes('Hello from A'))).toBeTruthy();

    await ctxA.close();
    await ctxB.close();
  });
});
