import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { zodValidate } from '../middleware/zodValidate';
import { CreateTaskSchema, UpdateTaskSchema } from '@qacc/shared';

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
 * Create a new task.
 */
router.post(
  '/',
  clerkAuth,
  zodValidate(CreateTaskSchema),
  async (req: Request, res: Response) => {
    const { project_id, finding_id, title, description, severity, status, assigned_to } = req.body;
    const { userId: clerkUserId } = req.auth!;

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

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id,
          finding_id,
          title,
          description,
          severity,
          status,
          assigned_to,
          created_by: supabaseUserId,
        })
        .select(`
          *,
          users:assigned_to(full_name, email),
          projects(name)
        `)
        .single();

      if (taskError) throw taskError;

      return res.status(201).json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/tasks
 * List tasks. Can filter by project_id.
 */
router.get('/', clerkAuth, async (req: Request, res: Response) => {
  const { project_id } = req.query;
  const { userId: clerkUserId } = req.auth!;

  try {
    const supabaseUserId = await getSupabaseUserId(clerkUserId);

    let query = supabase
      .from('tasks')
      .select(`
        *,
        users:assigned_to(full_name, email),
        projects!inner(name, project_members!inner(user_id))
      `)
      .eq('projects.project_members.user_id', supabaseUserId);

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(tasks);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task.
 */
router.patch(
  '/:id',
  clerkAuth,
  zodValidate(UpdateTaskSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);

      // Verify access via project membership
      const { data: taskCheck, error: accessError } = await supabase
        .from('tasks')
        .select(`
          project_id,
          projects!inner(project_members!inner(user_id))
        `)
        .eq('id', id)
        .eq('projects.project_members.user_id', supabaseUserId)
        .single();

      if (accessError || !taskCheck) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      const { data: task, error: updateError } = await supabase
        .from('tasks')
        .update(req.body)
        .eq('id', id)
        .select(`
          *,
          users:assigned_to(full_name, email),
          projects(name)
        `)
        .single();

      if (updateError) throw updateError;

      return res.json(task);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/tasks/:id
 * Delete a task. Restricted to admin and above.
 */
router.delete(
  '/:id',
  clerkAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId: clerkUserId } = req.auth!;

    try {
      const supabaseUserId = await getSupabaseUserId(clerkUserId);

      // Verify access via project membership
      const { data: taskCheck, error: accessError } = await supabase
        .from('tasks')
        .select(`
          project_id,
          projects!inner(project_members!inner(user_id))
        `)
        .eq('id', id)
        .eq('projects.project_members.user_id', supabaseUserId)
        .single();

      if (accessError || !taskCheck) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export { router as tasksRouter };
