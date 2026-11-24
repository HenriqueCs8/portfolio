// diagrama dos Conhecimentos: caixas, o pixel que percorre cada projeto e as descrições

import type { Campo } from './campo';

export interface Diagrama {
  /** título da seção completo (letreiro.ts): constrói o diagrama */
  completo(titulo: HTMLElement): void;
  /** fecha a descrição aberta (o filtro chama antes de esconder) */
  fecha(): void;
  /** filtro ligado: o pixel não passa por tecnologias escondidas */
  filtrando(v: boolean): void;
  /** refaz o trilho (resize) */
  mede(): void;
}

interface Caminho {
  titulo: string;
  stack: string[];
}

const ENTRADA = ['interface', 'servidor', 'dados', 'infra', 'automacao'];
const PARADAS = ['interface', 'servidor', 'dados', 'infra'];
const ENTRE_CAIXAS = 230; // ms entre uma caixa e a próxima
const PASSO_ONDA = 70; // ms entre uma tecnologia e a próxima, ao acender
const DUR_ONDA = 1600;
const DUR_PULSO = 2000;
const VIAGEM = 750; // ms do pixel entre duas paradas (igual à transição do CSS)
const PARADO = 650; // ms parado em cada caixa

export function criaDiagrama(campo: Campo, reduz: boolean, fino: boolean): Diagrama | null {
  const arq = document.querySelector<HTMLElement>('[data-arq]');
  const grade = arq?.querySelector<HTMLElement>('.arq-grade');
  if (!arq || !grade) return null;
  const secao = arq.closest<HTMLElement>('section')!;
  const caixas = new Map([...arq.querySelectorAll<HTMLElement>('.arq-cx')].map((c) => [c.dataset.camada!, c]));
  const tecs = [...arq.querySelectorAll<HTMLButtonElement>('.tec')];
  const pixel = arq.querySelector<HTMLElement>('.arq-pixel')!;
  const trilho = arq.querySelector<HTMLElement>('.arq-trilho')!;
  const legenda = arq.querySelector<HTMLElement>('.arq-legenda')!;
  const nomeDe = new Map(tecs.map((t) => [t.dataset.tec!, t.querySelector('.w')?.textContent || '']));
  let caminhos: Caminho[] = [];
  try {
    caminhos = JSON.parse(arq.dataset.caminhos || '[]');
  } catch {
    caminhos = [];
  }

  let montado = false;
  let naTela = false;
  let aberta: HTMLButtonElement | null = null;
  let filtro = false;
  let viajando = false;
  let vez = 0; // cada viagem tem a sua vez: uma interrompida não mexe na próxima
  let proximo = 0;
  let relViagem = 0;
  let relPulso = 0;

  const camadaDe = (t: HTMLElement) => t.closest<HTMLElement>('.arq-cx')!.dataset.camada!;
  const livre = () => montado && naTela && !aberta && !document.hidden && !document.querySelector('dialog[open]');

  // luz do fundo
  const luz = (cx: HTMLElement | null) => {
    if (!fino) return; // no celular a faixa de luz é dos projetos no centro da tela
    if (!cx) return campo.faixa(0, 0, 0, 0);
    const r = cx.getBoundingClientRect();
    campo.faixa(r.top, r.bottom, r.left + r.width / 2, 0.8);
  };
  const ativa = (camada: string | null) => caixas.forEach((c, k) => c.classList.toggle('ativo', k === camada));

  // trilho e pixel
  function mede() {
    const g = grade!.getBoundingClientRect();
    const auto = caixas.get('automacao');
    const inter = caixas.get('interface');
    const infra = caixas.get('infra');
    if (!inter || !infra) return;
    const ri = inter.getBoundingClientRect();
    const ra = auto?.getBoundingClientRect();
    // telas largas: no vão entre a Automação e o centro; celular: na margem da esquerda
    const lado = ra && ra.right < ri.left;
    const x = lado ? (ra!.right + ri.left) / 2 - g.left : -Math.min(14, Math.max(6, ri.left - 6));
    // o trilho vai do topo do Front-end até logo acima da Infraestrutura
    const rf = infra.getBoundingClientRect();
    const t0 = ri.top - g.top + 6;
    const t1 = rf.top - g.top - 3;
    arq!.style.setProperty('--tx', `${x.toFixed(1)}px`);
    arq!.style.setProperty('--t0', `${t0.toFixed(1)}px`);
    arq!.style.setProperty('--th', `${Math.max(0, t1 - t0).toFixed(1)}px`);
  }
  const yDe = (camada: string) => {
    const g = grade!.getBoundingClientRect();
    const r = caixas.get(camada)!.getBoundingClientRect();
    // na Infraestrutura o pixel para no fim do trilho
    if (camada === 'infra' && caixas.get('automacao')!.getBoundingClientRect().right < r.right - 1)
      return r.top - g.top - 12;
    return r.top - g.top + Math.min(r.height / 2, 34) - 4;
  };
  const vai = (y: number, animado: boolean) => {
    const atual = parseFloat(pixel.style.getPropertyValue('--py')) || 0;
    pixel.classList.toggle('sobe', y < atual);
    if (!animado) pixel.style.transition = 'none';
    pixel.style.setProperty('--py', `${y.toFixed(1)}px`);
    if (!animado) {
      void pixel.offsetWidth;
      pixel.style.transition = '';
    }
  };

  // o pixel faz o caminho de um projeto
  const limpaCaminho = () => {
    vez++;
    tecs.forEach((t) => t.classList.remove('no-caminho'));
    if (!aberta) {
      ativa(null);
      luz(null);
    }
    pixel.classList.remove('on');
    legenda.classList.remove('on');
    viajando = false;
  };
  // interrompido (descrição aberta, filtro, fora da tela): tenta de novo depois
  const interrompe = () => {
    if (!viajando) return;
    limpaCaminho();
    agendaViagem(3000);
  };

  function agendaViagem(espera: number) {
    clearTimeout(relViagem);
    relViagem = window.setTimeout(viagem, espera);
  }

  function viagem() {
    if (reduz || !caminhos.length) return;
    if (!livre() || filtro) return agendaViagem(1500);
    const c = caminhos[proximo % caminhos.length];
    proximo++;
    const usa = (camada: string) =>
      tecs.filter((t) => camadaDe(t) === camada && c.stack.includes(t.dataset.tec!)).map((t) => t.dataset.tec!);
    // desce sempre por Front-end e Back-end; Dados e Infraestrutura só se o projeto usar
    const paradas = PARADAS.filter((k, i) => caixas.has(k) && (i < 2 || usa(k).length));
    const trecho = PARADAS.map(usa).filter((a) => a.length).map((a) => a.map((id) => nomeDe.get(id)).join(' + '));
    legenda.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = c.titulo;
    legenda.append(b, ` · ${trecho.join(' → ')}`);
    legenda.classList.add('on');

    viajando = true;
    const minha = ++vez;
    vai(yDe('interface') - 28, false);
    pixel.classList.add('on');
    let i = 0;
    const segue = () => {
      if (minha !== vez) return;
      if (i >= paradas.length) {
        window.setTimeout(() => {
          if (minha !== vez) return;
          limpaCaminho();
          agendaViagem(2600);
        }, 1100);
        return;
      }
      const k = paradas[i++];
      vai(yDe(k), true);
      window.setTimeout(() => {
        if (minha !== vez) return;
        ativa(k);
        luz(caixas.get(k)!);
        tecs.forEach((t) => {
          if (camadaDe(t) === k && c.stack.includes(t.dataset.tec!)) t.classList.add('no-caminho');
        });
        window.setTimeout(segue, PARADO);
      }, VIAGEM + 10);
    };
    window.setTimeout(segue, 140);
  }

  // pulso: a onda passa de novo pelo texto, mais leve
  function agendaPulso(espera: number) {
    clearTimeout(relPulso);
    relPulso = window.setTimeout(pulsa, espera);
  }
  function pulsa() {
    if (reduz) return;
    if (!livre()) return agendaPulso(2000);
    const visiveis = tecs.filter((t) => !t.closest('li')?.hidden);
    visiveis.forEach((t, i) => {
      t.classList.remove('pulsando');
      t.style.setProperty('--d', `${i * 45}ms`);
    });
    void grade!.offsetWidth;
    visiveis.forEach((t) => t.classList.add('pulsando'));
    window.setTimeout(
      () => visiveis.forEach((t) => t.classList.remove('pulsando')),
      visiveis.length * 45 + DUR_PULSO + 50,
    );
    agendaPulso(9000);
  }

  // construção
  function pronto(animado: boolean) {
    montado = true;
    arq!.classList.add('pronto');
    mede();
    if (reduz) return;
    agendaViagem(animado ? 2300 : 1200);
    agendaPulso(animado ? 6000 : 4000);
  }

  function constroi(animado: boolean) {
    if (arq!.classList.contains('montando') || montado) return;
    arq!.classList.add('montando');
    if (!animado) {
      caixas.forEach((c) => c.classList.add('in', 'escrito'));
      tecs.forEach((t) => t.classList.add('aceso'));
      return pronto(false);
    }
    const ordem = ENTRADA.filter((k) => caixas.has(k));
    ordem.forEach((k, i) => {
      const c = caixas.get(k)!;
      window.setTimeout(() => {
        c.classList.add('in');
        if (fino) luz(c);
        window.setTimeout(() => c.classList.add('escrito'), 180);
        window.setTimeout(() => {
          const daqui = tecs.filter((t) => camadaDe(t) === k);
          daqui.forEach((t, j) => {
            t.style.setProperty('--d', `${j * PASSO_ONDA}ms`);
            t.classList.add('aceso', 'acendendo');
          });
          window.setTimeout(
            () => daqui.forEach((t) => t.classList.remove('acendendo')),
            daqui.length * PASSO_ONDA + DUR_ONDA + 50,
          );
        }, 420);
      }, 120 + i * ENTRE_CAIXAS);
    });
    window.setTimeout(() => {
      luz(null);
      pronto(true);
    }, 120 + ordem.length * ENTRE_CAIXAS + 900);
  }

  // indo de uma tecnologia para outra em menos de 400 ms, a próxima abre sem animação
  let fechando = 0;
  let fechouEm = -1e9;
  function abre(t: HTMLButtonElement) {
    clearTimeout(fechando);
    if (aberta === t) return;
    const quente = aberta !== null || performance.now() - fechouEm < 400;
    fechaJa();
    interrompe();
    aberta = t;
    const d = document.getElementById(t.getAttribute('aria-controls') || '');
    if (!d) return;
    t.setAttribute('aria-expanded', 'true');
    d.hidden = false;
    // fica dentro do diagrama; perto da base da tela abre para cima
    d.style.left = '0px';
    d.classList.remove('acima');
    const g = grade!.getBoundingClientRect();
    let r = d.getBoundingClientRect();
    const sobra = r.right - g.right;
    if (sobra > 0) d.style.left = `${-Math.ceil(sobra)}px`;
    if (r.bottom > innerHeight - 64) {
      d.classList.add('acima');
      r = d.getBoundingClientRect();
      if (r.top < 72) d.classList.remove('acima');
    }
    if (quente) {
      d.style.transition = 'none';
      d.classList.add('on');
      requestAnimationFrame(() => d.style.removeProperty('transition'));
    } else requestAnimationFrame(() => d.classList.add('on'));
    const cx = t.closest<HTMLElement>('.arq-cx')!;
    ativa(cx.dataset.camada!);
    luz(cx);
  }
  function fechaJa() {
    if (!aberta) return;
    const d = document.getElementById(aberta.getAttribute('aria-controls') || '');
    aberta.setAttribute('aria-expanded', 'false');
    if (d) {
      d.classList.remove('on');
      d.hidden = true;
    }
    aberta = null;
    fechouEm = performance.now();
    ativa(null);
    luz(null);
  }
  // com o mouse espera um pouco antes de fechar, para dar tempo de chegar nos links
  const fechaLogo = () => {
    clearTimeout(fechando);
    fechando = window.setTimeout(fechaJa, 160);
  };

  tecs.forEach((t) => {
    const li = t.closest('li')!;
    li.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') abre(t);
    });
    li.addEventListener('pointerleave', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse' && li.contains(aberta)) fechaLogo();
    });
    t.addEventListener('click', () => (aberta === t ? fechaJa() : abre(t)));
    t.addEventListener('focus', () => abre(t));
    li.addEventListener('focusout', (e) => {
      const para = (e as FocusEvent).relatedTarget as Node | null;
      if (!para || !li.contains(para)) {
        if (li.contains(aberta)) fechaJa();
      }
    });
  });
  // Esc fecha e devolve o foco ao nome; um toque fora fecha
  arq.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aberta) {
      const t = aberta;
      fechaJa();
      t.focus({ preventScroll: true });
      e.stopPropagation();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (aberta && !aberta.closest('li')!.contains(e.target as Node)) fechaJa();
  });

  // visibilidade
  new IntersectionObserver(
    ([e]) => {
      naTela = e.isIntersecting;
      if (!naTela) {
        interrompe();
        luz(null);
      }
    },
    { threshold: 0.25 },
  ).observe(grade);

  if (reduz) {
    caixas.forEach((c) => c.classList.add('in', 'escrito'));
    tecs.forEach((t) => t.classList.add('aceso'));
    pronto(false);
  }

  return {
    completo(titulo) {
      if (montado || !secao.contains(titulo)) return;
      // abriu com o título já completo e o diagrama longe: aparece pronto
      const r = grade!.getBoundingClientRect();
      const perto = r.bottom > -innerHeight * 0.25 && r.top < innerHeight * 1.25;
      constroi(perto);
    },
    fecha: fechaJa,
    filtrando(v) {
      filtro = v;
      if (v) interrompe();
    },
    mede,
  };
}
