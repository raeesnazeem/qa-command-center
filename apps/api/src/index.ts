import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { logger } from './lib/logger'
import { defaultRateLimiter } from './middleware/rateLimiter'
import { healthRouter } from './routes/health'
import { webhookRouter } from './routes/webhooks'
import { meRouter } from './routes/me'
import { projectsRouter } from './routes/projects'
import { runsRouter } from './routes/runs'
import { tasksRouter } from './routes/tasks'
import { statsRouter } from './routes/stats'
import { projectSettingsRouter } from './routes/projectSettings'
import { debugRouter } from './routes/debug'
import { testWebhookRouter } from './routes/test-webhook'
import { clerkMiddleware, getAuth } from '@clerk/express'

const app: express.Application = express()
const PORT = process.env.PORT ?? 3001

if (!process.env.CLERK_SECRET_KEY) {
  logger.error('Missing CLERK_SECRET_KEY in environment variables')
} else {
  logger.info('CLERK_SECRET_KEY is set')
}
logger.info(`FRONTEND_URL configured as: ${process.env.FRONTEND_URL}`)

// Security & parsing middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
)

// Webhook mount BEFORE express.json() and BEFORE Clerk middleware
// We use express.raw to get the exact bytes needed for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRouter)

app.use(express.json())
app.use(defaultRateLimiter)

// Clerk middleware for other routes
app.use(clerkMiddleware())

app.use((req, res, next) => {
  const auth = getAuth(req);
  console.log('--- Clerk Auth Debug ---');
  console.log('User ID:', auth.userId);
  console.log('Session ID:', auth.sessionId);
  // @ts-ignore - claims might be sessionClaims in some versions
  console.log('Claims:', auth.sessionClaims || (auth as any).claims);
  next();
});

// Routes
app.use('/api/health', healthRouter)
app.use('/api/me', meRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/runs', runsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/stats', statsRouter)
app.use('/api/projects', projectSettingsRouter)
app.use('/debug', debugRouter)
app.use('/api/findings', (_req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }))
app.use('/api/chat', (_req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }))

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`)
})

export default app
