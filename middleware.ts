/**
 * Middleware Next.js pour la sécurité
 * Ajoute les headers de sécurité et implémente CSP
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Générer un nonce unique pour CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${
      process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"
    };
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://openweathermap.org https://s4.anilist.co https://media.kitsu.io;
    font-src 'self';
    connect-src 'self' https://openweathermap.org https://graphql.anilist.co;
    frame-src 'self' https://www.youtube.com https://player.vimeo.com https://codesandbox.io;
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
