import { defineConfig } from 'astro/config';

// SITE_URL vem da Cloudflare; sem ela, vale o endereço *.pages.dev do build
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || undefined;

export default defineConfig({
  site,
  // 'file' faz /privacidade abrir sem barra no fim
  build: { inlineStylesheets: 'always', format: 'file' },
  trailingSlash: 'never',
  devToolbar: { enabled: false },
});
