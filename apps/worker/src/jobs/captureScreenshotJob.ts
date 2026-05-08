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
  const { 
    url, 
    userId, 
    scrollX = 0, 
    scrollY = 0, 
    width = 1280, 
    height = 720,
    fullPage = false,
    viewportWidth,
    viewportHeight
  } = job.data;
  
  if (!url) throw new Error('URL is required for capture');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // Use provided viewport dimensions or fallback to width/height
    const vWidth = Math.max(Math.floor(Number(viewportWidth)) || Math.floor(Number(width)) || 1280, 100);
    const vHeight = Math.max(Math.floor(Number(viewportHeight)) || Math.floor(Number(height)) || 720, 100);
    
    const finalScrollX = Math.max(0, Math.floor(Number(scrollX)) || 0);
    const finalScrollY = Math.max(0, Math.floor(Number(scrollY)) || 0);

    const context = await browser.newContext({
      viewport: { width: vWidth, height: vHeight },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    logger.info({ 
      url, 
      userId, 
      fullPage,
      viewport: `${vWidth}x${vHeight}`
    }, 'Capturing screenshot with robust parameters');

    // Navigate to URL - 'load' is more reliable than 'networkidle' for sites with constant trackers
    await page.goto(url, { timeout: 45000, waitUntil: 'load' });
    
    // Wait for content to stabilize and initial animations to settle
    await page.waitForTimeout(3000);

    // Apply lazy-load wakeup logic ONLY if it's a full page capture
    if (fullPage) {
      logger.info({ url }, 'Waking up lazy loaders for full-page capture');
      
      // 1. Force all images to eager load and resolve lazy attributes
      await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          // Force eager loading
          img.setAttribute('loading', 'eager');
          
          // Swap common lazy-load attributes if they exist
          const lazyAttributes = ['data-src', 'data-srcset', 'data-original', 'lazy-src'];
          lazyAttributes.forEach(attr => {
            if (img.hasAttribute(attr)) {
              if (attr === 'data-srcset') {
                img.srcset = img.getAttribute(attr)!;
              } else {
                img.src = img.getAttribute(attr)!;
              }
            }
          });
        });
        
        // Disable animations/transitions and hide skeletons
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after {
            transition: none !important;
            animation: none !important;
            scroll-behavior: auto !important;
          }
          [class*="skeleton"], [class*="loading-placeholder"], [class*="shimmer"] {
            opacity: 0 !important;
            visibility: hidden !important;
          }
        `;
        document.head.appendChild(style);
      });

      // 2. Scroll to bottom in smaller increments to trigger lazy loading
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 300; // Smaller steps
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight || totalHeight > 15000) { // Cap at 15k for performance
              clearInterval(timer);
              resolve();
            }
          }, 150); // Slower interval
        });
      });

      // 3. Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      
      // 4. Wait for all images to be fully loaded and decoded
      await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll('img'));
        await Promise.all(images.map(img => {
          if (img.complete) return (img as any).decode?.().catch(() => null);
          return new Promise((resolve) => {
            img.addEventListener('load', () => (img as any).decode?.().then(resolve).catch(resolve));
            img.addEventListener('error', resolve);
          });
        }));
      });
      
      // 5. Wait for network to settle and final stabilize
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(10000); // 10 second rest
    }
 else if (finalScrollX > 0 || finalScrollY > 0) {
      // Apply scroll position ONLY if not a full page capture
      try {
        await page.evaluate(({ x, y }) => {
          window.scrollTo(x, y);
        }, { x: finalScrollX, y: finalScrollY });
        
        await page.waitForTimeout(1000);
      } catch (scrollErr) {
        logger.warn({ url, scrollErr }, 'Failed to apply scroll position');
      }
    }

    // Take screenshot (fullPage if requested)
    const buffer = await page.screenshot({ 
      fullPage: !!fullPage,
      animations: 'disabled'
    });

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
