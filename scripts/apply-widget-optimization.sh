#!/bin/bash
# Script pour appliquer automatiquement withWidgetOptimization à tous les widgets
# Usage: ./apply-widget-optimization.sh

set -e

WIDGETS_DIR="./components/widgets"
WIDGETS=(
    "weather-widget.tsx"
    "chart-widget.tsx"
    "anime-calendar-widget.tsx"
    "notes-widget.tsx"
    "todo-list-widget.tsx"
    "watchlist-widget.tsx"
    "timer-widget.tsx"
    "bookmarks-widget.tsx"
    "quote-widget.tsx"
    "countdown-widget.tsx"
    "link-widget.tsx"
    "ping-widget.tsx"
    "iframe-widget.tsx"
    "datetime-widget.tsx"
)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Application de withWidgetOptimization aux widgets${NC}\n"

for widget in "${WIDGETS[@]}"; do
    WIDGET_PATH="$WIDGETS_DIR/$widget"
    
    # Vérifier si le fichier existe
    if [ ! -f "$WIDGET_PATH" ]; then
        echo -e "${YELLOW}⚠ $widget n'existe pas, ignoré${NC}"
        continue
    fi
    
    # Vérifier si déjà optimisé
    if grep -q "withWidgetOptimization" "$WIDGET_PATH"; then
        echo -e "${YELLOW}✓ $widget déjà optimisé, ignoré${NC}"
        continue
    fi
    
    # Extraire le nom du composant (sans .tsx)
    COMPONENT_NAME=$(basename "$widget" .tsx)
    
    # Convertir kebab-case en PascalCase (ex: weather-widget → WeatherWidget)
    PASCAL_NAME=$(echo "$COMPONENT_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')
    
    # Créer un backup
    cp "$WIDGET_PATH" "${WIDGET_PATH}.backup"
    
    # Trouver la ligne export default
    EXPORT_LINE=$(grep -n "export default" "$WIDGET_PATH" | cut -d: -f1 | head -1)
    
    if [ -z "$EXPORT_LINE" ]; then
        echo -e "${RED}✗ $widget: Impossible de trouver 'export default'${NC}"
        rm "${WIDGET_PATH}.backup"
        continue
    fi
    
    # Ajouter l'import et modifier l'export
    {
        # Tout jusqu'à la ligne avant export
        head -n $((EXPORT_LINE - 1)) "$WIDGET_PATH"
        
        # Ajouter l'import
        echo ""
        echo "// Optimisation: Mémorisation du composant pour éviter les re-renders"
        echo "import { withWidgetOptimization } from '@/lib/widget-optimization';"
        echo ""
        
        # Modifier l'export
        echo "export default withWidgetOptimization($PASCAL_NAME);"
        
        # Le reste du fichier après export
        tail -n +$((EXPORT_LINE + 1)) "$WIDGET_PATH"
    } > "${WIDGET_PATH}.tmp"
    
    # Remplacer le fichier original
    mv "${WIDGET_PATH}.tmp" "$WIDGET_PATH"
    
    echo -e "${GREEN}✓ $widget optimisé${NC}"
    
    # Supprimer le backup
    rm "${WIDGET_PATH}.backup"
done

echo -e "\n${GREEN}✅ Optimisation terminée!${NC}"
echo -e "\n${YELLOW}Prochaines étapes:${NC}"
echo "1. Vérifier que tout compile: npm run build"
echo "2. Tester en dev: npm run dev"
echo "3. Vérifier les re-renders dans React DevTools Profiler"
