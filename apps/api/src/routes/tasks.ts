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
  const { userId: clerkUserId, role } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        users:assigned_to (id, full_name, email),
        projects:project_id (id, name)
      `, { count: 'exact' });

    const effectiveProjectId = project_id || projectId;
    if (effectiveProjectId) query = query.eq('project_id', effectiveProjectId);
    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);

    // RBAC: Developer only sees assigned tasks
    if (role === 'developer') {
      query = query.eq('assigned_to', supabaseUserId);
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
 * Get full task with comments and rebuttals.
 */
router.get('/:id', clerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
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
      .single();

    if (error) throw error;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    return res.json(task);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update status, assignee, description (role-checked).
 */
router.patch(
  '/:id',
  clerkAuth,
  zodValidate(UpdateTaskSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, assigned_to, description } = req.body;

    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .update({ status, assigned_to, description })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!task) return res.status(404).json({ error: 'Task not found' });

      // Broadcast update
      await broadcastTaskUpdate(id, task);

      return res.json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/tasks/:id/assign
 * Assign task to a user. Restricted to qa_engineer and above.
 */
router.post(
  '/:id/assign',
  clerkAuth,
  requireRole('qa_engineer'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .update({ assigned_to: user_id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!task) return res.status(404).json({ error: 'Task not found' });

      // Broadcast update
      await broadcastTaskUpdate(id, task);

      return res.json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/tasks/:id/comments
 * Add a comment to a task.
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
 * Add a rebuttal to a task. Restricted to developer.
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

      // Enqueue AI analysis job
      await qaQueue.add(
        'analyze_rebuttal',
        { rebuttalId: rebuttal.id, taskId: id },
        {
          removeOnComplete: true,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      return res.status(201).json(rebuttal);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);


export { router as tasksRouter };
