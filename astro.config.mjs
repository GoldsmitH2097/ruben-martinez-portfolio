import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ruben-martinez.com',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  build: {
    assets: 'assets',
  },
});
