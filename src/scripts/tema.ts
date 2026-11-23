/* Troca de tema: os pixels do tema novo cobrem a tela a partir do botão e depois se desfazem. */

import { celula } from './campo';
import { BAYER } from './nome';
import { RITMO, curvaEntra, curvaTroca } from './ritmo';

type Tema = 'escuro' | 'claro';

interface Opcoes {
  reduz: boolean;
  /** depois da troca: a luz e os pixels releem o tema (recebe o centro do botão) */
  aoTrocar: (x: number, y: number) => void;
}

const COR_BARRA: Record<Tema, string> = { escuro: '#0a0909', claro: '#e8e6e3' };
const COBRE = RITMO.medio;
const REVELA = RITMO.lento;
const BANDA = 0.07; // largura da frente de vinho (fração da distância até o canto mais longe)
const SALTO = 0.14; // quanto o pontilhado embaralha a borda

export function iniciaTema({ reduz, aoTrocar }: Opcoes) {
  const html = document.documentElement;
  const botao = document.querySelector<HTMLButtonElement>('[data-tema-bt]');
  if (!botao) return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  const atual = (): Tema => (html.dataset.tema === 'claro' ? 'claro' : 'escuro');
  const rotula = () =>
    botao.setAttribute('aria-label', atual() === 'claro' ? 'Mudar para o tema escuro' : 'Mudar para o tema claro');
  rotula();

  const aplica = (tema: Tema) => {
    if (tema === 'claro') html.dataset.tema = 'claro';
    else delete html.dataset.tema;
    try {
      localStorage.setItem('tema', tema);
    } catch {
      /* sem storage: vale só nesta visita */
    }
    meta?.setAttribute('content', COR_BARRA[tema]);
    rotula();
    // o ícone novo chega girando (.tema-bt.trocou)
    botao.classList.remove('trocou');
    void botao.offsetWidth;
    botao.classList.add('trocou');
    const r = botao.getBoundingClientRect();
    aoTrocar(r.left + r.width / 2, r.top + r.height / 2);
  };

  // cores de um tema em ABGR: troca o atributo, lê e volta no mesmo instante
  const coresDe = (tema: Tema) => {
    const antes = html.dataset.tema;
    if (tema === 'claro') html.dataset.tema = 'claro';
    else delete html.dataset.tema;
    const css = getComputedStyle(html);
    const abgr = (nome: string) => {
      const [r, g, b] = css.getPropertyValue(nome).trim().split(/\s+/).map(Number);
      return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
    };
    const cores = { fundo: abgr('--fundo-rgb'), vivo: abgr('--vivo-rgb'), frente: abgr('--pixel-2-rgb') };
    if (antes) html.dataset.tema = antes;
    else delete html.dataset.tema;
    return cores;
  };

  let ocupado = false;
  botao.addEventListener('click', () => {
    if (ocupado) return;
    const novo: Tema = atual() === 'claro' ? 'escuro' : 'claro';
    if (reduz) return aplica(novo);
    ocupado = true;

    // o dobro da célula da luz, na mesma grade
    const cel = celula() * 2;
    const W = Math.ceil(innerWidth / cel);
    const H = Math.ceil(innerHeight / cel);
    const canvas = document.createElement('canvas');
    canvas.className = 'tema-onda';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * cel}px`;
    canvas.style.height = `${H * cel}px`;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d')!;
    const quadro = ctx.createImageData(W, H);
    const buf = new Uint32Array(quadro.data.buffer);

    const r = botao.getBoundingClientRect();
    const ox = (r.left + r.width / 2) / cel;
    const oy = (r.top + r.height / 2) / cel;
    const longe = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    // distância de cada célula até o botão, embaralhada pelo pontilhado
    const dist = new Float32Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        dist[y * W + x] = Math.hypot(x - ox, y - oy) / longe + BAYER[(y & 3) * 4 + (x & 3)] * SALTO;

    const cor = coresDe(novo);
    const fim = 1 + SALTO + BANDA;

    // cobrindo: atrás da frente já é o fundo novo. revelando: só o que ainda está na frente
    const desenha = (p: number, cobrindo: boolean) => {
      const f = (cobrindo ? curvaTroca(p) : curvaEntra(p)) * fim;
      for (let i = 0; i < buf.length; i++) {
        const d = dist[i];
        const dentro = cobrindo ? d < f : d >= f;
        if (!dentro) {
          buf[i] = 0;
          continue;
        }
        const daFrente = Math.abs(f - d);
        buf[i] = daFrente < BANDA * 0.45 ? cor.frente : daFrente < BANDA ? cor.vivo : cor.fundo;
      }
      ctx.putImageData(quadro, 0, 0);
    };

    const fase = (cobrindo: boolean) =>
      new Promise<void>((pronto) => {
        const t0 = performance.now();
        const dur = cobrindo ? COBRE : REVELA;
        const passo = (agora: number) => {
          const p = Math.min(1, (agora - t0) / dur);
          desenha(p, cobrindo);
          if (p < 1) requestAnimationFrame(passo);
          else pronto();
        };
        requestAnimationFrame(passo);
      });

    fase(true)
      .then(() => {
        aplica(novo);
        return fase(false);
      })
      .then(() => {
        canvas.remove();
        ocupado = false;
      });
  });
}
