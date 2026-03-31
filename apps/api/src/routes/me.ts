// import { Router, Request, Response } from 'express';
// import { clerkAuth } from '../middleware/clerkAuth';
// import { supabase } from '../lib/supabase';
// import { logger } from '../lib/logger';

// export const meRouter: Router = Router();

// meRouter.get('/', clerkAuth, async (req: Request, res: Response) => {
//   try {
//     const userId = req.auth?.userId;

//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const { data: user, error } = await supabase
//       .from('users')
//       .select('*')
//       .eq('clerk_id', userId)
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         return res.status(404).json({ error: 'User not found in local database' });
//       }
//       throw error;
//     }

//     return res.json(user);
//   } catch (error) {
//     logger.error(error, 'Error in /api/me');
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) return res.status(401).json({ error: 'No Clerk UserID found' });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', userId) // Query by clerk_user_id field
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not synced to Supabase yet', userId });
  }

  return res.json(data);
});

export { router as meRouter };