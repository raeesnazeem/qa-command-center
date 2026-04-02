import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';

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
    .single();
  if (error || !data) throw new Error(`User not synced: ${clerkIdOrUuid}`);
  return data.id;
}

/**
 * GET /api/dashboard/stats
 * Get aggregated statistics for the dashboard, respecting RBAC.
 */
router.get('/stats', clerkAuth, async (req: Request, res: Response) => {
  const { orgId, role, userId: clerkUserId } = req.auth!;

  if (!orgId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    // 1. Resolve accessible projects based on role
    let projectIds: string[] = [];
    if (role === 'super_admin' || role === 'admin') {
      const { data } = await supabase.from('projects').select('id').eq('org_id', orgId);
      projectIds = data?.map(p => p.id) || [];
    } else {
      const { data } = await supabase.from('project_members').select('project_id').eq('user_id', supabaseUserId);
      projectIds = data?.map(m => m.project_id) || [];
    }

    if (projectIds.length === 0) {
      return res.json({
        open_issues: 0, total_runs: 0, runs_this_week: 0, my_open_tasks: 0, projects_count: 0,
        recent_runs: [], my_tasks: [], pending_signoffs: []
      });
    }

    // 2. Open issues matching permissions
    // Developer: ONLY assigned to them. Others: ALL in their projects.
    let issuesQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'open');
    if (role === 'developer') {
      issuesQuery = issuesQuery.eq('assigned_to', supabaseUserId);
    }
    const { count: openIssuesCount } = await issuesQuery;

    // 3. Runs across accessible projects
    const { count: totalRunsCount } = await supabase.from('qa_runs').select('*', { count: 'exact', head: true }).in('project_id', projectIds);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { count: runsThisWeekCount } = await supabase.from('qa_runs').select('*', { count: 'exact', head: true }).in('project_id', projectIds).gte('created_at', oneWeekAgo.toISOString());

    // 4. My Open Tasks (always for current user)
    const { count: myOpenTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', supabaseUserId).eq('status', 'open');

    // 5. Recent Runs (limit 5)
    const { data: recentRuns } = await supabase.from('qa_runs').select('*, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(5);

    // 6. My Tasks (Top 5 assigned to user)
    const { data: myTasks } = await supabase.from('tasks').select('*, projects(name)').eq('assigned_to', supabaseUserId).eq('status', 'open').order('created_at', { ascending: false }).limit(5);

    // 7. Pending Sign-offs (Only for management)
    let pendingSignoffs = [];
    if (['super_admin', 'admin', 'sub_admin'].includes(role || '')) {
      const { data: completedRuns } = await supabase.from('qa_runs')
        .select('*, projects(name), sign_offs(id)')
        .in('project_id', projectIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);
      
      pendingSignoffs = (completedRuns || [])
        .filter((run: any) => !run.sign_offs || run.sign_offs.length === 0)
        .slice(0, 5);
    }

    return res.json({
      open_issues: openIssuesCount || 0,
      total_runs: totalRunsCount || 0,
      runs_this_week: runsThisWeekCount || 0,
      my_open_tasks: myOpenTasksCount || 0,
      projects_count: projectIds.length,
      recent_runs: recentRuns || [],
      my_tasks: myTasks || [],
      pending_signoffs: pendingSignoffs
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export { router as dashboardRouter };
