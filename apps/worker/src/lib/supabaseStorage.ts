import { supabase } from './supabase';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const BUCKET_NAME = 'screenshots';

/**
 * Ensures the screenshots bucket exists.
 */
async function ensureBucketExists() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    logger.error({ error: listError.message }, 'Failed to list buckets');
    return;
  }

  const exists = buckets.some(b => b.name === BUCKET_NAME);
  
  if (!exists) {
    logger.info({ bucket: BUCKET_NAME }, 'Creating storage bucket');
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      allowedMimeTypes: ['image/png', 'image/jpeg'],
    });

    if (createError) {
      logger.error({ error: createError.message }, 'Failed to create bucket');
    }
  }
}

/**
 * Uploads a screenshot buffer to Supabase Storage and returns a signed URL.
 */
export async function uploadScreenshot(buffer: Buffer, path: string): Promise<string> {
  await ensureBucketExists();

  logger.info({ path }, 'Uploading screenshot to storage');

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    logger.error({ path, error: uploadError.message }, 'Failed to upload screenshot');
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Generate signed URL (1 hour expiry)
  const { data, error: signedUrlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600);

  if (signedUrlError || !data?.signedUrl) {
    logger.error({ path, error: signedUrlError?.message }, 'Failed to generate signed URL');
    throw new Error(`Failed to generate signed URL: ${signedUrlError?.message}`);
  }

  return data.signedUrl;
}
