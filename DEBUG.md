# Debug - Corrections des erreurs

## Problèmes corrigés

### 1. ✅ Erreurs TMDb API (Failed to fetch)
- **Cause**: Manque de headers et de gestion d'erreur appropriée
- **Solution**: Ajout de headers explicites et meilleure gestion des erreurs dans `lib/api/tmdb.ts`
- **Fichiers modifiés**: 
  - `lib/api/tmdb.ts` - Toutes les fonctions API (getUpcomingMovies, getTrendingMovies, getTVAiringToday, getTVOnTheAir, getTrendingTVShows)

### 2. ✅ Duplicate React Keys
- **Cause**: Même ID utilisé dans plusieurs listes (upcoming + trending)
- **Solution**: Ajout d'un préfixe de section + index dans les clés
- **Fichiers modifiés**:
  - `components/widgets/movies-tv-calendar-widget.tsx` - Toutes les maps avec prefix unique

### 3. 🔍 Page Admin inaccessible
- **Investigation en cours**
- **Outils de debug ajoutés**:
  - `/debug` - Page de debug de session
  - `/api/admin/test` - Route API de test
  - Logs console dans `app/admin/page.tsx`

## Comment débugger la page Admin

### Étape 1: Vérifier votre session
Accédez à: `http://localhost:3001/debug`

Cette page affichera:
- ✅ État de la session (connecté ou non)
- 👤 Informations utilisateur (ID, nom, email)
- 🛡️ Rôle actuel (USER, VIP, ou ADMIN)
- 📊 Données brutes de session

### Étape 2: Tester l'API Admin
Ouvrez dans votre navigateur: `http://localhost:3001/api/admin/test`

Vous devriez voir un JSON avec:
```json
{
  "success": true,
  "hasSession": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "ADMIN"
  },
  "isAdmin": true
}
```

### Étape 3: Vérifier les logs serveur
Dans votre terminal où tourne `npm run dev`, cherchez les logs:
```
[AdminPage] Loading admin page...
[AdminPage] Session: { hasSession: true, userId: '...', userRole: 'ADMIN', isAdmin: true }
[AdminPage] Access granted, loading users...
```

Si vous voyez:
```
[AdminPage] Access denied, redirecting to dashboard
```
Cela signifie que votre session n'a pas le rôle ADMIN.

## Solutions possibles

### Si votre rôle n'est pas ADMIN:
1. Arrêtez le serveur (`Ctrl+C`)
2. Ouvrez votre base de données et modifiez manuellement le rôle
3. Ou créez un script de migration

### Si la page redirige sans raison:
1. Vérifiez les logs console du serveur
2. Vérifiez que le middleware n'interfère pas
3. Essayez de supprimer le cache Next.js: supprimez le dossier `.next` et redémarrez

### Si les erreurs TMDb persistent:
1. Vérifiez votre clé API TMDb dans `.env`
2. Testez la clé directement avec curl:
   ```bash
   curl "https://api.themoviedb.org/3/movie/upcoming?api_key=VOTRE_CLE&language=fr-FR"
   ```
3. Vérifiez que la variable commence bien par `NEXT_PUBLIC_`

## Changements de code

### lib/api/tmdb.ts
Ajout de:
- Headers explicites (`Content-Type: application/json`)
- `cache: 'no-store'` pour forcer les nouvelles requêtes
- Logs d'erreur détaillés avec status HTTP

### components/widgets/movies-tv-calendar-widget.tsx
Changement des clés:
- `key={movie.id}` → `key={`upcoming-${movie.id}-${index}`}`
- `key={show.id}` → `key={`airing-${show.id}-${index}`}`

Cela évite les duplicates quand un même film/série apparaît dans plusieurs catégories.

## Prochaines étapes

1. Testez l'application
2. Vérifiez la page `/debug` pour voir votre session
3. Essayez d'accéder à `/admin`
4. Consultez les logs du serveur
5. Si ça ne fonctionne toujours pas, partagez les résultats des pages debug
