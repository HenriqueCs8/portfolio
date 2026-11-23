// a próxima imagem aparece célula por célula a partir do canto de baixo à direita (Bayer 8x8)

const bayer8 = (() => {
  const m = [0];
  let tam = 1;
  while (tam < 8) {
    const novo = new Array(tam * 2 * tam * 2);
    for (let y = 0; y < tam; y++)
      for (let x = 0; x < tam; x++) {
        const v = m[y * tam + x] * 4;
        novo[y * tam * 2 + x] = v;
        novo[y * tam * 2 + x + tam] = v + 2;
        novo[(y + tam) * tam * 2 + x] = v + 3;
        novo[(y + tam) * tam * 2 + x + tam] = v + 1;
      }
    m.splice(0, m.length, ...novo);
    tam *= 2;
  }
  return m.map((v) => (v + 0.5) / 64);
})();

/** desenha como object-fit: cover, no centro ou presa no canto de cima */
function cobre(c: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, topo: boolean) {
  const iw = img.naturalWidth || w;
  const ih = img.naturalHeight || h;
  const s = Math.max(w / iw, h / ih);
  c.drawImage(img, topo ? 0 : (w - iw * s) / 2, topo ? 0 : (h - ih * s) / 2, iw * s, ih * s);
}

export interface Opcoes {
  duracao?: number;
  /** tamanho da célula em px de CSS */
  cel?: number;
  /** imagem que fica por baixo enquanto a nova entra */
  base?: HTMLImageElement | null;
  /** alinha pelo canto de cima à esquerda (prints de sites) */
  topo?: boolean;
}

export async function dissolve(quadro: HTMLElement, entra: HTMLImageElement, opcoes: Opcoes = {}) {
  const { duracao = 1000, cel: CEL = 8, base = null, topo = false } = opcoes;
  try {
    await entra.decode();
  } catch {
    /* segue com o que tiver */
  }
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = quadro.clientWidth;
  const h = quadro.clientHeight;
  const tela = document.createElement('canvas');
  tela.className = 'dissolve';
  tela.setAttribute('aria-hidden', 'true');
  tela.width = Math.round(w * dpr);
  tela.height = Math.round(h * dpr);
  quadro.appendChild(tela);
  const c = tela.getContext('2d')!;

  // a imagem que entra, pronta, fora da tela
  const fonte = document.createElement('canvas');
  fonte.width = tela.width;
  fonte.height = tela.height;
  const f = fonte.getContext('2d')!;
  f.scale(dpr, dpr);
  cobre(f, entra, w, h, topo);
  let fundo: HTMLCanvasElement | null = null;
  if (base) {
    fundo = document.createElement('canvas');
    fundo.width = tela.width;
    fundo.height = tela.height;
    const b = fundo.getContext('2d')!;
    b.scale(dpr, dpr);
    cobre(b, base, w, h, topo);
  }

  // máscara: cada célula entra no seu momento
  const mascara = document.createElement('canvas');
  mascara.width = tela.width;
  mascara.height = tela.height;
  const m = mascara.getContext('2d')!;
  m.fillStyle = '#000';
  const cols = Math.ceil(w / CEL);
  const lins = Math.ceil(h / CEL);
  const celulas: [number, number, number][] = [];
  for (let y = 0; y < lins; y++)
    for (let x = 0; x < cols; x++) {
      const canto = ((cols - 1 - x) / cols + (lins - 1 - y) / lins) / 2; // 0 no canto da luz
      celulas.push([x, y, 0.62 * canto + 0.38 * bayer8[(y % 8) * 8 + (x % 8)]]);
    }
  celulas.sort((a, b) => a[2] - b[2]);

  await new Promise<void>((pronto) => {
    let feitas = 0;
    const t0 = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - t0) / duracao);
      const alvo = p * p * (3 - 2 * p); // suaviza começo e fim
      while (feitas < celulas.length && celulas[feitas][2] <= alvo) {
        const [x, y] = celulas[feitas++];
        m.fillRect(x * CEL * dpr, y * CEL * dpr, CEL * dpr + 0.5, CEL * dpr + 0.5);
      }
      c.globalCompositeOperation = 'copy';
      c.drawImage(mascara, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.drawImage(fonte, 0, 0);
      if (fundo) {
        c.globalCompositeOperation = 'destination-over';
        c.drawImage(fundo, 0, 0);
      }
      if (p < 1) requestAnimationFrame(passo);
      else pronto();
    };
    requestAnimationFrame(passo);
  });
  return () => tela.remove();
}
