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
          // Update React Query cache
          queryClient.setQueryData(['run', runId], (oldData: QARun | undefined) => {
            if (!oldData) return payload.new as QARun;
            return { ...oldData, ...payload.new };
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    // 2. Subscribe to custom broadcast channel for progress events
    // This is used by the worker to send granular progress (like specific page crawl completion)
    const broadcastChannel = supabase
      .channel(`run:${runId}`)
      .on('broadcast', { event: 'progress' }, (payload) => {
        console.log('Granular progress broadcast received:', payload);
        // We don't update the run cache here as this is specific page progress
        // But we could trigger a refresh or update a different cache if needed
        // For now, we just ensure the subscription works as requested
      })
      .subscribe();

    return () => {
      runChannel.unsubscribe();
      broadcastChannel.unsubscribe();
    };
  }, [runId, queryClient]);

  return { isConnected };
};
