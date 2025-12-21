"use client";

interface ThemeSettingsProps {
  user: {
    role: "USER" | "VIP" | "ADMIN";
  };
  dashboardId: string;
}

export function ThemeSettings({ user, dashboardId }: ThemeSettingsProps) {
  // Ce fichier est obsolète - utiliser ThemeSettingsEnhanced à la place
  return null;
}
