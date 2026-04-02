import { Request, Response, NextFunction } from 'express'
import { getAuth } from '@clerk/express'
import { supabase } from '../lib/supabase'
import { randomUUID } from 'crypto'

export interface AuthPayload {
  userId: string
  orgId: string | null
  role: string | null
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export const clerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = getAuth(req)

    if (!auth.userId) {
      console.error('--- Clerk Auth Failed: No User ID in Request ---')
      res.status(401).json({ error: 'Unauthorized', details: 'No active session found' })
      return
    }

    // 1. Get role from Clerk if available
    let role = (auth.orgRole as string) || null
    let orgId: string | null = null

    // 2. Always fetch user from Supabase to get the internal UUID org_id
    console.log(`[clerkAuth] Fetching user profile for ${auth.userId}...`);
    let { data: user, error } = await supabase
      .from('users')
      .select('id, role, org_id')
      .eq('clerk_user_id', auth.userId)
      .maybeSingle()

    // 3. Self-healing: If user doesn't exist in Supabase, create them
    if (!user && !error) {
      console.log(`[clerkAuth] User ${auth.userId} not found in Supabase. Creating profile...`);
      
      // Ensure a default organization exists
      let { data: defaultOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (!defaultOrg) {
        console.log(`[clerkAuth] Creating default organization...`);
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: 'Default Organization' })
          .select()
          .single()
        
        if (!orgError && newOrg) {
          defaultOrg = newOrg;
        }
      }

      if (defaultOrg) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: randomUUID(),
            clerk_user_id: auth.userId,
            clerk_id: auth.userId,
            role: 'developer', // Default role for new users
            org_id: defaultOrg.id
          })
          .select()
          .single()

        if (!insertError && newUser) {
          user = newUser;
          console.log(`[clerkAuth] Created new user profile for ${auth.userId} with org ${defaultOrg.id}`);
        }
      }
    }

    // 4. Resolve role and orgId
    if (user) {
      // Prioritize Clerk role if available, otherwise use DB role
      if (!role) role = user.role;
      // ALWAYS use the UUID from the database for orgId
      orgId = user.org_id;
    }

    // 5. Final safety check: if orgId is still null, find ANY organization
    if (!orgId) {
      console.log(`[clerkAuth] orgId still null for ${auth.userId}, attempting final fallback...`);
      const { data: fallbackOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      if (fallbackOrg) {
        orgId = fallbackOrg.id;
        // Update user so they have it next time
        await supabase.from('users').update({ org_id: orgId }).eq('clerk_user_id', auth.userId);
      }
    }

    // Map to our local AuthPayload format
    req.auth = {
      userId: user?.id || auth.userId, // Prefer Supabase UUID
      clerkUserId: auth.userId,      // Keep original Clerk ID for sync if needed
      orgId: orgId,
      role: role,
    } as any;

    console.log('--- Clerk Auth Success ---')
    console.log('User:', req.auth?.userId)
    console.log('Org:', req.auth?.orgId)
    console.log('Role:', req.auth?.role)

    next()
  } catch (err: any) {
    console.error('--- Clerk Auth Middleware Error ---')
    console.error('Error:', err.message)
    res.status(401).json({ error: 'Authentication failed', details: err.message })
  }
}
