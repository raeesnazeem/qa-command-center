import { Queue, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  throw new Error('UPSTASH_REDIS_URL is not defined in environment variables');
}

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const qaQueue = new Queue('qa-jobs', { connection });

/**
 * Helper to add a job to the QA queue
 */
export const addJob = async (name: string, data: any, opts?: JobsOptions) => {
  return qaQueue.add(name, data, opts);
};

/**
 * Helper to add a 'start_run' job
 */
export const addRunJob = async (runId: string) => {
  return addJob('start_run', { runId }, {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
};
