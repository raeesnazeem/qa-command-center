import 'dotenv/config';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { processTestJob } from './jobs/testJob';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const redisUrl = process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  logger.error('UPSTASH_REDIS_URL is not defined in environment variables');
  process.exit(1);
}

// BullMQ connection options
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

const queueName = 'qa-jobs';

// 1. Create the Queue
const qaQueue = new Queue(queueName, { connection });

// 2. Create the Worker
const worker = new Worker(
  queueName,
  async (job: Job) => {
    const { name } = job;
    
    logger.info({ jobId: job.id, jobName: name }, `Job ${name} received`);

    switch (name) {
      case 'start_run':
        // Stub for starting a run
        break;
      case 'crawl_page':
        // Stub for crawling a page
        break;
      case 'run_checks':
        // Stub for running checks
        break;
      case 'generate_embeddings':
        // Stub for generating embeddings
        break;
      case 'test':
        await processTestJob();
        break;
      default:
        logger.warn({ jobName: name }, `Unknown job name: ${name}`);
    }
  },
  { 
    connection,
    concurrency: 5, // Process up to 5 jobs simultaneously
  }
);

// 3. Error Handling
worker.on('error', (err) => {
  logger.error(err, 'Worker error occurred');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Job completed successfully');
});

// Queue events for monitoring
const queueEvents = new QueueEvents(queueName, { connection });

logger.info(`Worker started, consuming queue: ${queueName}`);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
