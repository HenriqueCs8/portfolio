import type { APIRoute } from 'astro';

// página nova? coloque o caminho aqui. sem SITE_URL o mapa sai vazio
const paginas = ['/', '/privacidade'];

export const GET: APIRoute = ({ site }) => {
  const urls = site ? paginas.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n') : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
