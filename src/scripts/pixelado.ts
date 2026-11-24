// aparece ou some em pixels (troca de página dos projetos)

const CELULA_MASCARA = 6;
const DEGRAUS = 16;
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35,
  11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

let quadros: string[] | null = null;
function geraQuadros() {
  const lado = 8 * CELULA_MASCARA;
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  const x = c.getContext('2d')!;
  quadros = [];
  for (let k = 0; k <= DEGRAUS; k++) {
    x.clearRect(0, 0, lado, lado);
    x.fillStyle = '#000';
    const limite = (k / DEGRAUS) * 64;
    for (let i = 0; i < 64; i++) {
      if (B8[i] < limite) x.fillRect((i % 8) * CELULA_MASCARA, ((i / 8) | 0) * CELULA_MASCARA, CELULA_MASCARA, CELULA_MASCARA);
    }
    quadros.push(c.toDataURL());
  }
  return quadros;
}

/** põe a máscara num degrau (0 = invisível, 16 = inteiro) */
export function nivel(el: HTMLElement, k: number) {
  const q = (quadros ?? geraQuadros())[Math.max(0, Math.min(DEGRAUS, Math.round(k)))];
  const v = `url(${q})`;
  el.style.setProperty('mask-image', v);
  el.style.setProperty('-webkit-mask-image', v);
  el.style.setProperty('mask-size', `${8 * CELULA_MASCARA}px`);
  el.style.setProperty('-webkit-mask-size', `${8 * CELULA_MASCARA}px`);
}

export function semMascara(el: HTMLElement) {
  for (const p of ['mask-image', '-webkit-mask-image', 'mask-size', '-webkit-mask-size']) el.style.removeProperty(p);
}

export interface Sinal {
  parou: boolean;
}

/** resolve no fim, ou na hora se o sinal abortar */
export function pixela(el: HTMLElement, entra: boolean, duracao: number, atraso: number, sinal: Sinal) {
  return new Promise<void>((resolve) => {
    nivel(el, entra ? 0 : DEGRAUS);
    const t0 = performance.now() + atraso;
    const passo = (agora: number) => {
      if (sinal.parou) return resolve();
      const e = Math.min(1, Math.max(0, (agora - t0) / duracao));
      // entrando, desacelera no fim; saindo, acelera
      const k = entra ? 1 - Math.pow(1 - e, 2) : e * e;
      nivel(el, entra ? k * DEGRAUS : (1 - k) * DEGRAUS);
      if (e < 1) requestAnimationFrame(passo);
      else {
        if (entra) semMascara(el);
        resolve();
      }
    };
    requestAnimationFrame(passo);
  });
}
