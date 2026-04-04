/**
 * fetchProjects.mjs
 * Fetches and parses the Behance RSS feed at build time.
 * Called by Astro's content layer — runs server-side, no CORS issues.
 */

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '../../.cache/projects.json');
const RSS_URL = 'https://www.behance.net/feeds/user?username=RubenMartinez';

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
  const rawHtml = item["content:encoded"] || item.description || "";
  const html = typeof rawHtml === "string" ? rawHtml : (rawHtml?.__cdata || String(rawHtml || ""));
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export async function fetchProjects() {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata' });

  try {
    console.log('[RSS] Fetching Behance feed…');
    const res = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; portfolio-bot/1.0)', Accept: 'application/rss+xml' },
      timeout: 15000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel;
    if (!channel) throw new Error('No rss.channel in response');

    const raw = Array.isArray(channel.item) ? channel.item : [channel.item];
    const projects = raw.filter(Boolean).map((item, i) => ({
      id: i,
      title: String(item.title?.__cdata || item.title || `Project ${i + 1}`).trim(),
      link: String(item.link || item.guid?.__cdata || item.guid || '#').trim(),
      pubDate: item.pubDate || null,
      description: String(item.description?.__cdata || item.description || '').replace(/<[^>]+>/g, '').trim(),
      thumbnail: extractThumbnail(item),
    })).filter(p => p.link !== '#');

    console.log(`[RSS] Got ${projects.length} project(s).`);
    const payload = { fetchedAt: new Date().toISOString(), projects };
    saveCache(payload);
    return payload;
  } catch (err) {
    console.warn(`[RSS] Fetch failed: ${err.message} — using cache.`);
    const cached = loadCache();
    if (cached) return cached;
    console.warn('[RSS] No cache. Returning empty list.');
    return { fetchedAt: null, projects: [] };
  }
}
