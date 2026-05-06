import { Router, Request, Response } from 'express';
import axios from 'axios';
import { clerkAuth } from '../middleware/clerkAuth';
import { qaQueue } from '../lib/queue';

const router: Router = Router();

// Whitelisted domains allowed to be proxied
const WHITELISTED_DOMAINS = [
  'bosthetics.com',
  'ruma.com',
  'example.com'
];

/**
 * Helper to resolve relative URLs and rewrite them to go through the proxy
 */
function rewriteLinks(html: string, baseUrl: string, proxyOrigin: string): string {
  const urlObj = new URL(baseUrl);
  const baseHref = `${urlObj.protocol}//${urlObj.host}/`;

  // Inject <base> tag to fix all relative images, scripts, and stylesheets natively
  const baseTag = `<base href="${baseHref}">`;
  if (/<head>/i.test(html)) {
    html = html.replace(/<head>/i, `<head>\n  ${baseTag}`);
  } else {
    html = baseTag + '\n' + html;
  }

  // Resolve URL using native URL API
  const resolveUrl = (path: string) => {
    try {
      return new URL(path, baseUrl).href;
    } catch (e) {
      return path;
    }
  };

  const rewriteAttribute = (match: string, before: string, path: string, after: string, attr: string) => {
    if (!path || path.startsWith('#') || path.startsWith('javascript:') || path.startsWith('mailto:')) return match;

    const resolved = resolveUrl(path);
    try {
      const resolvedUrlObj = new URL(resolved);
      const resolvedHostname = resolvedUrlObj.hostname;

      // Proxy if it's a whitelisted domain or a subdomain of one
      const isWhitelisted = WHITELISTED_DOMAINS.some(d => 
        resolvedHostname === d || resolvedHostname.endsWith('.' + d)
      );

      if (isWhitelisted) {
        const tagName = match.trim().toLowerCase().startsWith('<a') ? 'a' : 'form';
        return `<${tagName}${before}${attr}="${proxyOrigin}/api/proxy-browser?url=${encodeURIComponent(resolved)}"${after}>`;
      }
    } catch (e) {}

    return match;
  };

  // Rewrite <a> hrefs
  html = html.replace(
    /<a\b([^>]*)href=["'](.*?)["']([^>]*)>/gi,
    (match, before, path, after) => rewriteAttribute(match, before, path, after, 'href')
  );

  // Rewrite <form> actions
  html = html.replace(
    /<form\b([^>]*)action=["'](.*?)["']([^>]*)>/gi,
    (match, before, path, after) => rewriteAttribute(match, before, path, after, 'action')
  );

  return html;
}

/**
 * ALL /proxy-browser
 * Proxies a URL and rewrites links to support internal navigation
 */
router.all(
  '/proxy-browser',
  (req, res, next) => {
    // Bypass clerkAuth for GET requests so native browser assets (images/scripts) can load
    if (req.method === 'GET') {
      return next();
    }
    // Require auth for initial POST loads
    return clerkAuth(req, res, next);
  },
  async (req: Request, res: Response) => {
    const url = req.method === 'POST' ? req.body.url : (req.query.url as string);
    const protocol = req.protocol;
    const host = req.get('host');
    const proxyOrigin = `${protocol}://${host}`;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      // Improved whitelisting: check if hostname is or ends with a whitelisted domain
      const isWhitelisted = WHITELISTED_DOMAINS.some(d => 
        hostname === d || hostname.endsWith('.' + d)
      );

      if (!isWhitelisted) {
        return res.status(403).json({ error: 'Domain not whitelisted' });
      }

      const response = await axios.get(url, {
        timeout: 15000, // Increased timeout for heavy assets
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        responseType: 'arraybuffer' // Handle both text and binary data
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      let data = response.data;

      // Only rewrite if it's an HTML page
      if (contentType.includes('text/html')) {
        const html = data.toString('utf8');
        const rewrittenHtml = rewriteLinks(html, url, proxyOrigin);
        data = Buffer.from(rewrittenHtml, 'utf8');
      }

      // Preserve original content-type
      res.setHeader('Content-Type', contentType);
      
      // Security headers for iframe compatibility
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
      
      // Optional: Forward caching headers for performance
      if (response.headers['cache-control']) {
        res.setHeader('Cache-Control', response.headers['cache-control']);
      }

      return res.send(data);
    } catch (error: any) {
      console.error('[Proxy Error]:', error.message);
      return res.status(500).json({ 
        error: 'Failed to load page',
        details: error.message 
      });
    }
  }
);

/**
 * POST /api/proxy-browser/capture
 * Triggers a screenshot capture of a URL via the worker and returns the URL.
 */
router.post(
  '/proxy-browser/capture',
  clerkAuth,
  async (req: Request, res: Response) => {
    const { url } = req.body;
    const userId = (req as any).auth?.userId;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const job = await qaQueue.add('capture_screenshot', { url, userId }, {
        removeOnComplete: true,
      });

      const result = await job.waitUntilFinished(new (require('bullmq').QueueEvents)('qa-jobs', { 
        connection: qaQueue.opts.connection 
      }));

      return res.json(result);
    } catch (error: any) {
      console.error('[Capture Proxy Error]:', error.message);
      return res.status(500).json({ 
        error: 'Failed to capture screenshot',
        details: error.message 
      });
    }
  }
);

export { router as proxyRouter };
