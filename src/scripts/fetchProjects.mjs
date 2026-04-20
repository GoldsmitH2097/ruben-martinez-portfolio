/**
 * fetchProjects.mjs
 * Fetches the Behance RSS feed at build time via proxy fallbacks.
 * Behance blocks cloud datacenter IPs (GitHub Actions runners included),
 * so we try a chain of public CORS/proxy services before falling back to cache.
 */

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '../../.cache/projects.json');
const RSS_URL = 'https://www.behance.net/feeds/user?username=RubenMartinez';

// Proxy chain — tried in order until one works
const PROXY_URLS = [
  RSS_URL, // direct first (works locally)
  `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_URL)}`,
  `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`,
];

function loadCache() {
  try {
    if (existsSync(CACHE_PATH)) return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch (_) {}
  return null;
}

function saveCache(data) {
  const dir = dirname(CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
}

function extractThumbnail(item) {
  if (item['media:thumbnail']?.['@_url']) return item['media:thumbnail']['@_url'];
  if (item.enclosure?.['@_url']) return item.enclosure['@_url'];
  const raw = item['content:encoded'] || item.description || '';
  const html = typeof raw === 'string' ? raw : (raw?.__cdata || String(raw || ''));
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

async function tryFetch(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; portfolio-bot/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    timeout: 12000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes('<rss') && !text.includes('<feed')) throw new Error('Response is not RSS/XML');
  return text;
}

export async function fetchProjects() {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
  });

  let xml = null;

  for (const url of PROXY_URLS) {
    try {
      console.log(`[RSS] Trying: ${url.slice(0, 60)}…`);
      xml = await tryFetch(url);
      console.log('[RSS] Success.');
      break;
    } catch (err) {
      console.warn(`[RSS] Failed (${err.message}), trying next…`);
    }
  }

  if (xml) {
    try {
      const parsed = parser.parse(xml);
      const channel = parsed?.rss?.channel;
      if (!channel) throw new Error('No rss.channel');

      const raw = Array.isArray(channel.item) ? channel.item : [channel.item];
      const projects = raw
        .filter(Boolean)
        .map((item, i) => ({
          id: i,
          title: String(item.title?.__cdata || item.title || `Project ${i + 1}`).trim(),
          link: String(item.link || item.guid?.__cdata || item.guid || '#').trim(),
          pubDate: item.pubDate || null,
          description: String(
            item.description?.__cdata || item.description || ''
          ).replace(/<[^>]+>/g, '').trim(),
          thumbnail: extractThumbnail(item),
        }))
        .filter(p => p.link !== '#');

      console.log(`[RSS] Parsed ${projects.length} project(s).`);
      const payload = { fetchedAt: new Date().toISOString(), projects };
      saveCache(payload);
      return payload;
    } catch (err) {
      console.warn(`[RSS] Parse failed: ${err.message}`);
    }
  }

  console.warn('[RSS] All sources failed — falling back to cache.');
  const cached = loadCache();
  if (cached) {
    console.log(`[RSS] Loaded ${cached.projects.length} cached project(s).`);
    return cached;
  }

  console.warn('[RSS] No cache. Returning empty list.');
  return { fetchedAt: null, projects: [] };
}
