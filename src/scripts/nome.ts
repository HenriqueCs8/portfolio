/* O nome do início em pixels: se monta na abertura e se desfaz com a rolagem. */

import { CELULA, celula } from './campo';

// cores dos pixels em ABGR (ordem do ImageData em little-endian), lidas do tema
export const PIX = { um: 0xfffff1f4, dois: 0xffffb0c4, tres: 0xffb52055 };
/** variável "R G B" do tema em ABGR (ou o valor reserva) */
export function corCss(nome: string, reserva: number) {
  const [r, g, b] = getComputedStyle(document.documentElement).getPropertyValue(nome).trim().split(/\s+/).map(Number);
  if ([r, g, b].some((v) => Number.isNaN(v))) return reserva;
  return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
export function lePixels() {
  PIX.um = corCss('--pixel-1-rgb', PIX.um);
  PIX.dois = corCss('--pixel-2-rgb', PIX.dois);
  PIX.tres = corCss('--pixel-3-rgb', PIX.tres);
}
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((b) => (b + 0.5) / 16);

export const limita = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const suave = (a: number, b: number, v: number) => {
  const t = limita((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const vaiVolta = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface Nome {
  /** roda a abertura; resolve quando o nome está montado e a página pode entrar */
  abertura(escala?: number): Promise<void>;
  /** pula a abertura na hora */
  pula(): void;
  /** posição do scroll, para a saída */
  rolagem(y: number): void;
  /** refaz as medidas (depois de mudar o tamanho da tela) */
  mede(): void;
}

/** mede as letras como o navegador desenhou e devolve uma partícula por célula preenchida */
export function amostraLetras(el: HTMLElement, cel: number) {
  const antes = el.style.transform;
  el.style.transform = 'none';
  const linhas = [...el.querySelectorAll<HTMLElement>('.ln > span')];
  const antesL = linhas.map((l) => l.style.transform);
  linhas.forEach((l) => (l.style.transform = 'none'));
  const r = el.getBoundingClientRect();

  const M = 16; // margem para letras que passam um pouco da caixa
  const off = document.createElement('canvas');
  const ow = Math.ceil(r.width) + M * 2;
  const oh = Math.ceil(r.height) + M * 2;
  off.width = ow;
  off.height = oh;
  const c = off.getContext('2d', { willReadFrequently: true })!;
  const cs = getComputedStyle(el);
  c.font = `${cs.fontWeight} ${cs.fontStretch === '125%' ? 'expanded' : ''} ${cs.fontSize} ${cs.fontFamily}`.replace(/\s+/g, ' ');
  if ('fontStretch' in c) (c as any).fontStretch = 'expanded';
  c.fillStyle = '#fff';
  c.textBaseline = 'alphabetic';
  const descida = c.measureText('H').fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.22;
  const maiuscula = cs.textTransform === 'uppercase';

  // desenha cada letra na posição exata em que o navegador a desenhou
  // caixa de cada letra, na ordem de leitura
  const caixas: number[] = [];
  const passeio = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    // cópias para leitor de tela ficam de fora
    acceptNode: (no) => (no.parentElement?.closest('.so-leitor') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const faixa = document.createRange();
  for (let no = passeio.nextNode(); no; no = passeio.nextNode()) {
    const t = no.textContent || '';
    for (let i = 0; i < t.length; i++) {
      if (!t[i].trim()) continue;
      faixa.setStart(no, i);
      faixa.setEnd(no, i + 1);
      const cr = faixa.getBoundingClientRect();
      c.fillText(maiuscula ? t[i].toLocaleUpperCase('pt-BR') : t[i], cr.left - r.left + M, cr.bottom - r.top + M - descida);
      caixas.push(cr.left - r.left, cr.top - r.top, cr.right - r.left, cr.bottom - r.top);
    }
  }
  el.style.transform = antes;
  linhas.forEach((l, i) => (l.style.transform = antesL[i]));

  // uma partícula por célula preenchida, alinhada à grade de células da tela
  const dados = c.getImageData(0, 0, ow, oh).data;
  const px: number[] = [];
  const x0 = ((cel - ((r.left - M) % cel)) % cel) + cel / 2;
  for (let y = cel / 2; y < oh; y += cel) {
    for (let x = x0; x < ow; x += cel) {
      if (dados[((y | 0) * ow + (x | 0)) * 4 + 3] > 110) px.push(x - M, y - M);
    }
  }
  const n = px.length / 2;
  const hx = new Float32Array(n);
  const hy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    hx[i] = px[i * 2];
    hy[i] = px[i * 2 + 1];
  }
  return { n, hx, hy, esquerda: r.left, topoDoc: r.top + scrollY, largura: r.width, altura: r.height, caixas };
}

export function criaNome(h1: HTMLElement, hero: HTMLElement, parallax: number): Nome {
  let alturaHero = hero.offsetHeight;
  const canvas = document.createElement('canvas');
  canvas.className = 'pixels';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  let W = 0;
  let H = 0;
  // células de 3 px como a luz; 2 px em nomes pequenos (celular)
  let cel = CELULA;
  let quadro!: ImageData;
  let buf!: Uint32Array;
  const dimensiona = () => {
    cel = celula(parseFloat(getComputedStyle(h1).fontSize) < 90 ? 2 : CELULA);
    W = Math.max(1, Math.ceil(innerWidth / cel));
    H = Math.max(1, Math.ceil(innerHeight / cel));
    canvas.width = W;
    canvas.height = H;
    // cada célula do tamanho exato da grade (o canvas pode passar um pouco da tela)
    canvas.style.width = `${W * cel}px`;
    canvas.style.height = `${H * cel}px`;
    quadro = ctx.createImageData(W, H);
    buf = new Uint32Array(quadro.data.buffer);
  };

  // amostra das letras

  let n = 0;
  let hx = new Float32Array(0); // posição de cada pixel em relação ao canto do nome (px de CSS)
  let hy = new Float32Array(0);
  let r1 = new Float32Array(0); // números aleatórios fixos por pixel
  let r2 = new Float32Array(0);
  let solta = new Float32Array(0); // quando cada pixel se solta na saída (0 a 1)
  let esquerda = 0;
  let topoDoc = 0; // topo do nome no documento, sem transformações
  let altura = 1;
  let largura = 1;

  const amostra = () => {
    const a = amostraLetras(h1, cel);
    ({ n, hx, hy, esquerda, topoDoc, largura, altura } = a);
    r1 = new Float32Array(n);
    r2 = new Float32Array(n);
    solta = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      r1[i] = Math.random();
      r2[i] = Math.random();
      // de baixo para cima, com acaso: a base das letras cai primeiro
      solta[i] = 0.62 * Math.random() + 0.38 * limita(hy[i] / altura);
    }
  };

  const ponto = (x: number, y: number, cor: number, alfa: number) => {
    const cx = (x / cel) | 0;
    const cy = (y / cel) | 0;
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) return;
    if (alfa < 1 && alfa <= BAYER[(cy & 3) * 4 + (cx & 3)]) return;
    buf[cy * W + cx] = cor;
  };
  const mostra = () => ctx.putImageData(quadro, 0, 0);
  const limpa = () => {
    buf.fill(0);
    mostra();
  };

  // abertura

  let pedidoAbertura = 0;
  let terminaAbertura: (() => void) | null = null;

  // escala < 1 encurta tudo (1 = 2,4 s; 0,58 ≈ 1,4 s no F5)
  const abertura = (escala = 1) =>
    new Promise<void>((resolve) => {
      dimensiona();
      amostra();
      const topo = topoDoc - scrollY;

      // ~2.600 pontos de partida; cada pixel sai de um deles
      const origens = Math.min(2600, Math.max(600, Math.round((innerWidth * innerHeight) / 520)));
      const ox = new Float32Array(origens);
      const oy = new Float32Array(origens);
      const oAparece = new Float32Array(origens);
      for (let o = 0; o < origens; o++) {
        ox[o] = Math.random() * innerWidth;
        oy[o] = Math.random() * innerHeight;
        oAparece[o] = Math.random() * 380 * escala;
      }
      const sx = new Float32Array(n);
      const sy = new Float32Array(n);
      const ap = new Float32Array(n);
      const ini = new Float32Array(n);
      const dur = new Float32Array(n);
      const curva = new Float32Array(n);
      let fimVoo = 0;
      for (let i = 0; i < n; i++) {
        const o = (Math.random() * origens) | 0;
        sx[i] = ox[o];
        sy[i] = oy[o];
        ap[i] = oAparece[o];
        // da esquerda para a direita, com acaso
        ini[i] = (300 + (hx[i] / largura) * 420 + r1[i] * 240) * escala;
        dur[i] = (820 + r2[i] * 300) * Math.max(0.7, escala);
        curva[i] = (r1[i] - 0.5) * 0.5;
        fimVoo = Math.max(fimVoo, ini[i] + dur[i]);
      }
      const DISSOLVE = 260 * Math.max(0.7, escala);

      let acabou = false;
      const fim = () => {
        if (acabou) return;
        acabou = true;
        cancelAnimationFrame(pedidoAbertura);
        terminaAbertura = null;
        limpa();
        // o nome continua visível; quem chamou marca como montado
        h1.style.opacity = '';
        h1.classList.add('montado');
        resolve();
      };
      terminaAbertura = fim;

      const t0 = performance.now();
      let nomeVisivel = false;
      const passo = (agora: number) => {
        const t = agora - t0;
        buf.fill(0);
        if (t >= fimVoo && !nomeVisivel) {
          // o texto de verdade aparece por baixo dos pontos
          nomeVisivel = true;
          h1.style.opacity = '1';
        }
        for (let i = 0; i < n; i++) {
          if (t < ap[i]) continue;
          if (nomeVisivel && t > fimVoo + r2[i] * DISSOLVE) continue;
          const p = limita((t - ini[i]) / dur[i]);
          const e = vaiVolta(p);
          const tx = esquerda + hx[i];
          const ty = topo + hy[i];
          const dx = tx - sx[i];
          const dy = ty - sy[i];
          const arco = Math.sin(Math.PI * e) * curva[i];
          const x = sx[i] + dx * e - dy * arco;
          const y = sy[i] + dy * e + dx * arco;
          const cor = p >= 1 ? PIX.um : p > 0.7 ? PIX.dois : r1[i] > 0.55 ? PIX.dois : PIX.tres;
          ponto(x, y, cor, p > 0 ? 1 : limita((t - ap[i]) / 140));
        }
        mostra();
        if (t < fimVoo + DISSOLVE + 40) pedidoAbertura = requestAnimationFrame(passo);
        else fim();
      };
      pedidoAbertura = requestAnimationFrame(passo);
    });

  // saída ligada ao scroll

  let k = 0;
  let desenhado = false;
  let pedidoSaida = 0;
  let pronto = false;

  const desenhaSaida = () => {
    pedidoSaida = 0;
    const y = scrollY;
    // troca de uma vez: misturar aos poucos deixava o nome quadriculado
    const fio = k > 0 ? 1 : 0;
    h1.style.opacity = k > 0 ? '0' : '';
    if (k <= 0 || k >= 1) {
      if (desenhado) limpa();
      desenhado = false;
      return;
    }
    const topo = topoDoc - y + y * parallax;
    buf.fill(0);
    for (let i = 0; i < n; i++) {
      const l = limita((k - solta[i] * 0.6) / 0.4);
      if (l >= 1) continue;
      const x = esquerda + hx[i] + (r1[i] - 0.5) * 110 * l;
      const yy = topo + hy[i] + l * l * (240 + r2[i] * 420);
      const cor = l < 0.18 ? PIX.um : l < 0.55 ? PIX.dois : PIX.tres;
      ponto(x, yy, cor, fio * (1 - suave(0.45, 1, l)));
    }
    mostra();
    desenhado = true;
  };

  return {
    abertura,
    pula() {
      terminaAbertura?.();
    },
    rolagem(y) {
      if (!pronto) return;
      // altura medida no mede(); ler offsetHeight aqui forçaria layout a cada quadro
      const fimSaida = Math.max(1, alturaHero * 0.62);
      // zona morta no começo: o F5 às vezes volta alguns pixels abaixo do topo
      const zona = Math.min(80, alturaHero * 0.06);
      const novo = limita((y - zona) / Math.max(1, fimSaida - zona));
      if (novo === k && (novo === 0 || novo === 1)) return;
      k = novo;
      if (!pedidoSaida) pedidoSaida = requestAnimationFrame(desenhaSaida);
    },
    mede() {
      dimensiona();
      amostra();
      alturaHero = hero.offsetHeight;
      pronto = true;
      k = -1;
      this.rolagem(scrollY);
    },
  };
}
