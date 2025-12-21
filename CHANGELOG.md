# Changelog

All notable changes to the Nexus Dashboard project will be documented in this file.

## [2.0.0] - 2024-12-21

### Added
- **Universal Calendar Widget** : Calendrier complet avec 5 sources de données (Anime, Manga, Films, Séries TV, Événements personnels)
- **Movies & TV Calendar Widget** : Widget simplifié pour films et séries via TMDb API
- **TMDb API Integration** : Client complet pour l'API TMDb v3 avec 15+ fonctions
- **Calendar Events System** : CRUD complet pour événements personnels avec métadonnées
- **4 Cyber Themes** : Blue, Matrix, Synthwave, Arctic avec effets glassmorphism
- **7 Gradient Presets** : Aurora, Sunset, Ocean, Forest, Fire, Purple Haze, Space
- **Time-Based Themes** : Changement automatique du thème selon l'heure
- **Migration SQL** : Nouvelle table calendar_events avec index optimisés
- **shadcn/ui Components** : Ajout de scroll-area, select, textarea, skeleton
- **Scripts d'Installation** : setup.sh et setup.ps1 pour installation automatique
- **Scripts de Déploiement** : deploy.sh et deploy.ps1 pour déploiement Docker simplifié
- **Documentation Consolidée** : README.md complet avec toutes les informations

### Changed
- **Dockerfile** : Ajout de --legacy-peer-deps pour résoudre les conflits de dépendances
- **Docker Compose** : Ajout de NEXT_PUBLIC_TMDB_API_KEY dans les variables d'environnement
- **Theme Provider** : Extension avec nouvelles fonctionnalités (gradients, time-based)
- **Widget System** : Enregistrement des nouveaux widgets calendrier
- **Database Schema** : Extension avec table calendar_events et EventMetadata
- **lib/utils.ts** : Ajout de generateId() et generateSlug()
- **lib/auth.ts** : Ajout de @ts-ignore pour résoudre conflit de types NextAuth

### Fixed
- **TypeScript Errors** : Correction des erreurs de typage dans calendar-events.ts
- **Build Errors** : Résolution des problèmes de compilation (notes-widget, lazy-widgets)
- **Import Errors** : Correction des imports manquants (ScrollArea, Select, Textarea)
- **Type Mismatches** : Correction des types TMDb (posterUrl, voteAverage, genres)
- **Params Async** : Mise à jour pour Next.js 15 (params devient Promise)
- **categoryId Missing** : Ajout dans add-widget-dialog et add-widget-dialog-enhanced
- **themeConfig Type** : Correction du type dans layout-templates.ts

### Removed
- **20+ Fichiers .md** : Suppression de tous les fichiers markdown redondants (gardé uniquement README.md)
- **docs/ Folder** : Suppression du dossier docs avec tous ses fichiers
- **theme-settings.tsx** : Remplacement par stub (obsolète, remplacé par theme-settings-enhanced.tsx)

### Security
- **User non-root** : Container Docker exécuté avec uid 1001
- **Healthchecks** : Ajout de healthcheck pour MySQL
- **Environment Variables** : Meilleure gestion des secrets
- **Password Hashing** : Bcrypt avec 10 salt rounds

### Performance
- **Multi-stage Build** : Dockerfile optimisé (~300 MB vs 1.5 GB)
- **Lazy Loading** : Préparation pour lazy loading des widgets
- **Index Database** : Ajout d'index sur calendar_events (user_id, start_date, type)
- **Query Optimization** : Requêtes optimisées pour TMDb et AniList

### Dependencies
- **React** : v19.0.0
- **Next.js** : v15.5.9
- **Drizzle ORM** : v0.45.1
- **NextAuth.js** : v5.0.0-beta.25
- **TanStack Query** : v5.90.12
- **Tailwind CSS** : v4 (latest)
- **shadcn/ui** : Components mis à jour

---

## [1.0.0] - 2024-11

### Initial Release
- Dashboard système avec grille magnétique
- 12 widgets de base (Link, Ping, Iframe, DateTime, Weather, Notes, Chart, Anime Calendar, Todo, Watchlist, Timer, Bookmarks, Quote, Countdown)
- Système d'authentification NextAuth.js
- Multi-dashboards par utilisateur
- Système de rôles (USER, VIP, ADMIN)
- Thèmes Light, Dark, OLED
- Personnalisation CSS (3 niveaux)
- Docker Compose pour déploiement
- MySQL 8.0 avec Drizzle ORM

---

## Prochaines Versions

### [2.1.0] - Planifié
- [ ] Rate limiting pour APIs externes
- [ ] Content Security Policy (CSP)
- [ ] Optimisation lazy loading des widgets
- [ ] Tests unitaires et E2E
- [ ] Documentation API complète
- [ ] Internationalisation (i18n)
- [ ] Dark mode amélioré
- [ ] Widget Spotify/Music
- [ ] Widget RSS Feed
- [ ] Widget GitHub Activity

### [3.0.0] - Future
- [ ] Real-time collaboration
- [ ] Widget Marketplace
- [ ] Plugins system
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Cloud sync
- [ ] AI-powered widgets
- [ ] Advanced analytics
