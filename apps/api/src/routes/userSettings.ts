import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/users/notification-prefs
 * Get notification preferences for the current user.
 */
router.get('/notification-prefs', clerkAuth, async (req: Request, res: Response) => {
  const { userId } = req.auth!;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('notification_prefs')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    // Return preferences or empty object if null
    return res.json(data?.notification_prefs || {});
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Error fetching notification prefs');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/notification-prefs
 * Update notification preferences for the current user.
 */
router.patch('/notification-prefs', clerkAuth, async (req: Request, res: Response) => {
  const { userId } = req.auth!;
  const { notification_prefs, google_chat_user_id } = req.body;

  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (notification_prefs !== undefined) updateData.notification_prefs = notification_prefs;
    if (google_chat_user_id !== undefined) updateData.google_chat_user_id = google_chat_user_id;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('notification_prefs, google_chat_user_id')
      .single();

    if (error) throw error;
    
    logger.info({ userId }, 'Updated user notification preferences');
    return res.json(data.notification_prefs);
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Error updating notification prefs');
    return res.status(500).json({ error: error.message });
  }
});

export const userSettingsRouter: Router = router;
