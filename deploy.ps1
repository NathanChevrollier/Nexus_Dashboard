# Nexus Dashboard - Script de déploiement Docker (Windows)
# Usage: .\deploy.ps1 [dev|prod]

param(
    [string]$Mode = "dev"
)

Write-Host "🚀 Nexus Dashboard - Déploiement Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Yellow
Write-Host ""

# Vérifier Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ $dockerVersion détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas installé" -ForegroundColor Red
    Write-Host "   Installez Docker Desktop depuis https://www.docker.com/get-started" -ForegroundColor Yellow
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-Host "✅ $composeVersion détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose n'est pas installé" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Vérifier .env
if (-not (Test-Path .env)) {
    Write-Host "❌ Fichier .env manquant" -ForegroundColor Red
    Write-Host "   Créez un fichier .env depuis .env.example" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
Write-Host ""

# Choisir le fichier docker-compose
if ($Mode -eq "prod") {
    $ComposeFile = "docker-compose.production.yml"
    Write-Host "📦 Mode Production" -ForegroundColor Cyan
} else {
    $ComposeFile = "docker-compose.yml"
    Write-Host "📦 Mode Développement" -ForegroundColor Cyan
}
Write-Host ""

# Arrêter les conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Cyan
docker-compose -f $ComposeFile down

# Supprimer l'ancien build (optionnel)
$response = Read-Host "Voulez-vous supprimer les anciennes images? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    docker-compose -f $ComposeFile down --rmi all
    Write-Host "✅ Images supprimées" -ForegroundColor Green
}
Write-Host ""

# Build et démarrage
Write-Host "🏗️  Build de l'application..." -ForegroundColor Cyan
docker-compose -f $ComposeFile build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build réussi" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Démarrage des services..." -ForegroundColor Cyan
docker-compose -f $ComposeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du démarrage" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Services démarrés" -ForegroundColor Green
Write-Host ""

# Attendre MySQL
Write-Host "⏳ Attente de MySQL (30 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Migrations
Write-Host "🗄️  Exécution des migrations..." -ForegroundColor Cyan
docker-compose -f $ComposeFile exec -T app npm run db:push

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Les migrations ont échoué" -ForegroundColor Yellow
    Write-Host "   Vous pouvez les exécuter manuellement:" -ForegroundColor White
    Write-Host "   docker-compose -f $ComposeFile exec app npm run db:push" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Déploiement terminé!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Informations:" -ForegroundColor Cyan
Write-Host "   - Application: http://localhost:3000" -ForegroundColor White
Write-Host "   - MySQL: localhost:3307" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Commandes utiles:" -ForegroundColor Cyan
Write-Host "   - Logs: docker-compose -f $ComposeFile logs -f app" -ForegroundColor White
Write-Host "   - Arrêter: docker-compose -f $ComposeFile down" -ForegroundColor White
Write-Host "   - Redémarrer: docker-compose -f $ComposeFile restart app" -ForegroundColor White
Write-Host "   - Shell: docker-compose -f $ComposeFile exec app sh" -ForegroundColor White
Write-Host ""
