import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const mapa = site ? `\nSitemap: ${new URL('/sitemap.xml', site).href}\n` : '';
  return new Response(`User-agent: *\nAllow: /\n${mapa}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
