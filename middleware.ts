/**
 * Middleware Next.js pour la sécurité
 * Ajoute les headers de sécurité et implémente CSP
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Générer un nonce unique pour CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const socketEnv = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || process.env.SOCKET_SERVER_URL || '';
  const socketOrigin = socketEnv || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4001' : '');
  // Derive ws/wss forms for CSP (browsers enforce ws/wss for WebSocket connections)
  let socketConnectSources = '';
  if (socketOrigin) {
    try {
      const url = new URL(socketOrigin);
      const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsOrigin = `${wsProto}//${url.host}`;
      socketConnectSources = `${socketOrigin} ${wsOrigin}`;
    } catch (e) {
      // If URL parsing fails, just use the socketOrigin as-is + add ws variant
      socketConnectSources = socketOrigin;
    }
  }
  // In development, always allow localhost socket origins to be safe
  if (process.env.NODE_ENV !== 'production') {
    socketConnectSources += ' http://localhost:4001 ws://localhost:4001 wss://localhost:4001';
  }

  // Also allow localhost socket origins just in case the client attempts to connect
  // to a local socket server (some deployments or docker setups use localhost).
  if (!socketConnectSources.includes('localhost')) {
    socketConnectSources += ' http://localhost:4001 ws://localhost:4001 wss://localhost:4001';
  }

  // Content Security Policy
  // Allow configuring iframe sources via env var (comma-separated list)
  let iframeAllowlistRaw =
    process.env.NEXT_PUBLIC_IFRAME_ALLOWLIST || process.env.IFRAME_ALLOWLIST || '';

  // If no env var provided, try fetching the dynamic allowlist from internal API
  // Use an in-memory cache on the Node process to avoid fetching on every request.
  // This avoids recursive middleware fetches and reduces latency.
  if (!iframeAllowlistRaw) {
    try {
      const CACHE_TTL = parseInt(
        process.env.NEXT_PUBLIC_IFRAME_ALLOWLIST_TTL_MS || '300000',
        10
      ); // default 5 minutes
      type CacheEntry = { value: string; ts: number };
      const globalKey = '__IFRAME_ALLOWLIST_CACHE__';
      const now = Date.now();

      const cached = (globalThis as any)[globalKey] as CacheEntry | undefined;
      if (cached && now - cached.ts < CACHE_TTL) {
        iframeAllowlistRaw = cached.value;
      } else {
        const pathname = request.nextUrl?.pathname || '';
        // Skip fetching when middleware is executing for an API route or _next resources
        if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
          const origin = request.nextUrl?.origin || '';
          if (origin) {
            const res = await fetch(`${origin}/api/iframe/allowlist`);
            if (res.ok) {
              const body = await res.json();
              if (body && Array.isArray(body.origins)) {
                iframeAllowlistRaw = body.origins.join(',');
                try {
                  (globalThis as any)[globalKey] = { value: iframeAllowlistRaw, ts: now };
                } catch (e) {
                  // ignore attempts to write non-writable globals in some runtimes
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore - fallback to empty
      console.error('Middleware: could not fetch dynamic iframe allowlist', e);
    }
  }
  const iframeAllowlist = iframeAllowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        const u = new URL(s);
        return `${u.protocol}//${u.host}`;
      } catch (e) {
        // If no protocol provided, assume https by default
        return s.includes('://') ? s : `https://${s}`;
      }
    })
    .join(' ');

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${
      process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"
    };
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://openweathermap.org https://s4.anilist.co https://media.kitsu.io https://image.tmdb.org;
    font-src 'self';
    connect-src 'self' https://openweathermap.org https://graphql.anilist.co ${socketConnectSources} http://localhost:4001 ws://localhost:4001 wss://localhost:4001 data: blob:;
    frame-src 'self' https://www.youtube.com https://player.vimeo.com https://codesandbox.io ${iframeAllowlist};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests;' : ''}
  `.replace(/\s{2,}/g, ' ').trim();

  // Créer la réponse avec les headers de sécurité
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Security Headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  // HSTS (uniquement en production avec HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Passer le nonce pour l'utiliser dans les scripts
  response.headers.set('x-nonce', nonce);
  // Exposer le nonce au rendu côté serveur via un cookie non HttpOnly
  // (le layout server peut lire ce cookie avec `cookies()`)
  response.cookies.set('csp-nonce', nonce, { httpOnly: false, path: '/' });

  return response;
}

// Configurer les routes où le middleware s'applique
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf:
     * - api/auth (NextAuth)
     * - api/health (pour les healthchecks)
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - admin (page admin)
     */
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|admin).*)',
  ],
};
