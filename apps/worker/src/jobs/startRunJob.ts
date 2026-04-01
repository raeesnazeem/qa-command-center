import { Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { qaQueue } from '../lib/queue';
import { crawlSitemap } from '../crawlers/sitemapCrawler';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export async function processStartRunJob(job: Job) {
  const { runId } = job.data;
  
  if (!runId) {
    throw new Error('No runId provided to start_run job');
  }

  logger.info({ runId }, 'Starting run processing');

  // Step 1: Fetch run from Supabase
  const { data: run, error: fetchError } = await supabase
    .from('qa_runs')
    .select('id, site_url, project_id, selected_urls')
    .eq('id', runId)
    .single();

  if (fetchError || !run) {
    throw new Error(`Failed to fetch run ${runId}: ${fetchError?.message}`);
  }

  // Step 2: Update run status to 'running'
  const { error: updateError } = await supabase
    .from('qa_runs')
    .update({ 
      status: 'running',
      started_at: new Date().toISOString()
    })
    .eq('id', runId);

  if (updateError) {
    logger.error({ runId, error: updateError.message }, 'Failed to update run status to running');
  }

  try {
    // Step 3: Get URLs to process
    let urls: string[] = [];
    
    logger.info({ runId }, 'Determining URLs to process');
    if (run.selected_urls && run.selected_urls.length > 0) {
      logger.info({ runId, count: run.selected_urls.length }, 'Using provided selected_urls');
      urls = run.selected_urls;
    } else {
      logger.info({ runId, siteUrl: run.site_url }, 'Crawling site for pages (crawlSitemap)');
      urls = await crawlSitemap(run.site_url);
    }
    
    logger.info({ runId, count: urls.length }, 'URL collection complete');

    // Step 4: Update run.pages_total with URL count
    const { error: totalError } = await supabase
      .from('qa_runs')
      .update({ pages_total: urls.length })
      .eq('id', runId);

    if (totalError) {
      logger.error({ runId, error: totalError.message }, 'Failed to update pages_total');
    }

    // Step 5 & 6: For each URL, add a 'crawl_page' job AND insert into pages table
    // We do this in batches for better performance
    logger.info({ runId, count: urls.length }, 'Inserting pages into database');
    const pagesToInsert = urls.map(url => ({
      run_id: runId,
      url: url,
      status: 'pending'
    }));

    const { data: insertedPages, error: insertError } = await supabase
      .from('pages')
      .insert(pagesToInsert)
      .select('id, url');

    if (insertError) {
      logger.error({ runId, error: insertError.message }, 'Failed to insert pages into DB');
      throw new Error(`Failed to insert pages for run ${runId}: ${insertError.message}`);
    }

    // Add jobs to queue for each page discovered
    if (insertedPages) {
      logger.info({ runId, count: insertedPages.length }, 'Enqueuing crawl_page jobs');
      const crawlJobs = insertedPages.map(page => ({
        name: 'crawl_page',
        data: {
          runId,
          pageId: page.id,
          url: page.url,
          projectId: run.project_id
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        }
      }));

      await qaQueue.addBulk(crawlJobs);
      logger.info({ runId, count: crawlJobs.length }, 'Enqueued crawl_page jobs successfully');
    }

  } catch (error: any) {
    logger.error({ runId, error: error.message }, 'Error during sitemap crawl');
    
    // Update status to failed if crawling fails
    await supabase
      .from('qa_runs')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', runId);
      
    throw error;
  }
}
