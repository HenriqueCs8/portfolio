import { defineConfig } from 'astro/config';

// endereço público (canonical, og:image, sitemap). Na Cloudflare: variável SITE_URL.
// sem ela, usa o endereço do próprio build (CF_PAGES_URL)
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || undefined;

export default defineConfig({
  site,
  // format "file": /privacidade sem barra no fim (com pastas a Cloudflare redireciona)
  build: { inlineStylesheets: 'always', format: 'file' },
  trailingSlash: 'never',
  devToolbar: { enabled: false },
});
