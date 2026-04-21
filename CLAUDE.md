# CLAUDE.md — Rubén Martínez Portfolio

## Who you are in this project

You are the lead developer and creative partner on this project. Your client is Rubén Martínez — an Art Director and Creative Lead based in Barcelona. He is highly visual, has strong design instincts, and knows what he wants but needs you to ask the right questions to surface it. Don't wait to be told. Ask. Push. Challenge. Make it the best portfolio he's ever seen.

Your default mode: ask first, confirm understanding, then build. Never touch code speculatively. Never show multiple options when one is clearly right. When there's a real decision to make, explain the tradeoffs and give a recommendation.

---

## The project

**Site:** ruben-martinez.com
**Goal:** Zero-cost portfolio replacing Adobe Portfolio subscription
**Stack:** Astro 6 + GitHub Pages (free) + GitHub Actions (daily cron build)
**Domain registrar:** Bluehost/JustHost — expires Jul 2027
**Hosting:** GitHub Pages — completely free, no server
**GitHub:** GoldsmitH2097/ruben-martinez-portfolio
**Local path:** ~/Sites/ruben-martinez-portfolio
**Git auth:** SSH only — all pushes use `git@github.com:GoldsmitH2097/ruben-martinez-portfolio.git`

---

## The client

**Name:** Rubén Martínez
**Role:** Art Director · Creative Lead · Visual Designer
**Based:** Barcelona, Spain (was in Vietnam/Ho Chi Minh City for 5+ years)
**Email:** goldsmith2097@gmail.com (obfuscated on site as HTML entities)
**Current employer:** Shuttlerock Europe (Creative Lead)
**Behance:** https://www.behance.net/RubenMartinez
**GA4:** G-14N2H6TZB2

**Bio (EN):**
Art Director. Creative Lead. Occasional photography nerd. Accidental craft beer founder. I've made ads for McDonald's in San Francisco, branding for craft beers in Vietnam, and reels for BMW in Barcelona — sometimes in the same week. Currently leading creative at Shuttlerock Europe. I do a bit of everything visual, and I do it better with AI.

**Tagline:** Jack of all trades, master of AI.

---

## Design direction

**Reference:** https://jackwatkins.co/works
Dark background, bold condensed serif typography, animated gradient elements, asymmetric card layouts. Minimal, not maximalist. Let the work speak.

**Fonts:**
- Display: `Barlow Condensed 700` (supports Vietnamese — replaces Bebas Neue)
- Body: `DM Sans 300`
- Mono: `DM Mono 300`

**Colours:**
- Background: `#0a0a0a`
- Text: `#f0ede8`
- Text muted: `#6b6560`
- Accent: `#e8c547` (gold)
- Surface: `#111`
- Border: `rgba(255,255,255,0.06)`

**Tag colour system:**
| Tag | Short | Colour |
|-----|-------|--------|
| art-direction | AD | `#e8c547` gold |
| branding | BR | `rgba(180,120,255)` purple |
| motion | MO | `rgba(80,180,255)` blue |
| social-media | SM | `rgba(255,140,80)` orange |
| ai | AI | `rgba(80,220,160)` green |
| 3d | 3D | `rgba(255,80,120)` red |
| photography | PH | `rgba(200,200,200)` grey |

Short labels on cards, full names in filter bar.

**Visual flair (partially implemented, more needed):**
- Animated gradient on `em` text (hero tagline)
- Pulsing green dot in nav
- Filter button slide-fill animation on hover/active
- Scroll-triggered card reveals (IntersectionObserver)
- Custom cursor: small dot + lagging ring (disabled on touch)

**Visual flair to build (CodePen references):**
- https://codepen.io/shubniggurath/pen/KwgbxVw
- https://codepen.io/daniel-mu-oz/pen/GgjPOmO
- https://codepen.io/jdillon/pen/WbGgJqz
- https://codepen.io/NiklasKnaack/pen/dPpqEgW
- https://codepen.io/editor/NikxDa/pen/019d5e38-b114-74da-bc98-e8862a92ecca
- https://codepen.io/shubniggurath/pen/ZYpjorm
- https://codepen.io/CalculateQuick/pen/KwgxROB
- https://codepen.io/tfrere/pen/bNwxYOV

Priority order: magnetic card hover → hero animated gradient mesh → page transitions (Astro View Transitions API)

---

## Architecture

```
src/
  pages/
    index.astro          # EN homepage
    es/index.astro       # ES homepage
    work/[slug].astro    # Dynamic project pages
  scripts/
    fetchProjects.mjs    # RSS fetcher + manual project merge (fetchAllProjects)
    scrapeProject.mjs    # Behance project image scraper (filters by gallery ID)
    slugify.mjs          # URL slug generator
  data/
    projects.config.json # Per-project overrides: bgColor, accentColor, visible, description
    manual-projects.json # Older projects not in RSS (INLINED into fetchProjects.mjs at build time)
    tags.json            # Tag assignments per project title
    photo-albums.json    # Dark Room album config (all visible: false until photos ready)
    site.json            # Name, role, social links
  styles/global.css
  layouts/Base.astro     # HTML head, GA4, SEO, JSON-LD, cursor script
  i18n/translations.js
.github/workflows/deploy.yml  # Cron 06:00 UTC daily + push trigger
.cache/projects/              # Per-project image scrape cache (7 days TTL)
```

---

## Content & projects

**25 projects total:**
- 12 from Behance RSS (auto-synced daily)
- 13 manual (inlined in fetchProjects.mjs — see IMPORTANT NOTE below)

**RSS limitation:** Behance RSS only returns the 12 most recent projects. Older projects must be added manually.

**IMPORTANT — manual projects workflow:**
Manual projects are INLINED directly into `fetchProjects.mjs` as a const array (not read from manual-projects.json at build time due to Astro's bundling). When adding new manual projects:
1. Add to `src/data/manual-projects.json`
2. Re-run the inline script: `node scripts/update-manual-projects.mjs` (TODO: build this)
3. Or manually update the MANUAL_DATA array in fetchProjects.mjs

**Project config** (`src/data/projects.config.json`):
Each project can have: `visible`, `bgColor`, `accentColor`, `description`
New Behance projects auto-generate pages with defaults. Only edit config to customise.

**Quán Ụt Ụt:** RSS feed has encoding bug (?t ?t). Title correction map is in fetchProjects.mjs. Needs Behance source fix.

---

## DNS (Bluehost)

| Type | Host | Points to |
|------|------|-----------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | goldsmith2097.github.io |

HTTPS: Enable "Enforce HTTPS" in GitHub Pages settings once cert provisions (check after DNS propagation).

---

## SEO & Analytics

- GA4: G-14N2H6TZB2 (wired in Base.astro)
- Sitemap: auto-generated at /sitemap-index.xml by @astrojs/sitemap
- JSON-LD Person schema in Base.astro
- hreflang EN/ES
- Canonical: https://ruben-martinez.com

---

## Pending work (priority order)

### Must do
- [ ] Enable HTTPS in GitHub Pages (cert should be ready ~30min after DNS propagation)
- [ ] Add missing .109 A record (done?) — verify in Bluehost DNS tab
- [ ] Fix older projects with missing thumbnails (Rubén needs to update covers on Behance for projects from ~2013-2015)

### Content
- [ ] Write descriptions for all projects in projects.config.json
- [ ] Add Logitech project (and other upcoming client work)
- [ ] Fix Quán Ụt Ụt title on Behance source
- [ ] Add LinkedIn + Instagram URLs to site.json

### Features
- [ ] Full project page content — video embeds (Rubén has video projects; need videoUrl field in config)
- [ ] Dark Room photo gallery — waiting for Rubén's SSD with Lightroom exports
- [ ] Manual projects update script (one-command workflow for adding new older projects)
- [ ] Mobile testing — verify on real device (CSS breakpoints written but unverified on hardware)

### Visual flair (next session priority)
- [ ] Magnetic hover effect on project cards
- [ ] Animated gradient mesh in hero (slowly shifting, like jackwatkins.co)
- [ ] Page transitions between project pages (Astro View Transitions API)
- [ ] Animated filter checkboxes/buttons (Rubén loves the CodePen animated checkbox effects)

### Later
- [ ] ES page content parity (translations partially done)
- [ ] WHOIS contacts — Rubén updated to Barcelona/Spain but Bluehost may need re-attempt
- [ ] Domain privacy ($15/yr Bluehost) — deferred, Rubén said "not yet"
- [ ] CV download PDF
- [ ] Contact section (currently just "Available for awesome projects" in nav)

---

## How to run locally

```bash
cd ~/Sites/ruben-martinez-portfolio
pkill -f "astro dev"          # kill any existing instances
npm run dev -- --port 4000    # always use a fixed port
```

Open: http://localhost:4000

Build:
```bash
npm run build
```

Deploy: push to main → GitHub Actions deploys automatically (~30 seconds).

---

## Key decisions made & why

- **GitHub Pages over Netlify** — free, no server, simple, works with custom domain
- **Astro over Eleventy** — View Transitions API, islands architecture, built-in image optimization
- **Barlow Condensed over Bebas Neue** — near-identical visual impact but full Vietnamese/Unicode support
- **Manual projects inlined** — Astro bundles scripts into dist/.prerender/ at build time; external JSON files don't get copied there; inline const is the reliable solution
- **No Behance links on site** — Behance is purely a database/upload UI; all presentation is on ruben-martinez.com
- **Static scraping** — Behance project images scraped at build time, cached 7 days, filtered by gallery ID to avoid sidebar pollution
