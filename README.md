# 🚀 Nexus Dashboard v2.0

Dashboard auto-hébergé moderne et personnalisable avec widgets interactifs, calendrier multi-sources et thèmes glassmorphism.

---

## 📋 Table des Matières

- [Stack Technique](#-stack-technique)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Widgets Disponibles](#-widgets-disponibles)
- [Déploiement](#-déploiement)
- [Architecture](#-architecture)
- [Sécurité](#-sécurité)
- [Troubleshooting](#-troubleshooting)

---

## 🛠️ Stack Technique

### Frontend

- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript (Strict Mode)
- **UI**: shadcn/ui + Tailwind CSS v4
- **State Management**: TanStack Query v5 + Zustand
- **Grid**: react-grid-layout
- **Charts**: Chart.js + react-chartjs-2
- **Markdown**: react-markdown + remark-gfm

### Backend

- **Database**: MySQL 8.0
- **ORM**: Drizzle ORM v0.45
- **Auth**: NextAuth.js v5 (Auth.js)
- **Adapter**: @auth/drizzle-adapter
- **Validation**: Zod v4

### APIs Externes

- **TMDb API v3**: Films, séries TV, tendances
- **AniList GraphQL**: Anime, manga, planning de sortie

### DevOps

- **Container**: Docker + Docker Compose
- **Node**: v20-alpine
- **Multi-stage build**: Optimisé pour production

---

## 🌟 Fonctionnalités

### 📊 Dashboard

- ✅ **Multi-dashboards** par utilisateur avec slugs uniques
- ✅ **Grille magnétique** responsive et redimensionnable
- ✅ **Drag & Drop** des widgets avec sauvegarde automatique
- ✅ **Catégories** pour organiser les widgets
- ✅ **Dashboards publics** partageables via URL
- ✅ **Export/Import** de configuration en JSON
- ✅ **Templates** prédéfinis (Gaming, Productivity, Monitoring)

### 🎨 Personnalisation

- ✅ **7 thèmes** : Light, Dark, OLED + 4 variantes Cyber (Blue, Matrix, Synthwave, Arctic)
- ✅ **Glassmorphism** avec effets de blur et particules animées
- ✅ **7 gradients animés** : Aurora, Sunset, Ocean, Forest, Fire, Purple Haze, Space
- ✅ **4 palettes** : Material, Pastel, Neon, Earth Tones
- ✅ **Time-Based Themes** : changement automatique selon l'heure
- ✅ **3 niveaux CSS** : GUI (users), Scoped (VIP), Global (admin)

### 🎭 Widgets (16 types)

- 📎 **Link** - Liens rapides avec icônes
- 📡 **Ping** - Monitoring serveurs
- 🖼️ **Iframe** - Intégration sites externes
- 🕐 **DateTime** - Horloge avec fuseaux horaires
- 🌤️ **Weather** - Météo (API)
- 📝 **Notes** - Éditeur markdown
- 📊 **Chart** - Graphiques interactifs
- 📅 **Anime Calendar** - Planning anime/manga (AniList)
- ✅ **Todo List** - Gestionnaire tâches
- 📺 **Watchlist** - Liste de films/séries
- ⏱️ **Timer** - Pomodoro et chronomètre
- 🔖 **Bookmarks** - Favoris organisés
- 💬 **Quote** - Citations aléatoires
- ⏳ **Countdown** - Compte à rebours
- 🎬 **Movies & TV** - Calendrier simplifié films/séries (TMDb)
- 🗓️ **Universal Calendar** - Calendrier complet 5 sources (Anime/Manga/Films/Séries/Personnel)

### 👥 Système de Rôles

- **USER** : Accès widgets de base + personnalisation GUI
- **VIP** : + Scoped CSS + Widgets premium (Calendar, Charts)
- **ADMIN** : + Global CSS + Gestion utilisateurs + Import/Export

### 🔐 Sécurité

- ✅ **NextAuth.js v5** avec Credentials provider
- ✅ **Bcrypt** pour hash des mots de passe
- ✅ **JWT sessions** avec tokens sécurisés
- ✅ **Validation comptes** par admin obligatoire
- ✅ **Middleware** pour protection des routes
- ✅ **CORS** configuré pour APIs externes
- ✅ **CSP** (Content Security Policy) recommandé en production

---

## 📦 Installation

### ⚡️ Quick Start (local)

Sur Windows ou macOS/Linux, tout peut être automatisé:

```bash
# Dev (crée .env par défaut, créer public/, lance Docker, migrations, seed admin)
./deploy.sh

# Production
./deploy.sh prod
```

Alternatives locales:

- Windows: exécuter [setup.ps1](setup.ps1) (vérifs, création .env/public, Docker MySQL, migrations)
- Linux/macOS: exécuter [setup.sh](setup.sh)

### Prérequis

- Node.js v20+ (LTS recommandé)
- MySQL 8.0+
- npm ou yarn
- Docker (optionnel)

### 1. Cloner le Projet

```bash
git clone <votre-repo>
cd nexus-dashboard
```

### 2. Installer les Dépendances

```bash
npm install --legacy-peer-deps
```

**Important** : Utiliser `--legacy-peer-deps` pour éviter les conflits de peer dependencies entre React 19 et certaines librairies.

### 3. Configuration Environnement

Créer un fichier `.env` à la racine :

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=3307
DATABASE_USER=nexus
DATABASE_PASSWORD=nexus_password_2025
DATABASE_NAME=nexus_dashboard

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=super_secret_key_change_in_production_12345

# External APIs
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Base de Données

**Option A : Via Docker (Recommandé)**

```bash
docker-compose up -d db
```

**Option B : MySQL Local**

```sql
CREATE DATABASE nexus_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexus'@'localhost' IDENTIFIED BY 'nexus_password_2025';
GRANT ALL PRIVILEGES ON nexus_dashboard.* TO 'nexus'@'localhost';
FLUSH PRIVILEGES;
```

### 5. Migrations

```bash
npm run db:push
```

Cela créera automatiquement toutes les tables :

- `users` (id, name, email, password, role, status)
- `dashboards` (id, userId, name, slug, isPublic, themeConfig)
- `widgets` (id, dashboardId, type, x, y, w, h, options)
- `categories` (id, dashboardId, name, color)
- `calendar_events` (id, userId, title, startDate, endDate, type, metadata)

### 6. Seed (Optionnel)

Créer l'utilisateur admin de test :

```bash
npm run seed
```

Credentials par défaut :

- **Email**: `admin@nexus.local`
- **Password**: `admin123`
- **Role**: ADMIN

### 7. Lancer en Développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

### Clé API TMDb (CRITIQUE)

Les widgets **Movies & TV** et **Universal Calendar** nécessitent une clé API TMDb.

**Obtenir la clé (gratuit)** :

1. Créer un compte sur [themoviedb.org](https://www.themoviedb.org/signup)
2. Aller dans [Settings > API](https://www.themoviedb.org/settings/api)
3. Demander une clé "Developer" (gratuit, 2 minutes)
4. Copier la clé `API Key (v3 auth)` (32 caractères)
5. Ajouter dans `.env` :
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

**Sans clé TMDb** :

- ❌ Widget "Movies & TV" → Ne charge aucune donnée
- ❌ Films/Séries dans "Universal Calendar" → Vides
- ✅ Anime/Manga/Événements personnels → Fonctionnent

### Variables d'Environnement

| Variable                   | Requis | Description             | Défaut                |
| -------------------------- | ------ | ----------------------- | --------------------- |
| `DATABASE_HOST`            | ✅     | Hôte MySQL              | localhost             |
| `DATABASE_PORT`            | ✅     | Port MySQL              | 3307                  |
| `DATABASE_USER`            | ✅     | Utilisateur DB          | nexus                 |
| `DATABASE_PASSWORD`        | ✅     | Mot de passe DB         | -                     |
| `DATABASE_NAME`            | ✅     | Nom de la DB            | nexus_dashboard       |
| `NEXTAUTH_URL`             | ✅     | URL de l'app            | http://localhost:3000 |
| `NEXTAUTH_SECRET`          | ✅     | Secret JWT (32+ chars)  | -                     |
| `NEXT_PUBLIC_TMDB_API_KEY` | ⚠️     | Clé TMDb (films/séries) | -                     |

---

## 🎨 Widgets Disponibles

### 📎 Link Widget

```json
{
  "type": "link",
  "options": {
    "title": "GitHub",
    "url": "https://github.com",
    "icon": "🐙",
    "openInNewTab": true
  }
}
```

### 🎬 Movies & TV Calendar Widget

```json
{
  "type": "movies-tv-calendar",
  "options": {
    "title": "Films & Séries",
    "filter": "week",
    "activeTab": "movies"
  }
}
```

- **Sources** : TMDb uniquement
- **Fonctionnalités** : Films à venir, séries en cours, tendances
- **Filtres** : Aujourd'hui / Cette semaine

### 🗓️ Universal Calendar Widget

```json
{
  "type": "universal-calendar",
  "options": {
    "title": "Calendrier Complet",
    "view": "month",
    "enabledSources": {
      "anime": true,
      "manga": true,
      "movies": true,
      "tv": true,
      "personal": true
    },
    "sourceColors": {
      "anime": "#FF6B6B",
      "manga": "#4ECDC4",
      "movies": "#FFD93D",
      "tv": "#6BCB77",
      "personal": "#A78BFA"
    }
  }
}
```

- **Sources** : AniList (anime/manga) + TMDb (films/séries) + Base de données (personnel)
- **Vues** : Mois, Semaine, Liste
- **CRUD** : Ajouter/Modifier/Supprimer événements personnels

### 📅 Anime Calendar Widget

```json
{
  "type": "anime-calendar",
  "options": {
    "title": "Anime & Manga",
    "filter": "week"
  }
}
```

---

## 🚀 Déploiement

### Docker Compose (Recommandé)

Le projet inclut un setup Docker complet avec multi-stage build optimisé.

**1. Créer `.env` avec vos credentials**

```bash
cp .env.example .env
# Éditer .env avec vos vraies valeurs
```

**2. Construire et lancer (automatisé)**

```bash
./deploy.sh            # dev
./deploy.sh prod       # production
```

**3. Vérifier les logs**

```bash
docker-compose logs -f app
```

**4. Accéder à l'application**

- App : [http://localhost:3000](http://localhost:3000)
- MySQL : `localhost:3307`

**Services inclus** :

- `db` : MySQL 8.0 avec healthcheck
- `app` : Next.js avec dépendances auto-installées

### Production (VPS/Server)

**1. Cloner sur le serveur**

```bash
git clone <votre-repo>
cd nexus-dashboard
```

**2. Configuration production**

Créer `.env.production` :

```env
DATABASE_HOST=db
DATABASE_PORT=3306
DATABASE_USER=nexus
DATABASE_PASSWORD=<strong-password>
DATABASE_NAME=nexus_dashboard
NEXTAUTH_URL=https://votre-domaine.com
NEXTAUTH_SECRET=<générer-secret-fort-32-chars>
NEXT_PUBLIC_TMDB_API_KEY=<votre-clé>
NODE_ENV=production
```

**3. Utiliser docker-compose.production.yml**

```bash
./deploy.sh prod
```

**4. Migrations**

Le script `deploy.sh` exécute les migrations automatiquement. Pour les relancer manuellement:

```bash
npm run db:push
```

**5. Nginx Reverse Proxy (optionnel)**

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**6. SSL avec Certbot**

```bash
sudo certbot --nginx -d votre-domaine.com
```

### Optimisations Production

**Dockerfile multi-stage** :

- Stage 1 (`deps`) : Installation dépendances seules
- Stage 2 (`builder`) : Build Next.js avec optimisations
- Stage 3 (`runner`) : Image finale minimale (Node Alpine)

**Résultat** :

- Image finale : ~300 MB (vs 1.5 GB sans optimisation)
- Build time : 3-5 minutes
- Démarrage : <2 secondes

**Variables Build** :

- `NEXT_TELEMETRY_DISABLED=1` : Désactive télémétrie
- `NODE_ENV=production` : Mode production
- `output: 'standalone'` : Bundle minimal

---

## 🏗️ Architecture

### Structure du Projet

```
nexus-dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── dashboards/           # CRUD dashboards
│   │   └── widgets/              # CRUD widgets
│   ├── auth/                     # Pages auth (login/register)
│   ├── dashboard/                # Dashboard views
│   │   ├── [slug]/               # Dashboard dynamique
│   │   └── new/                  # Créer dashboard
│   ├── public/[slug]/            # Dashboards publics
│   ├── settings/                 # Paramètres utilisateur
│   ├── globals.css               # Styles globaux + Tailwind
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Page d'accueil
│
├── components/
│   ├── dashboard/                # Composants dashboard
│   │   ├── dashboard-view.tsx    # Vue principale
│   │   ├── add-widget-dialog.tsx # Ajout widgets
│   │   └── widget-settings.tsx   # Config widgets
│   ├── widgets/                  # 16 widgets
│   │   ├── link-widget.tsx
│   │   ├── movies-tv-calendar-widget.tsx
│   │   ├── universal-calendar-widget.tsx
│   │   └── ...
│   ├── settings/                 # Paramètres
│   │   └── theme-settings-enhanced.tsx
│   ├── ui/                       # shadcn/ui components
│   ├── theme-provider.tsx        # Context thème
│   └── command-palette.tsx       # Cmd+K
│
├── lib/
│   ├── actions/                  # Server Actions
│   │   ├── widgets.ts            # CRUD widgets
│   │   ├── dashboards.ts         # CRUD dashboards
│   │   ├── calendar-events.ts    # CRUD événements
│   │   └── theme.ts              # Thème CSS
│   ├── api/                      # Clients API
│   │   └── tmdb.ts               # TMDb API v3
│   ├── db/                       # Database
│   │   ├── schema.ts             # Schéma Drizzle
│   │   └── index.ts              # DB client
│   ├── auth.ts                   # NextAuth config
│   └── utils.ts                  # Utilitaires
│
├── drizzle/                      # Migrations SQL
│   ├── 0001_initial.sql
│   ├── 0002_add_categories.sql
│   └── 0003_add_calendar_events.sql
│
├── public/                       # Assets statiques
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml            # Dev environment
├── docker-compose.production.yml # Production
├── .env                          # Variables locales
├── next.config.ts                # Config Next.js
├── tailwind.config.ts            # Config Tailwind
└── package.json                  # Dépendances
```

### Base de Données (MySQL)

**Tables principales** :

```sql
users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('USER', 'VIP', 'ADMIN') DEFAULT 'USER',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

dashboards (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  is_public BOOLEAN DEFAULT false,
  theme_config JSON,
  custom_css TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

widgets (
  id VARCHAR(255) PRIMARY KEY,
  dashboard_id VARCHAR(255) NOT NULL,
  category_id VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  w INT NOT NULL,
  h INT NOT NULL,
  options JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
)

calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  type ENUM('anime', 'manga', 'movie', 'tv', 'personal') NOT NULL,
  color VARCHAR(20),
  completed BOOLEAN DEFAULT false,
  metadata JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, start_date),
  INDEX idx_type (type)
)
```

### APIs Externes

**TMDb API v3** :

- Endpoint : `https://api.themoviedb.org/3`
- Fonctions : 15+ (films, séries, tendances, genres)
- Rate limit : 40 requêtes/10 secondes
- Images : `https://image.tmdb.org/t/p/{size}/{path}`

**AniList GraphQL** :

- Endpoint : `https://graphql.anilist.co`
- Pas d'authentification requise
- Fonctions : Schedule anime/manga, search, trending
- Rate limit : 90 requêtes/minute

---

## 🔒 Sécurité

### Implémenté ✅

1. **Authentification** :

   - NextAuth.js v5 avec JWT sessions
   - Bcrypt pour hash des mots de passe (salt rounds: 10)
   - Validation des comptes par admin

2. **Protection Routes** :

   - Middleware pour routes protégées
   - Vérification ownership des dashboards/widgets
   - Server Actions avec auth checks

3. **Validation** :

   - Zod pour validation des inputs
   - Sanitization des données utilisateur
   - Protection contre injections SQL (Drizzle ORM)

4. **Docker** :
   - User non-root dans container (uid 1001)
   - Healthchecks pour services
   - Réseau isolé entre services

### Recommandations Production 🔐

1. **Variables d'Environnement** :

   ```bash
   # Générer secret fort (32+ chars)
   openssl rand -base64 32

   # Changer TOUS les mots de passe par défaut
   # Ne JAMAIS commit les .env
   ```

2. **Content Security Policy** :

   ```tsx
   // next.config.ts
   headers: [
     {
       source: "/:path*",
       headers: [
         {
           key: "Content-Security-Policy",
           value:
             "default-src 'self'; img-src 'self' https://image.tmdb.org https://s4.anilist.co;",
         },
       ],
     },
   ];
   ```

3. **Rate Limiting** :

   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

4. **HTTPS** :

   - Utiliser Certbot pour SSL gratuit
   - Forcer HTTPS via Nginx
   - HSTS header recommandé

5. **Backups** :
   ```bash
   # Backup MySQL quotidien
   docker-compose exec db mysqldump -u nexus -p nexus_dashboard > backup-$(date +%F).sql
   ```

---

## 🐛 Troubleshooting

### Problème : Build échoue avec erreur TypeScript

**Symptôme** :

```
Type error: Adapter types incompatible
./lib/auth.ts:31:3
```

**Solution** :
Le commentaire `@ts-ignore` est déjà présent dans `lib/auth.ts`. Si l'erreur persiste :

```bash
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
```

### Problème : Widgets calendrier ne chargent pas

**Symptôme** : Movies/TV ou Universal Calendar vides

**Cause** : Clé API TMDb manquante

**Solution** :

1. Vérifier `.env` :
   ```bash
   cat .env | grep TMDB
   ```
2. Ajouter la clé :
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=votre_cle_ici
   ```
3. Redémarrer :
   ```bash
   npm run dev
   ```

### Problème : Base de données connexion refusée

**Symptôme** :

```
Error: connect ECONNREFUSED 127.0.0.1:3307
```

**Solutions** :

1. Vérifier MySQL :
   ```bash
   docker-compose ps
   # Le service "db" doit être "healthy"
   ```
2. Tester connexion :
   ```bash
   mysql -h localhost -P 3307 -u nexus -p
   # Entrer le password du .env
   ```
3. Recréer la DB :
   ```bash
   docker-compose down -v
   docker-compose up -d db
   npm run db:push
   ```

### Problème : Images TMDb ne s'affichent pas

**Cause** : Next.js `remotePatterns` restrictif

**Solution** : Vérifier `next.config.ts` :

```ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'image.tmdb.org',
    },
    {
      protocol: 'https',
      hostname: 's4.anilist.co',
    },
  ],
}
```

### Problème : Drag & Drop des widgets ne fonctionne pas

**Cause** : Conflit CSS ou état non synchronisé

**Solution** :

1. Effacer cache navigateur
2. Vérifier console pour erreurs
3. Recharger page (Cmd+R)

### Problème : Docker build échoue

**Symptôme** :

```
npm ERR! peer dependency conflicts
```

**Solution** :
Le Dockerfile utilise déjà `npm ci` (plus strict). Si erreur, modifier `Dockerfile` ligne 11 :

```dockerfile
RUN npm ci --legacy-peer-deps
```

---

## 📚 Documentation Complète

### Liens Utiles

- **TMDb API Docs** : https://developers.themoviedb.org/3
- **AniList GraphQL** : https://anilist.github.io/ApiV2-GraphQL-Docs/
- **Next.js 15** : https://nextjs.org/docs
- **Drizzle ORM** : https://orm.drizzle.team/docs
- **NextAuth.js** : https://authjs.dev/getting-started

### Scripts NPM

```bash
# Développement
npm run dev              # Lancer serveur dev (port 3000)

# Build & Production
npm run build            # Build optimisé pour production
npm run start            # Lancer build en production

# Base de données
npm run db:generate      # Générer migrations depuis schema
npm run db:push          # Push schema vers DB (dev)
npm run db:migrate       # Exécuter migrations (prod)
npm run db:studio        # Ouvrir Drizzle Studio

# Qualité code
npm run lint             # ESLint + TypeScript checks
```

### Commandes Docker

```bash
# Développement
docker-compose up -d               # Lancer tous services
docker-compose down                # Arrêter tous services
docker-compose logs -f app         # Logs en temps réel
docker-compose exec app sh         # Shell dans container

# Production
docker-compose -f docker-compose.production.yml up -d --build
docker-compose -f docker-compose.production.yml exec app npm run db:push

# Maintenance
docker-compose restart app         # Redémarrer app
docker-compose down -v             # Tout supprimer (data incluse)
docker system prune -a             # Nettoyer images/containers orphelins
```

---

## 🤝 Contribution

### Ajouter un Nouveau Widget

1. **Créer le composant** :

   ```tsx
   // components/widgets/mon-widget.tsx
   interface MonWidgetProps {
     options: {
       title?: string;
       // autres options
     };
     onUpdateOptions: (options: any) => void;
   }

   export function MonWidget({ options, onUpdateOptions }: MonWidgetProps) {
     return <div>Mon Widget</div>;
   }
   ```

2. **Enregistrer dans widget-component.tsx** :

   ```tsx
   case 'mon-widget':
     return <MonWidget {...props} />;
   ```

3. **Ajouter dans add-widget-dialog.tsx** :

   ```tsx
   <Button onClick={() => handleAdd("mon-widget")}>Mon Widget</Button>
   ```

4. **Étendre le type dans schema.ts** :
   ```ts
   export interface WidgetOptions {
     // Ajouter les options de votre widget
   }
   ```

---

## 📄 License

MIT License

---

## 👨‍💻 Auteur

**Nathan**

Dashboard créé avec ❤️ et beaucoup de ☕

---

**Version** : 2.0.0  
**Dernière mise à jour** : Décembre 2024  
**Node** : v20+  
**Next.js** : 15.5.9
