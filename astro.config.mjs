import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ruben-martinez.com',
  base: '/',
  output: 'static',
  build: {
    assets: 'assets',
  },
});
