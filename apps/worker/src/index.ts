import 'dotenv/config';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { processTestJob } from './jobs/testJob';
import { processStartRunJob } from './jobs/startRunJob';
import { processCrawlPageJob } from './jobs/crawlPageJob';
import { processRunChecksJob } from './jobs/runChecksJob';
import { processAnalyzeRebuttalJob } from './jobs/analyzeRebuttalJob';
import { processVisualDiffJob } from './jobs/visualDiffJob';
import { processGenerateEmbeddingsJob } from './jobs/generateEmbeddingsJob';

import { processRunAiChecksJob } from './jobs/runAiChecksJob';

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
  enableReadyCheck: false,
  tls: redisUrl.startsWith('rediss://') ? {
    rejectUnauthorized: false
  } : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  connectTimeout: 10000,
  keepAlive: 10000,
});

const queueName = 'qa-jobs';

// 1. Create the Queue
const qaQueue = new Queue(queueName, { connection });

// 2. Create the Worker
const worker = new Worker(
  queueName,
  async (job: Job) => {
    const { name } = job;
    
    logger.info({ jobId: job.id, jobName: name, data: job.data }, `Job ${name} received - starting processing`);

    try {
      switch (name) {
        case 'start_run':
          await processStartRunJob(job);
          break;
        case 'crawl_page':
          await processCrawlPageJob(job);
          break;
        case 'run_checks':
          await processRunChecksJob(job);
          break;
        case 'run_ai_checks':
        case 'queueGeminiCall':
          await processRunAiChecksJob(job);
          break;
        case 'analyze_rebuttal':
          await processAnalyzeRebuttalJob(job);
          break;
        case 'visual_diff':
          await processVisualDiffJob(job);
          break;
        case 'generate_embeddings':
          await processGenerateEmbeddingsJob(job);
          break;
        case 'test':
          await processTestJob();
          break;
        default:
          logger.warn({ jobName: name }, `Unknown job name: ${name}`);
      }
      logger.info({ jobId: job.id, jobName: name }, `Job ${name} finished processing`);
    } catch (error: any) {
      logger.error({ jobId: job.id, jobName: name, error: error.message, stack: error.stack }, `Error processing job ${name}`);
      throw error;
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
