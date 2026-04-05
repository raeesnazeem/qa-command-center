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

    // 1. Get raw claims to extract name/email
    const claims = auth.sessionClaims as any;
    const email = claims?.email || null;
    const fullName = claims?.full_name || claims?.name || (claims?.first_name ? `${claims.first_name} ${claims.last_name || ''}`.trim() : null);

    // 2. Get role from Clerk if available (priority)
    let role = (auth.orgRole as string) || null
    let orgId: string | null = null

    // 3. Always fetch user from Supabase to get the internal UUID org_id and profile
    console.log(`[clerkAuth] Fetching user profile for ${auth.userId}...`);
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', auth.userId)
      .maybeSingle()

    // 4. Synchronization: Update name/email if they changed or were missing
    if (user && (fullName || email)) {
      const updates: any = {};
      if (fullName && user.full_name !== fullName) updates.full_name = fullName;
      if (email && user.email !== email) updates.email = email;
      
      if (Object.keys(updates).length > 0) {
        console.log(`[clerkAuth] Syncing profile updates for ${auth.userId}:`, updates);
        await supabase.from('users').update(updates).eq('id', user.id);
        // Refresh local user object
        user = { ...user, ...updates };
      }
    }

    // 5. Self-healing: If user doesn't exist in Supabase, create them
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
            email: email,
            full_name: fullName,
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

    // 6. Resolve role and orgId
    if (user) {
      // Trust the database role as the primary source of truth for permissions
      // Clerk roles are only used as a fallback or for initial setup
      if (user.role) {
        // Normalize role string: lowercase and replace spaces/hyphens with underscores
        const normalized = user.role.toLowerCase().replace(/[\s-]/g, '_');
        // Map common variants to internal role names
        if (normalized === 'qa') role = 'qa_engineer';
        else role = normalized;
      } else if (role) {
        // Simple mapping for common Clerk roles if user.role is missing
        const clerkRole = role.toLowerCase().replace(/[\s-]/g, '_');
        if (clerkRole === 'org:admin' || clerkRole === 'admin') role = 'admin';
        else if (clerkRole === 'org:member' || clerkRole === 'member') role = 'developer';
        else if (clerkRole === 'qa') role = 'qa_engineer';
        else role = clerkRole;
      }
      
      // ALWAYS use the UUID from the database for orgId
      orgId = user.org_id;
    }

    // 7. Final safety check: if orgId is still null, find ANY organization
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
    console.log('User:', req.auth?.userId, `(${fullName})`)
    console.log('Org:', req.auth?.orgId)
    console.log('Role:', req.auth?.role)

    next()
  } catch (err: any) {
    console.error('--- Clerk Auth Middleware Error ---')
    console.error('Error:', err.message)
    res.status(401).json({ error: 'Authentication failed', details: err.message })
  }
}
