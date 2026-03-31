import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';

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
 * GET /api/dashboard/stats
 * Get aggregated statistics for the dashboard.
 */
router.get('/stats', clerkAuth, async (req: Request, res: Response) => {
  const { orgId } = req.auth!;
  const clerkUserId = req.auth!.userId;

  if (!orgId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    // 1. Get project IDs for the organization
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', orgId);

    if (projectsError) throw projectsError;
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return res.json({
        open_issues: 0,
        total_runs: 0,
        runs_this_week: 0,
        my_open_tasks: 0,
        projects_count: 0
      });
    }

    // 2. Aggregate Stats
    
    // Projects count
    const projectsCount = projectIds.length;

    // Open issues count across all projects in org
    const { count: openIssuesCount, error: issuesError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .eq('status', 'open');

    if (issuesError) throw issuesError;

    // Total runs count across all projects in org
    const { count: totalRunsCount, error: runsError } = await supabase
      .from('qa_runs')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds);

    if (runsError) throw runsError;

    // Runs this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { count: runsThisWeekCount, error: weeklyRunsError } = await supabase
      .from('qa_runs')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .gte('created_at', oneWeekAgo.toISOString());

    if (weeklyRunsError) throw weeklyRunsError;

    // My open tasks count
    const { count: myOpenTasksCount, error: myTasksCountError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', supabaseUserId)
      .eq('status', 'open');

    if (myTasksCountError) throw myTasksCountError;

    // 3. Fetch Lists for UI components

    // Recent QA Runs (Last 5 across all projects)
    const { data: recentRuns, error: recentRunsError } = await supabase
      .from('qa_runs')
      .select('*, projects(name)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRunsError) throw recentRunsError;

    // My Tasks (Top 5 assigned to user)
    const { data: myTasks, error: myTasksError } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('assigned_to', supabaseUserId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (myTasksError) throw myTasksError;

    // Pending Sign-offs (Runs completed but not signed off)
    // We fetch completed runs and then filter out those with sign-offs
    const { data: completedRuns, error: completedRunsError } = await supabase
      .from('qa_runs')
      .select('*, projects(name), sign_offs(id)')
      .in('project_id', projectIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (completedRunsError) throw completedRunsError;

    const pendingSignoffs = (completedRuns || [])
      .filter((run: any) => !run.sign_offs || run.sign_offs.length === 0)
      .slice(0, 5);

    return res.json({
      open_issues: openIssuesCount || 0,
      total_runs: totalRunsCount || 0,
      runs_this_week: runsThisWeekCount || 0,
      my_open_tasks: myOpenTasksCount || 0,
      projects_count: projectsCount,
      recent_runs: recentRuns || [],
      my_tasks: myTasks || [],
      pending_signoffs: pendingSignoffs
    });
  } catch (error: any) {
    console.error('[Dashboard Stats Error]:', error);
    return res.status(500).json({ error: error.message });
  }
});

export { router as dashboardRouter };
