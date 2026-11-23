// círculo de luz em pixels que abre e fecha o detalhe do projeto

import { celula } from './campo';
import { BAYER, corCss } from './nome';

const curva = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function inunda(
  dialogo: HTMLElement,
  fundo: HTMLElement,
  origem: { x: number; y: number },
  abrindo: boolean,
  duracao: number,
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.className = 'det-luz';
  canvas.setAttribute('aria-hidden', 'true');
  dialogo.insertBefore(canvas, fundo.nextSibling);
  // mesma grade da luz do fundo
  const CELULA = celula();
  const W = Math.ceil(innerWidth / CELULA);
  const H = Math.ceil(innerHeight / CELULA);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W * CELULA}px`;
  canvas.style.height = `${H * CELULA}px`;
  const ctx = canvas.getContext('2d')!;
  const quadro = ctx.createImageData(W, H);
  const buf = new Uint32Array(quadro.data.buffer);

  // tons da frente de luz: os da luz do fundo e o destaque do tema
  const tons = [
    corCss('--luz-2-rgb', 0xff65102e),
    corCss('--luz-3-rgb', 0xff8b1741),
    corCss('--luz-4-rgb', 0xffb52055),
    corCss('--pixel-2-rgb', 0xffffb0c4),
  ];

  const ox = origem.x / CELULA;
  const oy = origem.y / CELULA;
  // distância até o canto mais longe da tela, em células
  const maximo = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) + 4;
  const banda = Math.max(26, maximo * 0.16); // largura da frente de luz, em células

  return new Promise((resolve) => {
    const t0 = performance.now();
    const passo = (agora: number) => {
      // fechou no meio do caminho: a luz para onde está
      if (!canvas.isConnected) return resolve();
      const p = Math.min(1, (agora - t0) / duracao);
      const e = curva(abrindo ? p : 1 - p);
      const r = e * (maximo + banda);
      fundo.style.clipPath = `circle(${(r * CELULA).toFixed(1)}px at ${origem.x}px ${origem.y}px)`;

      buf.fill(0);
      const y0 = Math.max(0, Math.floor(oy - r));
      const y1 = Math.min(H - 1, Math.ceil(oy + r));
      for (let y = y0; y <= y1; y++) {
        const dy = y - oy;
        const meia = Math.sqrt(Math.max(0, r * r - dy * dy));
        const x0 = Math.max(0, Math.floor(ox - meia));
        const x1 = Math.min(W - 1, Math.ceil(ox + meia));
        for (let x = x0; x <= x1; x++) {
          const dx = x - ox;
          const fundoDentro = r - Math.sqrt(dx * dx + dy * dy);
          if (fundoDentro < 0 || fundoDentro > banda) continue;
          const v = (1 - fundoDentro / banda) * 4; // 4 na frente, 0 no fim da banda
          const nivel = Math.floor(v) + (BAYER[(y & 3) * 4 + (x & 3)] < v % 1 ? 1 : 0);
          if (nivel <= 0) continue;
          buf[y * W + x] = tons[Math.min(nivel, 4) - 1];
        }
      }
      ctx.putImageData(quadro, 0, 0);

      if (p < 1) requestAnimationFrame(passo);
      else {
        canvas.remove();
        if (abrindo) fundo.style.clipPath = '';
        resolve();
      }
    };
    requestAnimationFrame(passo);
  });
}
