import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { logger } from '../lib/logger';

const router: Router = Router();

/**
 * GET /api/users
 * List all users in the same organization as the current user.
 */
router.get('/', clerkAuth, async (req: Request, res: Response) => {
  const { orgId } = req.auth!;

  if (!orgId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    logger.info({ orgId }, 'Fetching all users for organization');

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('org_id', orgId)
      .order('full_name', { ascending: true });

    if (error) {
      logger.error({ error: error.message }, 'Error fetching workspace users');
      throw error;
    }

    return res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Unhandled error in GET /api/users');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:id
 * Update a user's profile or role. Restricted to admin+.
 */
router.patch('/:id', clerkAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { full_name, role } = req.body;
  const { orgId } = req.auth!;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(full_name && { full_name }),
        ...(role && { role }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message, userId: id }, 'Error updating user');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Remove a user from the organization. Restricted to admin+.
 */
router.delete('/:id', clerkAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { orgId } = req.auth!;

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;
    return res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, userId: id }, 'Error deleting user');
    return res.status(500).json({ error: error.message });
  }
});

export { router as usersRouter };
