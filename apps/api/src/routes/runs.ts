import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateRunSchema } from '@qacc/shared';
import { addRunJob } from '../lib/queue';

const router: Router = Router();

/**
 * Helper to get Supabase user UUID from Clerk ID
 */
async function getSupabaseUserId(clerkId: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkId)
    .single();
  
  if (error || !data) {
    throw new Error(`User not synced: ${clerkId}`);
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
    const { project_id, run_type, site_url, figma_url, enabled_checks, is_woocommerce, device_matrix } = req.body;
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
 * GET /api/projects/:id/runs
 * List runs for a project with pagination and summary stats.
 */
router.get('/projects/:id/runs', clerkAuth, async (req: Request, res: Response) => {
  const { id: project_id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    const { data: runs, error, count } = await supabase
      .from('qa_runs')
      .select('*', { count: 'exact' })
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      data: runs,
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
 * GET /api/runs/:id
 * Get full run details, pages, and findings summary.
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Fetch run details
    const { data: run, error: runError } = await supabase
      .from('qa_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // 2. Fetch pages for this run
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('run_id', id);

    if (pagesError) throw pagesError;

    // 3. Fetch finding counts per check factor
    const { data: findingsSummary, error: findingsError } = await supabase
      .from('findings')
      .select('check_factor')
      .eq('run_id', id);

    if (findingsError) throw findingsError;

    const findingCounts: Record<string, number> = {};
    findingsSummary.forEach((f: any) => {
      findingCounts[f.check_factor] = (findingCounts[f.check_factor] || 0) + 1;
    });

    // 4. Calculate progress
    const pages_total = run.pages_total || 0;
    const pages_processed = run.pages_processed || 0;
    const progress_percentage = pages_total > 0 ? (pages_processed / pages_total) * 100 : 0;

    return res.json({
      ...run,
      pages,
      finding_counts: findingCounts,
      progress_percentage,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

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
        'pending': ['running'],
        'running': ['completed', 'failed'],
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return res.status(422).json({
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        });
      }

      const updateData: any = { status: newStatus };
      if (newStatus === 'completed' || newStatus === 'failed') {
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
