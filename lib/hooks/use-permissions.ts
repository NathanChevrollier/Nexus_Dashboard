"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants/permissions";
import type { Role } from "@/lib/actions/permissions";

/**
 * Hook client pour vérifier les permissions de l'utilisateur
 * Note: Ce hook utilise les permissions par défaut + celles en cache
 * Pour une vérification serveur plus sûre, utilisez les fonctions dans @/lib/actions/permissions
 */
export function usePermissions() {
  const { data: session } = useSession();
  const role = (session?.user?.role || 'USER') as Role;
  const isOwner = session?.user?.isOwner || false;

  const permissions = useMemo(() => {
    // Le owner a toutes les permissions
    if (isOwner) {
      return new Set(DEFAULT_ROLE_PERMISSIONS.ADMIN);
    }
    
    // Pour les autres, utiliser les permissions par défaut du rôle
    return new Set(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.USER);
  }, [role, isOwner]);

  const hasPermission = (permissionKey: string): boolean => {
    if (isOwner) return true;
    return permissions.has(permissionKey);
  };

  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    if (isOwner) return true;
    return permissionKeys.some(key => permissions.has(key));
  };

  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    if (isOwner) return true;
    return permissionKeys.every(key => permissions.has(key));
  };

  return {
    role,
    isOwner,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: role === 'ADMIN',
    isVIP: role === 'VIP',
    isUser: role === 'USER',
  };
}

/**
 * Mapping des types de widgets vers leurs permissions
 */
export const WIDGET_TYPE_TO_PERMISSION: Record<string, string> = {
  'link': 'USE_LINK_WIDGET',
  'ping': 'USE_PING_WIDGET',
  'link-ping': 'USE_LINK_PING_WIDGET',
  'iframe': 'USE_IFRAME_WIDGET',
  'datetime': 'USE_DATETIME_WIDGET',
  'weather': 'USE_WEATHER_WIDGET',
  'notes': 'USE_NOTES_WIDGET',
  'chart': 'USE_CHART_WIDGET',
  'anime-calendar': 'USE_ANIME_CALENDAR_WIDGET',
  'todo-list': 'USE_TODO_LIST_WIDGET',
  'watchlist': 'USE_WATCHLIST_WIDGET',
  'timer': 'USE_TIMER_WIDGET',
  'bookmarks': 'USE_BOOKMARKS_WIDGET',
  'quote': 'USE_QUOTE_WIDGET',
  'countdown': 'USE_COUNTDOWN_WIDGET',
  'universal-calendar': 'USE_UNIVERSAL_CALENDAR_WIDGET',
  'movies-tv-calendar': 'USE_MOVIES_TV_CALENDAR_WIDGET',
  'media-requests': 'USE_MEDIA_REQUESTS_WIDGET',
  'torrent-overview': 'USE_TORRENT_OVERVIEW_WIDGET',
  'monitoring': 'USE_MONITORING_WIDGET',
  'media-library': 'USE_MEDIA_LIBRARY_WIDGET',
  'library': 'USE_LIBRARY_WIDGET',
  'games': 'USE_GAMES_WIDGET',
  'game-leaderboard': 'USE_GAME_LEADERBOARD_WIDGET',
};

/**
 * Hook pour vérifier si l'utilisateur peut utiliser un type de widget spécifique
 */
export function useCanUseWidget(widgetType: string): boolean {
  const { hasPermission } = usePermissions();
  
  const permissionKey = WIDGET_TYPE_TO_PERMISSION[widgetType];
  if (!permissionKey) {
    // Si le widget n'a pas de permission définie, on autorise par défaut
    return true;
  }
  
  return hasPermission(permissionKey);
}
