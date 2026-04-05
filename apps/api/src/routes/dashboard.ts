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
        open_issues: 0,
        total_runs: 0,
        runs_this_week: 0,
        my_open_tasks: 0,
        projects_count: 0,
        recent_runs: [],
        my_tasks: [],
        pending_signoffs: [],
        pre_release_projects: [],
        post_release_projects: [],
        all_projects: [],
        qa_projects: [],
        dev_projects: []
      });
    }

    // 2. Fetch all relevant projects with their nested data for thorough population
    // This allows us to calculate global stats by summing project-level data
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*, qa_runs(id, status, created_at), tasks(id, status, assigned_to)')
      .in('id', projectIds);

    if (projectsError) throw projectsError;

    const enrichedProjects = (projectsData || []).map((p: any) => ({
      ...p,
      open_issues_count: p.tasks?.filter((t: any) => t.status === 'open').length || 0,
      total_runs_count: p.qa_runs?.length || 0,
      active_runs_count: p.qa_runs?.filter((r: any) => r.status === 'running').length || 0
    }));

    // 3. Calculate Global Stats Dynamically
    const totalRunsCount = enrichedProjects.reduce((sum, p) => sum + p.total_runs_count, 0);
    const projectsCount = enrichedProjects.length;
    
    // Open Issues (Role-based)
    let openIssuesCount = 0;
    if (role === 'developer') {
      openIssuesCount = enrichedProjects.reduce((sum, p) => 
        sum + (p.tasks?.filter((t: any) => t.status === 'open' && t.assigned_to === supabaseUserId).length || 0), 0);
    } else {
      openIssuesCount = enrichedProjects.reduce((sum, p) => sum + p.open_issues_count, 0);
    }

    // Runs this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const runsThisWeekCount = enrichedProjects.reduce((sum, p) => 
      sum + (p.qa_runs?.filter((r: any) => new Date(r.created_at) >= oneWeekAgo).length || 0), 0);

    // 4. My Open Tasks (always for current user)
    const { count: myOpenTasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', supabaseUserId)
      .eq('status', 'open');

    // 5. Recent Runs (limit 5) - Fetch directly for ordering
    const { data: recentRuns } = await supabase
      .from('qa_runs')
      .select('*, projects(name, is_pre_release)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(5);

    // 6. My Tasks (Top 5 assigned to user)
    const { data: myTasks } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('assigned_to', supabaseUserId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

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

    // 8. Role Specific Project Categorization
    let preReleaseProjects = enrichedProjects.filter(p => p.is_pre_release);
    let postReleaseProjects = enrichedProjects.filter(p => !p.is_pre_release);
    let allProjects = [...enrichedProjects].sort((a, b) => a.name.localeCompare(b.name));
    
    let devProjects = []; 
    let qaProjects = [];

    if (role === 'super_admin' || role === 'admin') {
      // Get projects with open tasks assigned to QAs vs Devs for the workspace views
      const { data: tasksWithRoles } = await supabase
        .from('tasks')
        .select('project_id, users!inner(role)')
        .eq('status', 'open')
        .in('project_id', projectIds);

      const qaProjectIds = new Set(tasksWithRoles?.filter(t => t.users.role === 'qa_engineer').map(t => t.project_id));
      const devProjectIds = new Set(tasksWithRoles?.filter(t => t.users.role === 'developer').map(t => t.project_id));

      qaProjects = enrichedProjects.filter(p => qaProjectIds.has(p.id));
      devProjects = enrichedProjects.filter(p => devProjectIds.has(p.id));
    }

    if (role === 'developer') {
      // Filter project lists to only those where dev has assigned tasks
      const devAssignedProjectIds = new Set(enrichedProjects.flatMap(p => 
        p.tasks?.filter((t: any) => t.assigned_to === supabaseUserId).map((t: any) => p.id) || []
      ));

      preReleaseProjects = preReleaseProjects.filter(p => devAssignedProjectIds.has(p.id));
      postReleaseProjects = postReleaseProjects.filter(p => devAssignedProjectIds.has(p.id));
      allProjects = allProjects.filter(p => devAssignedProjectIds.has(p.id));
    }

    return res.json({
      open_issues: openIssuesCount || 0,
      total_runs: totalRunsCount || 0,
      runs_this_week: runsThisWeekCount || 0,
      my_open_tasks: myOpenTasksCount || 0,
      projects_count: projectsCount,
      recent_runs: recentRuns || [],
      my_tasks: myTasks || [],
      pending_signoffs: pendingSignoffs,
      pre_release_projects: preReleaseProjects,
      post_release_projects: postReleaseProjects,
      all_projects: allProjects,
      qa_projects: qaProjects,
      dev_projects: devProjects
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export { router as dashboardRouter };
