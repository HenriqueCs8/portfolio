/* Texto que acende palavra por palavra quando o título da seção termina,
   e depois pulsa de leve de tempos em tempos. */

export interface Acende {
  /** título completo: acende o texto da seção (uma vez) */
  completo(titulo: HTMLElement): void;
  /** acende o grupo (data-acende-grupo) deste elemento (uma vez) */
  acende(el: HTMLElement): void;
}

const DUR_ONDA = 1700; // cada palavra, ao acender (ms)
const DUR_PULSO = 2000; // cada palavra, no pulso
const ESPALHA_MAX = 2800; // da primeira à última palavra a começar (ms)
const PASSO_MAX = 32;
const PAUSA_MIN = 3000; // entre o fim de um pulso e o começo do próximo
const PAUSA_MAX = 5000;

interface Grupo {
  blocos: HTMLElement[];
  ultima: number; // atraso da última palavra (ms)
  aceso: boolean;
  naTela: boolean; // pelo menos 30% de algum bloco à vista (pode pulsar)
  vistos: Map<Element, number>; // quanto de cada bloco está à vista
  onda: number; // relógio do fim da onda
  pulso: number; // relógio do fim do pulso
  ocupado: boolean; // foco do teclado dentro do texto
  relogio: number;
}

/** troca cada palavra por <span class="w"> */
function embrulha(el: HTMLElement) {
  const nos: Text[] = [];
  const passeio = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (no) =>
      !no.textContent?.trim() || no.parentElement?.closest('.so-leitor, .w')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let no = passeio.nextNode(); no; no = passeio.nextNode()) nos.push(no as Text);
  for (const no of nos) {
    const frag = document.createDocumentFragment();
    for (const parte of (no.textContent || '').split(/(\s+)/)) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) frag.append(parte);
      else {
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = parte;
        frag.append(w);
      }
    }
    no.replaceWith(frag);
  }
}

export function criaAcende(): Acende {
  // cada grupo pela raiz: a <section> ou o data-acende-grupo
  const porRaiz = new Map<HTMLElement, Grupo>();
  const porBloco = new Map<Element, Grupo>();

  for (const bloco of document.querySelectorAll<HTMLElement>('[data-acende]')) {
    const raiz = bloco.closest<HTMLElement>('[data-acende-grupo]') ?? bloco.closest<HTMLElement>('section');
    if (!raiz) continue;
    embrulha(bloco);
    bloco.classList.add('preparado');
    let s = porRaiz.get(raiz);
    if (!s) {
      s = {
        blocos: [],
        ultima: 0,
        aceso: false,
        naTela: false,
        vistos: new Map(),
        onda: 0,
        pulso: 0,
        ocupado: false,
        relogio: 0,
      };
      porRaiz.set(raiz, s);
    }
    s.blocos.push(bloco);
    porBloco.set(bloco, s);
  }

  // a onda corre pelo grupo inteiro, em ordem de leitura
  for (const s of porRaiz.values()) {
    const palavras = s.blocos.flatMap((b) => [...b.querySelectorAll<HTMLElement>('.w')]);
    const passo = Math.min(PASSO_MAX, ESPALHA_MAX / Math.max(1, palavras.length));
    palavras.forEach((w, i) => w.style.setProperty('--d', `${Math.round(i * passo)}ms`));
    s.ultima = Math.round((palavras.length - 1) * passo);
  }

  const classe = (s: Grupo, nome: string, liga: boolean) => s.blocos.forEach((b) => b.classList.toggle(nome, liga));

  // saiu da tela no meio: a onda termina na hora e o pulso para
  const terminaFora = (s: Grupo) => {
    if (s.onda) {
      clearTimeout(s.onda);
      s.onda = 0;
      classe(s, 'acendendo', false);
    }
    if (s.pulso) {
      clearTimeout(s.pulso);
      s.pulso = 0;
      classe(s, 'pulsando', false);
      agenda(s);
    }
  };

  const visto = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const s = porBloco.get(e.target);
        if (!s) continue;
        s.vistos.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
        const fracoes = [...s.vistos.values()];
        s.naTela = fracoes.some((f) => f >= 0.3);
        if (fracoes.every((f) => f === 0)) terminaFora(s);
      }
    },
    { threshold: [0, 0.3] },
  );
  for (const s of porRaiz.values()) {
    for (const b of s.blocos) {
      visto.observe(b);
      b.addEventListener('focusin', () => (s.ocupado = true));
      b.addEventListener('focusout', () => (s.ocupado = false));
    }
  }

  function agenda(s: Grupo, antes = 0) {
    clearTimeout(s.relogio);
    const espera = antes + PAUSA_MIN + Math.random() * (PAUSA_MAX - PAUSA_MIN);
    s.relogio = window.setTimeout(() => pulsa(s), espera);
  }

  // alguém selecionando texto
  const selecionando = (s: Grupo) => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    const no = sel.getRangeAt(0).commonAncestorContainer;
    return s.blocos.some((b) => b.contains(no) || no.contains(b));
  };

  const pulsa = (s: Grupo) => {
    const livre =
      s.naTela && !s.ocupado && !document.hidden && !document.querySelector('dialog[open]') && !selecionando(s);
    if (!livre) {
      // tenta de novo daqui a pouco, sem acumular pulsos
      s.relogio = window.setTimeout(() => pulsa(s), 2000);
      return;
    }
    classe(s, 'pulsando', false);
    void s.blocos[0].offsetWidth; // recomeça a animação
    classe(s, 'pulsando', true);
    s.pulso = window.setTimeout(() => {
      s.pulso = 0;
      classe(s, 'pulsando', false);
      agenda(s);
    }, s.ultima + DUR_PULSO + 50);
  };

  const liga = (s: Grupo | undefined) => {
    if (!s || s.aceso) return;
    s.aceso = true;
    // longe da tela (a página abriu mais abaixo): acende sem animação
    const r = s.blocos[0].getBoundingClientRect();
    const perto = r.bottom > -innerHeight * 0.25 && r.top < innerHeight * 1.25;
    classe(s, 'aceso', true);
    const onda = perto ? s.ultima + DUR_ONDA + 50 : 0;
    if (perto) {
      classe(s, 'acendendo', true);
      s.onda = window.setTimeout(() => {
        s.onda = 0;
        classe(s, 'acendendo', false);
      }, onda);
    }
    // o primeiro pulso vem depois que a onda termina
    agenda(s, onda);
  };

  return {
    completo(titulo) {
      const secao = titulo.closest<HTMLElement>('section');
      if (secao) liga(porRaiz.get(secao));
    },
    acende(el) {
      const raiz = el.closest<HTMLElement>('[data-acende-grupo]');
      if (raiz) liga(porRaiz.get(raiz));
    },
  };
}
