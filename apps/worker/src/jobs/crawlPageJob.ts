import { Job } from 'bullmq';
import { chromium } from 'playwright';
import { supabase } from '../lib/supabase';
import { qaQueue } from '../lib/queue';
import { screenshotPage } from '../crawlers/pageScreenshotter';
import { checkBrokenLinks } from '../checks/brokenLinksCheck';
import { checkExternalLinks } from '../checks/externalLinkCheck';
import { checkMeta } from '../checks/metaCheck';
import { checkConsoleErrors } from '../checks/consoleErrorCheck';
import { checkDummyContent } from '../checks/dummyContentCheck';
import { checkSpelling } from '../checks/spellingCheck';
import { checkImageCompliance } from '../checks/imageComplianceCheck';
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

  const updateProgress = async (progress: number, step: string) => {
    const { error: progressError } = await supabase
      .from('pages')
      .update({ progress, current_step: step })
      .eq('id', pageId);
    
    if (progressError) {
      logger.error({ pageId, error: progressError.message, progress, step }, 'Failed to update page progress in DB');
    }
    
    const progressChannel = supabase.channel(`run:${runId}`);
    await progressChannel.send({
      type: 'broadcast',
      event: 'page_progress',
      payload: { pageId, progress, current_step: step }
    });
  };

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
    const screenshots = await screenshotPage(pageUrl, runId, pageId, updateProgress);

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

    // Step 4: Run automated checks
    logger.info({ pageId }, 'Running automated checks');
    await updateProgress(90, 'Running quality checks...');

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Console error check listener must be attached before goto
      const consoleErrors: string[] = [];
      const criticalErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && (consoleErrors.length + criticalErrors.length) < 80) {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        if ((consoleErrors.length + criticalErrors.length) < 80) {
          criticalErrors.push(err.message);
        }
      });

      await page.goto(pageUrl, { waitUntil: 'load', timeout: 60000 });

      const [linkFindings, extLinkFindings, metaFindings, consoleFindings, dummyFindings, spellingFindings, imageFindings] = await Promise.all([
        checkBrokenLinks(page, screenshots).catch(e => { logger.error('Broken links check failed:', e); return []; }),
        checkExternalLinks(page, screenshots).catch(e => { logger.error('External links check failed:', e); return []; }),
        checkMeta(page, screenshots).catch(e => { logger.error('Meta check failed:', e); return []; }),
        checkConsoleErrors(page, screenshots).catch(e => { logger.error('Console errors check failed:', e); return []; }),
        checkDummyContent(page, screenshots).catch(e => { logger.error('Dummy content check failed:', e); return []; }),
        checkSpelling(page, screenshots).catch(e => { logger.error('Spelling check failed:', e); return []; }),
        checkImageCompliance(page, screenshots).catch(e => { logger.error('Image compliance check failed:', e); return []; })
      ]);

      const allFindings = [
        ...linkFindings,
        ...extLinkFindings,
        ...metaFindings,
        ...consoleFindings,
        ...dummyFindings,
        ...spellingFindings,
        ...imageFindings
      ].map(f => ({
        ...f,
        page_id: pageId,
        run_id: runId
      }));

      if (allFindings.length > 0) {
        logger.info({ pageId, count: allFindings.length }, 'Inserting findings');
        const { error: findingsError } = await supabase
          .from('findings')
          .insert(allFindings);
        
        if (findingsError) {
          logger.error({ pageId, error: findingsError.message }, 'Failed to insert findings');
        }
      }

      // Add AI Check jobs decoupled to perform asynchronously
      const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');
      
      qaQueue.add('run_ai_checks', { runId, pageId, pageUrl, pageText })
             .catch(e => logger.error('Failed to queue run_ai_checks:', e));
             
      // Step 5: Update page status to 'done'
      await supabase
        .from('pages')
        .update({ status: 'done', progress: 100, current_step: 'All checks complete' })
        .eq('id', pageId);

    } finally {
      await browser.close().catch(e => logger.error({ err: e }, 'Failed to close browser'));
    }

  } catch (error: any) {
    logger.error({ runId, pageUrl, error: error.message }, 'Error during page crawl');
    
    if (pageId) {
      await supabase
        .from('pages')
        .update({ status: 'failed' })
        .eq('id', pageId);
    }
    
    throw error;
  } finally {
    // Step 6: Increment run.pages_processed by 1
    // This MUST run regardless of success/failure so the run doesn't get stuck
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

    // Step 7: Check for run completion
    const { data: runCheck } = await supabase
      .from('qa_runs')
      .select('pages_processed, pages_total')
      .eq('id', runId)
      .single();

    if (runCheck && runCheck.pages_processed >= runCheck.pages_total) {
      await supabase
        .from('qa_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', runId);
      
      logger.info({ runId }, 'Run marked as completed');
    }

    // Step 8: Broadcast progress update
    const finalChannel = supabase.channel(`run:${runId}`);
    await finalChannel.send({
      type: 'broadcast',
      event: 'progress',
      payload: {
        pageUrl,
        status: 'done',
        pageId
      }
    });

    logger.info({ pageId, runId }, 'Page crawl lifecycle finished');
  }
}
