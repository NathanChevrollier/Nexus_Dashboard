/**
 * Higher-Order Component pour optimiser les widgets
 * Ajoute React.memo avec une fonction de comparaison personnalisée
 */

import { memo, ComponentType } from 'react';

interface WidgetProps {
  id: string;
  config: Record<string, any>;
  onUpdate?: (id: string, config: Record<string, any>) => void;
  onDelete?: (id: string) => void;
  [key: string]: any;
}

/**
 * Fonction de comparaison pour React.memo
 * Compare les props de manière profonde pour éviter les re-renders inutiles
 */
function arePropsEqual(
  prevProps: WidgetProps,
  nextProps: WidgetProps
): boolean {
  // Si les IDs sont différents, re-render
  if (prevProps.id !== nextProps.id) {
    return false;
  }

  // Comparer la config de manière profonde
  const prevConfig = JSON.stringify(prevProps.config);
  const nextConfig = JSON.stringify(nextProps.config);
  
  if (prevConfig !== nextConfig) {
    return false;
  }

  // Comparer les autres props importantes
  if (
    prevProps.onUpdate !== nextProps.onUpdate ||
    prevProps.onDelete !== nextProps.onDelete
  ) {
    return false;
  }

  // Props identiques, pas besoin de re-render
  return true;
}

/**
 * HOC pour optimiser un widget
 * Usage: export default withWidgetOptimization(MyWidget);
 */
export function withWidgetOptimization<P extends WidgetProps>(
  Component: ComponentType<P>
): ComponentType<P> {
  const MemoizedComponent = memo(Component, arePropsEqual);
  MemoizedComponent.displayName = `Optimized(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

/**
 * Hook personnalisé pour optimiser les callbacks de widget
 */
export { useCallback, useMemo } from 'react';
