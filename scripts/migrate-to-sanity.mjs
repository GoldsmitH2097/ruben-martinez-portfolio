/**
 * migrate-to-sanity.mjs
 * One-shot migration of all 25 Behance projects into Sanity CMS.
 * Run with: node scripts/migrate-to-sanity.mjs
 */
import { createClient } from '@sanity/client';
import fetch from 'node-fetch';

const client = createClient({
  projectId: '7efeaozz',
  dataset: 'production',
  apiVersion: '2025-04-21',
  token: 'skssx1lOX01hDsmNFEULlpUtYw86LVM1BeHkuWGtHS9UuUUFtKzf4dxB4Bci8xvFpIhC5YzmP5XNGAiDp',
  useCdn: false,
});

function slugify(str) {
  return str.toLowerCase()
    .replace(/[àáâãäåæ]/g, 'a').replace(/[èéêëě]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function extractYear(pubDate) {
  if (!pubDate) return 2021;
  const match = String(pubDate).match(/\d{4}/);
  return match ? parseInt(match[0]) : 2021;
}

async function uploadImageFromUrl(url, filename) {
  try {
    console.log(`  uploading ${filename}...`);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.buffer();
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const asset = await client.assets.upload('image', buffer, { filename, contentType: ct });
    console.log(`  ✓ ${filename} → ${asset._id}`);
    return asset;
  } catch (err) {
    console.warn(`  ✗ failed ${filename}: ${err.message}`);
    return null;
  }
}

// ── All 25 projects: 12 RSS + 13 manual ─────────────────────────────────────
const ALL_PROJECTS = [
  // RSS projects (from Behance cache)
  { title: 'Shuttlerock 2023 North America Reel', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/b9df79200537205.Y3JvcCwxOTM1LDE1MTQsMjg3LDA.png', behanceUrl: 'https://www.behance.net/gallery/200537205/Shuttlerock-2023-North-America-Reel', pubDate: '2024', tags: ['motion', 'social-media'], order: 1 },
  { title: 'Shuttlerock 2023 EMEA Reel', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/d64d66200536751.Y3JvcCwyMzAxLDE4MDAsNTM1LDA.png', behanceUrl: 'https://www.behance.net/gallery/200536751/Shuttlerock-2023-EMEA-Reel', pubDate: '2024', tags: ['motion', 'social-media'], order: 2 },
  { title: 'Shuttlerock 2023 APAC Reel', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/f3bd07200535897.Y3JvcCwxMTI0LDg3OSwwLDUw.jpg', behanceUrl: 'https://www.behance.net/gallery/200535897/Shuttlerock-2023-APAC-Reel', pubDate: '2024', tags: ['motion', 'social-media'], order: 3 },
  { title: 'Sprite Vietnam', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/ca97cd114642859.Y3JvcCwxMTk3LDkzNiwzNzMsMTIxOA.jpg', behanceUrl: 'https://www.behance.net/gallery/114642859/Sprite-Vietnam', pubDate: '2021', tags: ['art-direction', 'social-media'], order: 4 },
  { title: 'Coca Cola Vietnam Ad Campaigns', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/ac8808114642093.Y3JvcCwxMTI3LDg4Miw1NSww.jpg', behanceUrl: 'https://www.behance.net/gallery/114642093/Coca-Cola-Vietnam-Ad-Campaigns', pubDate: '2021', tags: ['art-direction', 'social-media'], order: 5 },
  { title: 'Tê Tê Craft Beer Branding & Marketing', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/1110dc111765403.Y3JvcCwxODc5LDE0NzAsMTQ4LDE1Mw.jpg', behanceUrl: 'https://www.behance.net/gallery/111765403/Te-Te-Craft-Beer-Branding-Marketing', pubDate: '2021', tags: ['branding', 'art-direction'], order: 6 },
  { title: 'FV Hospital Ad Campaign', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/9ba553111782765.Y3JvcCwxMDkxLDg1MywxMTQ4LDQyNA.jpg', behanceUrl: 'https://www.behance.net/gallery/111782765/FV-Hospital-Ad-Campaign', pubDate: '2021', tags: ['art-direction', 'social-media'], order: 7 },
  { title: 'Vinhomes Central Park Branding & Design', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/c4607f111765373.Y3JvcCwxMTUzLDkwMiwzNDMsMjI4.jpg', behanceUrl: 'https://www.behance.net/gallery/111765373/Vinhomes-Central-Park-Branding-Design', pubDate: '2021', tags: ['branding', 'art-direction'], order: 8 },
  { title: 'Quán Ụt Ụt Branding & Marketing', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/e6df38111765391.Y3JvcCwxMDgxLDg0NiwyNzMsMTM5.jpg', behanceUrl: 'https://www.behance.net/gallery/111765391/Quan-t-t-Branding-Marketing', pubDate: '2021', tags: ['branding', 'art-direction'], order: 9 },
  { title: 'Broma Branding & Marketing', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/e72c89111765389.Y3JvcCwxMTMxLDg4NCwyMTEsMA.jpg', behanceUrl: 'https://www.behance.net/gallery/111765389/Broma-Branding-Marketing', pubDate: '2021', tags: ['branding', 'art-direction'], order: 10 },
  { title: 'Mia Resorts Branding & Marketing', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/fa41fd111765363.Y3JvcCwxMTAyLDg2MSw0NjYsMjYx.jpg', behanceUrl: 'https://www.behance.net/gallery/111765363/Mia-Resorts-Branding-Marketing', pubDate: '2021', tags: ['branding', 'art-direction'], order: 11 },
  { title: 'Vight Bespoke Lighting Rebrand', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/404/1e4553111765401.Y3JvcCwxMTM3LDg4OSwxODksMzA.jpg', behanceUrl: 'https://www.behance.net/gallery/111765401/Vight-Bespoke-Lighting-Rebrand', pubDate: '2021', tags: ['branding'], order: 12 },
  // Manual projects (older Behance work)
  { title: 'Belvie Chocolate Packaging', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400/a21e40111765415.6008160848a9a.jpeg', behanceUrl: 'https://www.behance.net/gallery/111765415/Belvie-Chocolate-Packaging', pubDate: '2021', tags: ['branding'], order: 13 },
  { title: 'The Common Room Project Branding', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/b0558625498959.563463fa71fd6.png', behanceUrl: 'https://www.behance.net/gallery/25498959/The-Common-Room-Project-Branding', pubDate: '2015', tags: ['branding'], order: 14 },
  { title: 'Car Renders — 3D Rendering', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400/ace99725497429.563463a08edc3.jpg', behanceUrl: 'https://www.behance.net/gallery/25497429/Car-Renders-3D-Rendering', pubDate: '2015', tags: ['3d'], order: 15 },
  { title: 'Intel — 3D Modeling & Rendering', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400/78d8ab25496835.6008387be4092.jpg', behanceUrl: 'https://www.behance.net/gallery/25496835/Intel-3D-Modeling-Rendering', pubDate: '2015', tags: ['3d'], order: 16 },
  { title: 'La Virgen — Branding & Rendering', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400/fd238125496083.56346342d2a23.jpg', behanceUrl: 'https://www.behance.net/gallery/25496083/La-Virgen-Branding-Rendering', pubDate: '2015', tags: ['branding', '3d'], order: 17 },
  { title: "Mini Cooper S '08 — 3D Modeling", thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/f4a40522802917.56318a25cd900.jpg', behanceUrl: 'https://www.behance.net/gallery/22802917/Mini-Cooper-S-08-3D-Modeling-Rendering', pubDate: '2014', tags: ['3d'], order: 18 },
  { title: 'Écorché Sculpture', thumbnail: null, behanceUrl: 'https://www.behance.net/gallery/22802363/Ecorch-Sculpture', pubDate: '2014', tags: ['3d'], order: 19 },
  { title: 'Full Metal Quartet — 3D Modeling', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/a0aa6322801817.563189e831d37.jpg', behanceUrl: 'https://www.behance.net/gallery/22801817/Full-Metal-Quartet-3D-Modeling', pubDate: '2014', tags: ['3d'], order: 20 },
  { title: 'Girados Branding', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/e06d0822801439.563189baaafba.jpg', behanceUrl: 'https://www.behance.net/gallery/22801439/Girados-Branding', pubDate: '2014', tags: ['branding'], order: 21 },
  { title: 'Sinhtolina — Branding & Photography', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/837ab522800737.600851831a259.jpg', behanceUrl: 'https://www.behance.net/gallery/22800737/Sinhtolina-Branding-Photography', pubDate: '2014', tags: ['branding', 'photography'], order: 22 },
  { title: 'Girl by the Pool — 3D Rendering', thumbnail: null, behanceUrl: 'https://www.behance.net/gallery/454872/Girl-by-the-Pool-3D-Modeling-Rendering', pubDate: '2013', tags: ['3d'], order: 23 },
  { title: 'Kiwi — Advertising & Animation', thumbnail: 'https://mir-s3-cdn-cf.behance.net/projects/max_808/4370be397713.Y3JvcCwxMDY2LDgzNCwzNTksMjM1.png', behanceUrl: 'https://www.behance.net/gallery/397713/Kiwi-Advertising-Animation', pubDate: '2013', tags: ['art-direction', 'motion'], order: 24 },
  { title: 'Dental Floss — Advertising & Animation', thumbnail: 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/7c797d78036323.56015b752322f.jpg', behanceUrl: 'https://www.behance.net/gallery/403604/Dental-Floss-Advertising-Animation', pubDate: '2013', tags: ['art-direction', 'motion'], order: 25 },
];

async function main() {
  console.log(`\nMigrating ${ALL_PROJECTS.length} projects to Sanity...\n`);

  for (const p of ALL_PROJECTS) {
    const slug = slugify(p.title);
    const year = extractYear(p.pubDate);
    console.log(`[${p.order}/${ALL_PROJECTS.length}] ${p.title}`);

    // Upload cover image to Sanity CDN
    let coverImageAsset = null;
    if (p.thumbnail) {
      const ext = p.thumbnail.split('.').pop().split('?')[0] || 'jpg';
      coverImageAsset = await uploadImageFromUrl(p.thumbnail, `${slug}-cover.${ext}`);
    }

    // Build the Sanity document
    const doc = {
      _type: 'project',
      title: p.title,
      slug: { _type: 'slug', current: slug },
      year,
      tags: p.tags || [],
      displayOrder: p.order,
      visible: true,
      featured: false,
      description: '',
      // Store Behance URL as a reference (in liveUrl temporarily — we'll clean these up later)
      // Actually we won't expose Behance links on the site, but useful for asset hunting
    };

    if (coverImageAsset) {
      doc.coverImage = {
        _type: 'image',
        asset: { _type: 'reference', _ref: coverImageAsset._id },
      };
    }

    try {
      const created = await client.create(doc);
      console.log(`  ✓ created ${created._id}\n`);
    } catch (err) {
      console.error(`  ✗ failed to create: ${err.message}\n`);
    }

    // Small delay to be polite to both Behance CDN and Sanity API
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✓ Migration complete!\n');
}

main().catch(console.error);
