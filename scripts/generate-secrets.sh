#!/bin/bash
# Script de génération des secrets pour Docker
# Usage: ./generate-secrets.sh

set -e

SECRETS_DIR="./secrets"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Génération des secrets pour Nexus Dashboard"
echo "================================================"

# Créer le répertoire secrets s'il n'existe pas
if [ ! -d "$SECRETS_DIR" ]; then
  mkdir -p "$SECRETS_DIR"
  echo -e "${GREEN}✓ Répertoire secrets/ créé${NC}"
fi

# Fonction pour générer un mot de passe sécurisé
generate_password() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Générer le mot de passe root MySQL
if [ ! -f "$SECRETS_DIR/db_root_password.txt" ]; then
  DB_ROOT_PASSWORD=$(generate_password)
  echo -n "$DB_ROOT_PASSWORD" > "$SECRETS_DIR/db_root_password.txt"
  chmod 600 "$SECRETS_DIR/db_root_password.txt"
  echo -e "${GREEN}✓ db_root_password.txt généré${NC}"
else
  echo -e "${YELLOW}⚠ db_root_password.txt existe déjà (ignoré)${NC}"
fi

# Générer le mot de passe utilisateur MySQL
if [ ! -f "$SECRETS_DIR/db_password.txt" ]; then
  DB_PASSWORD=$(generate_password)
  echo -n "$DB_PASSWORD" > "$SECRETS_DIR/db_password.txt"
  chmod 600 "$SECRETS_DIR/db_password.txt"
  echo -e "${GREEN}✓ db_password.txt généré${NC}"
else
  echo -e "${YELLOW}⚠ db_password.txt existe déjà (ignoré)${NC}"
fi

# Générer le secret NextAuth
if [ ! -f "$SECRETS_DIR/nextauth_secret.txt" ]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 64 | tr -d "\n")
  echo -n "$NEXTAUTH_SECRET" > "$SECRETS_DIR/nextauth_secret.txt"
  chmod 600 "$SECRETS_DIR/nextauth_secret.txt"
  echo -e "${GREEN}✓ nextauth_secret.txt généré${NC}"
else
  echo -e "${YELLOW}⚠ nextauth_secret.txt existe déjà (ignoré)${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Secrets générés avec succès!${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT:${NC}"
echo "1. Ne JAMAIS commiter le dossier secrets/ dans Git"
echo "2. Sauvegarder ces secrets de manière sécurisée"
echo "3. Les fichiers ont les permissions 600 (lecture seule pour vous)"
echo ""
echo "Pour voir un secret:"
echo "  cat $SECRETS_DIR/db_password.txt"
echo ""
echo "Pour déployer en production:"
echo "  docker-compose -f docker-compose.production.yml up -d"
