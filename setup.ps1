# Nexus Dashboard - Script d'installation automatique (Windows)
# Usage: .\setup.ps1

Write-Host "🚀 Nexus Dashboard - Installation" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "   Installez Node.js v20+ depuis https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Vérifier npm
try {
    $npmVersion = npm -v
    Write-Host "✅ npm $npmVersion détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Installation des dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dépendances installées" -ForegroundColor Green
Write-Host ""

# Vérifier .env
if (-not (Test-Path .env)) {
    Write-Host "⚙️  Création du fichier .env..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "✅ Fichier .env créé" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Éditer .env avec vos vraies valeurs" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "✅ Fichier .env existant" -ForegroundColor Green
    Write-Host ""
}

# Créer le dossier public s'il n'existe pas
if (-not (Test-Path -Path "public")) {
    Write-Host "📁 Création du dossier public..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path "public" | Out-Null
    Write-Host "✅ Dossier public créé" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✅ Dossier public existant" -ForegroundColor Green
    Write-Host ""
}

# Vérifier Docker pour MySQL
try {
    docker --version | Out-Null
    Write-Host "🐳 Docker détecté" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Voulez-vous démarrer MySQL via Docker? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        docker-compose up -d db
        Write-Host "✅ MySQL démarré via Docker" -ForegroundColor Green
        Write-Host "   Attendez 10 secondes pour l'initialisation..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    Write-Host ""
} catch {
    Write-Host "⚠️  Docker non détecté - Assurez-vous que MySQL est installé" -ForegroundColor Yellow
    Write-Host ""
}

# Migrations
Write-Host "🗄️  Exécution des migrations..." -ForegroundColor Cyan
npm run db:push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors des migrations" -ForegroundColor Red
    Write-Host "   Vérifiez que MySQL est démarré et accessible" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Migrations exécutées" -ForegroundColor Green
Write-Host ""

# Seed (optionnel)
$response = Read-Host "Voulez-vous créer un utilisateur admin de test? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    npx tsx seed.ts
    Write-Host ""
}

# Clé TMDb
Write-Host "🎬 Configuration TMDb API" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
$envContent = Get-Content .env -ErrorAction SilentlyContinue
if ($envContent -match "your_tmdb_api_key_here") {
    Write-Host "⚠️  Clé TMDb manquante!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Les widgets Films/Séries nécessitent une clé API TMDb (gratuite)." -ForegroundColor White
    Write-Host ""
    Write-Host "Pour obtenir une clé:" -ForegroundColor White
    Write-Host "1. Créer un compte sur https://www.themoviedb.org/signup" -ForegroundColor White
    Write-Host "2. Aller dans Settings > API" -ForegroundColor White
    Write-Host "3. Demander une clé 'Developer'" -ForegroundColor White
    Write-Host "4. Copier la clé API Key (v3 auth)" -ForegroundColor White
    Write-Host "5. Ajouter dans .env: NEXT_PUBLIC_TMDB_API_KEY=votre_cle" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Installation terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Éditer .env avec vos vraies valeurs" -ForegroundColor White
Write-Host "   2. Ajouter votre clé TMDb (optionnel mais recommandé)" -ForegroundColor White
Write-Host "   3. Lancer: npm run dev" -ForegroundColor White
Write-Host "   4. Ouvrir: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation complète: README.md" -ForegroundColor Cyan
Write-Host ""
