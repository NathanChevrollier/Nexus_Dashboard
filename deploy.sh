#!/bin/bash

# Nexus Dashboard - Script de déploiement Docker (automatisation dev/prod)
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

# Préparer l'environnement (crée .env et public si besoin)
if [ ! -f .env ]; then
    echo "⚙️  Création du fichier .env (depuis .env.example)..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "DATABASE_HOST=localhost"       > .env
        echo "DATABASE_PORT=3307"            >> .env
        echo "DATABASE_USER=nexus"           >> .env
        echo "DATABASE_PASSWORD=nexus_password_2025" >> .env
        echo "DATABASE_NAME=nexus_dashboard" >> .env
        echo "NEXTAUTH_URL=http://localhost:3000"    >> .env
        echo "NEXTAUTH_SECRET=super_secret_key_change_in_production_12345" >> .env
        echo "NODE_ENV=development"          >> .env
    fi
    echo "✅ Fichier .env créé"
else
    echo "✅ Fichier .env existant"
fi

# Créer le dossier public s'il n'existe pas
if [ ! -d public ]; then
    echo "📁 Création du dossier public..."
    mkdir -p public
    echo "✅ Dossier public créé"
fi
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

 # Attendre MySQL (jusqu'à healthy)
echo "⏳ Attente de MySQL (healthcheck)..."
for i in {1..30}; do
    STATUS=$(docker inspect -f '{{json .State.Health.Status}}' nexus-mysql 2>/dev/null || echo "\"unknown\"")
    if [ "$STATUS" = '"healthy"' ]; then
        echo "✅ MySQL ready"
        break
    fi
    sleep 2
done
echo ""

 # Migrations : exécuter à l'intérieur du conteneur (évite npm install sur l'hôte)
echo "🗄️  Exécution des migrations (container)..."
docker-compose -f $COMPOSE_FILE run --rm migrator || {
    echo "⚠️  Les migrations via le conteneur ont échoué. Vous pouvez vérifier les logs: docker-compose -f $COMPOSE_FILE logs migrator";
}

# Seed admin si absent (local dev)
if [ "$MODE" = "dev" ]; then
    echo "🌱 Vérification utilisateur admin..."
    COUNT=$(docker exec nexus-mysql mysql -unexus -pnexus_password_2025 -N -e "SELECT COUNT(*) FROM nexus_dashboard.users WHERE email='admin@nexus.local';" 2>/dev/null || echo 0)
    if [ "$COUNT" = "0" ]; then
        echo "🌱 Seeding admin user..."
        if docker-compose -f $COMPOSE_FILE exec -T app npm run seed; then
            echo "✅ Admin seed OK (admin@nexus.local / admin123)"
        else
            echo "⚠️ Seed a échoué (peut-être déjà présent)"
        fi
    else
        echo "✅ Admin déjà présent"
    fi
fi

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📝 Informations:"
echo "   - Application: http://localhost:3000"
echo "   - MySQL: localhost:3307"
if [ "$MODE" = "dev" ]; then
    echo "   - Admin par défaut: admin@nexus.local / admin123"
fi
echo ""
echo "🔍 Commandes utiles:"
echo "   - Logs: docker-compose -f $COMPOSE_FILE logs -f app"
echo "   - Arrêter: docker-compose -f $COMPOSE_FILE down"
echo "   - Redémarrer: docker-compose -f $COMPOSE_FILE restart app"
echo "   - Shell: docker-compose -f $COMPOSE_FILE exec app sh"
echo ""
