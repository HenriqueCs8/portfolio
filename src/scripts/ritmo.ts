// durações e curvas, iguais às do global.css

export const RITMO = { toque: 120, rapido: 240, medio: 450, lento: 650, cena: 780 } as const;

export const CURVA = {
  /** entra: começa rápido e assenta devagar */
  entra: 'cubic-bezier(.16,1,.3,1)',
  /** sai: começa devagar e acelera para fora */
  sai: 'cubic-bezier(.55,0,1,.45)',
  /** troca: o que vai de um lugar a outro na tela */
  troca: 'cubic-bezier(.83,0,.17,1)',
} as const;

export const ESCALONA = 60;

/** duração da saída correspondente a uma entrada */
export const saida = (entrada: number) => Math.round(entrada * 0.65);

/** as mesmas curvas como funções, para o que é desenhado em canvas */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (p1: number, p2: number) => 1 - 3 * p2 + 3 * p1;
  const b = (p1: number, p2: number) => 3 * p2 - 6 * p1;
  const c = (p1: number) => 3 * p1;
  const em = (t: number, p1: number, p2: number) => ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t;
  const inclina = (t: number, p1: number, p2: number) => 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1);
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = inclina(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      t -= (em(t, x1, x2) - x) / d;
    }
    return em(Math.min(1, Math.max(0, t)), y1, y2);
  };
}
export const curvaEntra = bezier(0.16, 1, 0.3, 1);
export const curvaSai = bezier(0.55, 0, 1, 0.45);
export const curvaTroca = bezier(0.83, 0, 0.17, 1);
