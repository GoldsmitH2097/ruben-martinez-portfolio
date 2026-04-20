/**
 * fetchProjects.mjs
 * Strategy: try direct RSS → allorigins proxy → rss2json → cache fallback
 */

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '../../.cache/projects.json');
const USERNAME = 'RubenMartinez';
const BEHANCE_RSS = `https://www.behance.net/feeds/user?username=${USERNAME}`;

const SOURCES = [
  // 1. Direct (works locally, sometimes blocked in CI)
  { name: 'direct', url: BEHANCE_RSS, transform: body => body },
  // 2. allorigins proxy (decodes base64 data URI)
  {
    name: 'allorigins',
    url: `https://api.allorigins.win/get?url=${encodeURIComponent(BEHANCE_RSS)}`,
    transform: async body => {
      const json = JSON.parse(body);
      if (!json.contents) throw new Error('No contents');
      if (json.contents.startsWith('data:')) {
        return Buffer.from(json.contents.split(',')[1], 'base64').toString('utf8');
      }
      return json.contents;
    },
  },
  // 3. rss2json service
  {
    name: 'rss2json',
    url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(BEHANCE_RSS)}`,
    transform: async body => {
      const json = JSON.parse(body);
      if (json.status !== 'ok') throw new Error('rss2json error');
      // Convert to our format directly
      return { _rss2json: json };
    },
  },
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
  const rawHtml = item['content:encoded'] || item.description || '';
  const html = typeof rawHtml === 'string' ? rawHtml : (rawHtml?.__cdata || String(rawHtml || ''));
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function parseXML(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
  });
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) throw new Error('No rss.channel');
  const raw = Array.isArray(channel.item) ? channel.item : [channel.item];
  return raw.filter(Boolean).map((item, i) => ({
    id: i,
    title: String(item.title?.__cdata || item.title || `Project ${i + 1}`).trim(),
    link: String(item.link || item.guid?.__cdata || item.guid || '#').trim(),
    pubDate: item.pubDate || null,
    description: String(item.description?.__cdata || item.description || '').replace(/<[^>]+>/g, '').trim(),
    thumbnail: extractThumbnail(item),
  })).filter(p => p.link !== '#');
}

function parseRss2json(json) {
  return json.items.map((item, i) => ({
    id: i,
    title: String(item.title || `Project ${i + 1}`).trim(),
    link: String(item.link || '#').trim(),
    pubDate: item.pubDate || null,
    description: String(item.description || '').replace(/<[^>]+>/g, '').trim(),
    thumbnail: item.thumbnail || item.enclosure?.link || null,
  })).filter(p => p.link !== '#');
}

export async function fetchProjects() {
  for (const source of SOURCES) {
    try {
      console.log(`[RSS] Trying ${source.name}…`);
      const res = await fetch(source.url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; portfolio-bot/1.0)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.text();
      const transformed = await source.transform(body);

      let projects;
      if (transformed?._rss2json) {
        projects = parseRss2json(transformed._rss2json);
      } else {
        projects = parseXML(transformed);
      }

      if (!projects.length) throw new Error('No projects parsed');

      console.log(`[RSS] ✓ ${source.name} → ${projects.length} project(s)`);
      const payload = { fetchedAt: new Date().toISOString(), projects };
      saveCache(payload);
      return payload;

    } catch (err) {
      console.warn(`[RSS] ${source.name} failed: ${err.message}`);
    }
  }

  console.warn('[RSS] All sources failed — using cache.');
  const cached = loadCache();
  if (cached) {
    console.log(`[RSS] Cache has ${cached.projects.length} project(s).`);
    return cached;
  }
  console.warn('[RSS] No cache. Empty list.');
  return { fetchedAt: null, projects: [] };
}
