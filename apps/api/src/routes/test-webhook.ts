import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { randomUUID } from 'crypto';

export const testWebhookRouter = Router();

testWebhookRouter.post('/clerk', async (req: Request, res: Response) => {
  console.log('=== TEST WEBHOOK ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  try {
    const { type, data } = req.body;
    
    if (type === 'user.created') {
      console.log('Processing user.created event');
      const { id: clerk_id, email_addresses, first_name, last_name } = data;
      const email = email_addresses[0]?.email_address;
      const full_name = `${first_name || ''} ${last_name || ''}`.trim();
      
      console.log('User data:', { clerk_id, email, full_name });

      // Check if this is the first user in the system
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      console.log('Current user count:', count);
      const role = (count === 0) ? 'super_admin' : 'developer';
      console.log('Assigned role:', role);

      const { error } = await supabase
        .from('users')
        .insert({
          id: randomUUID(), // Generate UUID for required id field
          clerk_user_id: clerk_id,
          clerk_id: clerk_id,
          email,
          full_name,
          role,
          org_id: null,
        });

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      console.log('User successfully created in Supabase');
    }

    return res.status(200).json({ success: true, type });
  } catch (error) {
    console.error('Error processing test webhook:', error);
    return res.status(500).json({ error: 'Database sync failed', details: error.message });
  }
});
