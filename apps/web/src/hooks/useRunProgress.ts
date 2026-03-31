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
  const pagesProcessed = run?.pages_processed || 0;
  const pagesTotal = run?.pages_total || 0;
  const progress = pagesTotal > 0 ? (pagesProcessed / pagesTotal) * 100 : 0;

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
