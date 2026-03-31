import { chromium } from 'playwright';
import sharp from 'sharp';
import { supabase } from '../lib/supabase';
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
}

/**
 * Captures full-page screenshots for a URL in multiple viewports,
 * compresses them, and uploads to Supabase Storage.
 */
export async function screenshotPage(
  url: string,
  runId: string,
  pageId: string
): Promise<ScreenshotResult> {
  const result: ScreenshotResult = {};

  for (const viewport of VIEWPORTS) {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      logger.info({ url, viewport: viewport.name }, `Taking screenshot`);

      // Navigate to URL
      await page.goto(url, { timeout: 30000, waitUntil: 'load' });

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

      // Take full-page screenshot
      const buffer = await page.screenshot({ fullPage: true });

      // Compress with sharp
      const compressedBuffer = await sharp(buffer)
        .resize({ width: viewport.width, withoutEnlargement: true })
        .jpeg({ quality: 80 }) // Using jpeg for better compression of screenshots, though request says .png path
        .toBuffer();

      // Upload to Supabase Storage
      const storagePath = `${runId}/${pageId}/${viewport.name}.png`;
      const { data, error } = await supabase.storage
        .from('screenshots')
        .upload(storagePath, compressedBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload ${viewport.name} screenshot: ${error.message}`);
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('screenshots')
        .getPublicUrl(storagePath);

      if (viewport.name === 'desktop') result.desktopUrl = publicUrl;
      if (viewport.name === 'tablet') result.tabletUrl = publicUrl;
      if (viewport.name === 'mobile') result.mobileUrl = publicUrl;

      logger.info({ url, viewport: viewport.name }, 'Screenshot uploaded successfully');

    } catch (error: any) {
      logger.error({ url, viewport: viewport.name, error: error.message }, 'Failed to capture screenshot');
    } finally {
      await browser.close();
    }
  }

  return result;
}
