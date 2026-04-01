import { Page } from 'playwright';
import nspell from 'nspell';
import en from 'dictionary-en';

let spellcheckerInstance: nspell | null = null;

async function getSpellchecker(): Promise<nspell> {
  if (spellcheckerInstance) return spellcheckerInstance;
  return new Promise((resolve, reject) => {
    en((err: any, dict: { aff: Buffer; dic: Buffer }) => {
      if (err) return reject(err);
      spellcheckerInstance = nspell(dict);
      resolve(spellcheckerInstance);
    });
  });
}

export async function checkSpelling(page: Page, pageRecord: any): Promise<any[]> {
  const dictionary = await getSpellchecker();

  const allowlist = new Set([
    'wordpress', 'elementor', 'plugin', 'plugins', 'woocommerce', 'shopify',
    'backend', 'frontend', 'api', 'seo', 'js', 'css', 'html', 'react', 'vue',
    'angular', 'node', 'app', 'online', 'website', 'startup', 'web', 'login',
    'signup', 'dashboard', 'ecommerce', 'blog', 'vlog', 'cdn', 'ssl', 'http',
    'https', 'localhost', 'dev', 'prod', 'admin', 'ui', 'ux', 'qa', 'saas'
  ]);

  const rawTexts = await page.evaluate(() => {
    const texts: { text: string; extract: string }[] = [];
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, span, div');

    const isHidden = (el: Element) => {
      const style = window.getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    };

    const isInsideSkippedNode = (el: Element) => {
      return el.closest('nav, footer, script, style, noscript, svg') !== null;
    };

    // Keep track to avoid duplicating text that has already been extracted
    const wordsSet = new Set<string>();

    for (const el of elements) {
      if (isHidden(el) || isInsideSkippedNode(el)) continue;

      let directText = '';
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent) {
          directText += child.textContent;
        }
      }

      const trimmedText = directText.trim();
      if (trimmedText && !wordsSet.has(trimmedText)) {
        wordsSet.add(trimmedText);
        texts.push({
          text: trimmedText,
          extract: trimmedText
        });
      }
    }
    return texts;
  });

  const findings: any[] = [];
  
  // Strip simple URLs out of block.text before tokenizing
  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/g;
  const wordRegex = /[a-zA-Z]+/g;

  // Track added words to deduplicate findings
  const dedupWords = new Set<string>();

  for (const block of rawTexts) {
    if (findings.length >= 50) break;
    
    // Remove URLs to avoid tokenizing parts of them
    const textWithoutUrls = block.text.replace(urlRegex, ' ');
    const words = textWithoutUrls.match(wordRegex) || [];
    
    for (const word of words) {
      if (findings.length >= 50) break;

      if (dedupWords.has(word.toLowerCase())) continue;

      // Rule: skip words < 3 characters
      if (word.length < 3) continue;

      // Rule: skip capitalized words (proper nouns)
      if (word[0] === word[0].toUpperCase()) continue;

      // Rule: skip words in custom allowlist
      if (allowlist.has(word.toLowerCase())) continue;

      const isMispelled = !dictionary.spell(word);
      if (isMispelled) {
        dedupWords.add(word.toLowerCase());
        const suggestions = dictionary.suggest(word);
        
        let contextText = block.extract;
        if (contextText.length > 200) {
          const index = contextText.indexOf(word);
          const start = Math.max(0, index - 50);
          const end = Math.min(contextText.length, index + word.length + 50);
          contextText = (start > 0 ? '...' : '') + contextText.substring(start, end) + (end < contextText.length ? '...' : '');
        }

        findings.push({
          check_factor: 'spelling',
          severity: 'low',
          title: `Misspelled: ${word}`,
          description: suggestions.length > 0 ? `Suggestion: ${suggestions[0]}` : `No suggestions found for ${word}`,
          context_text: contextText,
        });
      }
    }
  }

  return findings;
}
