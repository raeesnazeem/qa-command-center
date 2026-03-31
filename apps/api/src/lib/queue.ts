import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  throw new Error('UPSTASH_REDIS_URL is not defined in environment variables');
}

/**
 * BullMQ connection using Upstash Redis
 */
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

/**
 * QA Jobs Queue
 */
export const qaQueue = new Queue('qa-jobs', { connection });

/**
 * Enqueue a crawler job for a specific QA run
 * @param runId The UUID of the qa_run
 */
export const addRunJob = async (runId: string) => {
  return qaQueue.add(
    'start_run',
    { runId },
    {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );
};
