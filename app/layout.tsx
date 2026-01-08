import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./themes-glassmorphism.css";
import { Providers } from "@/components/providers";
import { cookies } from 'next/headers';

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Nexus Dashboard",
  description: "Dashboard auto-hébergé moderne avec personnalisation avancée",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Lire le nonce CSP depuis le cookie injecté par le middleware
  const cookieStore = await cookies();
  const nonce = cookieStore.get?.('csp-nonce')?.value ?? '';
  return (
    <html lang="fr" suppressHydrationWarning className="overflow-hidden h-full">
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function initTheme() {
                    try {
                      const theme = localStorage.getItem('nexus-theme') || 'dark';
                      const primaryColor = localStorage.getItem('nexus-primary-color') || '#3b82f6';
                      const backgroundColor = localStorage.getItem('nexus-background-color') || '#171717';
                      const borderRadius = localStorage.getItem('nexus-border-radius') || '8';
                      const backgroundImage = localStorage.getItem('nexus-background-image') || '';
                      const gradientPreset = localStorage.getItem('nexus-gradient-preset') || 'none';

                      const root = document.documentElement;
                      const body = document.body;
                      if (!root || !body) return; // defensive

                      // Apply theme classes immediately
                      if (theme.startsWith('cyber')) {
                        root.classList.add('cyber');
                        body.classList.add('cyber');
                        if (theme === 'cyber-matrix') body.classList.add('matrix');
                        else if (theme === 'cyber-synthwave') body.classList.add('synthwave');
                        else if (theme === 'cyber-arctic') body.classList.add('arctic');
                      } else {
                        root.classList.add(theme);
                        body.classList.add(theme);
                      }

                      // Apply CSS variables immediately
                      root.style.setProperty('--primary', primaryColor);
                      root.style.setProperty('--background', backgroundColor);
                      root.style.setProperty('--radius', borderRadius + 'px');

                      // Apply gradient
                      const gradients = {
                        aurora: 'linear-gradient(135deg, #00F260 0%, #0575E6 50%, #8E2DE2 100%)',
                        sunset: 'linear-gradient(135deg, #FF6B6B 0%, #FFD93D 50%, #6BCB77 100%)',
                        ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        forest: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
                        fire: 'linear-gradient(135deg, #f12711 0%, #f5af19 50%, #6BCB77 100%)',
                        'purple-haze': 'linear-gradient(135deg, #360033 0%, #0b8793 100%)'
                      };

                      if (gradientPreset !== 'none' && gradients[gradientPreset]) {
                        body.style.background = gradients[gradientPreset];
                        body.style.backgroundAttachment = 'fixed';
                      } else if (backgroundImage) {
                        body.style.backgroundImage = 'url(' + backgroundImage + ')';
                      }
                    } catch (err) {
                      console.error('Theme init inner error:', err);
                    }
                  }

                  if (document.body) {
                    initTheme();
                  } else {
                    document.addEventListener('DOMContentLoaded', initTheme);
                  }
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className={`${inter.className} overflow-hidden h-full`} suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
