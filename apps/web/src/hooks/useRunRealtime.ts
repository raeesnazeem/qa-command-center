import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QARun } from '../api/runs.api';

export const useRunRealtime = (runId: string) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!runId) return;

    // 1. Subscribe to table changes for the specific run
    const runChannel = supabase
      .channel(`run-db-changes-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qa_runs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          console.log('Run update received via Realtime:', payload);
          // Instead of manually updating with partial data (which lacks Joined fields like 'pages'),
          // we invalidate to trigger a clean fetch from the API.
          queryClient.invalidateQueries({ queryKey: ['run', runId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pages',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          // When any page is inserted or updated, refetch the full run data
          // to keep the pages list and progress counts in sync
          queryClient.invalidateQueries({ queryKey: ['run', runId] });
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime status for run ${runId}:`, status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.error(`Supabase Realtime error/closed for run ${runId}:`, status);
        }
      });

    // 2. Subscribe to custom broadcast channel for progress events
    const broadcastChannel = supabase
      .channel(`run:${runId}`)
      .on('broadcast', { event: 'progress' }, (payload) => {
        console.log('Granular progress broadcast received:', payload);
        // Instant refetch on broadcast
        queryClient.invalidateQueries({ queryKey: ['run', runId] });
      })
      .on('broadcast', { event: 'page_progress' }, (payload) => {
        console.log('Per-page progress broadcast received:', payload);
        // We could manually update the cache here for smoother UI, 
        // but invalidating is safer for now.
        queryClient.invalidateQueries({ queryKey: ['run', runId] });
      })
      .subscribe();

    return () => {
      runChannel.unsubscribe();
      broadcastChannel.unsubscribe();
    };
  }, [runId, queryClient]);

  return { isConnected };
};
