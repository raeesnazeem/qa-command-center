import React from 'react';
import { useRun } from './useRuns';
import { useRunRealtime } from './useRunRealtime';

/**
 * Custom hook that combines standard polling with Supabase Realtime updates
 * to provide live execution progress for a specific QA run.
 */
export const useRunProgress = (runId: string) => {
  // 1. Primary data fetching with built-in polling
  const { data: run, isLoading, error } = useRun(runId);

  // 2. Realtime subscription (updates React Query cache automatically)
  const { isConnected: isLive } = useRunRealtime(runId);

  // 3. Derived progress values
  const pages = run?.pages || [];
  const pagesProcessed = run?.pages_processed || 0;
  const pagesTotal = run?.pages_total || run?.selected_urls?.length || 0;
  
  // Calculate a more granular progress percentage based on individual page progress
  const progress = React.useMemo(() => {
    if (pagesTotal === 0) return 0;
    
    const progressSum = pages.reduce((acc, page) => {
      if (page.status === 'done' || page.status === 'screenshotted') {
        return acc + 100;
      }
      if (page.status === 'processing') {
        // Ensure we at least show 5% if it's processing to show movement
        return acc + Math.max(5, page.progress || 0);
      }
      return acc;
    }, 0);
    
    const calculated = progressSum / pagesTotal;
    
    // If the run is 'running' but calculated is 0, show 2% to indicate activity
    if (run?.status === 'running' && calculated === 0) {
      return 2;
    }
    
    return Math.min(100, calculated);
  }, [pages, pagesTotal, run?.status]);

  return {
    run,
    progress,
    isLive,
    pagesProcessed,
    pagesTotal,
    isLoading,
    error
  };
};
