import { Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { exportFigmaFrames, compareScreenshots, queueGeminiCall } from '@qacc/ai';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

async function downloadBuffer(url: string | null | undefined): Promise<Buffer | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    logger.warn({ url, error: error.message }, 'Failed to download image buffer');
    return undefined;
  }
}

export async function processVisualDiffJob(job: Job) {
  const { runId, pageId } = job.data;

  if (!runId || !pageId) {
    throw new Error('Missing runId or pageId in job data');
  }

  logger.info({ runId, pageId }, 'Starting visual diff job');

  // Step 1: Load page record + run record
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*, runs!inner(figma_url, project_id)')
    .eq('id', pageId)
    .single();

  if (pageError || !page) {
    throw new Error(`Failed to load page or run details: ${pageError?.message}`);
  }

  const run = page.runs as any;
  if (!run.figma_url) {
    logger.warn({ runId }, 'No Figma URL provided for this run, skipping visual diff');
    return;
  }

  // Step 2: Get decrypted Figma token from project settings
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('figma_token')
    .eq('id', run.project_id)
    .single();

  if (projectError || !project?.figma_token) {
    throw new Error('Figma token not found in project settings');
  }

  // Step 3: Export Figma frames
  logger.info({ figmaUrl: run.figma_url }, 'Exporting Figma frames...');
  const frames = await exportFigmaFrames(run.figma_url, project.figma_token, supabase, runId);

  // Step 4: Match frames to page URL
  const normalizedPagePath = new URL(page.url).pathname;
  const matchedFrame = frames.find(f => f.pageUrl === normalizedPagePath) || frames[0]; // Fallback to first if no match

  if (!matchedFrame) {
    throw new Error('No Figma frames found to compare');
  }

  // Step 5: Download Figma PNG and Site desktop screenshot
  logger.info({ matchedFrame: matchedFrame.frameName }, 'Downloading images for comparison...');
  const figmaBuffer = await downloadBuffer(matchedFrame.imageUrl);
  const siteBuffer = await downloadBuffer(page.screenshot_url_desktop);

  if (!figmaBuffer || !siteBuffer) {
    throw new Error('Failed to download images for visual diff');
  }

  // Step 6: Call compareScreenshots (via queueGeminiCall)
  logger.info('Analyzing visual differences with Gemini...');
  const diffResult = await queueGeminiCall(() => compareScreenshots(figmaBuffer, siteBuffer, page.url));

  // Step 7: Insert into visual_diffs table
  const { data: visualDiff, error: diffError } = await supabase
    .from('visual_diffs')
    .insert({
      page_id: pageId,
      run_id: runId,
      figma_image_url: matchedFrame.imageUrl,
      site_image_url: page.screenshot_url_desktop,
      issues: diffResult.issues,
      status: 'completed'
    })
    .select()
    .single();

  if (diffError) {
    throw new Error(`Failed to save visual diff results: ${diffError.message}`);
  }

  // Step 8: Create findings of type 'visual_diff' for each identified issue
  if (diffResult.issues.length > 0) {
    const findings = diffResult.issues.map(issue => ({
      run_id: runId,
      page_id: pageId,
      check_factor: 'visual_diff',
      severity: issue.severity,
      title: `[VISUAL DIFF] ${issue.type.toUpperCase()} in ${issue.area}`,
      description: issue.issue,
      status: 'open',
      visual_diff_id: visualDiff.id
    }));

    const { error: findingsError } = await supabase.from('findings').insert(findings);
    if (findingsError) {
      logger.error({ error: findingsError.message }, 'Failed to create findings from visual diff');
    }
  }

  logger.info({ pageId, issuesFound: diffResult.issues.length }, 'Visual diff job completed successfully');
}
