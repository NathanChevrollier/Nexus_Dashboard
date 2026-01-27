/**
 * Permissions disponibles dans l'application Nexus Dashboard
 * Ces permissions sont utilisées pour le contrôle d'accès basé sur les rôles (RBAC)
 */

export interface Permission {
  key: string;
  label: string;
  description: string;
  category: 'Admin' | 'Library' | 'Widget' | 'Dashboard' | 'Integration' | 'General';
}

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
  {
    key: 'USE_IFRAME_WIDGETS',
    label: 'Utiliser les widgets iFrame',
    description: 'Créer et afficher des widgets iFrame',
    category: 'Widget',
  },
  {
    key: 'USE_ADVANCED_WIDGETS',
    label: 'Utiliser les widgets avancés',
    description: 'Accès aux widgets avancés (Docker, monitoring, etc.)',
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
  ],
  VIP: [
    'ACCESS_LIBRARY',
    'REQUEST_MEDIA',
    'CREATE_WIDGETS',
    'MANAGE_WIDGETS',
    'USE_IFRAME_WIDGETS',
    'USE_ADVANCED_WIDGETS',
    'CREATE_DASHBOARDS',
    'SHARE_DASHBOARDS',
    'EXPORT_DASHBOARDS',
    'IMPORT_DASHBOARDS',
    'USE_PUBLIC_DASHBOARDS',
    'CONFIGURE_INTEGRATIONS',
    'USE_INTEGRATIONS',
    'USE_CHAT',
    'CUSTOMIZE_THEME',
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
    'USE_IFRAME_WIDGETS',
    'USE_ADVANCED_WIDGETS',
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
