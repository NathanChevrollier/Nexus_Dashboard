import { APIRequestContext, BrowserContext } from '@playwright/test';
import { URLSearchParams } from 'url';

export async function signInAndGetCookie(request: APIRequestContext, base: string, email: string, password: string) {
  // Get CSRF token
  const csrfRes = await request.get(`${base}/api/auth/csrf`);
  const csrf = (await csrfRes.json()).csrfToken;

  const params = new URLSearchParams();
  params.append('csrfToken', csrf);
  params.append('email', email);
  params.append('password', password);

  const resp = await request.post(`${base}/api/auth/callback/credentials`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    // allow manual redirect handling
    maxRedirects: 0,
  }).catch((e: any) => e);

  // Playwright's request.post may throw for 3xx; attempt a second approach
  let setCookieHeader = '';
  try {
    const headers = resp.headers();
    setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'] || '';
  } catch (e: any) {
    // If resp is an Error wrapper, try to extract response
    if ((resp as any).response) {
      const headers = (resp as any).response.headers();
      setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'] || '';
    }
  }

  // Build cookie header string usable in subsequent requests
  if (!setCookieHeader) {
    // Fallback: attempt sign-in via JSON (some setups support ?json=1)
    const alt = await request.post(`${base}/api/auth/callback/credentials?json=1`, {
      data: { csrfToken: csrf, email, password },
    });
    const altHeaders = alt.headers();
    setCookieHeader = altHeaders['set-cookie'] || altHeaders['Set-Cookie'] || '';
  }

  // Normalize to single cookie header string
  if (Array.isArray(setCookieHeader)) setCookieHeader = setCookieHeader.join('; ');
  return setCookieHeader || '';
}

export async function applyCookieToContext(context: BrowserContext, cookieHeader: string, baseUrl: string) {
  if (!cookieHeader) return;
  const parts = cookieHeader.split(/, (?=[^;]+=)/); // split multiple cookies
  const url = new URL(baseUrl);
  const cookies = parts.map((c) => {
    const [pair, ...flags] = c.split(';').map(s => s.trim());
    const [name, ...valParts] = pair.split('=');
    const value = valParts.join('=');
    const cookie: any = { name, value, domain: url.hostname, path: '/', httpOnly: false, secure: false };
    for (const f of flags) {
      if (/^HttpOnly$/i.test(f)) cookie.httpOnly = true;
      if (/^Secure$/i.test(f)) cookie.secure = true;
      const m = f.match(/^Expires=(.+)$/i);
      if (m) cookie.expires = Math.floor(new Date(m[1]).getTime() / 1000);
    }
    return cookie;
  });
  await context.addCookies(cookies as any);
}
