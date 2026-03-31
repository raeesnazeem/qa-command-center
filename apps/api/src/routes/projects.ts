import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateProjectSchema, UpdateProjectSchema } from '@qacc/shared';

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
    const { orgId, userId: clerkUserId } = req.auth!;

    if (!orgId) {
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

    // Fetch projects where the user is a member
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(user_id),
        qa_runs(
          completed_at,
          status
        ),
        tasks(
          status
        )
      `)
      .eq('project_members.user_id', supabaseUserId);

    if (error) throw error;

    const projects = data.map((project: any) => {
      // Compute last successful run date
      const lastRun = project.qa_runs
        ?.filter((r: any) => r.status === 'completed')
        .sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];

      // Compute open issues count
      const openIssuesCount = project.tasks?.filter((t: any) => t.status === 'open').length || 0;

      // Cleanup response object
      const { project_members, qa_runs, tasks, ...rest } = project;

      return {
        ...rest,
        last_run_date: lastRun?.completed_at || null,
        open_issues_count: openIssuesCount,
      };
    });

    return res.json(projects);
  } catch (error: any) {
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
          status,
          completed_at
        ),
        tasks(
          status
        )
      `)
      .eq('id', id)
      .single();

    if (projectError || !projectData) throw projectError || new Error('Project not found');

    // Compute stats
    const totalRuns = projectData.qa_runs?.length || 0;
    const lastRun = projectData.qa_runs
      ?.filter((r: any) => r.status === 'completed')
      .sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
    
    const openIssuesCount = projectData.tasks?.filter((t: any) => t.status === 'open').length || 0;
    const resolvedIssuesCount = projectData.tasks?.filter((t: any) => t.status === 'resolved' || t.status === 'closed').length || 0;

    const { qa_runs, tasks, ...rest } = projectData;

    return res.json({
      ...rest,
      total_runs_count: totalRuns,
      last_run_date: lastRun?.completed_at || null,
      open_issues_count: openIssuesCount,
      resolved_issues_count: resolvedIssuesCount,
    });
  } catch (error: any) {
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

export { router as projectsRouter };

