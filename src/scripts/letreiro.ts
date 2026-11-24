// títulos das seções escritos em pixels conforme o scroll

import { CELULA, celula } from './campo';
import { amostraLetras, limita, suave, BAYER, PIX } from './nome';

interface Titulo {
  el: HTMLElement;
  nota: HTMLElement | null;
  n: number;
  hx: Float32Array; // centro de cada pixel em relação ao canto do título (px de CSS)
  hy: Float32Array;
  u: Float32Array; // posição na ordem de leitura (0 a 1)
  limiar: Float32Array; // degrau do xadrez do pixel
  linhaPx: Uint8Array; // linha do título em que o pixel está
  // letras na ordem de leitura
  lx0: Float32Array;
  larg: Float32Array;
  acum: Float32Array;
  linhaL: Uint8Array;
  total: number;
  // faixa vertical de cada linha, para o recorte
  cima: Float32Array;
  baixo: Float32Array;
  largura: number;
  banda: number; // largura da faixa que escreve, na mesma escala de u
  esquerda: number;
  topoDoc: number;
  inicio: number; // rolagem em que a escrita começa
  fim: number; // rolagem em que o título fica completo
  p: number;
  // até onde vai o texto de verdade (corteX cai sempre na borda de uma célula)
  corteLinha: number;
  corteX: number;
}

export interface Letreiro {
  rolagem(): void;
  mede(): void;
}

const LETRAS_NA_FAIXA = 1.5;
const FAIXA_MIN = 0.12;
const FAIXA_MAX = 0.3;
// dentro da faixa: os pixels ficam todos acesos na metade de trás
const CHEIO = 0.5;
// folga para acentos
const FOLGA = 48;

const resto = (v: number, m: number) => ((v % m) + m) % m;

export function criaLetreiro(elementos: HTMLElement[], aoCompletar?: (titulo: HTMLElement) => void): Letreiro {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixels';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  let cel = CELULA;
  let dpr = 1;
  let W = 1;
  let H = 1;
  let quadro!: ImageData;
  let buf!: Uint32Array;
  let titulos: Titulo[] = [];
  let desenhado = false;

  const mede = () => {
    // todos os títulos na mesma grade: 2 px no celular, senão a da luz
    const menor = Math.min(...elementos.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    dpr = window.devicePixelRatio || 1;
    cel = celula(menor < 90 ? 2 : CELULA);
    // uma célula a mais em cada borda para a camada poder se deslocar
    W = Math.ceil(innerWidth / cel) + 2;
    H = Math.ceil(innerHeight / cel) + 2;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * cel}px`;
    canvas.style.height = `${H * cel}px`;
    quadro = ctx.createImageData(W, H);
    buf = new Uint32Array(quadro.data.buffer);

    const maxRolagem = document.documentElement.scrollHeight - innerHeight;
    const folga = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 16;
    titulos = elementos.map((el) => {
      el.style.clipPath = '';
      const a = amostraLetras(el, cel);
      const secao = el.closest<HTMLElement>('section') || el;
      const nota = secao.querySelector<HTMLElement>('.sec-nota');
      // daqui em diante quem mostra o título é o JS (o CSS esconde para não piscar)
      el.classList.add('letreiro-pronto');
      nota?.classList.add('letreiro-pronto');

      // letras na ordem de leitura, cada uma com a sua largura, e a linha de cada uma
      const letras = a.caixas.length / 4;
      const lx0 = new Float32Array(letras);
      const larg = new Float32Array(letras);
      const acum = new Float32Array(letras);
      const linhaL = new Uint8Array(letras);
      let total = 0;
      let linhas = 0;
      let topoLinha = -Infinity;
      for (let l = 0; l < letras; l++) {
        const x0 = a.caixas[l * 4];
        const y0 = a.caixas[l * 4 + 1];
        const y1 = a.caixas[l * 4 + 3];
        // nova linha quando a letra cai abaixo do meio da linha atual
        if (l === 0) topoLinha = y0;
        else if (y0 > topoLinha + (y1 - y0) * 0.5) {
          linhas++;
          topoLinha = y0;
        }
        lx0[l] = x0;
        larg[l] = Math.max(1, a.caixas[l * 4 + 2] - x0);
        acum[l] = total;
        linhaL[l] = linhas;
        total += larg[l];
      }
      total = Math.max(1, total);
      linhas++;

      const n = a.n;
      const u = new Float32Array(n);
      const limiar = new Float32Array(n);
      const linhaPx = new Uint8Array(n);
      const gTopo = new Float32Array(linhas).fill(Infinity);
      const gBase = new Float32Array(linhas).fill(-Infinity);
      for (let i = 0; i < n; i++) {
        const x = a.hx[i];
        const y = a.hy[i];
        // a letra do pixel: a caixa que o contém (ou a mais próxima)
        let qual = 0;
        let perto = Infinity;
        for (let l = 0; l < letras; l++) {
          const x0 = a.caixas[l * 4];
          const y0 = a.caixas[l * 4 + 1];
          const x1 = a.caixas[l * 4 + 2];
          const y1 = a.caixas[l * 4 + 3];
          if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
            qual = l;
            break;
          }
          const d = Math.abs(x - (x0 + x1) / 2) + Math.abs(y - (y0 + y1) / 2);
          if (d < perto) {
            perto = d;
            qual = l;
          }
        }
        u[i] = letras ? (acum[qual] + limita(x - lx0[qual], 0, larg[qual])) / total : 0;
        const ln = letras ? linhaL[qual] : 0;
        linhaPx[i] = ln;
        gTopo[ln] = Math.min(gTopo[ln], y - cel / 2);
        gBase[ln] = Math.max(gBase[ln], y + cel / 2);
        limiar[i] = BAYER[(Math.floor(y / cel) & 3) * 4 + (Math.floor((a.esquerda + x) / cel) & 3)];
      }
      // o recorte de cada linha vai do meio do vão de cima ao meio do vão de baixo
      const cima = new Float32Array(linhas);
      const baixo = new Float32Array(linhas);
      for (let l = 0; l < linhas; l++) {
        cima[l] = l === 0 ? -FOLGA : (gBase[l - 1] + gTopo[l]) / 2;
        baixo[l] = l === linhas - 1 ? a.altura + FOLGA : (gBase[l] + gTopo[l + 1]) / 2;
      }
      const banda = limita(LETRAS_NA_FAIXA / Math.max(1, letras), FAIXA_MIN, FAIXA_MAX);

      // começa quando o título já subiu um pouco e termina antes da seção chegar ao topo
      const topoSecao = secao.getBoundingClientRect().top + scrollY;
      const fim = Math.min(topoSecao - folga, maxRolagem - 2);
      let inicio = a.topoDoc - innerHeight + Math.min(innerHeight * 0.15, 140);
      if (fim - inicio < 240) inicio = fim - 240;
      return {
        el, nota, n, hx: a.hx, hy: a.hy, u, limiar, linhaPx, lx0, larg, acum, linhaL, total, cima, baixo,
        largura: a.largura, banda, esquerda: a.esquerda, topoDoc: a.topoDoc, inicio, fim, p: -1,
        corteLinha: -1, corteX: -Infinity,
      } satisfies Titulo;
    });
    desenha();
  };

  // borda de trás da faixa: linha e x
  const borda = (t: Titulo, uTras: number) => {
    const alvo = uTras * t.total;
    let l = 0;
    while (l + 1 < t.acum.length && t.acum[l + 1] <= alvo) l++;
    if (!t.acum.length) return { linha: 0, x: -FOLGA };
    return { linha: t.linhaL[l], x: t.lx0[l] + limita(alvo - t.acum[l], 0, t.larg[l]) };
  };

  // recorte: linhas já escritas inteiras e a atual até a borda
  const recorta = (t: Titulo) => {
    if (t.p >= 1) {
      t.el.style.clipPath = '';
      t.corteLinha = Infinity;
      return;
    }
    const uTras = t.p * (1 + t.banda) - t.banda;
    if (uTras <= 0 || !t.n) {
      t.el.style.clipPath = 'inset(0 0 100% 0)';
      t.corteLinha = -1;
      return;
    }
    const { linha, x } = borda(t, uTras);
    // a borda vai para a divisa de células seguinte: dali em diante, só pixels
    const g0 = t.hx[0] - cel / 2;
    t.corteLinha = linha;
    t.corteX = g0 + Math.ceil((x - g0) / cel - 1e-6) * cel;
    const c = t.cima[linha].toFixed(1);
    const b = t.baixo[linha].toFixed(1);
    const d = (t.largura + FOLGA).toFixed(1);
    // meio pixel a mais para não sobrar fresta
    const xs = (t.corteX + 0.5).toFixed(2);
    t.el.style.clipPath =
      `polygon(${-FOLGA}px ${-FOLGA}px, ${d}px ${-FOLGA}px, ${d}px ${c}px, ${xs}px ${c}px, ` +
      `${xs}px ${b}px, ${-FOLGA}px ${b}px)`;
  };

  const desenha = () => {
    const y = scrollY;
    let algum = false;
    for (const t of titulos) {
      const p = limita((y - t.inicio) / Math.max(1, t.fim - t.inicio));
      if (p !== t.p) {
        // título completo: o texto da seção acende (acende.ts)
        if (p >= 1 && t.p < 1) aoCompletar?.(t.el);
        t.p = p;
        recorta(t);
        if (t.nota) {
          const q = suave(0.82, 1, p);
          t.nota.style.opacity = String(q);
          t.nota.style.transform = q < 1 ? `translateY(${((1 - q) * 14).toFixed(1)}px)` : '';
        }
      }
      if (p > 0 && p < 1) algum = true;
    }
    if (!algum) {
      if (desenhado) {
        buf.fill(0);
        ctx.putImageData(quadro, 0, 0);
        desenhado = false;
      }
      return;
    }
    buf.fill(0);
    let presa = false;
    let dx = 0;
    let dy = 0;
    for (const t of titulos) {
      if (!(t.p > 0 && t.p < 1) || !t.n) continue;
      const topo = t.topoDoc - y;
      // a camada se desloca para a grade cair em cima do título
      if (!presa) {
        presa = true;
        dx = resto(t.esquerda + t.hx[0] - cel / 2, cel);
        dy = resto(topo + t.hy[0] - cel / 2, cel);
        dx = Math.round(dx * dpr) / dpr;
        dy = Math.round(dy * dpr) / dpr;
      }
      const frente = t.p * (1 + t.banda);
      const ox = t.esquerda - cel / 2 - dx + cel;
      const oy = topo - cel / 2 - dy + cel;
      for (let i = 0; i < t.n; i++) {
        // onde o texto de verdade já aparece, não há pixel
        const ln = t.linhaPx[i];
        if (ln < t.corteLinha || (ln === t.corteLinha && t.hx[i] - cel / 2 < t.corteX - 0.01)) continue;
        const k = (frente - t.u[i]) / t.banda; // 0 = a faixa acabou de chegar; 1 = já passou
        if (k <= 0) continue;
        let cor: number;
        if (k >= 1) {
          // ponta de letra que passa da borda do recorte
          cor = PIX.um;
        } else {
          // acende em xadrez na frente da faixa e escurece em degraus para trás
          if (limita(k / CHEIO) <= t.limiar[i]) continue;
          const tom = k + (t.limiar[i] - 0.5) * 0.3;
          cor = tom > 0.72 ? PIX.um : tom > 0.38 ? PIX.dois : PIX.tres;
        }
        const cx = Math.round((ox + t.hx[i]) / cel);
        const cy = Math.round((oy + t.hy[i]) / cel);
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
        buf[cy * W + cx] = cor;
      }
    }
    canvas.style.transform = `translate(${(dx - cel).toFixed(3)}px, ${(dy - cel).toFixed(3)}px)`;
    ctx.putImageData(quadro, 0, 0);
    desenhado = true;
  };

  let pedido = 0;
  return {
    rolagem() {
      if (!pedido)
        pedido = requestAnimationFrame(() => {
          pedido = 0;
          desenha();
        });
    },
    mede,
  };
}
