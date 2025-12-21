import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./themes-glassmorphism.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexus Dashboard",
  description: "Dashboard auto-hébergé moderne avec personnalisation avancée",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
