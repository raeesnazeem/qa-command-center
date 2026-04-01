import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateProjectSchema, UpdateProjectSchema } from '@qacc/shared';
import { logger } from '../lib/logger';

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
 * POST /api/projects
 * Create a new project. Restricted to sub_admin and above.
 * Automatically assigns the creator as sub_admin of the project.
 */
router.post(
  '/',
  clerkAuth,
  requireRole('sub_admin'),
  zodValidate(CreateProjectSchema),
  async (req: Request, res: Response) => {
    const { name, site_url, client_name, is_woocommerce } = req.body;
    
    console.log('--- Project Creation Debug ---');
    console.log('Request Body:', req.body);
    console.log('Auth Context:', req.auth);

    const { orgId, userId: clerkUserId } = req.auth!;

    if (!orgId) {
      console.error('Project creation failed: Missing orgId in req.auth');
      return res.status(400).json({ error: 'Organization ID is required to create a project' });
    }

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);

      // 1. Insert the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name,
          site_url,
          client_name,
          is_woocommerce,
          org_id: orgId,
          status: 'active',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Add creator as project member (sub_admin)
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: supabaseUserId,
          role: 'sub_admin',
        });

      if (memberError) throw memberError;

      return res.status(201).json(project);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/projects
 * List all projects the user is a member of.
 */
router.get('/', clerkAuth, async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    logger.info({ supabaseUserId }, 'Listing projects for user');

    // Fetch projects where the user is a member
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(user_id),
        qa_runs(
          id,
          status,
          completed_at,
          created_at,
          pages_processed,
          pages_total
        ),
        tasks(
          status
        )
      `)
      .eq('project_members.user_id', supabaseUserId);

    if (error) {
      logger.error({ error: error.message }, 'Error listing projects');
      throw error;
    }

    const projects = data.map((project: any) => {
      // Compute last run date (any status)
      const sortedRuns = project.qa_runs
        ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
      const lastRun = sortedRuns[0];

      // Identify ongoing run (if any)
      const ongoingRun = project.qa_runs?.find((r: any) => r.status === 'running' || r.status === 'pending' || r.status === 'paused');

      // Compute open issues count
      const openIssuesCount = project.tasks?.filter((t: any) => t.status === 'open').length || 0;

      // Cleanup response object
      const { project_members, qa_runs, tasks, ...rest } = project;

      return {
        ...rest,
        total_runs_count: project.qa_runs?.length || 0,
        last_run_date: lastRun ? (lastRun.completed_at || lastRun.created_at) : null,
        open_issues_count: openIssuesCount,
        ongoing_run: ongoingRun ? {
          id: ongoingRun.id,
          status: ongoingRun.status,
          pages_processed: ongoingRun.pages_processed,
          pages_total: ongoingRun.pages_total
        } : null
      };
    });

    logger.info({ count: projects.length }, 'Returning projects list');
    return res.json(projects);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Unhandled error in GET /api/projects');
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id/runs', clerkAuth, async (req: Request, res: Response) => {
  const { id: project_id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    logger.info({ project_id, page, limit }, 'Fetching runs for project');
    
    const { data: runs, error, count } = await supabase
      .from('qa_runs')
      .select(`
        id,
        project_id,
        run_type,
        status,
        site_url,
        figma_url,
        pages_total,
        pages_processed,
        enabled_checks,
        is_woocommerce,
        started_at,
        completed_at,
        created_by,
        created_at,
        updated_at,
        creator:users!qa_runs_created_by_fkey (
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ error: error.message }, 'Supabase error fetching runs');
      throw error;
    }

    logger.info({ count: runs?.length, total: count }, 'Fetched runs from Supabase');

    const enrichedRuns = runs.map((run: any) => ({
      ...run,
      created_by_name: run.creator?.full_name || run.creator?.email || 'System',
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
    logger.error({ error: error.message }, 'Error in GET /api/projects/:id/runs');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get a single project details including its members.
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId: clerkUserId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    // Verify membership first
    const { data: membership, error: memberCheckError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', supabaseUserId)
      .single();

    if (memberCheckError || !membership) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Fetch project with member details and basic stats
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_members(
          role,
          user_id,
          users(
            full_name,
            email,
            role
          )
        ),
        qa_runs(
          id,
          status,
          completed_at,
          created_at,
          pages_processed,
          pages_total,
          created_by,
          creator:users!qa_runs_created_by_fkey (
            full_name,
            email
          )
        ),
        tasks(
          id,
          status,
          severity,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (projectError || !projectData) {
      logger.error({ project_id: id, error: projectError?.message }, 'Error fetching project data');
      throw projectError || new Error('Project not found');
    }

    logger.info({ 
      project_id: id, 
      runs_found: projectData.qa_runs?.length,
      tasks_found: projectData.tasks?.length 
    }, 'Project data loaded');

    const totalRuns = projectData.qa_runs?.length || 0;
    const sortedRuns = projectData.qa_runs
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
    const lastRun = sortedRuns[0];
    
    // Identify ongoing run
    const ongoingRun = projectData.qa_runs?.find((r: any) => r.status === 'running' || r.status === 'pending' || r.status === 'paused');

    const openIssuesCount = projectData.tasks?.filter((t: any) => t.status === 'open').length || 0;
    const resolvedIssuesCount = projectData.tasks?.filter((t: any) => t.status === 'resolved' || t.status === 'closed').length || 0;

    // Get concurrent scans count
    const { count: concurrentScans } = await supabase
      .from('qa_runs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['running', 'pending']);

    const { qa_runs, tasks, ...rest } = projectData;

    const responseData = {
      ...rest,
      total_runs_count: totalRuns,
      last_run_date: lastRun ? (lastRun.completed_at || lastRun.created_at) : null,
      open_issues_count: openIssuesCount,
      resolved_issues_count: resolvedIssuesCount,
      ongoing_run: ongoingRun ? {
        id: ongoingRun.id,
        status: ongoingRun.status,
        pages_processed: ongoingRun.pages_processed,
        pages_total: ongoingRun.pages_total,
        created_by_name: ongoingRun.creator?.full_name || ongoingRun.creator?.email || 'System'
      } : null,
      concurrent_scans: concurrentScans || 0
    };

    logger.info({ project_id: id, last_run_date: responseData.last_run_date }, 'Returning project details');
    return res.json(responseData);
  } catch (error: any) {
    logger.error({ project_id: id, error: error.message }, 'Error in GET /api/projects/:id');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/projects/:id
 * Update project details. Restricted to admin and above.
 */
router.patch(
  '/:id',
  clerkAuth,
  requireRole('admin'),
  zodValidate(UpdateProjectSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const { data, error } = await supabase
        .from('projects')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Project not found' });

      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/projects/:id/members
 * Add a member to the project by email. Restricted to admin and above.
 */
router.post(
  '/:id/members',
  clerkAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { id: project_id } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'email and role are required' });
    }

    try {
      // 1. Find user by email in Supabase
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: `User with email ${email} not found in system` });
      }

      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this project' });
      }

      // 3. Add to project
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id,
          user_id: user.id,
          role,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/projects/:id/settings/test-basecamp
 * Test Basecamp connection. Restricted to admin and above.
 */
router.post(
  '/:id/settings/test-basecamp',
  clerkAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    // For now, just a placeholder that simulates a test
    setTimeout(() => {
      res.json({ message: 'Basecamp connection successful (simulated)' });
    }, 1000);
  }
);

/**
 * PATCH /api/projects/:id/members/:userId/role
 * Update a member's role in the project. Restricted to admin and above.
 */
router.patch(
  '/:id/members/:userId/role',
  clerkAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { id: project_id, userId: user_id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }

    try {
      const { data, error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('project_id', project_id)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Member not found in project' });

      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/projects/:id
 * Delete a project. Restricted to admin and above.
 */
router.delete(
  '/:id',
  clerkAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export { router as projectsRouter };

