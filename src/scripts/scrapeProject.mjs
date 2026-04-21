/**
 * scrapeProject.mjs
 * Fetches a Behance project page and extracts all full-size images.
 * Called at build time — no CORS issues, runs server-side.
 * Results are cached per project to avoid re-fetching on every build.
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
 * Extract all image URLs from a Behance project page HTML
 */
function extractImages(html) {
  const images = [];
  
  // Match Behance CDN image URLs — their main content images
  const patterns = [
    /https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"'\s)]+/g,
    /https:\/\/mir-s3-cdn-cf\.behance\.net\/projects\/[^"'\s)]+/g,
  ];
  
  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    for (const url of matches) {
      // Filter out tiny thumbnails — keep only full-size variants
      if (!url.includes('/40/') && !url.includes('/50/') && 
          !url.includes('/80/') && !url.includes('/100/') &&
          !url.includes('_sq') && !images.includes(url)) {
        images.push(url);
      }
    }
  }
  
  return [...new Set(images)]; // deduplicate
}

export async function scrapeProjectImages(behanceUrl, slug) {
  // Return cache if fresh enough (7 days)
  const cached = loadProjectCache(slug);
  if (cached) {
    const age = Date.now() - new Date(cached.scrapedAt).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000) {
      console.log(`[scrape] ${slug}: using cache (${cached.images.length} images)`);
      return cached.images;
    }
  }

  try {
    console.log(`[scrape] ${slug}: fetching ${behanceUrl}`);
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
    const images = extractImages(html);
    
    console.log(`[scrape] ${slug}: found ${images.length} images`);
    saveProjectCache(slug, { scrapedAt: new Date().toISOString(), images });
    return images;
    
  } catch (err) {
    console.warn(`[scrape] ${slug}: failed (${err.message})`);
    return cached?.images || [];
  }
}
