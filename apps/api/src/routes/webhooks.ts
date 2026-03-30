import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export const webhookRouter = Router();

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

webhookRouter.post('/clerk', async (req: Request, res: Response) => {
  if (!CLERK_WEBHOOK_SECRET) {
    logger.error('CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get headers for verification
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Clerk sends raw body for signature verification
  const payload = JSON.stringify(req.body);
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    logger.error(err, 'Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { id, type, data } = evt;
  logger.info({ type, id }, 'Received Clerk webhook event');

  try {
    if (type === 'user.created') {
      const { id: clerk_id, email_addresses, first_name, last_name } = data;
      const email = email_addresses[0]?.email_address;
      const full_name = `${first_name || ''} ${last_name || ''}`.trim();

      // Check if this is the first user in the system
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const role = (count === 0) ? 'super_admin' : 'developer';

      const { error } = await supabase
        .from('users')
        .insert({
          id: clerk_id,
          email,
          full_name,
          role,
          org_id: null,
        });

      if (error) throw error;
      logger.info({ clerk_id, role }, 'User created in Supabase via webhook');
    }

    if (type === 'user.updated') {
      const { id: clerk_id, email_addresses, first_name, last_name } = data;
      const email = email_addresses[0]?.email_address;
      const full_name = `${first_name || ''} ${last_name || ''}`.trim();

      const { error } = await supabase
        .from('users')
        .update({
          email,
          full_name,
        })
        .eq('id', clerk_id);

      if (error) throw error;
      logger.info({ clerk_id }, 'User updated in Supabase via webhook');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error(error, `Error processing webhook event: ${type}`);
    return res.status(500).json({ error: 'Database sync failed' });
  }
});
