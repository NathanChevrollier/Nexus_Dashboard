# Guide de Démarrage - Documentation

## Vue d'ensemble

Le système de guide de démarrage est une fonctionnalité interactive qui accueille les nouveaux utilisateurs et les aide à découvrir les fonctionnalités principales de Nexus Dashboard.

## Fonctionnalités

### 1. Guide Interactif à 4 Étapes

Le guide se présente sous forme de carousel avec 4 étapes distinctes :

1. **Bienvenue sur Nexus** (Icône : Sparkles - Gradient : Purple-Pink)
   - Introduction générale à Nexus Dashboard
   - Présentation du concept de personnalisation

2. **Maîtrisez votre Dashboard** (Icône : Layout - Gradient : Blue-Cyan)
   - Explication de la création de dashboards
   - Introduction aux widgets et catégories

3. **Bibliothèque & Médias** (Icône : Library - Gradient : Emerald-Teal)
   - Fonctionnalités de suivi de films/séries/animes
   - Intégration TMDB

4. **Outils & Productivité** (Icône : CheckSquare - Gradient : Orange-Red)
   - Widgets productifs
   - Jeux intégrés
   - Personnalisation des thèmes

### 2. Bouton d'Accès Contextuel

- **Position** : Navbar (desktop et mobile)
- **Visibilité** : Uniquement si l'utilisateur n'a pas encore vu le guide
- **Animation** : Effet pulse pour attirer l'attention
- **Icône** : BookOpen

### 3. Persistance de la Préférence

- Une fois le guide terminé ou fermé avec "Ne plus afficher", la préférence est sauvegardée en base de données
- Le bouton disparaît automatiquement après dismissal
- Stocké dans la colonne `has_seen_guide` de la table `users`

## Architecture Technique

### Composants

1. **AppGuideDialog** (`components/guide/app-guide-dialog.tsx`)
   - Composant Dialog client-side
   - Gestion de la navigation entre les étapes
   - Appel de l'action `dismissGuide` à la fermeture

2. **Navbar** (`components/dashboard/navbar.tsx`)
   - Affichage conditionnel du bouton guide
   - Intégration desktop et mobile
   - Gestion du state `guideOpen`

### Actions Serveur

**Fichier** : `lib/actions/users.ts`

- `dismissGuide()` : Marque le guide comme vu pour l'utilisateur actuel
- `checkHasSeenGuide()` : Vérifie si l'utilisateur a déjà vu le guide

### Schéma de Base de Données

```sql
ALTER TABLE users ADD COLUMN has_seen_guide BOOLEAN DEFAULT FALSE NOT NULL;
```

## Utilisation

### Pour l'utilisateur

1. À la première connexion, le bouton "Guide de démarrage" apparaît dans la navbar (avec effet pulse)
2. Cliquer sur le bouton ouvre le guide interactif
3. Naviguer avec les boutons "Précédent" / "Suivant"
4. Points de progression en bas du dialog
5. Options de fermeture :
   - Bouton "Terminer" sur la dernière étape
   - Bouton "Ne plus afficher ce guide" en bas
   - Fermer le dialog avec la croix (ne marque pas comme vu)

### Pour le développeur

**Ajouter une nouvelle étape** :

Éditer `components/guide/app-guide-dialog.tsx` et ajouter un objet dans `GUIDE_STEPS` :

```typescript
{
  title: "Titre de l'étape",
  icon: IconComponent, // Lucide icon
  description: "Description courte",
  content: "Contenu détaillé de l'étape",
  color: "from-color-500 to-color-500" // Tailwind gradient
}
```

**Réinitialiser le guide pour un utilisateur** :

```sql
UPDATE users SET has_seen_guide = FALSE WHERE id = 'user_id';
```

## Styles & Design

- **Gradients** : Chaque étape a son propre gradient de couleur pour la rendre distinctive
- **Animations** : Effet pulse sur le bouton, transitions fluides entre étapes
- **Responsive** : Fonctionne parfaitement sur mobile et desktop
- **Accessibilité** : Navigation au clavier supportée, focus management

## Tests

### Tester le guide

1. Créer un nouveau compte utilisateur (ou réinitialiser `has_seen_guide`)
2. Se connecter et vérifier l'apparition du bouton
3. Ouvrir le guide et naviguer entre les étapes
4. Fermer avec "Ne plus afficher"
5. Rafraîchir la page et vérifier que le bouton a disparu

### Debug

Si le bouton n'apparaît pas :

- Vérifier que `hasSeenGuide` est bien à `false` dans la table users
- Vérifier que le prop est bien passé du page.tsx au Navbar
- Vérifier la console pour d'éventuelles erreurs

## Évolutions Futures

Fonctionnalités possibles :

- Guide contextuel par page (différent selon la route)
- Tutoriels interactifs pas-à-pas
- Vidéos de démonstration
- Tooltips contextuels pour les nouvelles features
- Statistiques d'utilisation du guide

## Migration

La colonne `has_seen_guide` a été ajoutée via Drizzle ORM. Si vous faites une migration fresh :

```bash
npm run db:push
```

Pour les utilisateurs existants, tous auront `has_seen_guide = false` par défaut et verront donc le guide à leur prochaine connexion.
