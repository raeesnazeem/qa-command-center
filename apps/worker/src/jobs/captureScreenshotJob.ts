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
  const { url, userId, scrollX = 0, scrollY = 0, width = 1280, height = 720 } = job.data;
  
  if (!url) throw new Error('URL is required for capture');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // Ensure viewport is valid
    const finalWidth = Math.max(width, 100);
    const finalHeight = Math.max(height, 100);
    const finalScrollX = Math.max(0, scrollX);
    const finalScrollY = Math.max(0, scrollY);

    const context = await browser.newContext({
      viewport: { width: finalWidth, height: finalHeight },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    logger.info({ 
      url, 
      userId, 
      scrollX: finalScrollX, 
      scrollY: finalScrollY, 
      width: finalWidth, 
      height: finalHeight 
    }, 'Capturing interactive screenshot with validated parameters');

    // Navigate to URL
    await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    
    // Wait for content to stabilize
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);

    // Apply scroll position if provided
    if (finalScrollX > 0 || finalScrollY > 0) {
      try {
        await page.evaluate(({ x, y }) => {
          window.scrollTo(x, y);
        }, { x: finalScrollX, y: finalScrollY });
        
        // Wait slightly longer for scroll-triggered assets
        await page.waitForTimeout(1000);
      } catch (scrollErr) {
        logger.warn({ url, scrollErr }, 'Failed to apply scroll position to page');
      }
    }

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
