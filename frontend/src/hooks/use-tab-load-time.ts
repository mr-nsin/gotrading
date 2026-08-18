import { useEffect, useRef } from 'react';

export function useTabLoadTime(tabName: string, isDataLoading: boolean) {
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    // Record start time on initial mount
    if (startTime.current === null) {
      startTime.current = performance.now();
    }

    // When data stops loading, log the time taken
    if (!isDataLoading && startTime.current !== null) {
      const loadTime = performance.now() - startTime.current;
      console.log(`⏱️ [Tab Load Time] ${tabName} fully loaded in ${loadTime.toFixed(0)}ms`);
      // Set to null to prevent double logging on subsequent non-loading renders
      startTime.current = null;
    }
  }, [isDataLoading, tabName]);
}
