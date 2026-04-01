import { Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { qaQueue } from '../lib/queue';
import { screenshotPage } from '../crawlers/pageScreenshotter';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export async function processCrawlPageJob(job: Job) {
  const { runId, pageId, url: pageUrl } = job.data;

  if (!runId || !pageId || !pageUrl) {
    throw new Error('Missing required data for crawl_page job (runId, pageId, or url)');
  }

  logger.info({ runId, pageId, pageUrl }, 'Processing page crawl');

  try {
    // Step 1: Update page status to 'processing' and set initial step
    logger.info({ pageId }, 'Setting page status to processing');
    const { error: statusError } = await supabase
      .from('pages')
      .update({ 
        status: 'processing',
        current_step: 'Starting page crawl...',
        progress: 2
      })
      .eq('id', pageId);

    if (statusError) {
      logger.error({ pageId, error: statusError.message }, 'Failed to update page status to processing');
    }

    // Immediate broadcast to update UI
    const initialChannel = supabase.channel(`run:${runId}`);
    await initialChannel.send({
      type: 'broadcast',
      event: 'page_progress',
      payload: { pageId, progress: 2, current_step: 'Starting page crawl...' }
    });

    // Step 2: Call screenshotPage(pageUrl, runId, pageId)
    const screenshots = await screenshotPage(pageUrl, runId, pageId, async (progress, step) => {
      const { error: progressError } = await supabase
        .from('pages')
        .update({ progress, current_step: step })
        .eq('id', pageId);
      
      if (progressError) {
        logger.error({ pageId, error: progressError.message, progress, step }, 'Failed to update page granular progress in DB');
      }
      
      // Also broadcast this granular update
      const progressChannel = supabase.channel(`run:${runId}`);
      const broadcastStatus = await progressChannel.send({
        type: 'broadcast',
        event: 'page_progress',
        payload: {
          pageId,
          progress,
          current_step: step
        }
      });

      if (broadcastStatus !== 'ok') {
        logger.warn({ pageId, broadcastStatus }, 'Broadcast of page_progress failed');
      }
    });

    // Step 3: Update page record with screenshot URLs and status='screenshotted'
    const { error: updatePageError } = await supabase
      .from('pages')
      .update({
        screenshot_url_desktop: screenshots.desktopUrl,
        screenshot_url_tablet: screenshots.tabletUrl,
        screenshot_url_mobile: screenshots.mobileUrl,
        status: 'screenshotted'
      })
      .eq('id', pageId);

    if (updatePageError) {
      logger.error({ pageId, error: updatePageError.message }, 'Failed to update page record with screenshots');
    }

    // Step 4: Increment run.pages_processed by 1
    const { error: incrementError } = await supabase.rpc('increment_pages_processed', {
      run_id_param: runId
    });

    // Fallback if RPC doesn't exist yet
    if (incrementError) {
      logger.warn({ runId, error: incrementError.message }, 'RPC increment_pages_processed failed, trying manual update');
      
      const { data: runData } = await supabase
        .from('qa_runs')
        .select('pages_processed')
        .eq('id', runId)
        .single();
      
      if (runData) {
        await supabase
          .from('qa_runs')
          .update({ pages_processed: (runData.pages_processed || 0) + 1 })
          .eq('id', runId);
      }
    }

    // Step 5: Broadcast progress update to Supabase Realtime channel "run:{runId}"
    const finalChannel = supabase.channel(`run:${runId}`);
    await finalChannel.send({
      type: 'broadcast',
      event: 'progress',
      payload: {
        pageUrl,
        status: 'screenshotted',
        pageId
      }
    });

    // Step 6: Add 'run_checks' job for this page
    await qaQueue.add('run_checks', {
      runId,
      pageId,
      url: pageUrl
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });

    logger.info({ pageId, runId }, 'Page crawl and screenshot complete');

  } catch (error: any) {
    logger.error({ runId, pageUrl, error: error.message }, 'Error during page crawl');
    
    if (pageId) {
      await supabase
        .from('pages')
        .update({ status: 'failed' })
        .eq('id', pageId);
    }
    
    throw error;
  }
}
