/**
 * Permissions disponibles dans l'application Nexus Dashboard
 * Ces permissions sont utilisées pour le contrôle d'accès basé sur les rôles (RBAC)
 */

export interface Permission {
  key: string;
  label: string;
  description: string;
  category: 'Admin' | 'Library' | 'Widget' | 'Dashboard' | 'Integration' | 'General';
  dependsOn?: string[]; // Permissions qui doivent être activées si celle-ci est activée
}

// Dépendances de permissions: si une permission est activée, ses dépendances doivent l'être aussi
export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  'MANAGE_USERS': ['ACCESS_ADMIN'],
  'MANAGE_ANNOUNCEMENTS': ['ACCESS_ADMIN'],
  'MANAGE_IFRAME_ALLOWLIST': ['ACCESS_ADMIN'],
  'VIEW_SYSTEM_LOGS': ['ACCESS_ADMIN'],
};

export const AVAILABLE_PERMISSIONS: Permission[] = [
  // ====== ADMIN PERMISSIONS ======
  {
    key: 'ACCESS_ADMIN',
    label: 'Accès à l\'administration',
    description: 'Permet d\'accéder au panel d\'administration',
    category: 'Admin',
  },
  {
    key: 'MANAGE_USERS',
    label: 'Gérer les utilisateurs',
    description: 'Bannir, supprimer ou modifier les rôles des utilisateurs',
    category: 'Admin',
  },
  {
    key: 'MANAGE_ANNOUNCEMENTS',
    label: 'Gérer les annonces',
    description: 'Créer, modifier et publier des annonces globales',
    category: 'Admin',
  },
  {
    key: 'MANAGE_IFRAME_ALLOWLIST',
    label: 'Gérer la liste blanche iFrame',
    description: 'Approuver ou refuser les requêtes d\'iframes',
    category: 'Admin',
  },
  {
    key: 'VIEW_SYSTEM_LOGS',
    label: 'Voir les logs système',
    description: 'Accéder aux logs et diagnostics du système',
    category: 'Admin',
  },

  // ====== LIBRARY PERMISSIONS ======
  {
    key: 'REQUEST_MEDIA',
    label: 'Requêter des médias',
    description: 'Faire des demandes de films, séries ou musiques',
    category: 'Library',
  },
  {
    key: 'ACCESS_LIBRARY',
    label: 'Accès à la bibliothèque',
    description: 'Consulter et lire la bibliothèque média',
    category: 'Library',
  },
  {
    key: 'MANAGE_LIBRARY',
    label: 'Gérer la bibliothèque',
    description: 'Ajouter, modifier ou supprimer des items de la bibliothèque',
    category: 'Library',
  },
  {
    key: 'UPLOAD_MEDIA',
    label: 'Téléverser des médias',
    description: 'Uploader des fichiers médias sur le serveur',
    category: 'Library',
  },

  // ====== WIDGET PERMISSIONS ======
  {
    key: 'CREATE_WIDGETS',
    label: 'Créer des widgets',
    description: 'Ajouter de nouveaux widgets aux dashboards',
    category: 'Widget',
  },
  {
    key: 'MANAGE_WIDGETS',
    label: 'Gérer les widgets',
    description: 'Modifier ou supprimer des widgets existants',
    category: 'Widget',
  },
  
  // Widgets individuels
  {
    key: 'USE_LINK_WIDGET',
    label: 'Widget: Lien',
    description: 'Créer des widgets de liens rapides',
    category: 'Widget',
  },
  {
    key: 'USE_PING_WIDGET',
    label: 'Widget: Ping/Status',
    description: 'Surveiller la disponibilité des serveurs',
    category: 'Widget',
  },
  {
    key: 'USE_LINK_PING_WIDGET',
    label: 'Widget: Lien+',
    description: 'Liens avec surveillance de disponibilité',
    category: 'Widget',
  },
  {
    key: 'USE_IFRAME_WIDGET',
    label: 'Widget: iFrame',
    description: 'Intégrer des pages web externes',
    category: 'Widget',
  },
  {
    key: 'USE_DATETIME_WIDGET',
    label: 'Widget: Date/Heure',
    description: 'Afficher l\'horloge et la date',
    category: 'Widget',
  },
  {
    key: 'USE_WEATHER_WIDGET',
    label: 'Widget: Météo',
    description: 'Consulter la météo en temps réel',
    category: 'Widget',
  },
  {
    key: 'USE_NOTES_WIDGET',
    label: 'Widget: Notes',
    description: 'Prendre des notes rapides',
    category: 'Widget',
  },
  {
    key: 'USE_CHART_WIDGET',
    label: 'Widget: Graphiques',
    description: 'Créer des graphiques et statistiques',
    category: 'Widget',
  },
  {
    key: 'USE_ANIME_CALENDAR_WIDGET',
    label: 'Widget: Calendrier Anime',
    description: 'Suivre les sorties anime/manga',
    category: 'Widget',
  },
  {
    key: 'USE_TODO_LIST_WIDGET',
    label: 'Widget: Todo List',
    description: 'Gérer des listes de tâches',
    category: 'Widget',
  },
  {
    key: 'USE_WATCHLIST_WIDGET',
    label: 'Widget: Watchlist',
    description: 'Lister films/séries à voir',
    category: 'Widget',
  },
  {
    key: 'USE_TIMER_WIDGET',
    label: 'Widget: Timer/Pomodoro',
    description: 'Minuteur et technique Pomodoro',
    category: 'Widget',
  },
  {
    key: 'USE_BOOKMARKS_WIDGET',
    label: 'Widget: Favoris',
    description: 'Organiser ses favoris web',
    category: 'Widget',
  },
  {
    key: 'USE_QUOTE_WIDGET',
    label: 'Widget: Citations',
    description: 'Afficher des citations inspirantes',
    category: 'Widget',
  },
  {
    key: 'USE_COUNTDOWN_WIDGET',
    label: 'Widget: Compte à rebours',
    description: 'Compter jusqu\'à un événement',
    category: 'Widget',
  },
  {
    key: 'USE_UNIVERSAL_CALENDAR_WIDGET',
    label: 'Widget: Calendrier Universel',
    description: 'Vue unifiée de tous les événements',
    category: 'Widget',
  },
  {
    key: 'USE_MOVIES_TV_CALENDAR_WIDGET',
    label: 'Widget: Films & Séries',
    description: 'Calendrier des sorties cinéma/TV',
    category: 'Widget',
  },
  {
    key: 'USE_MEDIA_REQUESTS_WIDGET',
    label: 'Widget: Requêtes Média',
    description: 'Gérer les requêtes Overseerr',
    category: 'Widget',
  },
  {
    key: 'USE_TORRENT_OVERVIEW_WIDGET',
    label: 'Widget: Torrents',
    description: 'Surveiller les téléchargements',
    category: 'Widget',
  },
  {
    key: 'USE_MONITORING_WIDGET',
    label: 'Widget: Monitoring',
    description: 'Surveiller les ressources système',
    category: 'Widget',
  },
  {
    key: 'USE_MEDIA_LIBRARY_WIDGET',
    label: 'Widget: Médiathèque',
    description: 'Accéder à la bibliothèque média',
    category: 'Widget',
  },
  {
    key: 'USE_LIBRARY_WIDGET',
    label: 'Widget: Bibliothèque',
    description: 'Gérer sa bibliothèque personnelle',
    category: 'Widget',
  },
  {
    key: 'USE_GAMES_WIDGET',
    label: 'Widget: Jeux',
    description: 'Accéder aux mini-jeux',
    category: 'Widget',
  },
  {
    key: 'USE_GAME_LEADERBOARD_WIDGET',
    label: 'Widget: Classement Jeux',
    description: 'Voir les meilleurs scores',
    category: 'Widget',
  },

  // ====== DASHBOARD PERMISSIONS ======
  {
    key: 'CREATE_DASHBOARDS',
    label: 'Créer des dashboards',
    description: 'Créer de nouveaux dashboards personnalisés',
    category: 'Dashboard',
  },
  {
    key: 'SHARE_DASHBOARDS',
    label: 'Partager des dashboards',
    description: 'Partager ses dashboards avec d\'autres utilisateurs',
    category: 'Dashboard',
  },
  {
    key: 'EXPORT_DASHBOARDS',
    label: 'Exporter des dashboards',
    description: 'Exporter la configuration de ses dashboards',
    category: 'Dashboard',
  },
  {
    key: 'IMPORT_DASHBOARDS',
    label: 'Importer des dashboards',
    description: 'Importer des configurations de dashboards',
    category: 'Dashboard',
  },
  {
    key: 'USE_PUBLIC_DASHBOARDS',
    label: 'Créer des dashboards publics',
    description: 'Rendre ses dashboards accessibles publiquement',
    category: 'Dashboard',
  },

  // ====== INTEGRATION PERMISSIONS ======
  {
    key: 'CONFIGURE_INTEGRATIONS',
    label: 'Configurer les intégrations',
    description: 'Connecter et configurer des services externes (Overseerr, Jellyfin, etc.)',
    category: 'Integration',
  },
  {
    key: 'USE_INTEGRATIONS',
    label: 'Utiliser les intégrations',
    description: 'Accéder aux fonctionnalités des intégrations configurées',
    category: 'Integration',
  },

  // ====== GENERAL PERMISSIONS ======
  {
    key: 'BYPASS_LIMITS',
    label: 'Contourner les limites',
    description: 'Ignorer les limites de widgets, dashboards ou requêtes',
    category: 'General',
  },
  {
    key: 'ACCESS_API',
    label: 'Accès à l\'API',
    description: 'Utiliser l\'API REST pour des intégrations externes',
    category: 'General',
  },
  {
    key: 'USE_CHAT',
    label: 'Utiliser le chat',
    description: 'Accéder au système de chat et notifications en temps réel',
    category: 'General',
  },
  {
    key: 'CUSTOMIZE_THEME',
    label: 'Personnaliser le thème',
    description: 'Modifier l\'apparence et les thèmes de ses dashboards',
    category: 'General',
  },
];

/**
 * Configuration des permissions par défaut pour chaque rôle
 * Ces valeurs seront utilisées pour initialiser la base de données
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<'USER' | 'VIP' | 'ADMIN', string[]> = {
  USER: [
    'ACCESS_LIBRARY',
    'CREATE_WIDGETS',
    'MANAGE_WIDGETS',
    'CREATE_DASHBOARDS',
    'EXPORT_DASHBOARDS',
    'IMPORT_DASHBOARDS',
    'USE_INTEGRATIONS',
    'USE_CHAT',
    'CUSTOMIZE_THEME',
    // Widgets de base
    'USE_LINK_WIDGET',
    'USE_DATETIME_WIDGET',
    'USE_NOTES_WIDGET',
    'USE_TODO_LIST_WIDGET',
    'USE_BOOKMARKS_WIDGET',
    'USE_QUOTE_WIDGET',
    'USE_COUNTDOWN_WIDGET',
    'USE_TIMER_WIDGET',
  ],
  VIP: [
    'ACCESS_LIBRARY',
    'REQUEST_MEDIA',
    'CREATE_WIDGETS',
    'MANAGE_WIDGETS',
    'CREATE_DASHBOARDS',
    'SHARE_DASHBOARDS',
    'EXPORT_DASHBOARDS',
    'IMPORT_DASHBOARDS',
    'USE_PUBLIC_DASHBOARDS',
    'CONFIGURE_INTEGRATIONS',
    'USE_INTEGRATIONS',
    'USE_CHAT',
    'CUSTOMIZE_THEME',
    // Tous les widgets
    'USE_LINK_WIDGET',
    'USE_PING_WIDGET',
    'USE_LINK_PING_WIDGET',
    'USE_IFRAME_WIDGET',
    'USE_DATETIME_WIDGET',
    'USE_WEATHER_WIDGET',
    'USE_NOTES_WIDGET',
    'USE_CHART_WIDGET',
    'USE_ANIME_CALENDAR_WIDGET',
    'USE_TODO_LIST_WIDGET',
    'USE_WATCHLIST_WIDGET',
    'USE_TIMER_WIDGET',
    'USE_BOOKMARKS_WIDGET',
    'USE_QUOTE_WIDGET',
    'USE_COUNTDOWN_WIDGET',
    'USE_UNIVERSAL_CALENDAR_WIDGET',
    'USE_MOVIES_TV_CALENDAR_WIDGET',
    'USE_MEDIA_REQUESTS_WIDGET',
    'USE_TORRENT_OVERVIEW_WIDGET',
    'USE_MONITORING_WIDGET',
    'USE_MEDIA_LIBRARY_WIDGET',
    'USE_LIBRARY_WIDGET',
    'USE_GAMES_WIDGET',
    'USE_GAME_LEADERBOARD_WIDGET',
  ],
  ADMIN: [
    // Admins ont toutes les permissions
    'ACCESS_ADMIN',
    'MANAGE_USERS',
    'MANAGE_ANNOUNCEMENTS',
    'MANAGE_IFRAME_ALLOWLIST',
    'VIEW_SYSTEM_LOGS',
    'REQUEST_MEDIA',
    'ACCESS_LIBRARY',
    'MANAGE_LIBRARY',
    'UPLOAD_MEDIA',
    'CREATE_WIDGETS',
    'MANAGE_WIDGETS',
    'CREATE_DASHBOARDS',
    'SHARE_DASHBOARDS',
    'EXPORT_DASHBOARDS',
    'IMPORT_DASHBOARDS',
    'USE_PUBLIC_DASHBOARDS',
    'CONFIGURE_INTEGRATIONS',
    'USE_INTEGRATIONS',
    'BYPASS_LIMITS',
    'ACCESS_API',
    'USE_CHAT',
    'CUSTOMIZE_THEME',
    // Tous les widgets
    'USE_LINK_WIDGET',
    'USE_PING_WIDGET',
    'USE_LINK_PING_WIDGET',
    'USE_IFRAME_WIDGET',
    'USE_DATETIME_WIDGET',
    'USE_WEATHER_WIDGET',
    'USE_NOTES_WIDGET',
    'USE_CHART_WIDGET',
    'USE_ANIME_CALENDAR_WIDGET',
    'USE_TODO_LIST_WIDGET',
    'USE_WATCHLIST_WIDGET',
    'USE_TIMER_WIDGET',
    'USE_BOOKMARKS_WIDGET',
    'USE_QUOTE_WIDGET',
    'USE_COUNTDOWN_WIDGET',
    'USE_UNIVERSAL_CALENDAR_WIDGET',
    'USE_MOVIES_TV_CALENDAR_WIDGET',
    'USE_MEDIA_REQUESTS_WIDGET',
    'USE_TORRENT_OVERVIEW_WIDGET',
    'USE_MONITORING_WIDGET',
    'USE_MEDIA_LIBRARY_WIDGET',
    'USE_LIBRARY_WIDGET',
    'USE_GAMES_WIDGET',
    'USE_GAME_LEADERBOARD_WIDGET',
  ],
};

/**
 * Obtenir toutes les permissions d'une catégorie
 */
export function getPermissionsByCategory(category: Permission['category']): Permission[] {
  return AVAILABLE_PERMISSIONS.filter(p => p.category === category);
}

/**
 * Obtenir une permission par sa clé
 */
export function getPermissionByKey(key: string): Permission | undefined {
  return AVAILABLE_PERMISSIONS.find(p => p.key === key);
}

/**
 * Obtenir toutes les catégories uniques
 */
export function getCategories(): Permission['category'][] {
  return Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));
}
