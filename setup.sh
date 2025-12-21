#!/bin/bash

# Nexus Dashboard - Script d'installation automatique
# Usage: ./setup.sh

set -e

echo "🚀 Nexus Dashboard - Installation"
echo "=================================="
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "   Installez Node.js v20+ depuis https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js v$NODE_VERSION détecté"
    echo "   Version recommandée: v20+"
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm $(npm -v) détecté"
echo ""

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"
echo ""

# Vérifier .env
if [ ! -f .env ]; then
    echo "⚙️  Création du fichier .env..."
    cp .env.example .env
    echo "✅ Fichier .env créé"
    echo "⚠️  IMPORTANT: Éditer .env avec vos vraies valeurs"
    echo ""
else
    echo "✅ Fichier .env existant"
    echo ""
fi

# Vérifier Docker pour MySQL
if command -v docker &> /dev/null; then
    echo "🐳 Docker détecté"
    echo ""
    read -p "Voulez-vous démarrer MySQL via Docker? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose up -d db
        echo "✅ MySQL démarré via Docker"
        echo "   Attendez 10 secondes pour l'initialisation..."
        sleep 10
    fi
    echo ""
fi

# Migrations
echo "🗄️  Exécution des migrations..."
npm run db:push

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors des migrations"
    echo "   Vérifiez que MySQL est démarré et accessible"
    exit 1
fi

echo "✅ Migrations exécutées"
echo ""

# Seed (optionnel)
read -p "Voulez-vous créer un utilisateur admin de test? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx tsx seed.ts
    echo ""
fi

# Clé TMDb
echo "🎬 Configuration TMDb API"
echo "========================="
if grep -q "your_tmdb_api_key_here" .env 2>/dev/null; then
    echo "⚠️  Clé TMDb manquante!"
    echo ""
    echo "Les widgets Films/Séries nécessitent une clé API TMDb (gratuite)."
    echo ""
    echo "Pour obtenir une clé:"
    echo "1. Créer un compte sur https://www.themoviedb.org/signup"
    echo "2. Aller dans Settings > API"
    echo "3. Demander une clé 'Developer'"
    echo "4. Copier la clé API Key (v3 auth)"
    echo "5. Ajouter dans .env: NEXT_PUBLIC_TMDB_API_KEY=votre_cle"
    echo ""
fi

echo ""
echo "✅ Installation terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Éditer .env avec vos vraies valeurs"
echo "   2. Ajouter votre clé TMDb (optionnel mais recommandé)"
echo "   3. Lancer: npm run dev"
echo "   4. Ouvrir: http://localhost:3000"
echo ""
echo "📚 Documentation complète: README.md"
echo ""
