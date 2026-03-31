import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateRunSchema } from '@qacc/shared';

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
 * Start a new QA run. Restricted to qa_engineer and above.
 */
router.post(
  '/',
  clerkAuth,
  requireRole('qa_engineer'),
  zodValidate(CreateRunSchema),
  async (req: Request, res: Response) => {
    const { project_id, run_type, site_url, figma_url, enabled_checks, is_woocommerce } = req.body;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);

      // 1. Verify project membership and role
      const { data: membership, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', project_id)
        .eq('user_id', supabaseUserId)
        .single();

      if (memberError || !membership) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }

      // 2. Insert the run
      const { data: run, error: runError } = await supabase
        .from('qa_runs')
        .insert({
          project_id,
          run_type,
          site_url,
          figma_url,
          enabled_checks,
          is_woocommerce,
          status: 'pending',
          created_by: supabaseUserId,
        })
        .select()
        .single();

      if (runError) throw runError;

      // TODO: Trigger asynchronous processing (crawling/testing) here

      return res.status(201).json(run);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/runs/:id
 * Get details of a specific QA run.
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId: clerkUserId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    // Fetch run with project details to verify access
    const { data: run, error: runError } = await supabase
      .from('qa_runs')
      .select(`
        *,
        projects!inner(
          id,
          name,
          project_members!inner(user_id)
        )
      `)
      .eq('id', id)
      .eq('projects.project_members.user_id', supabaseUserId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run not found or access denied' });
    }

    // Fetch findings for this run with page URLs
    const { data: findings, error: findingsError } = await supabase
      .from('findings')
      .select(`
        *,
        pages(url)
      `)
      .eq('run_id', id);

    if (findingsError) throw findingsError;

    // Flatten findings to include page_url directly
    const flattenedFindings = findings.map((f: any) => ({
      ...f,
      page_url: f.pages?.url || 'Unknown',
      pages: undefined
    }));

    // Fetch pages for this run
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('run_id', id);

    if (pagesError) throw pagesError;

    return res.json({
      ...run,
      findings: flattenedFindings,
      pages,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs
 * List runs for a project (passed as query param).
 */
router.get('/', clerkAuth, async (req: Request, res: Response) => {
  const { project_id } = req.query;
  const { userId: clerkUserId } = req.auth!;

  if (!project_id) {
    return res.status(400).json({ error: 'project_id query parameter is required' });
  }

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    // Verify membership
    const { data: membership, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', supabaseUserId)
      .single();

    if (memberError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: runs, error: runsError } = await supabase
      .from('qa_runs')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (runsError) throw runsError;

    return res.json(runs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export { router as runsRouter };
