import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '../../.cache/projects.json');
const BEHANCE_RSS = 'https://www.behance.net/feeds/user?username=RubenMartinez';

const SOURCES = [
  {
    name: 'direct',
    url: BEHANCE_RSS,
    transform: body => body,
  },
  {
    name: 'allorigins',
    url: `https://api.allorigins.win/get?url=${encodeURIComponent(BEHANCE_RSS)}`,
    transform: body => {
      const json = JSON.parse(body);
      if (!json.contents) throw new Error('No contents');
      if (json.contents.startsWith('data:')) {
        return Buffer.from(json.contents.split(',')[1], 'base64').toString('utf8');
      }
      return json.contents;
    },
  },
  {
    name: 'rss2json',
    url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(BEHANCE_RSS)}`,
    transform: body => ({ _rss2json: JSON.parse(body) }),
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

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

// Known RSS encoding bugs — correct them at source
const TITLE_CORRECTIONS = {
  'Quán ?t ?t Branding & Marketing': 'Quán Ụt Ụt Branding & Marketing',
};

function decode(val) {
  const str = typeof val === 'object' ? (val?.__cdata || '') : String(val || '');
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#38;/g, '&');
}

function str(val, fallback = '') {
  return decode(val) || fallback;
}

function extractThumbnail(item) {
  if (item['media:thumbnail']?.['@_url']) return item['media:thumbnail']['@_url'];
  if (item.enclosure?.['@_url']) return item.enclosure['@_url'];
  const rawHtml = item['content:encoded'] || item.description || '';
  const html = typeof rawHtml === 'object' ? (rawHtml?.__cdata || '') : String(rawHtml || '');
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function parseXML(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata' });
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) throw new Error('No rss.channel');
  const raw = Array.isArray(channel.item) ? channel.item : [channel.item];
  return raw.filter(Boolean).map((item, i) => ({
    id: i,
    title: TITLE_CORRECTIONS[str(item.title, `Project ${i + 1}`).trim()] || str(item.title, `Project ${i + 1}`).trim(),
    link: str(item.link?.__cdata ? item.link : (item.link || item.guid), '#').trim(),
    pubDate: item.pubDate || null,
    description: str(item.description).replace(/<[^>]+>/g, '').trim(),
    thumbnail: extractThumbnail(item),
  })).filter(p => p.link !== '#');
}

function parseRss2json(data) {
  if (data.status !== 'ok') throw new Error('rss2json error: ' + data.status);
  return data.items.map((item, i) => ({
    id: i,
    title: TITLE_CORRECTIONS[str(item.title, `Project ${i + 1}`).trim()] || str(item.title, `Project ${i + 1}`).trim(),
    link: String(item.link || item.guid || '#').trim(),
    pubDate: item.pubDate || null,
    description: String(item.description || '').replace(/<[^>]+>/g, '').trim(),
    thumbnail: item.thumbnail || item.enclosure?.link || null,
  })).filter(p => p.link !== '#');
}

// ── main ───────────────────────────────────────────────────────────────────

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
      const transformed = source.transform(body);

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
  return { fetchedAt: null, projects: [] };
}

/**
 * Merge manually curated tags from src/data/tags.json into project list.
 * Tags survive RSS refreshes because they live in a separate committed file.
 */
export async function fetchProjectsWithTags() {
  const { projects, fetchedAt } = await fetchProjects();
  
  const tagsPath = join(__dirname, '../../src/data/tags.json');
  let tagMap = {};
  try {
    tagMap = JSON.parse(readFileSync(tagsPath, 'utf8'));
  } catch(_) {
    console.warn('[tags] Could not load tags.json');
  }

  const tagged = projects.map(p => ({
    ...p,
    tags: tagMap[p.title] || [],
  }));

  return { fetchedAt, projects: tagged };
}

/**
 * Merge manual projects (older Behance work not in RSS) with RSS projects.
 * Manual projects take lower priority — RSS projects always win on title match.
 */
export async function fetchAllProjects() {
  const { projects: rssProjects, fetchedAt } = await fetchProjectsWithTags();
  
  // Manual projects — statically inlined so they survive Astro's build bundling
  const MANUAL_DATA = [{"url": "https://www.behance.net/gallery/111765415/Belvie-Chocolate-Packaging", "title": "Belvie Chocolate Packaging", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/1400/a21e40111765415.6008160848a9a.jpeg", "tags": ["branding"]}, {"url": "https://www.behance.net/gallery/25498959/The-Common-Room-Project-Branding", "title": "The Common Room Project Branding", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/b0558625498959.563463fa71fd6.png", "tags": ["branding"]}, {"url": "https://www.behance.net/gallery/25497429/Car-Renders-3D-Rendering", "title": "Car Renders — 3D Rendering", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/1400/ace99725497429.563463a08edc3.jpg", "tags": ["3d"]}, {"url": "https://www.behance.net/gallery/25496835/Intel-3D-Modeling-Rendering", "title": "Intel — 3D Modeling & Rendering", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/1400/78d8ab25496835.6008387be4092.jpg", "tags": ["3d"]}, {"url": "https://www.behance.net/gallery/25496083/La-Virgen-Branding-Rendering", "title": "La Virgen — Branding & Rendering", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/1400/fd238125496083.56346342d2a23.jpg", "tags": ["branding", "3d"]}, {"url": "https://www.behance.net/gallery/22802917/Mini-Cooper-S-08-3D-Modeling-Rendering", "title": "Mini Cooper S '08 — 3D Modeling", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/f4a40522802917.56318a25cd900.jpg", "tags": ["3d"]}, {"url": "https://www.behance.net/gallery/22802363/Ecorch-Sculpture", "title": "Écorché Sculpture", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/3f17a522802363.56318a058fc08.jpg", "tags": ["3d"]}, {"url": "https://www.behance.net/gallery/22801817/Full-Metal-Quartet-3D-Modeling", "title": "Full Metal Quartet — 3D Modeling", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/a0aa6322801817.563189e831d37.jpg", "tags": ["3d"]}, {"url": "https://www.behance.net/gallery/22801439/Girados-Branding", "title": "Girados Branding", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/e06d0822801439.563189baaafba.jpg", "tags": ["branding"]}, {"url": "https://www.behance.net/gallery/22800737/Sinhtolina-Branding-Photography", "title": "Sinhtolina — Branding & Photography", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/837ab522800737.600851831a259.jpg", "tags": ["branding", "photography"]}, {"url": "https://www.behance.net/gallery/454872/Girl-by-the-Pool-3D-Modeling-Rendering", "title": "Girl by the Pool — 3D Rendering", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/3f17a522802363.56318a058fc08.jpg", "tags": ["3d"]}, {"url": "https://www.behance.net/gallery/397713/Kiwi-Advertising-Animation", "title": "Kiwi — Advertising & Animation", "thumbnail": "https://mir-s3-cdn-cf.behance.net/projects/max_808/4370be397713.Y3JvcCwxMDY2LDgzNCwzNTksMjM1.png", "tags": ["art-direction", "motion"]}, {"url": "https://www.behance.net/gallery/403604/Dental-Floss-Advertising-Animation", "title": "Dental Floss — Advertising & Animation", "thumbnail": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/7c797d78036323.56015b752322f.jpg", "tags": ["art-direction", "motion"]}];
  let manualProjects = MANUAL_DATA.map((p, i) => ({
    id: 1000 + i,
    title: p.title,
    link: p.url || p.link,
    pubDate: p.pubDate || null,
    description: p.description || '',
    thumbnail: p.thumbnail || null,
    tags: p.tags || [],
    manual: true,
  }));

  // Merge — skip manual projects that already exist in RSS (by title)
  const rssTitles = new Set(rssProjects.map(p => p.title.toLowerCase()));
  const newManual = manualProjects.filter(p => !rssTitles.has(p.title.toLowerCase()));
  
  const all = [...rssProjects, ...newManual];
  console.log(`[projects] ${rssProjects.length} from RSS + ${newManual.length} manual = ${all.length} total`);
  return { fetchedAt, projects: all };
}
