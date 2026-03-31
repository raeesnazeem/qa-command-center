import { Request, Response, NextFunction } from 'express'
import { getAuth } from '@clerk/express'

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

    // Map Clerk's auth object to our local AuthPayload format
    req.auth = {
      userId: auth.userId,
      orgId: auth.orgId || null,
      role: (auth.orgRole as string) || null,
    }

    console.log('--- Clerk Auth Success ---')
    console.log('User:', req.auth.userId)
    console.log('Org:', req.auth.orgId)
    console.log('Role:', req.auth.role)

    next()
  } catch (err: any) {
    console.error('--- Clerk Auth Middleware Error ---')
    console.error('Error:', err.message)
    res.status(401).json({ error: 'Authentication failed', details: err.message })
  }
}
