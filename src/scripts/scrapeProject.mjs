/**
 * scrapeProject.mjs
 * Fetches a Behance project page and extracts main content images only.
 * - Filters by gallery ID so only images from THIS project are included
 * - Deduplicates by image hash to avoid multiple resolutions of same image
 * - Prefers highest resolution variants
 * - Caches results for 7 days
 */

import fetch from 'node-fetch';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache/projects');

function getCachePath(slug) {
  return join(CACHE_DIR, `${slug}.json`);
}

function loadProjectCache(slug) {
  try {
    const path = getCachePath(slug);
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  } catch (_) {}
  return null;
}

function saveProjectCache(slug, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(getCachePath(slug), JSON.stringify(data, null, 2));
}

/**
 * Extract main project content images only.
 * galleryId filters to images belonging to this specific project,
 * eliminating sidebar/recommended project images entirely.
 */
function extractImages(html, galleryId) {
  const images = [];
  const seen = new Set();

  // Size preference order — we only want full-size images
  const PREFERRED = ['hd', 'fs', 'max_1400', 'max_1200', 'max_632', 'max_800'];
  const SKIP = ['max_316', 'max_240', 'max_320', 'max_200', 'max_100', '_sq', 'disp_webp', '_webp', '/sq/'];

  const pattern = /https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/([^"'\s)]+)/g;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const url = 'https://mir-s3-cdn-cf.behance.net/project_modules/' + match[1];

    // Only images from this gallery
    if (galleryId && !url.includes(galleryId)) continue;

    // Skip small/webp variants
    if (SKIP.some(s => url.includes(s))) continue;

    // Deduplicate — each unique image has a consistent hash segment
    const filename = url.split('/').pop().replace(/\?.*$/, '');
    const parts = filename.split('.');
    // Hash is typically first segment of filename
    const hash = parts[0];

    if (!hash || seen.has(hash)) continue;
    seen.add(hash);

    images.push(url);
  }

  return images;
}

export async function scrapeProjectImages(behanceUrl, slug) {
  // Return cache if fresh (7 days)
  const cached = loadProjectCache(slug);
  if (cached) {
    const age = Date.now() - new Date(cached.scrapedAt).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000) {
      console.log(`[scrape] ${slug}: cache (${cached.images.length} images)`);
      return cached.images;
    }
  }

  try {
    console.log(`[scrape] ${slug}: fetching...`);
    const res = await fetch(behanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Extract gallery ID from URL: /gallery/123456/ -> 123456
    const galleryMatch = behanceUrl.match(/\/gallery\/(\d+)\//);
    const galleryId = galleryMatch ? galleryMatch[1] : null;

    const images = extractImages(html, galleryId);
    console.log(`[scrape] ${slug}: ${images.length} images (gallery ${galleryId})`);

    saveProjectCache(slug, { scrapedAt: new Date().toISOString(), images });
    return images;

  } catch (err) {
    console.warn(`[scrape] ${slug}: failed (${err.message})`);
    return cached?.images || [];
  }
}
