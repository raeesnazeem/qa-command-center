import { chromium } from 'playwright';
import sharp from 'sharp';
import { uploadScreenshot } from '../lib/supabaseStorage';
import pino from 'pino';
import { Job } from 'bullmq';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export async function processCaptureScreenshotJob(job: Job) {
  const { url, userId } = job.data;
  
  if (!url) throw new Error('URL is required for capture');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    logger.info({ url, userId }, 'Capturing interactive screenshot');

    // Navigate to URL
    await page.goto(url, { timeout: 30000, waitUntil: 'load' });
    
    // Wait for content to stabilize
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);

    // Take viewport screenshot
    const buffer = await page.screenshot({ fullPage: false });

    // Compress with sharp
    const compressedBuffer = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload to Supabase Storage using a public bucket for Basecamp accessibility
    const timestamp = Date.now();
    const storagePath = `capture/${userId || 'manual'}/${timestamp}.jpg`;
    
    const publicUrl = await uploadScreenshot(compressedBuffer, storagePath, {
      bucket: 'evidence',
      isPublic: true
    });
    
    logger.info({ url, storagePath }, 'Interactive screenshot captured and uploaded');
    
    return { imageUrl: publicUrl };

  } catch (error: any) {
    logger.error({ url, error: error.message }, 'Failed to capture interactive screenshot');
    throw error;
  } finally {
    await browser.close();
  }
}
