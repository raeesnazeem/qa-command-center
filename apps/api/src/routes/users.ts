import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
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

export { router as usersRouter };
