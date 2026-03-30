import { Request, Response, NextFunction } from 'express'
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

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
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = await clerk.verifyToken(token)

    req.auth = {
      userId: payload.sub,
      orgId: (payload.org_id as string) ?? null,
      role: (payload.org_role as string) ?? null,
    }

    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
