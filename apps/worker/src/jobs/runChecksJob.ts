import { Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export async function processRunChecksJob(job: Job) {
  const { runId, pageId, url: pageUrl } = job.data;

  if (!runId || !pageId) {
    throw new Error('Missing runId or pageId for run_checks job');
  }

  logger.info({ runId, pageId, pageUrl }, 'Starting checks for page');

  const updateProgress = async (progress: number, step: string) => {
    await supabase
      .from('pages')
      .update({ progress, current_step: step, status: 'processing' })
      .eq('id', pageId);

    // Broadcast granular update
    const channel = supabase.channel(`run:${runId}`);
    await channel.send({
      type: 'broadcast',
      event: 'page_progress',
      payload: { pageId, progress, current_step: step }
    });
  };

  try {
    // Simulated checks for now to show real-time progress
    await updateProgress(5, 'Initializing page checks...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await updateProgress(20, 'Checking Accessibility (A11y)...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    await updateProgress(40, 'Running SEO Analysis...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    await updateProgress(60, 'Validating Performance Metrics...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    await updateProgress(80, 'Scanning for Console Errors...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await updateProgress(95, 'Finalizing results...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mark as done
    await supabase
      .from('pages')
      .update({ 
        status: 'done', 
        progress: 100, 
        current_step: 'Checks complete' 
      })
      .eq('id', pageId);

    const channel = supabase.channel(`run:${runId}`);
    await channel.send({
      type: 'broadcast',
      event: 'progress',
      payload: { pageId, status: 'done' }
    });

    logger.info({ pageId }, 'Checks completed successfully');
  } catch (error: any) {
    logger.error({ pageId, error: error.message }, 'Error during page checks');
    await supabase
      .from('pages')
      .update({ status: 'failed', current_step: `Error: ${error.message}` })
      .eq('id', pageId);
    throw error;
  }
}
