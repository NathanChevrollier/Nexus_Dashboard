import { useCallback, useRef } from 'react';

/**
 * Hook pour débouncer les appels d'update de widgets
 * Évite les appels excessifs à la base de données
 */
export function useDebouncedUpdate<T extends (...args: any[]) => Promise<any>>(
  updateFn: T,
  delay = 1000
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      // Annuler le timeout précédent
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Créer un nouveau timeout
      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await updateFn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    },
    [updateFn, delay]
  ) as T;

  return debouncedFn;
}

/**
 * Hook pour batching - accumule plusieurs updates et les envoie en une fois
 */
export function useBatchedUpdate<T>(
  updateFn: (items: T[]) => Promise<any>,
  delay = 500
) {
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const flush = useCallback(async () => {
    if (batchRef.current.length > 0) {
      const items = [...batchRef.current];
      batchRef.current = [];
      await updateFn(items);
    }
  }, [updateFn]);

  const addToBatch = useCallback(
    (item: T) => {
      batchRef.current.push(item);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(flush, delay);
    },
    [flush, delay]
  );

  return { addToBatch, flush };
}
