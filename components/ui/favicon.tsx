"use client";

import { useEffect } from "react";

export default function FaviconManager() {
  useEffect(() => {
    try {
      const ensureLink = (rel: string, href: string, type?: string) => {
        let el = document.querySelector(`link[rel="${rel}"]`);
        if (!el) {
          el = document.createElement("link");
          el.setAttribute("rel", rel);
          document.head.appendChild(el);
        }
        el.setAttribute("href", href);
        if (type) el.setAttribute("type", type);
      };

      // Primary SVG favicon
      ensureLink("icon", "/favicon.svg", "image/svg+xml");
      // Alternate for older browsers
      ensureLink("alternate icon", "/favicon.svg");
      // Apple touch
      ensureLink("apple-touch-icon", "/favicon.svg");
    } catch (e) {
      // no-op
      // eslint-disable-next-line no-console
      console.error('FaviconManager error', e);
    }
  }, []);

  return null;
}
