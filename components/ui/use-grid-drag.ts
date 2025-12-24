import { useState, useCallback } from 'react';

export function useGridDrag() {
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback(() => {
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    startDrag,
    endDrag,
  };
}
