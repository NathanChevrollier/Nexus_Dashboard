# Script PowerShell pour générer les secrets Docker
# Usage: .\generate-secrets.ps1

$ErrorActionPreference = "Stop"

$SECRETS_DIR = ".\secrets"

Write-Host "`n🔐 Génération des secrets pour Nexus Dashboard" -ForegroundColor Blue
Write-Host "================================================`n" -ForegroundColor Blue

# Créer le répertoire secrets s'il n'existe pas
if (-not (Test-Path $SECRETS_DIR)) {
    New-Item -ItemType Directory -Path $SECRETS_DIR | Out-Null
    Write-Host "✓ Répertoire secrets/ créé" -ForegroundColor Green
}

# Fonction pour générer un mot de passe sécurisé
function Generate-Password {
    $bytes = New-Object Byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Replace("=", "").Replace("+", "").Replace("/", "").Substring(0, 32)
}

# Générer le mot de passe root MySQL
$DB_ROOT_PASSWORD_FILE = Join-Path $SECRETS_DIR "db_root_password.txt"
if (-not (Test-Path $DB_ROOT_PASSWORD_FILE)) {
    $DB_ROOT_PASSWORD = Generate-Password
    [IO.File]::WriteAllText($DB_ROOT_PASSWORD_FILE, $DB_ROOT_PASSWORD)
    Write-Host "✓ db_root_password.txt généré" -ForegroundColor Green
} else {
    Write-Host "⚠ db_root_password.txt existe déjà (ignoré)" -ForegroundColor Yellow
}

# Générer le mot de passe utilisateur MySQL
$DB_PASSWORD_FILE = Join-Path $SECRETS_DIR "db_password.txt"
if (-not (Test-Path $DB_PASSWORD_FILE)) {
    $DB_PASSWORD = Generate-Password
    [IO.File]::WriteAllText($DB_PASSWORD_FILE, $DB_PASSWORD)
    Write-Host "✓ db_password.txt généré" -ForegroundColor Green
} else {
    Write-Host "⚠ db_password.txt existe déjà (ignoré)" -ForegroundColor Yellow
}

# Générer le secret NextAuth
$NEXTAUTH_SECRET_FILE = Join-Path $SECRETS_DIR "nextauth_secret.txt"
if (-not (Test-Path $NEXTAUTH_SECRET_FILE)) {
    $bytes = New-Object Byte[] 64
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    $NEXTAUTH_SECRET = [Convert]::ToBase64String($bytes)
    [IO.File]::WriteAllText($NEXTAUTH_SECRET_FILE, $NEXTAUTH_SECRET)
    Write-Host "✓ nextauth_secret.txt généré" -ForegroundColor Green
} else {
    Write-Host "⚠ nextauth_secret.txt existe déjà (ignoré)" -ForegroundColor Yellow
}

Write-Host "`n================================================" -ForegroundColor Blue
Write-Host "✅ Secrets générés avec succès!`n" -ForegroundColor Green

Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "1. Ne JAMAIS commiter le dossier secrets/ dans Git"
Write-Host "2. Sauvegarder ces secrets de manière sécurisée"
Write-Host "3. Ajouter 'secrets/' dans votre .gitignore`n"

Write-Host "Pour voir un secret:"
Write-Host "  Get-Content $SECRETS_DIR\db_password.txt`n"

Write-Host "Pour déployer en production:"
Write-Host "  docker-compose -f docker-compose.production.yml up -d`n"

Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
