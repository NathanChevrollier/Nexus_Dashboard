// Helpers to resolve brand logo SVG URLs using Simple Icons CDN
// Usage: import { getIconUrlForLink } from '@/lib/api/logos'

export const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';

const DOMAIN_SLUG_OVERRIDES: Record<string, string> = {
  'twitch.tv': 'twitch',
  'www.twitch.tv': 'twitch',
  'netflix.com': 'netflix',
  'www.netflix.com': 'netflix',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'github.com': 'github',
  'www.github.com': 'github',
  'discord.com': 'discord',
  'www.discord.com': 'discord',
  'twitter.com': 'twitter',
  'www.twitter.com': 'twitter',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
};

function hostnameToSlug(hostname: string): string | null {
  if (!hostname) return null;
  if (DOMAIN_SLUG_OVERRIDES[hostname]) return DOMAIN_SLUG_OVERRIDES[hostname];
  // naive fallback: take first label (e.g. music.youtube.com -> music)
  const parts = hostname.split('.');
  // Try to take second-level domain: example 'something.co.uk' -> 'something'
  if (parts.length >= 2) {
    const sld = parts[parts.length - 2];
    return sld;
  }
  return hostname;
}

export function getSimpleIconCdnUrlBySlug(slug: string) {
  if (!slug) return null;
  // Simple Icons CDN: https://cdn.simpleicons.org/{slug}
  return `${SIMPLE_ICONS_CDN}/${encodeURIComponent(slug)}`;
}

export function getIconUrlForLink(href?: string | null): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://example.invalid');
    const hostname = url.hostname.toLowerCase();
    const slug = hostnameToSlug(hostname);
    if (!slug) return null;
    return getSimpleIconCdnUrlBySlug(slug);
  } catch (e) {
    // If it's not a full URL, try to extract domain-like string
    const match = href.match(/([a-z0-9-]+)\./i);
    const slug = match ? match[1].toLowerCase() : null;
    return slug ? getSimpleIconCdnUrlBySlug(slug) : null;
  }
}

export default {
  getIconUrlForLink,
  getSimpleIconCdnUrlBySlug,
};
