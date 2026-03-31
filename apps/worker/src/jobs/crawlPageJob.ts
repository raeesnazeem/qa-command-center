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
  const { runId, pageUrl, pageIndex, totalPages } = job.data;

  if (!runId || !pageUrl) {
    throw new Error('Missing required data for crawl_page job');
  }

  logger.info({ runId, pageUrl, pageIndex }, 'Processing page crawl');

  let pageId: string | null = null;

  try {
    // Step 1: Insert page record into pages table with status='pending'
    const { data: pageRecord, error: insertError } = await supabase
      .from('pages')
      .insert({
        run_id: runId,
        url: pageUrl,
        status: 'pending'
      })
      .select('id')
      .single();

    if (insertError || !pageRecord) {
      throw new Error(`Failed to insert page record: ${insertError?.message}`);
    }

    pageId = pageRecord.id;

    // Step 2: Call screenshotPage(pageUrl, runId, pageId)
    const screenshots = await screenshotPage(pageUrl, runId, pageId as string);

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

    // Fallback if RPC doesn't exist yet (though we should create it)
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
    const channel = supabase.channel(`run:${runId}`);
    await channel.send({
      type: 'broadcast',
      event: 'progress',
      payload: {
        pageUrl,
        pageIndex,
        totalPages,
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
    
    // We throw to let BullMQ handle retries if configured, 
    // but the requirement says "continue with next page" which BullMQ does by default for other jobs in the queue.
    throw error;
  }
}
