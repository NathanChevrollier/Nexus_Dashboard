#!/bin/bash
# Script de déploiement en production pour Nexus Dashboard
# Usage: ./deploy.sh [start|stop|restart|logs|status|backup]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
PROJECT_NAME="nexus-dashboard"
BACKUP_DIR="./backups"

# Fonctions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_requirements() {
    print_header "Vérification des prérequis"
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi
    print_success "Docker installé: $(docker --version)"
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        exit 1
    fi
    print_success "Docker Compose installé: $(docker-compose --version)"
    
    # Vérifier les secrets
    if [ ! -f "./secrets/db_password.txt" ] || [ ! -f "./secrets/nextauth_secret.txt" ]; then
        print_error "Secrets manquants! Exécutez d'abord: ./scripts/generate-secrets.sh"
        exit 1
    fi
    print_success "Secrets présents"
    
    # Vérifier le fichier de configuration
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Fichier $COMPOSE_FILE manquant"
        exit 1
    fi
    print_success "Fichier de configuration présent"
}

start_services() {
    print_header "Démarrage des services"
    
    # Pull des images
    echo -e "\n${BLUE}📦 Téléchargement des images...${NC}"
    docker-compose -f $COMPOSE_FILE pull
    
    # Build de l'application
    echo -e "\n${BLUE}🔨 Build de l'application...${NC}"
    docker-compose -f $COMPOSE_FILE build --no-cache app
    
    # Démarrage
    echo -e "\n${BLUE}🚀 Démarrage des conteneurs...${NC}"
    docker-compose -f $COMPOSE_FILE up -d
    
    # Attendre que les services soient prêts
    echo -e "\n${BLUE}⏳ Attente du démarrage complet...${NC}"
    sleep 10
    
    # Vérifier le statut
    check_health
    
    print_success "Services démarrés avec succès!"
}

stop_services() {
    print_header "Arrêt des services"
    
    docker-compose -f $COMPOSE_FILE down
    
    print_success "Services arrêtés"
}

restart_services() {
    print_header "Redémarrage des services"
    
    stop_services
    sleep 5
    start_services
}

check_health() {
    print_header "Vérification de la santé des services"
    
    # Statut des conteneurs
    echo -e "\n${BLUE}📊 Statut des conteneurs:${NC}"
    docker-compose -f $COMPOSE_FILE ps
    
    # Health check de l'application
    echo -e "\n${BLUE}🏥 Health check de l'application:${NC}"
    sleep 5
    
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health || echo "FAILED")
    
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
        print_success "Application en bonne santé"
        echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
    else
        print_error "Application en mauvaise santé"
        echo "$HEALTH_RESPONSE"
    fi
}

show_logs() {
    print_header "Logs des services"
    
    if [ -z "$2" ]; then
        # Tous les logs
        docker-compose -f $COMPOSE_FILE logs -f --tail=100
    else
        # Logs d'un service spécifique
        docker-compose -f $COMPOSE_FILE logs -f --tail=100 $2
    fi
}

backup_database() {
    print_header "Sauvegarde de la base de données"
    
    # Créer le répertoire de backup
    mkdir -p $BACKUP_DIR
    
    # Nom du fichier de backup
    BACKUP_FILE="$BACKUP_DIR/nexus_$(date +%Y%m%d_%H%M%S).sql"
    
    # Dump de la base
    echo -e "\n${BLUE}💾 Création du backup...${NC}"
    docker exec nexus-mysql-prod mysqldump \
        -u nexus \
        -p$(cat ./secrets/db_password.txt) \
        nexus_dashboard \
        > $BACKUP_FILE
    
    # Compression
    gzip $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    print_success "Backup créé: $BACKUP_FILE"
    
    # Afficher la taille
    SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo -e "Taille: ${BLUE}$SIZE${NC}"
    
    # Nettoyage des vieux backups (garder 7 jours)
    echo -e "\n${BLUE}🧹 Nettoyage des anciens backups...${NC}"
    find $BACKUP_DIR -name "nexus_*.sql.gz" -mtime +7 -delete
    
    REMAINING=$(ls -1 $BACKUP_DIR/*.sql.gz 2>/dev/null | wc -l)
    print_success "$REMAINING backups conservés"
}

show_status() {
    print_header "Statut du système"
    
    # Conteneurs
    echo -e "\n${BLUE}🐳 Conteneurs Docker:${NC}"
    docker-compose -f $COMPOSE_FILE ps
    
    # Ressources
    echo -e "\n${BLUE}📊 Utilisation des ressources:${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
        nexus-mysql-prod nexus-app-prod nexus-nginx 2>/dev/null || echo "Services non démarrés"
    
    # Volumes
    echo -e "\n${BLUE}💾 Volumes:${NC}"
    docker volume ls | grep nexus || echo "Aucun volume trouvé"
    
    # Espace disque
    echo -e "\n${BLUE}💿 Espace disque:${NC}"
    df -h / | tail -n 1
}

update_app() {
    print_header "Mise à jour de l'application"
    
    # Backup avant la mise à jour
    backup_database
    
    # Pull du code (si Git)
    if [ -d ".git" ]; then
        echo -e "\n${BLUE}📥 Pull du code...${NC}"
        git pull
        print_success "Code mis à jour"
    fi
    
    # Rebuild et redémarrage
    echo -e "\n${BLUE}🔄 Rebuild et redémarrage...${NC}"
    docker-compose -f $COMPOSE_FILE build --no-cache app
    docker-compose -f $COMPOSE_FILE up -d --force-recreate app
    
    # Vérification
    sleep 10
    check_health
    
    print_success "Mise à jour terminée!"
}

# Menu principal
case "${1:-}" in
    start)
        check_requirements
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    backup)
        backup_database
        ;;
    update)
        update_app
        ;;
    health)
        check_health
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs [service]|status|backup|update|health}"
        echo ""
        echo "Commandes:"
        echo "  start   - Démarre tous les services"
        echo "  stop    - Arrête tous les services"
        echo "  restart - Redémarre tous les services"
        echo "  logs    - Affiche les logs (optionnel: spécifier un service)"
        echo "  status  - Affiche le statut du système"
        echo "  backup  - Crée une sauvegarde de la base de données"
        echo "  update  - Met à jour et redéploie l'application"
        echo "  health  - Vérifie la santé des services"
        echo ""
        echo "Exemples:"
        echo "  $0 start"
        echo "  $0 logs app"
        echo "  $0 backup"
        exit 1
        ;;
esac
