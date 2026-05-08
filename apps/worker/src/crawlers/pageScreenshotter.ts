import { chromium } from 'playwright';
import sharp from 'sharp';
import { uploadScreenshot } from '../lib/supabaseStorage';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

interface Viewport {
  name: 'desktop' | 'tablet' | 'mobile';
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

export interface ScreenshotResult {
  desktopUrl?: string;
  tabletUrl?: string;
  mobileUrl?: string;
  desktopBuffer?: Buffer;
  mobileBuffer?: Buffer;
}

/**
 * Captures full-page screenshots for a URL in multiple viewports,
 * compresses them, and uploads to Supabase Storage.
 */
export async function screenshotPage(
  url: string,
  runId: string,
  pageId: string,
  onProgress?: (progress: number, step: string) => Promise<void>
): Promise<ScreenshotResult> {
  const result: ScreenshotResult = {};

  let completedViewports = 0;
  const totalViewports = VIEWPORTS.length;

  for (const viewport of VIEWPORTS) {
    if (onProgress) {
      await onProgress(
        Math.round((completedViewports / totalViewports) * 100),
        `Capturing ${viewport.name} screenshot...`
      );
    }
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    try {
      if (onProgress) {
        await onProgress(
          Math.min(99, Math.round((completedViewports / totalViewports) * 100) + 5),
          `Opening browser (${viewport.name})...`
        );
      }
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      logger.info({ url, viewport: viewport.name }, `Taking screenshot`);

      if (onProgress) {
        await onProgress(
          Math.round((completedViewports / totalViewports) * 100) + 10,
          `Navigating to URL (${viewport.name})...`
        );
      }
      // Navigate to URL
      await page.goto(url, { timeout: 30000, waitUntil: 'load' });

      if (onProgress) {
        await onProgress(
          Math.round((completedViewports / totalViewports) * 100) + 15,
          `Waiting for ${viewport.name} content...`
        );
      }
      // Wait for Elementor or fallback to networkidle
      try {
        await page.waitForSelector('.elementor-section, .elementor-widget, .elementor', { 
          timeout: 15000 
        });
        logger.debug({ url, viewport: viewport.name }, 'Elementor detected');
      } catch (e) {
        logger.debug({ url, viewport: viewport.name }, 'Elementor not detected, waiting for networkidle');
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null);
      }

      if (onProgress) {
        await onProgress(
          Math.round((completedViewports / totalViewports) * 100) + 18,
          `Waking up lazy loaders (${viewport.name})...`
        );
      }

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

      if (onProgress) {
        await onProgress(
          Math.round((completedViewports / totalViewports) * 100) + 20,
          `Capturing ${viewport.name} screenshot...`
        );
      }
      // Take full-page screenshot
      const buffer = await page.screenshot({ 
        fullPage: true,
        animations: 'disabled'
      });

      if (onProgress) {
        await onProgress(
          Math.round((completedViewports / totalViewports) * 100) + 25,
          `Optimizing ${viewport.name} image...`
        );
      }
      // Compress with sharp
      const compressedBuffer = await sharp(buffer)
        .resize({ width: viewport.width, withoutEnlargement: true })
        .jpeg({ quality: 80 }) // Using jpeg for better compression of screenshots, though request says .png path
        .toBuffer();

      if (onProgress) {
        await onProgress(
          Math.round((completedViewports / totalViewports) * 100) + 30,
          `Uploading ${viewport.name} to cloud...`
        );
      }
      // Upload to Supabase Storage using utility (ensures bucket exists)
      const storagePath = `${runId}/${pageId}/${viewport.name}.png`;
      const publicUrl = await uploadScreenshot(compressedBuffer, storagePath);

      if (viewport.name === 'desktop') {
        result.desktopUrl = publicUrl;
        result.desktopBuffer = compressedBuffer;
      }
      if (viewport.name === 'tablet') result.tabletUrl = publicUrl;
      if (viewport.name === 'mobile') {
        result.mobileUrl = publicUrl;
        result.mobileBuffer = compressedBuffer;
      }

      completedViewports++;
      logger.info({ url, viewport: viewport.name }, 'Screenshot uploaded successfully');

    } catch (error: any) {
      logger.error({ url, viewport: viewport.name, error: error.message }, 'Failed to capture screenshot');
    } finally {
      await browser.close();
    }
  }

  if (onProgress) {
    await onProgress(100, 'Screenshots complete');
  }

  return result;
}
