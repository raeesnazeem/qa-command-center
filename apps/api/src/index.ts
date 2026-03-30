import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { logger } from './lib/logger'
import { defaultRateLimiter } from './middleware/rateLimiter'
import { healthRouter } from './routes/health'
import { webhookRouter } from './routes/webhooks'
import { meRouter } from './routes/me'

const app = express()
const PORT = process.env.PORT ?? 3001

// Security & parsing middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
)

// Webhook mount BEFORE express.json()
// We use express.raw to get the exact bytes needed for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRouter)

app.use(express.json())
app.use(defaultRateLimiter)

// Routes
app.use('/health', healthRouter)
app.use('/api/me', meRouter)

// Placeholder routers — replace with real implementations as they are built
app.use('/api/projects', (_req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }))
app.use('/api/runs', (_req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }))
app.use('/api/tasks', (_req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }))
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
