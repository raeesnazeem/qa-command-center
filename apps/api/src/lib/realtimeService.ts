import { supabase } from './supabase';

/**
 * Broadcasts a task update via Supabase Realtime.
 * Channel: "tasks"
 */
export async function broadcastTaskUpdate(taskId: string, payload: any): Promise<void> {
  const channel = supabase.channel(`task_update_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'task_updated',
          payload: {
            taskId,
            ...payload,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error(`[RealtimeService] Failed to send broadcast for ${taskId}:`, error);
      } finally {
        supabase.removeChannel(channel);
      }
    }
  });
}

/**
 * Broadcasts QA run progress via Supabase Realtime.
 * Channel: "run:{runId}"
 */
export async function broadcastRunProgress(runId: string, payload: any): Promise<void> {
  try {
    const channel = supabase.channel(`run:${runId}`);
    await channel.send({
      type: 'broadcast',
      event: 'progress_update',
      payload: {
        runId,
        ...payload,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[RealtimeService] Failed to broadcast run progress for ${runId}:`, error);
  }
}
