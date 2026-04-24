import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { broadcastTaskUpdate } from '../lib/realtimeService';
import { qaQueue } from '../lib/queue';
import { 
  CreateTaskSchema, 
  UpdateTaskSchema, 
  CreateCommentSchema, 
  RebuttalSchema 
} from '@qacc/shared';
import * as emailNotifier from '../lib/emailNotifier';
import { logger } from '../lib/logger';

const router: Router = Router();

/**
 * Helper to get Supabase user UUID from Clerk ID.
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
 * POST /api/tasks
 * Create a new task. Restricted to qa_engineer and above.
 */
router.post(
  '/',
  clerkAuth,
  requireRole('qa_engineer'),
  zodValidate(CreateTaskSchema),
  async (req: Request, res: Response) => {
    const { finding_id, project_id, title, description, severity, assigned_to } = req.body;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          finding_id,
          project_id,
          title,
          description,
          severity,
          assigned_to,
          created_by: supabaseUserId,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      // If task is assigned on creation, notify the user
      if (assigned_to) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', assigned_to)
            .single();
          
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', project_id)
            .single();
          
          if (userData && projectData) {
            await emailNotifier.emailTaskAssigned(userData, task, projectData.name);
          }
        } catch (err: any) {
          logger.error(err, `Failed to send assignment email for new task ${task.id}`);
        }
      }

      return res.status(201).json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/tasks
 * List tasks with filters.
 */
router.get('/', clerkAuth, async (req: Request, res: Response) => {
  const { project_id, projectId, status, severity, assigned_to, page = '1', limit = '10' } = req.query;
  const { userId: clerkUserId, role, orgId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        users:assigned_to (id, full_name, email),
        creator:created_by (id, full_name, email),
        projects:project_id (id, name, org_id)
      `, { count: 'exact' });

    // Filter by organization
    query = query.eq('projects.org_id', orgId);

    // Apply filters
    const effectiveProjectId = project_id || projectId;
    if (effectiveProjectId) query = query.eq('project_id', effectiveProjectId);
    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    
    // RBAC: Developer only sees assigned tasks
    if (role === 'developer') {
      query = query.eq('assigned_to', supabaseUserId);
    } else if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    // RBAC: Sub-Admin/QA/PM only see tasks in their project memberships
    else if (role !== 'super_admin' && role !== 'admin') {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', supabaseUserId);
      
      const projectIds = memberships?.map(m => m.project_id) || [];
      if (projectIds.length === 0) return res.json({ data: [], pagination: { total: 0 } });
      query = query.in('project_id', projectIds);
    }

    // Pagination
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/:id
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId: clerkUserId, role, orgId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        users:assigned_to (id, full_name, email),
        creator:created_by (id, full_name, email),
        projects (id, name, org_id),
        comments (
          *,
          users:author_id (full_name, email)
        ),
        rebuttals (
          *,
          users:submitted_by (full_name, email)
        )
      `)
      .eq('id', id)
      .eq('projects.org_id', orgId)
      .single();

    const task = data as any;

    if (error || !task) return res.status(404).json({ error: 'Task not found' });

    // RBAC Check
    if (role === 'developer' && task.assigned_to !== supabaseUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(task);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tasks/:id
 */
router.patch(
  '/:id',
  clerkAuth,
  zodValidate(UpdateTaskSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, assigned_to, description } = req.body;
    try {
      let targetUserId = assigned_to;
      if (assigned_to) {
        targetUserId = await getSupabaseUserId(assigned_to);
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .update({ 
          status, 
          assigned_to: targetUserId, 
          description 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await broadcastTaskUpdate(id, task);
      return res.json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/tasks/:id/assign
 */
router.post(
  '/:id/assign',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id, assigned_to } = req.body;
    const inputId = user_id || assigned_to;
    if (!inputId) return res.status(400).json({ error: 'user_id or assigned_to is required' });

    try {
      const targetUserId = await getSupabaseUserId(inputId);

      const { data: task, error } = await supabase
        .from('tasks')
        .update({ assigned_to: targetUserId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify the user via email
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', targetUserId)
          .single();
        
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', task.project_id)
          .single();
        
        if (userData && projectData) {
          await emailNotifier.emailTaskAssigned(userData, task, projectData.name);
        }
      } catch (err: any) {
        logger.error(err, `Failed to send assignment email for task ${id}`);
      }

      await broadcastTaskUpdate(id, task);
      return res.json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/tasks/:id/comments
 */
router.post(
  '/:id/comments',
  clerkAuth,
  zodValidate(CreateCommentSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          task_id: id,
          author_id: supabaseUserId,
          content
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(comment);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/tasks/:id/rebuttals
 */
router.post(
  '/:id/rebuttals',
  clerkAuth,
  requireRole('developer'),
  zodValidate(RebuttalSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { text, screenshot_url } = req.body;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);
      const { data: rebuttal, error } = await supabase
        .from('rebuttals')
        .insert({
          task_id: id,
          submitted_by: supabaseUserId,
          text,
          screenshot_url
        })
        .select()
        .single();

      if (error) throw error;

      await qaQueue.add('analyze_rebuttal', { rebuttalId: rebuttal.id, taskId: id }, {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });

      return res.status(201).json(rebuttal);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export { router as tasksRouter };
