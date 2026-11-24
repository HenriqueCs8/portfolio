// painel "Ver mais" da Carreira

import { RITMO, CURVA, ESCALONA, saida } from './ritmo';

const ABRE = CURVA.entra;
const FECHA = CURVA.sai;

interface Opcoes {
  reduz: boolean;
  /** para a rolagem suave com o painel aberto */
  para(): void;
  segue(): void;
  /** a luz acompanha o painel */
  luz?: (aberto: boolean) => void;
}

export function iniciaGaveta({ reduz, para, segue, luz }: Opcoes) {
  const achado = document.querySelector<HTMLDialogElement>('#gaveta');
  if (!achado) return;
  const gav: HTMLDialogElement = achado;
  const painel = gav.querySelector<HTMLElement>('.gav-painel')!;
  const arts = [...gav.querySelectorAll<HTMLElement>('.gav-art')];
  const ordem = arts.map((a) => a.dataset.car!);
  const numero = gav.querySelector<HTMLElement>('[data-gav-n]');
  const ant = gav.querySelector<HTMLButtonElement>('[data-gav="-1"]')!;
  const prox = gav.querySelector<HTMLButtonElement>('[data-gav="1"]')!;
  let atual = -1;
  let origem: HTMLElement | null = null;
  let saindo = false;

  // conteúdo entra em camadas
  const camadas = (art: HTMLElement) => [...art.children] as HTMLElement[];
  const entra = (art: HTMLElement, atraso: number) => {
    if (reduz) return;
    camadas(art).forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, filter: 'blur(6px)', transform: 'translateY(10px)' },
          { opacity: 1, filter: 'blur(0)', transform: 'none' },
        ],
        { duration: RITMO.lento, delay: atraso + i * ESCALONA, easing: ABRE, fill: 'backwards' },
      ),
    );
  };

  function mostra(i: number) {
    atual = i;
    arts.forEach((a, k) => (a.hidden = k !== i));
    const art = arts[i];
    gav.setAttribute('aria-labelledby', `gav-tit-${ordem[i]}`);
    if (numero) numero.textContent = String(i + 1);
    ant.disabled = i === 0;
    prox.disabled = i === arts.length - 1;
    painel.scrollTop = 0;
    return art;
  }

  // desce até um sistema e põe o foco nele
  function desceAte(alvo: HTMLElement) {
    const titulo = alvo.querySelector<HTMLElement>('h4') ?? alvo;
    titulo.focus({ preventScroll: true });
    const top = painel.scrollTop + alvo.getBoundingClientRect().top - painel.getBoundingClientRect().top - 16;
    if (reduz) painel.scrollTop = top;
    else window.setTimeout(() => painel.scrollTo({ top, behavior: 'smooth' }), RITMO.medio);
  }

  function abre(id: string, de: HTMLElement, alvoId?: string) {
    const i = ordem.indexOf(id);
    if (i < 0 || gav.open) return;
    origem = de;
    const art = mostra(i);
    gav.showModal();
    para();
    luz?.(true);
    const alvo = alvoId ? art.querySelector<HTMLElement>(`#${CSS.escape(alvoId)}`) : null;
    if (alvo) desceAte(alvo);
    else art.querySelector<HTMLElement>('.gav-tit')?.focus({ preventScroll: true });
    if (reduz) return;
    gav.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: RITMO.lento, easing: ABRE });
    try {
      gav.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RITMO.medio, easing: ABRE, pseudoElement: '::backdrop' });
    } catch {}
    gav.querySelector<HTMLElement>('.gav-barra')!.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: RITMO.medio,
      delay: 260,
      fill: 'backwards',
    });
    entra(art, 200);
  }

  function fecha(animado = true) {
    if (!gav.open || saindo) return;
    const fim = () => {
      saindo = false;
      gav.close();
      gav.getAnimations({ subtree: true }).forEach((a) => {
        if (!(a instanceof CSSTransition) && !(a instanceof CSSAnimation)) a.cancel();
      });
      segue();
      // quem abriu pode ter sumido: o foco volta para a tecnologia
      const dono = origem?.closest<HTMLElement>('.arq-desc');
      const volta = dono?.hidden ? document.querySelector<HTMLElement>(`[aria-controls="${dono.id}"]`) : origem;
      volta?.focus({ preventScroll: true });
    };
    luz?.(false);
    if (!animado || reduz) return fim();
    saindo = true;
    // fechar no meio da entrada: sai de onde está
    const daqui = getComputedStyle(gav).transform;
    let fundoDaqui = '1';
    try {
      fundoDaqui = getComputedStyle(gav, '::backdrop').opacity;
    } catch {}
    gav.getAnimations().forEach((a) => {
      if (!(a instanceof CSSTransition) && !(a instanceof CSSAnimation)) a.cancel();
    });
    try {
      gav.animate([{ opacity: fundoDaqui }, { opacity: 0 }], {
        duration: saida(RITMO.medio),
        easing: FECHA,
        pseudoElement: '::backdrop',
        fill: 'forwards',
      });
    } catch {}
    gav
      .animate([{ transform: daqui === 'none' ? 'none' : daqui }, { transform: 'translateX(100%)' }], {
        duration: saida(RITMO.lento),
        easing: FECHA,
        fill: 'forwards',
      })
      .finished.catch(() => {})
      .then(fim);
  }

  // vários cliques nas setas: vai direto para a última pedida
  let destino = -1;
  let trocando = false;
  function troca(passo: number) {
    const i = (trocando ? destino : atual) + passo;
    if (i < 0 || i >= arts.length || saindo) return;
    destino = i;
    ant.disabled = i === 0;
    prox.disabled = i === arts.length - 1;
    if (numero) numero.textContent = String(i + 1);
    if (trocando) return;
    const velho = arts[atual];
    const vai = () => {
      trocando = false;
      const art = mostra(destino);
      art.querySelector<HTMLElement>('.gav-tit')?.focus({ preventScroll: true });
      entra(art, 0);
    };
    if (reduz) return vai();
    trocando = true;
    velho
      .animate([{ opacity: 1 }, { opacity: 0, filter: 'blur(4px)' }], { duration: saida(RITMO.rapido), easing: FECHA })
      .finished.catch(() => {})
      .then(vai);
  }

  document.querySelectorAll<HTMLButtonElement>('.car-bt').forEach((b) =>
    b.addEventListener('click', () => abre(b.dataset.car!, b)),
  );
  document.querySelectorAll<HTMLAnchorElement>('[data-gav-abre]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      abre(a.dataset.gavAbre!, a, a.dataset.gavAlvo);
    }),
  );
  gav.querySelector('.gav-fecha')!.addEventListener('click', () => fecha());
  ant.addEventListener('click', () => troca(-1));
  prox.addEventListener('click', () => troca(1));
  // Esc fecha com a mesma animação do botão
  gav.addEventListener('cancel', (e) => {
    e.preventDefault();
    fecha();
  });
  // clique fora fecha
  gav.addEventListener('click', (e) => {
    if (e.target !== gav) return;
    const r = gav.getBoundingClientRect();
    const fora = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (fora) fecha();
  });
  // projeto da fase: fecha na hora e o clique segue para o detalhe
  gav.addEventListener(
    'click',
    (e) => {
      if ((e.target as HTMLElement).closest('[data-abre]')) {
        origem = null;
        fecha(false);
      }
    },
    true,
  );
}
