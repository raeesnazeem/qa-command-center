import { Router, Request, Response } from 'express';
import { clerkAuth } from '../middleware/clerkAuth';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router: Router = Router();

router.get('/', clerkAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.error({ error, userId }, 'User not found in Supabase');
      return res.status(404).json({ error: 'User not found in local database', userId });
    }

    return res.json(user);
  } catch (error) {
    logger.error(error, 'Error in /api/me');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as meRouter };