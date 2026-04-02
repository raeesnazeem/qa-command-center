import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateRunSchema } from '@qacc/shared';
import { addRunJob } from '../lib/queue';
import { quickFetchUrls } from '../lib/crawler';

const router: Router = Router();

/**
 * Helper to get Supabase user UUID from Clerk ID
 */
async function getSupabaseUserId(clerkIdOrUuid: string): Promise<string> {
  if (clerkIdOrUuid.length === 36 && clerkIdOrUuid.includes('-')) {
    return clerkIdOrUuid;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkIdOrUuid)
    .maybeSingle();
  
  if (error || !data) {
    throw new Error(`User not synced: ${clerkIdOrUuid}`);
  }
  return data.id;
}

/**
 * POST /api/runs
 * Start a new QA run (Status: pending).
 */
router.post(
  '/',
  clerkAuth,
  requireRole('qa_engineer'),
  zodValidate(CreateRunSchema),
  async (req: Request, res: Response) => {
    const { project_id, run_type, site_url, figma_url, enabled_checks, is_woocommerce, device_matrix, selected_urls } = req.body;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);

      const { data: run, error } = await supabase
        .from('qa_runs')
        .insert({
          project_id,
          run_type,
          site_url,
          figma_url,
          enabled_checks,
          is_woocommerce,
          device_matrix,
          selected_urls,
          pages_total: selected_urls ? selected_urls.length : 0,
          status: 'pending',
          created_by: supabaseUserId,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(run);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/runs/fetch-urls
 * Fetch URLs for a site to allow manual selection.
 */
router.post(
  '/fetch-urls',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { site_url } = req.body;

    if (!site_url) {
      return res.status(400).json({ error: 'site_url is required' });
    }

    try {
      const urls = await quickFetchUrls(site_url);
      return res.json({ urls });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/runs/projects/:id/runs
 * List runs for a project with pagination and summary stats.
 */
router.get('/projects/:id/runs', clerkAuth, async (req: Request, res: Response) => {
  const { id: project_id } = req.params;
  const { orgId } = req.auth!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    // Verify project belongs to org
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('org_id', orgId)
      .single();

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: runs, error, count } = await supabase
      .from('qa_runs')
      .select(`
        *,
        users!qa_runs_created_by_fkey (
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const enrichedRuns = runs.map((run: any) => ({
      ...run,
      created_by_name: run.users?.full_name || run.users?.email || 'Unknown',
    }));

    return res.json({
      data: enrichedRuns,
      pagination: {
        page,
        limit,
        total: count,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs/pages/:pageId/findings
 * Get detailed findings for a specific page.
 */
router.get('/pages/:pageId/findings', clerkAuth, async (req: Request, res: Response) => {
  const { pageId } = req.params;

  try {
    const { data: findings, error } = await supabase
      .from('findings')
      .select(`
        *,
        tasks (
          id,
          status,
          rebuttals (
            id,
            ai_verdict,
            ai_confidence,
            ai_reasoning
          )
        )
      `)
      .eq('page_id', pageId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(findings || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs/:id
 * Get full run details, pages, and findings summary.
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Fetch run details with creator info
    const { data: run, error: runError } = await supabase
      .from('qa_runs')
      .select(`
        *,
        users!qa_runs_created_by_fkey (
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // 2. Fetch pages for this run
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('run_id', id)
      .order('created_at', { ascending: true });

    if (pagesError) throw pagesError;

    // 3. Fetch all findings for this run to aggregate per page
    const { data: findings, error: findingsError } = await supabase
      .from('findings')
      .select('id, page_id, check_factor, severity, status')
      .eq('run_id', id);

    if (findingsError) throw findingsError;

    // 4. Aggregate findings per page and for the whole run
    const runFindingCounts: Record<string, number> = {};
    const pageFindingCounts: Record<string, Record<string, number>> = {};

    findings?.forEach((f: any) => {
      // Only count open or confirmed findings
      if (f.status === 'false_positive') return;

      // Global counts
      runFindingCounts[f.check_factor] = (runFindingCounts[f.check_factor] || 0) + 1;
      
      // Per-page counts
      if (!pageFindingCounts[f.page_id]) {
        pageFindingCounts[f.page_id] = {};
      }
      pageFindingCounts[f.page_id][f.check_factor] = (pageFindingCounts[f.page_id][f.check_factor] || 0) + 1;
    });

    // 5. Enrich pages with their finding counts
    const enrichedPages = pages?.map(page => ({
      ...page,
      finding_counts: pageFindingCounts[page.id] || {}
    }));

    // 6. Calculate progress
    const pages_total = run.pages_total || 0;
    const pages_processed = run.pages_processed || 0;
    const progress_percentage = pages_total > 0 ? (pages_processed / pages_total) * 100 : 0;

    // 7. Get concurrent scans count (running or pending in the same organization)
    const { count: concurrentScans } = await supabase
      .from('qa_runs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['running', 'pending']);

    return res.json({
      ...run,
      created_by_name: run.users?.full_name || run.users?.email || 'Unknown',
      pages: enrichedPages,
      finding_counts: runFindingCounts,
      progress_percentage,
      concurrent_scans: concurrentScans || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/findings/:id
 * Update finding details (severity, status, etc.)
 */
router.patch(
  '/findings/:id',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { severity, status } = req.body;

    try {
      const { data: updatedFinding, error } = await supabase
        .from('findings')
        .update({ severity, status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.json(updatedFinding);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/runs/:id/status
 * Update run status with strict state transition rules.
 */
router.patch(
  '/:id/status',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    try {
      const { data: run, error: fetchError } = await supabase
        .from('qa_runs')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError || !run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const currentStatus = run.status;

      // Validate transitions
      const validTransitions: Record<string, string[]> = {
        'pending': ['running', 'cancelled'],
        'running': ['completed', 'failed', 'paused', 'cancelled'],
        'paused': ['running', 'cancelled'],
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return res.status(422).json({
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        });
      }

      const updateData: any = { status: newStatus };
      if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: updatedRun, error: updateError } = await supabase
        .from('qa_runs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json(updatedRun);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/runs/:id/start
 * Manually start a pending QA run and enqueue it in BullMQ.
 */
router.post(
  '/:id/start',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      // 1. Fetch current status
      const { data: run, error: fetchError } = await supabase
        .from('qa_runs')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError || !run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      if (run.status !== 'pending') {
        return res.status(400).json({ 
          error: `Only pending runs can be started. Current status: ${run.status}` 
        });
      }

      // 2. Update status to 'running'
      const { data: updatedRun, error: updateError } = await supabase
        .from('qa_runs')
        .update({ status: 'running' })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 3. Enqueue the job in BullMQ for the worker to pick up
      await addRunJob(id);

      return res.json(updatedRun);
    } catch (error: any) {
      console.error('[Start Run Error]:', error);
      return res.status(500).json({ error: error.message });
    }
  }
);

export { router as runsRouter };
