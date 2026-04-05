import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateProjectSchema, UpdateProjectSchema } from '@qacc/shared';
import { logger } from '../lib/logger';
import { encrypt } from '../lib/encryption';
import axios from 'axios';

const router: Router = Router();

/**
 * Helper to get Supabase user UUID from Clerk ID.
 * Refactored to handle cases where the ID might already be a Supabase UUID from the middleware.
 */
async function getSupabaseUserId(clerkIdOrUuid: string): Promise<string> {
  if (!clerkIdOrUuid) throw new Error('clerkIdOrUuid is required');
  
  // If it's already a UUID, return it
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
 * POST /api/projects
 * Create a new project. Restricted to sub_admin and above.
 */
router.post(
  '/',
  clerkAuth,
  requireRole('sub_admin'),
  zodValidate(CreateProjectSchema),
  async (req: Request, res: Response) => {
    const { name, site_url, client_name, is_woocommerce, is_pre_release } = req.body;
    const { orgId, userId: clerkUserId } = req.auth!;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
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
          is_pre_release: is_pre_release || false,
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
 * List projects based on RBAC.
 */
router.get('/', clerkAuth, async (req: Request, res: Response) => {
  const { userId: clerkUserId, role, orgId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
    let query = supabase
      .from('projects')
      .select(`
        *,
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
      .eq('org_id', orgId);

    // Filter by membership if not super_admin or admin
    if (role !== 'super_admin' && role !== 'admin' && role !== 'qa_engineer') {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', supabaseUserId);
      
      const projectIds = memberships?.map(m => m.project_id) || [];
      if (projectIds.length === 0) return res.json([]);
      query = query.in('id', projectIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const projects = data.map((project: any) => {
      const sortedRuns = project.qa_runs?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
      const lastRun = sortedRuns[0];
      const ongoingRun = project.qa_runs?.find((r: any) => 
        ['running', 'pending', 'paused'].includes(r.status));
      const openIssuesCount = project.tasks?.filter((t: any) => t.status === 'open').length || 0;

      const { qa_runs, tasks, ...rest } = project;
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

    return res.json(projects);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/members
 * Add user to project. Restricted to sub_admin and above.
 */
router.post(
  '/:id/members',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { id: project_id } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'email and role are required' });
    }

    try {
      // 1. Find user in the ORG's users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('org_id', req.auth?.orgId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: `User with email ${email} not found in your organization` });
      }

      // 2. Add to project_members
      const { data, error: insertError } = await supabase
        .from('project_members')
        .upsert({
          project_id,
          user_id: user.id,
          role,
        }, { onConflict: 'project_id,user_id' })
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/projects/:id
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId: clerkUserId, role, orgId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    // Verify access if not super_admin/admin
    if (role !== 'super_admin' && role !== 'admin' && role !== 'qa_engineer') {
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', supabaseUserId)
        .single();

      if (!membership) return res.status(404).json({ error: 'Access denied or project not found' });
    }

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_members(
          role,
          user_id,
          users(full_name, email, role)
        ),
        qa_runs(
          id, status, completed_at, created_at, pages_processed, pages_total,
          creator:users!qa_runs_created_by_fkey (full_name, email)
        ),
        tasks(id, status, severity, created_at),
        project_settings(*)
      `)
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (projectError || !projectData) throw projectError || new Error('Project not found');

    const totalRuns = projectData.qa_runs?.length || 0;
    const sortedRuns = projectData.qa_runs?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
    const lastRun = sortedRuns[0];
    const ongoingRun = projectData.qa_runs?.find((r: any) => 
      ['running', 'pending', 'paused'].includes(r.status));

    const openIssuesCount = projectData.tasks?.filter((t: any) => t.status === 'open').length || 0;
    const resolvedIssuesCount = projectData.tasks?.filter((t: any) => 
      ['resolved', 'closed'].includes(t.status)).length || 0;

    const { qa_runs, tasks, ...rest } = projectData;

    return res.json({
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
      figma_access_token: projectData.project_settings?.[0]?.figma_token_encrypted,
      basecamp_account_id: projectData.project_settings?.[0]?.basecamp_account_id,
      basecamp_project_id: projectData.project_settings?.[0]?.basecamp_project_id,
      basecamp_todo_list_id: projectData.project_settings?.[0]?.basecamp_todolist_id,
      basecamp_api_token: projectData.project_settings?.[0]?.basecamp_token_encrypted
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/projects/:id
 */
router.patch(
  '/:id',
  clerkAuth,
  requireRole('sub_admin'),
  zodValidate(UpdateProjectSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: req.body.name,
          site_url: req.body.site_url,
          client_name: req.body.client_name,
          is_pre_release: req.body.is_pre_release !== undefined ? req.body.is_pre_release : undefined,
          status: req.body.status || 'active'
        })
        .eq('id', id)
        .eq('org_id', req.auth?.orgId)
        .select()
        .single();

      if (error) throw error;

      // Handle project_settings upsert
      const settingsUpdate: any = {};
      if (req.body.figma_access_token !== undefined) {
        settingsUpdate.figma_token_encrypted = req.body.figma_access_token ? encrypt(req.body.figma_access_token) : null;
      }
      if (req.body.basecamp_account_id !== undefined) settingsUpdate.basecamp_account_id = req.body.basecamp_account_id;
      if (req.body.basecamp_project_id !== undefined) settingsUpdate.basecamp_project_id = req.body.basecamp_project_id;
      if (req.body.basecamp_todo_list_id !== undefined) settingsUpdate.basecamp_todolist_id = req.body.basecamp_todo_list_id;
      if (req.body.basecamp_api_token !== undefined) {
        settingsUpdate.basecamp_token_encrypted = req.body.basecamp_api_token ? encrypt(req.body.basecamp_api_token) : null;
      }

      if (Object.keys(settingsUpdate).length > 0) {
        const { error: settingsError } = await supabase
          .from('project_settings')
          .upsert({
            project_id: id,
            ...settingsUpdate,
            updated_at: new Date().toISOString()
          }, { onConflict: 'project_id' });
        
        if (settingsError) throw settingsError;
      }

      return res.json(data);
    } catch (error: any) {
      logger.error({ error, projectId: id }, '[Update Project Error]');
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/projects/:id
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
        .eq('id', id)
        .eq('org_id', req.auth?.orgId);

      if (error) throw error;
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/projects/:id/settings/test-basecamp
 */
router.post(
  '/:id/settings/test-basecamp',
  clerkAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { id: project_id } = req.params;

    try {
      const { data: settings, error } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', project_id)
        .single();

      if (error || !settings) {
        return res.status(404).json({ error: 'Project settings not found' });
      }

      if (!settings.basecamp_token_encrypted || !settings.basecamp_account_id) {
        return res.status(400).json({ error: 'Basecamp configuration missing' });
      }

      const { decrypt } = await import('../lib/encryption');
      const decryptedToken = decrypt(settings.basecamp_token_encrypted);

      const response = await axios.get(
        `https://3.basecampapi.com/${settings.basecamp_account_id}/projects.json`,
        {
          headers: {
            'Authorization': `Bearer ${decryptedToken}`,
            'User-Agent': 'QA Command Center (raees@example.com)',
          },
        }
      );

      return res.json({ success: true, message: 'Connected', projectsCount: response.data?.length });
    } catch (error: any) {
      const message = error.response?.data?.error || error.message;
      return res.status(400).json({ error: `Basecamp API error: ${message}` });
    }
  }
);

export { router as projectsRouter };
