// roda depois do build e gera dist/_headers para a Cloudflare Pages
// scripts inline entram na CSP pelo hash, tirado do HTML final
// HSTS sem includeSubDomains/preload: é difícil voltar atrás
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// no Windows o .pathname viraria "/C:/..."
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const paginas = readdirSync(dist, { recursive: true }).filter((f) => String(f).endsWith('.html'));

const hashes = new Set();
for (const p of paginas) {
  const html = readFileSync(join(dist, p), 'utf8');
  for (const [, atributos, corpo] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(atributos) || !corpo.trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(corpo).digest('base64')}'`);
  }
}

const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].join(' ')}`.trim(),
  // CSS embutido e estilos escritos pela animação
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const conteudo = `# Gerado por ferramentas/cabecalhos.mjs. Não edite à mão: rode "npm run build".

/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000

# arquivos com hash no nome nunca mudam: cache de um ano
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/og.png
  Cache-Control: public, max-age=86400

/favicon.svg
  Cache-Control: public, max-age=86400

/favicon.ico
  Cache-Control: public, max-age=86400

/apple-touch-icon.png
  Cache-Control: public, max-age=86400
`;

writeFileSync(join(dist, '_headers'), conteudo);
console.log(`_headers: ${paginas.length} páginas, ${hashes.size} script(s) inline liberado(s) por hash`);
