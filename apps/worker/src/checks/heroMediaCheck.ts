import { Page as PlaywrightPage } from 'playwright';
import { Finding } from '@qacc/shared';

export async function checkHeroMedia(page: PlaywrightPage, pageRecord: any): Promise<Finding[]> {
  const findings: Finding[] = [];

  const mediaResults = await page.evaluate(() => {
    // 1. Find all video elements on the page
    const videos = Array.from(document.querySelectorAll('video'));
    
    // 2. Find any elements matching 'hero' in classes or ids
    const heroElements = Array.from(document.querySelectorAll('[class*="hero" i], [id*="hero" i]'));

    const videoDetails = videos.map(v => {
      const sources = Array.from(v.querySelectorAll('source')).map(s => s.src);
      const currentSrc = v.currentSrc || v.src || (sources.length > 0 ? sources[0] : '');
      return {
        outerHTML: v.outerHTML.substring(0, 300),
        src: currentSrc,
        poster: v.getAttribute('poster') || '',
        autoplay: v.autoplay,
        loop: v.loop,
        muted: v.muted,
        playsinline: v.playsInline,
        readyState: v.readyState,
        networkState: v.networkState,
        paused: v.paused,
        isInHero: heroElements.some(hero => hero.contains(v))
      };
    });

    const heroImages = heroElements.flatMap(hero => {
      return Array.from(hero.querySelectorAll('img')).map(img => {
        return {
          outerHTML: img.outerHTML.substring(0, 300),
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        };
      });
    });

    return {
      videoDetails,
      heroImages,
      hasHeroElement: heroElements.length > 0
    };
  });

  // Verify videos, specifically in the hero section or top of the page
  for (const video of mediaResults.videoDetails) {
    const isHeroVideo = video.isInHero || video.outerHTML.toLowerCase().includes('hero');
    
    // Check if the video src is empty
    if (!video.src) {
      findings.push({
        check_factor: 'hero_media',
        severity: 'high',
        title: 'Hero section video source missing or empty',
        description: 'A video element was detected in the hero section, but it is missing a valid video source (src or <source> tags). This causes the video block to appear blank or broken.',
        context_text: `Element: ${video.outerHTML}`,
        screenshot_url: pageRecord.desktopUrl,
        status: 'open',
        ai_generated: false
      });
    }

    // Check if poster (fallback image) is missing
    if (!video.poster && isHeroVideo) {
      findings.push({
        check_factor: 'hero_media',
        severity: 'medium',
        title: 'Hero section video missing fallback poster image',
        description: 'The hero section video element is missing a fallback "poster" image attribute. A poster image is critical for immediately displaying a fallback image on slower connections before the video stream has loaded.',
        context_text: `Element: ${video.outerHTML}`,
        screenshot_url: pageRecord.desktopUrl,
        status: 'open',
        ai_generated: false
      });
    }

    // Check if video is not autoplaying or muted (browsers block autoplay without muted)
    if (isHeroVideo && video.autoplay && !video.muted) {
      findings.push({
        check_factor: 'hero_media',
        severity: 'low',
        title: 'Hero video autoplay might be blocked (not muted)',
        description: 'The hero video is configured to autoplay, but is not set to muted. Modern web browsers block autoplay videos that are not muted, which might prevent the video from loading and playing immediately on page load.',
        context_text: `Element: ${video.outerHTML}`,
        screenshot_url: pageRecord.desktopUrl,
        status: 'open',
        ai_generated: false
      });
    }
  }

  // If there are hero images, verify they are loaded immediately
  for (const img of mediaResults.heroImages) {
    // Check if the image did not load successfully (naturalWidth === 0 or not complete)
    if (!img.complete || img.naturalWidth === 0) {
      findings.push({
        check_factor: 'hero_media',
        severity: 'high',
        title: 'Hero section image/fallback failed to load immediately',
        description: 'An image element in the hero section (which serves as a primary visual or fallback image) failed to load immediately on page load or is completely broken.',
        context_text: `Source: ${img.src}\nElement: ${img.outerHTML}`,
        screenshot_url: pageRecord.desktopUrl,
        status: 'open',
        ai_generated: false
      });
    }
  }

  return findings;
}
