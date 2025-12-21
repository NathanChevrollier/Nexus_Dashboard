#!/bin/bash

# Nexus Dashboard - Script de déploiement Docker
# Usage: ./deploy.sh [dev|prod]

set -e

MODE=${1:-dev}

echo "🚀 Nexus Dashboard - Déploiement Docker"
echo "========================================"
echo "Mode: $MODE"
echo ""

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    echo "   Installez Docker depuis https://www.docker.com/get-started"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo "✅ Docker $(docker --version) détecté"
echo "✅ Docker Compose $(docker-compose --version) détecté"
echo ""

# Vérifier .env
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant"
    echo "   Créez un fichier .env depuis .env.example"
    exit 1
fi

echo "✅ Fichier .env trouvé"
echo ""

# Choisir le fichier docker-compose
if [ "$MODE" = "prod" ]; then
    COMPOSE_FILE="docker-compose.production.yml"
    echo "📦 Mode Production"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "📦 Mode Développement"
fi
echo ""

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose -f $COMPOSE_FILE down

# Supprimer l'ancien build (optionnel)
read -p "Voulez-vous supprimer les anciennes images? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f $COMPOSE_FILE down --rmi all
    echo "✅ Images supprimées"
fi
echo ""

# Build et démarrage
echo "🏗️  Build de l'application..."
docker-compose -f $COMPOSE_FILE build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

echo "✅ Build réussi"
echo ""

echo "🚀 Démarrage des services..."
docker-compose -f $COMPOSE_FILE up -d

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du démarrage"
    exit 1
fi

echo "✅ Services démarrés"
echo ""

# Attendre MySQL
echo "⏳ Attente de MySQL (30 secondes)..."
sleep 30

# Migrations
echo "🗄️  Exécution des migrations..."
docker-compose -f $COMPOSE_FILE exec -T app npm run db:push

if [ $? -ne 0 ]; then
    echo "⚠️  Les migrations ont échoué"
    echo "   Vous pouvez les exécuter manuellement:"
    echo "   docker-compose -f $COMPOSE_FILE exec app npm run db:push"
fi

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📝 Informations:"
echo "   - Application: http://localhost:3000"
echo "   - MySQL: localhost:3307"
echo ""
echo "🔍 Commandes utiles:"
echo "   - Logs: docker-compose -f $COMPOSE_FILE logs -f app"
echo "   - Arrêter: docker-compose -f $COMPOSE_FILE down"
echo "   - Redémarrer: docker-compose -f $COMPOSE_FILE restart app"
echo "   - Shell: docker-compose -f $COMPOSE_FILE exec app sh"
echo ""
