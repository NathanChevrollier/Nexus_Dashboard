/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimiser les imports de packages
    optimizePackageImports: [
      'lucide-react',
      'react-chartjs-2',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
    ],
  },
  images: {
    // Formats modernes pour de meilleures performances
    formats: ['image/avif', 'image/webp'],
    // Restreindre les domaines autorisés pour la sécurité
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
      {
        protocol: 'https',
        hostname: 'media.kitsu.io',
      },
    ],
    // Cache les images pendant 24h
    minimumCacheTTL: 60 * 60 * 24,
  },
  // Compilation optimisée
  compiler: {
    // Supprimer les console.log en production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Headers de sécurité supplémentaires
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Download-Options',
            value: 'noopen'
          },
        ],
      },
    ];
  },
  // Redirections
  async redirects() {
    return [
      // (aucune redirection critique pour le moment)
    ];
  },
  output: 'standalone',
};

module.exports = nextConfig;
