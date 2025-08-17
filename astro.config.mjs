import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // For GitHub Pages project site
  site: 'https://stephen-netu.github.io/the-world-as-a-wiki',
  base: '/the-world-as-a-wiki',
  integrations: [sitemap()],
});
