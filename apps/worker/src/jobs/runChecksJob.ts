import { Job } from 'bullmq';
import { chromium } from 'playwright';
import { supabase } from '../lib/supabase';
import { checkBrokenLinks } from '../checks/brokenLinksCheck';
import { checkExternalLinks } from '../checks/externalLinkCheck';
import { checkMeta } from '../checks/metaCheck';
import { checkConsoleErrors } from '../checks/consoleErrorCheck';
import { checkDummyContent } from '../checks/dummyContentCheck';
import { checkImageCompliance } from '../checks/imageComplianceCheck';
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
    // Load page from DB to ensure we have the latest data
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    await updateProgress(10, 'Initializing quality checks...');

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const context = await browser.newContext();
      const playwrightPage = await context.newPage();

      // Initialize Playwright page with console listener (via checkConsoleErrors internal setup if needed, 
      // or explicit here as per prompt "console listener must be attached before page.goto()")
      const consoleErrors: string[] = [];
      const criticalErrors: string[] = [];

      playwrightPage.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      playwrightPage.on('pageerror', err => {
        criticalErrors.push(err.message);
      });

      await updateProgress(30, 'Navigating to page...');
      await playwrightPage.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });

      await updateProgress(60, 'Running automated audits...');
      
      // Run all checks in parallel
      const [
        linkFindings,
        extLinkFindings,
        metaFindings,
        consoleFindings,
        dummyFindings,
        imageFindings
      ] = await Promise.all([
        checkBrokenLinks(playwrightPage, page),
        checkExternalLinks(playwrightPage, page),
        checkMeta(playwrightPage, page),
        checkConsoleErrors(playwrightPage, page),
        checkDummyContent(playwrightPage, page),
        checkImageCompliance(playwrightPage, page)
      ]);

      const allFindings = [
        ...linkFindings,
        ...extLinkFindings,
        ...metaFindings,
        ...consoleFindings,
        ...dummyFindings,
        ...imageFindings
      ].map(f => ({
        ...f,
        page_id: pageId,
        run_id: runId
      }));

      if (allFindings.length > 0) {
        await updateProgress(80, `Saving ${allFindings.length} findings...`);
        const { error: insertError } = await supabase
          .from('findings')
          .insert(allFindings);

        if (insertError) {
          logger.error({ pageId, error: insertError.message }, 'Failed to insert findings');
        }
      }

      await updateProgress(95, 'Finalizing check results...');

    } finally {
      await browser.close();
    }

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
