import { criaCampo, type Campo } from './campo';
import { criaRolagem, focaSecao, iniciaRola, montaRola, iniciaBotoes, iniciaLinks, iniciaVelocidade, iniciaRodape, ScrollTrigger, SplitText, gsap } from './movimento';
import { inunda } from './luz';
import { criaDiagrama } from './diagrama';
import { iniciaGaveta } from './gaveta';
import { criaLetreiro, type Letreiro } from './letreiro';
import { criaAcende, type Acende } from './acende';
import { pixela, nivel, semMascara, type Sinal } from './pixelado';
import { criaNome, lePixels, type Nome } from './nome';
import { iniciaTema } from './tema';
import { RITMO, CURVA, ESCALONA, saida } from './ritmo';
import { dissolve } from './dissolve';

const html = document.documentElement;
// definido no <head> (Base.astro)
const reduz = document.documentElement.classList.contains('reduz');
const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
const TRANS = CURVA.troca;
const REV = CURVA.entra;

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const limita = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const dois = (n: number) => String(n).padStart(2, '0');

(window as any).__app = true;
if (fino) html.classList.add('fino');

// rolagem e fundo

const lenis = criaRolagem(reduz);
// o WebGL só começa depois da primeira pintura; até lá os pedidos ficam guardados aqui
let campoReal: Campo | null = null;
let campoPausado = false;
const campo: Campo = {
  progresso: (p) => campoReal?.progresso(p),
  faixa: (a, b, x, f) => campoReal?.faixa(a, b, x, f),
  foco: (x, y, f) => campoReal?.foco(x, y, f),
  ponteiro: (x, y) => campoReal?.ponteiro(x, y),
  pausa: (v) => {
    campoPausado = v;
    campoReal?.pausa(v);
  },
  tema: () => campoReal?.tema(),
};
// cores dos pixels do tema atual
lePixels();
iniciaTema({
  reduz,
  aoTrocar: (x, y) => {
    campo.tema();
    lePixels();
    // a luz do tema novo sai do botão
    if (!reduz) {
      campo.foco(x / innerWidth, 1 - y / innerHeight, 1);
      window.setTimeout(() => campo.foco(0, 0, 0), RITMO.lento);
    }
  },
});
requestAnimationFrame(() =>
  setTimeout(() => {
    campoReal = criaCampo($<HTMLCanvasElement>('#campo'), reduz);
    campoReal.pausa(campoPausado);
    pedeRolagem();
  }, 0),
);
iniciaRola();
iniciaBotoes();
iniciaLinks(reduz);

// mouse, caneta ou dedo: todos acendem a luz
addEventListener('pointermove', (e) => campo.ponteiro(e.clientX, e.clientY), { passive: true });
addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0];
    if (t) campo.ponteiro(t.clientX, t.clientY);
  },
  { passive: true },
);

// títulos que ocupam a largura toda

function ajustaTitulos() {
  for (const el of $$('[data-fit]')) {
    el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = '100px';
    const linhas = $$('.ln > span', el);
    linhas.forEach((s) => (s.style.letterSpacing = ''));
    const larguras = linhas.map((s) => s.getBoundingClientRect().width);
    const maior = Math.max(...larguras);
    if (!(maior > 0)) continue;
    const cheio = ((100 * el.clientWidth) / maior) * 0.995;
    // encolhe: só diminui se não couber
    const final = el.dataset.fit === 'encolhe' ? Math.min(base, cheio) : cheio;
    // justifica: as linhas curtas ganham espaçamento até a largura da maior (medido a 100px)
    if (el.hasAttribute('data-justifica')) {
      linhas.forEach((s, i) => {
        const n = (s.textContent || '').length;
        const falta = maior - larguras[i];
        if (n < 2 || falta < 0.5) return;
        const atual = parseFloat(getComputedStyle(s).letterSpacing) || 0;
        s.style.letterSpacing = `${((atual + falta / (n - 1)) / 100).toFixed(4)}em`;
      });
    }
    el.style.fontSize = final + 'px';
  }
}

// medidas que dependem do scroll

const pct = $('[data-pct]');
const barraP = $('.base-barra span');
const heroNome = $('.hero-nome');
const retrato = $('.retrato');
let nome: Nome | null = null;
const car = $('.car');
const carItens = $$('.car-item');
let letreiro: Letreiro | null = null;
let textos: Acende | null = null;

// medidas guardadas fora do scroll, para não forçar layout a cada quadro
const medidas = { altura: 0, carTopo: 0, carAltura: 1, itens: [] as number[] };
function medePagina() {
  const y = scrollY;
  medidas.altura = html.scrollHeight;
  if (car) {
    const r = car.getBoundingClientRect();
    medidas.carTopo = r.top + y;
    medidas.carAltura = Math.max(1, r.height);
    medidas.itens = carItens.map((it) => it.getBoundingClientRect().top + y);
  }
}
medePagina();
new ResizeObserver(() => {
  medePagina();
  pedeRolagem();
}).observe(document.body);

function aoRolar() {
  const vh = innerHeight;
  const total = Math.max(1, medidas.altura - vh);
  const y = scrollY;
  const p = limita(y / total);
  // só a luz em CSS (sem WebGL) usa o --p
  if (html.classList.contains('sem-gl')) html.style.setProperty('--p', p.toFixed(4));
  if (barraP) barraP.style.transform = `scaleX(${p.toFixed(4)})`;
  campo.progresso(p);
  const pctTexto = String(Math.round(p * 100));
  if (pct && pct.textContent !== pctTexto) pct.textContent = pctTexto;

  if (heroNome && !reduz && y < vh * 1.2) {
    heroNome.style.setProperty('--py', (y * 0.15).toFixed(1));
    // a foto sobe mais devagar que o nome e vai escurecendo
    if (retrato) {
      retrato.style.setProperty('--fy', (y * 0.24).toFixed(1));
      retrato.style.setProperty('--fo', (1 - 0.45 * limita(y / (vh * 0.8))).toFixed(3));
    }
  }
  nome?.rolagem(y);

  if (car) {
    const meio = vh * 0.6;
    car.style.setProperty('--f', limita((meio - (medidas.carTopo - y)) / medidas.carAltura).toFixed(4));
    carItens.forEach((it, i) => {
      const on = medidas.itens[i] - y + 14 < meio;
      if (it.classList.contains('on') === on) return;
      it.classList.toggle('on', on);
      if (on) {
        decodifica(it);
        // acende o texto da experiência
        textos?.acende(it);
      }
    });
  }
  letreiro?.rolagem();
  if (!fino) projetoNoCentro();
}

// no celular a linha que passa no meio da tela acende sozinha (no lugar do hover)
let noCentro: HTMLElement | null = null;
function projetoNoCentro() {
  if (reduz || document.querySelector('dialog[open]')) return;
  const meio = innerHeight / 2;
  let melhor: HTMLElement | null = null;
  let dist = innerHeight * 0.22;
  for (const l of document.querySelectorAll<HTMLElement>('.proj:not([hidden])')) {
    const r = l.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - meio);
    if (d < dist) {
      dist = d;
      melhor = l;
    }
  }
  if (melhor !== noCentro) {
    noCentro?.classList.remove('no-centro');
    melhor?.classList.add('no-centro');
    noCentro = melhor;
  }
  if (!melhor) return campo.faixa(0, 0, 0, 0);
  const r = melhor.getBoundingClientRect();
  campo.faixa(r.top, r.bottom, innerWidth / 2, 1 - dist / (innerHeight * 0.22));
}

let pedido = 0;
const pedeRolagem = () => {
  if (pedido) return;
  pedido = requestAnimationFrame(() => {
    pedido = 0;
    aoRolar();
  });
};
addEventListener('scroll', pedeRolagem, { passive: true });

let tempoResize = 0;
addEventListener('resize', () => {
  clearTimeout(tempoResize);
  tempoResize = window.setTimeout(() => {
    ajustaTitulos();
    travaAlturas();
    travaLista();
    if (!html.classList.contains('intro')) nome?.mede();
    aoRolar();
    ScrollTrigger.refresh();
  }, 120);
});

// entradas e seção atual

const revela = new IntersectionObserver(
  (es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visto');
      revela.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
);
$$('[data-rev]').forEach((el) => revela.observe(el));

const secoes = $$('[data-secao]');
const trilho = $('.odo-trilho');
const nomeSecao = $('[data-secao-nome]');
const links = $$('[data-nav]');
const nomes: Record<string, string> = { topo: 'Início' };
links.forEach((a) => (nomes[a.dataset.nav!] = a.dataset.rolaTexto || a.textContent || ''));

const atual = new IntersectionObserver(
  (es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const id = (e.target as HTMLElement).dataset.secao!;
      trilho?.style.setProperty('--n', String(secoes.indexOf(e.target as HTMLElement)));
      if (nomeSecao) nomeSecao.textContent = nomes[id] || '';
      links.forEach((a) =>
        a.dataset.nav === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'),
      );
    }
  },
  { rootMargin: '-50% 0px -50% 0px' },
);
secoes.forEach((s) => atual.observe(s));

// relógio

const relogio = $('[data-relogio]');
if (relogio) {
  const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const marca = () => (relogio.textContent = fmt.format(new Date()));
  marca();
  setInterval(marca, 20000);
}

// menu (celular)

const menu = $<HTMLDialogElement>('#menu');
if (menu) {
  // abre com os links subindo um a um; ao escolher uma seção, a página já rola por baixo.
  // pelo teclado abre e fecha na hora
  const links = $$<HTMLAnchorElement>('nav a', menu);
  let saindo: Promise<void> | null = null;
  const some = (alvo: Element | string) => {
    try {
      return menu.animate([{ opacity: 1 }, { opacity: 0 }], { duration: saida(RITMO.medio), easing: CURVA.sai, fill: 'forwards', ...(alvo === '::backdrop' ? { pseudoElement: '::backdrop' } : {}) });
    } catch {
      return null;
    }
  };
  const fechaMenu = (imediato: boolean) => {
    if (!menu.open) return Promise.resolve();
    if (imediato || reduz) {
      menu.close();
      return Promise.resolve();
    }
    if (saindo) return saindo;
    const anims = [some(menu), some('::backdrop')].filter((a): a is Animation => !!a);
    saindo = Promise.all(anims.map((a) => a.finished))
      .catch(() => [])
      .then(() => {
        menu.close();
        anims.forEach((a) => a.cancel());
        saindo = null;
      });
    return saindo;
  };
  $('.topo-menu')?.addEventListener('click', (e) => {
    menu.showModal();
    lenis?.stop();
    if (reduz || (e as MouseEvent).detail === 0) return;
    try {
      menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RITMO.rapido, easing: CURVA.entra, pseudoElement: '::backdrop' });
    } catch {}
    menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RITMO.medio, easing: CURVA.entra });
    links.forEach((a, i) =>
      a.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
        duration: RITMO.medio,
        delay: 60 + i * ESCALONA,
        easing: CURVA.entra,
        fill: 'backwards',
      }),
    );
  });
  $('.menu-fecha', menu)?.addEventListener('click', (e) => fechaMenu(e.detail === 0));
  menu.addEventListener('close', () => lenis?.start());
  links.forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const alvo = $(a.getAttribute('href')!);
      if (alvo) {
        if (lenis) lenis.scrollTo(alvo, { immediate: true, force: true });
        else alvo.scrollIntoView();
      }
      fechaMenu(e.detail === 0).then(() => alvo && focaSecao(alvo));
    }),
  );
}

// retrato: troca de imagem a cada 6 s

const quadro = $('.retrato-quadro');
if (quadro) {
  const imgs = $$<HTMLImageElement>('.retrato-img', quadro);
  const botao = $('.retrato-pausa', quadro)!;
  const tempo = $('.retrato-tempo', quadro)!;
  const INTERVALO = 6000;
  let i = 0;
  let pausado = reduz;
  let visivel = true;
  let relogioTroca = 0;
  let barra: Animation | null = null;

  const troca = () => {
    const sai = imgs[i];
    i = (i + 1) % imgs.length;
    const entra = imgs[i];
    sai.style.zIndex = '1';
    entra.style.zIndex = '2';
    if (reduz) {
      entra.classList.add('on');
      sai.classList.remove('on');
      return;
    }
    // a próxima imagem entra pixel a pixel
    dissolve(quadro, entra, { duracao: 1100 }).then((remove) => {
      entra.classList.add('on');
      sai.classList.remove('on');
      remove();
    });
  };

  const agenda = () => {
    clearTimeout(relogioTroca);
    barra?.cancel();
    if (pausado || !visivel || document.hidden || imgs.length < 2) return;
    if (!reduz) barra = tempo.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: INTERVALO, easing: 'linear' });
    relogioTroca = window.setTimeout(() => {
      troca();
      agenda();
    }, INTERVALO);
  };

  const pinta = () => {
    botao.setAttribute('aria-pressed', String(pausado));
    botao.setAttribute('aria-label', pausado ? 'Retomar troca de imagem' : 'Pausar troca de imagem');
  };
  botao.addEventListener('click', () => {
    pausado = !pausado;
    pinta();
    agenda();
  });
  new IntersectionObserver((es) => {
    visivel = es[0].isIntersecting;
    agenda();
  }).observe(quadro);
  document.addEventListener('visibilitychange', agenda);
  pinta();
}

// projetos: lista, páginas, prévia e detalhe

const linhas = $$('.proj');
const ordem = linhas.map((l) => l.dataset.projeto!);
const det = $<HTMLDialogElement>('#detalhe');
const detFundo = det ? $('.det-fundo', det) : null;
const detRolo = det ? $('.det-rolo', det) : null;
const previa = $('.previa');
let aberto = '';
let origem: HTMLElement | null = null;
let ocupado = false; // a luz está abrindo ou fechando o detalhe
let fechando: (() => void) | null = null; // termina na hora um fechamento em curso

const lista = $('.proj-lista');
const pager = $('.pager');
const paginas = Number(lista?.dataset.paginas || 1);
let pagina = 0;

function marcaPagina(n: number, direcao = 0) {
  const numero = $('[data-pag-n]');
  if (numero) {
    numero.innerHTML = `<span>${String(n + 1).padStart(2, '0')}</span>`;
    // o número novo entra pelo lado da seta
    if (direcao && !reduz)
      numero.firstElementChild?.animate([{ transform: `translateY(${direcao * 100}%)` }, { transform: 'none' }], {
        duration: 380,
        easing: REV,
      });
  }
  const ativo = document.activeElement;
  const setas = $$<HTMLButtonElement>('[data-pag]');
  setas.forEach((b) => {
    const destino = n + Number(b.dataset.pag);
    b.disabled = destino < 0 || destino >= paginas;
  });
  // a seta com foco apagou: o foco passa para a outra
  if (ativo instanceof HTMLButtonElement && ativo.disabled) setas.find((b) => !b.disabled)?.focus();
  const status = $('[data-pag-status]');
  if (status && direcao) {
    const da = linhas.filter((l) => Number(l.dataset.pagina) === n).map((l) => linhas.indexOf(l) + 1);
    status.textContent = `Projetos ${da[0]} a ${da[da.length - 1]} de ${linhas.length}.`;
  }
}

// troca de página: as linhas apagam e acendem em pixels (pixelado.ts).
// clicar de novo termina a troca atual e já começa a outra
let troca: Sinal | null = null;
function mostraPagina(n: number, animado: boolean, direcao = 1) {
  if (n < 0 || n >= paginas) return;
  const poe = (alvo: number) =>
    linhas.forEach((l) => {
      l.hidden = Number(l.dataset.pagina) !== alvo;
      semMascara(l);
    });
  // clique rápido: termina a troca atual antes de começar outra
  if (troca) {
    troca.parou = true;
    troca = null;
    poe(pagina);
  }
  const sai = linhas.filter((l) => !l.hidden);
  const entra = linhas.filter((l) => Number(l.dataset.pagina) === n);
  pagina = n;
  marcaPagina(n, animado ? direcao : 0);
  if (!animado || reduz) return poe(n);

  const sinal: Sinal = { parou: false };
  troca = sinal;
  const vira = <T,>(v: T[]) => (direcao > 0 ? v : [...v].reverse());
  // outra troca já começou e arrumou a lista
  Promise.all(vira(sai).map((l, i) => pixela(l, false, 240, i * 60, sinal))).then(() => {
    if (sinal.parou) return;
    sai.forEach((l) => {
      l.hidden = true;
      semMascara(l);
    });
    // a página nova entra com a máscara vazia para não piscar
    entra.forEach((l) => {
      nivel(l, 0);
      l.hidden = false;
    });
    Promise.all(vira(entra).map((l, i) => pixela(l, true, 320, i * 70, sinal))).then(() => {
      if (sinal.parou) return;
      if (troca === sinal) troca = null;
    });
  });
}

// trava a altura na primeira página para o resto do site não pular
function travaLista() {
  if (!lista || paginas < 2) return;
  lista.style.minHeight = '';
  const escondidas = linhas.filter((l) => l.hidden);
  linhas.forEach((l) => (l.hidden = Number(l.dataset.pagina) !== 0));
  lista.style.minHeight = `${lista.offsetHeight}px`;
  linhas.forEach((l) => (l.hidden = escondidas.includes(l)));
}

if (pager && paginas > 1) {
  // sem JS aparecem todos os projetos
  pager.hidden = false;
  mostraPagina(0, false);
  travaLista();
  $$<HTMLButtonElement>('[data-pag]').forEach((b) =>
    b.addEventListener('click', (e) => {
      const d = Number(b.dataset.pag);
      // pelo teclado troca na hora
      mostraPagina(pagina + d, (e as MouseEvent).detail > 0, d);
    }),
  );
}

function marcaEndereco(hash: string) {
  try {
    history.replaceState(null, '', hash || location.pathname + location.search);
  } catch {}
}

/** carrega a imagem grande do detalhe antes de abrir */
function adianta(id: string) {
  const img = det?.querySelector<HTMLImageElement>(`.det-art[data-det="${id}"] .det-img`);
  if (img && img.loading !== 'eager') img.loading = 'eager';
}

function mostraArtigo(id: string) {
  if (!det) return null;
  let art: HTMLElement | null = null;
  for (const a of $$('.det-art', det)) {
    a.hidden = a.dataset.det !== id;
    if (!a.hidden) art = a;
  }
  adianta(id);
  const n = ordem.indexOf(id);
  $('[data-det-odo]', det)?.style.setProperty('--n', String(n));
  const leitor = $('[data-det-n-leitor]', det);
  if (leitor) leitor.textContent = `Projeto ${n + 1} de ${ordem.length}`;
  det.setAttribute('aria-labelledby', `det-tit-${id}`);
  $$<HTMLButtonElement>('[data-det-ir]', det).forEach((b) => {
    const destino = n + Number(b.dataset.detIr);
    b.disabled = destino < 0 || destino >= ordem.length;
  });
  aberto = id;
  marcaEndereco(`#projeto-${id}`);
  return art;
}

function entraTexto(art: HTMLElement, atraso: number) {
  $$('.det-anim', art).forEach((el, i) =>
    el.animate(
      [
        { opacity: 0, transform: 'translateY(22px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 800, delay: atraso + i * 70, easing: REV, fill: 'backwards' },
    ),
  );
}

// título do detalhe sobe letra por letra
const titulosPartidos = new Map<HTMLElement, SplitText>();
function animaTitulo(art: HTMLElement, atraso: number) {
  const t = $('.det-tit-v', art);
  if (!t) return;
  let partes = titulosPartidos.get(t);
  if (!partes) {
    // a cópia visível é aria-hidden; o leitor usa o .so-leitor
    partes = new SplitText(t, { type: 'lines,chars', mask: 'lines', linesClass: 'det-linha', charsClass: 'ch', aria: 'none' });
    titulosPartidos.set(t, partes);
  }
  gsap.fromTo(partes.chars, { yPercent: 118 }, { yPercent: 0, duration: 0.95, ease: 'expo.out', stagger: 0.012, delay: atraso / 1000 });
}
addEventListener('resize', () => {
  titulosPartidos.forEach((p) => p.revert());
  titulosPartidos.clear();
});

const centro = (el: Element | null) => {
  const r = el?.getBoundingClientRect();
  if (!r || !r.width || r.bottom < 0 || r.top > innerHeight) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

function abre(id: string, de: HTMLElement | null, animado = true) {
  if (!det || !detFundo || !ordem.includes(id) || ocupado) return;
  const linha = linhas.find((l) => l.dataset.projeto === id);
  if (linha?.hidden) mostraPagina(Number(linha.dataset.pagina), false);
  origem = $('.proj-bt', linha) || null;

  // a imagem sai da prévia (se estiver na tela) ou da miniatura
  const fonte = previa?.classList.contains('on') ? previa : de || $('.proj-mini', linha);
  const r1 = fonte?.getBoundingClientRect();
  previa?.classList.remove('on');
  campo.faixa(0, 0, 0, 0);

  const art = mostraArtigo(id);
  if (!art) return;
  det.showModal();
  // foco no título: o leitor anuncia o projeto
  $('.det-tit', art)?.focus({ preventScroll: true });
  lenis?.stop();
  if (detRolo) detRolo.scrollTop = 0;
  if (!animado || reduz) return campo.pausa(true);

  // a luz nasce no botão e cobre a tela
  ocupado = true;
  const ponto = centro(origem) || centro(de) || { x: innerWidth / 2, y: innerHeight / 2 };
  try {
    det.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: REV, pseudoElement: '::backdrop' });
  } catch {}
  inunda(det, detFundo, ponto, true, RITMO.cena).then(() => {
    ocupado = false;
    // com o detalhe aberto o campo fica pausado
    if (det.open) campo.pausa(true);
  });
  $('.det-barra', det)!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 450, easing: REV, fill: 'backwards' });
  $('.det-nav', det)!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 750, easing: REV, fill: 'backwards' });
  $('.det-fig figcaption', art)?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 850, easing: REV, fill: 'backwards' });

  // a imagem viaja de onde estava até o lugar dela
  const img = $('.det-moldura', art)!;
  const r2 = img.getBoundingClientRect();
  if (r1 && r1.width > 0 && r2.width > 0) {
    img.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${r1.left - r2.left}px, ${r1.top - r2.top}px) scale(${r1.width / r2.width}, ${r1.height / r2.height})`,
        },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: 900, delay: 60, easing: TRANS, fill: 'backwards' },
    );
  } else {
    img.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 850, delay: 200, easing: TRANS, fill: 'backwards' });
  }
  animaTitulo(art, 360);
  entraTexto(art, 620);
}

function fecha(animado = true) {
  if (!det?.open) return;
  campo.pausa(false);
  let feito = false;
  const fim = () => {
    if (feito) return;
    feito = true;
    det.close();
    // para a luz que ainda estiver correndo
    det.querySelectorAll('.det-luz').forEach((c) => c.remove());
    // só as Web Animations: cancelar transição de CSS no meio deixa o estilo preso no fim
    det.getAnimations({ subtree: true }).forEach((a) => {
      if (!(a instanceof CSSTransition) && !(a instanceof CSSAnimation)) a.cancel();
    });
    lenis?.start();
    aberto = '';
    ocupado = false;
    fechando = null;
    marcaEndereco('');
    if (detFundo) detFundo.style.clipPath = '';
    origem?.focus({ preventScroll: true });
  };
  // fechar no meio de uma animação fecha na hora
  if (!animado || reduz || ocupado) return (fechando ?? fim)();
  ocupado = true;
  fechando = fim;
  // sai o conteúdo e depois a luz volta para o botão (a saída é mais curta que a entrada)
  detRolo!
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: CURVA.sai, fill: 'forwards' })
    .finished.then(() => {
      if (feito) return;
      const ponto = centro(origem) || { x: innerWidth / 2, y: innerHeight };
      try {
        det.animate([{ opacity: 1 }, { opacity: 0 }], { duration: saida(RITMO.lento), easing: TRANS, pseudoElement: '::backdrop', fill: 'forwards' });
      } catch {}
      return inunda(det, detFundo!, ponto, false, saida(RITMO.lento));
    })
    .catch(() => {})
    .then(fim);
}

function vaiPara(passo: number, animado: boolean) {
  if (!det || ocupado) return;
  const destino = ordem[ordem.indexOf(aberto) + passo];
  if (!destino) return;
  const velha = det.querySelector<HTMLImageElement>(`.det-art[data-det="${aberto}"] .det-img`);
  const linha = linhas.find((l) => l.dataset.projeto === destino);
  origem = $('.proj-bt', linha) || origem;
  const art = mostraArtigo(destino);
  if (!art) return;
  // o foco estava no projeto anterior: vai para o título do novo
  const ativo = document.activeElement;
  if (!ativo || ativo === document.body || ativo.closest('.det-art[hidden]')) $('.det-tit', art)?.focus({ preventScroll: true });
  if (detRolo) detRolo.scrollTop = 0;
  adianta(ordem[ordem.indexOf(destino) + passo] ?? destino);
  if (!animado || reduz) return;
  // imagem nova em pixels por cima da anterior
  const img = $<HTMLImageElement>('.det-img', art)!;
  img.style.visibility = 'hidden';
  dissolve($('.det-moldura', art)!, img, { duracao: 850, cel: 14, base: velha, topo: true }).then((remove) => {
    img.style.visibility = '';
    remove();
  });
  animaTitulo(art, 0);
  entraTexto(art, 120);
}

if (det) {
  linhas.forEach((l) => {
    l.addEventListener('click', (e) => {
      const viaTeclado = (e as MouseEvent).detail === 0;
      abre(l.dataset.projeto!, $('.proj-mini', l), !viaTeclado);
    });
    // teclado e toque também pré-carregam a imagem grande
    $('.proj-bt', l)?.addEventListener('focus', () => adianta(l.dataset.projeto!));
  });
  $('.det-fecha', det)?.addEventListener('click', (e) => fecha((e as MouseEvent).detail > 0));
  det.addEventListener('cancel', (e) => {
    e.preventDefault();
    fecha(false);
  });
  $$<HTMLButtonElement>('[data-det-ir]', det).forEach((b) =>
    b.addEventListener('click', (e) => vaiPara(Number(b.dataset.detIr), (e as MouseEvent).detail > 0)),
  );
  det.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') vaiPara(1, false);
    if (e.key === 'ArrowLeft') vaiPara(-1, false);
  });
  $$('[data-abre]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      abre(a.dataset.abre!, null, (e as MouseEvent).detail > 0);
      origem = a;
    }),
  );
  const pedidoNaUrl = location.hash.match(/^#projeto-(.+)$/);
  if (pedidoNaUrl) abre(pedidoNaUrl[1], null, false);
}

// conhecimentos: diagrama

const diagrama = criaDiagrama(campo, reduz, fino);
const arq = $('[data-arq]');

// conhecimentos: filtro por nível

const filtro = $('.filtro');
const filtroStatus = $('[data-filtro-status]');
let nivelAtivo = '';
let filtroVez = 0;

function aplicaFiltro(nivel: string, animado: boolean, anuncia = true) {
  if (!arq || !filtro) return;
  const vez = ++filtroVez;
  nivelAtivo = nivel;
  // fecha a descrição aberta antes de filtrar
  diagrama?.fecha();
  diagrama?.filtrando(!!nivel);

  const itens = $$<HTMLLIElement>('.arq-itens > li[data-nivel]', arq);
  itens.forEach((li) => li.getAnimations().forEach((a) => a.cancel()));
  const fica = (li: HTMLLIElement) => !nivel || li.dataset.nivel === nivel;
  const antes = new Map(itens.filter((li) => !li.hidden).map((li) => [li, li.getBoundingClientRect()]));
  const saem = itens.filter((li) => !li.hidden && !fica(li));

  const troca = () => {
    if (vez !== filtroVez) return;
    itens.forEach((li) => {
      li.getAnimations().forEach((a) => a.cancel());
      li.hidden = !fica(li);
    });
    $$('.arq-cx', arq).forEach((c) => {
      const vazia = !c.querySelector('.arq-itens > li[data-nivel]:not([hidden])');
      const aviso = $('.arq-vazia', c);
      if (aviso) aviso.hidden = !vazia;
      c.classList.toggle('sem-itens', vazia);
    });
    if (!animado) return;
    // quem fica desliza; quem volta sobe de leve, um por vez
    let k = 0;
    for (const li of itens) {
      if (li.hidden) continue;
      const r0 = antes.get(li);
      const r1 = li.getBoundingClientRect();
      if (r0) {
        const dx = r0.left - r1.left;
        const dy = r0.top - r1.top;
        if (Math.abs(dx) + Math.abs(dy) > 0.5)
          li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 520, easing: CURVA.entra });
      } else {
        li.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], {
          duration: 420,
          delay: 40 + k++ * 22,
          easing: CURVA.entra,
          fill: 'backwards',
        });
      }
    }
  };

  if (animado && saem.length) {
    // quem sai some rápido e só então o diagrama se reorganiza
    Promise.all(
      saem.map(
        (li) =>
          li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], {
            duration: 160,
            easing: CURVA.sai,
            fill: 'forwards',
          }).finished,
      ),
    )
      .catch(() => {})
      .then(troca);
  } else troca();

  $$('.filtro-bt', filtro).forEach((b) => b.setAttribute('aria-pressed', String(!!nivel && b.dataset.nivel === nivel)));
  $$('.filtro-x', filtro).forEach((x) => {
    const deste = !!nivel && x.previousElementSibling?.getAttribute('data-nivel') === nivel;
    const aparece = deste && x.hidden;
    x.hidden = !deste;
    if (aparece && animado)
      x.animate([{ opacity: 0, transform: 'scale(.4) rotate(-90deg)' }, { opacity: 1, transform: 'none' }], {
        duration: 380,
        easing: CURVA.entra,
      });
  });
  filtro.classList.toggle('ativo', !!nivel);
  if (anuncia && filtroStatus) {
    const bt = nivel ? $<HTMLButtonElement>(`.filtro-bt[data-nivel="${nivel}"]`, filtro) : null;
    const n = nivel ? Number(bt?.dataset.n) : Number(filtro.dataset.total);
    filtroStatus.textContent = nivel
      ? `Mostrando ${n} ${n === 1 ? 'tecnologia' : 'tecnologias'}: ${(bt?.dataset.nome || '').toLowerCase()}.`
      : `Mostrando todas as ${n} tecnologias.`;
  }
}

// trava a altura de cada caixa para o filtro não empurrar a página (nem os gatilhos de scroll)
function travaAlturas() {
  if (!arq) return;
  const ativo = nivelAtivo;
  if (ativo) aplicaFiltro('', false, false);
  const cxs = $$('.arq-cx', arq);
  cxs.forEach((c) => (c.style.minHeight = ''));
  cxs.forEach((c) => (c.style.minHeight = `${c.offsetHeight}px`));
  if (ativo) aplicaFiltro(ativo, false, false);
  diagrama?.mede();
}

if (filtro) {
  $$<HTMLButtonElement>('.filtro-bt', filtro).forEach((b) =>
    b.addEventListener('click', (e) => {
      const n = b.dataset.nivel || '';
      aplicaFiltro(nivelAtivo === n ? '' : n, e.detail > 0 && !reduz);
    }),
  );
  $$<HTMLButtonElement>('.filtro-x', filtro).forEach((x) =>
    x.addEventListener('click', (e) => {
      const bt = x.previousElementSibling as HTMLElement | null;
      aplicaFiltro('', e.detail > 0 && !reduz);
      // o X sumiu: o foco volta para o nível ativo
      bt?.focus({ preventScroll: true });
    }),
  );
  // Esc limpa o filtro (ou só fecha a descrição, se tiver uma aberta)
  [filtro, arq].forEach((el) =>
    el?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'Escape' || !nivelAtivo) return;
      const bt = $<HTMLElement>(`.filtro-bt[data-nivel="${nivelAtivo}"]`, filtro);
      aplicaFiltro('', false);
      if (filtro.contains(document.activeElement) || document.activeElement?.closest('[hidden]')) bt?.focus();
    }),
  );
}

// carreira: painel "Ver mais"

// pré-carrega as imagens da prévia e do detalhe com a página parada, uma por vez,
// para não travar o primeiro quadro da animação
// no toque não tem prévia, só o detalhe; com economia de dados não baixa nada antes
const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const aquece = async () => {
  if (economia) return;
  for (const img of $$<HTMLImageElement>(fino ? '[data-previa], .det-img' : '.det-img')) {
    img.loading = 'eager';
    try {
      await img.decode();
    } catch {
      /* falhou: segue para a próxima */
    }
  }
};
const aqueceDepois = () =>
  'requestIdleCallback' in window ? requestIdleCallback(() => aquece(), { timeout: 4000 }) : setTimeout(aquece, 2500);
if (document.readyState === 'complete') aqueceDepois();
else addEventListener('load', aqueceDepois, { once: true });

iniciaGaveta({
  reduz,
  para: () => lenis?.stop(),
  segue: () => lenis?.start(),
  // a luz acompanha o painel para a direita
  luz: (aberto) => campo.foco(aberto ? 0.92 : 0, aberto ? 0.5 : 0, aberto ? 1 : 0),
});

// carreira: o cargo novo se decodifica

const decodificados = new WeakSet<HTMLElement>();
const SINAIS = '01<>/{}#*+=';
// só o cargo de promoção embaralha; o leitor de tela lê o texto real
for (const ins of $$('.car-cargo').filter((c) => c.querySelector('del')).map((c) => $('ins', c)!)) {
  const t = ins.textContent || '';
  ins.dataset.texto = t;
  ins.innerHTML = '<span class="so-leitor"></span><span aria-hidden="true" class="decod"></span>';
  ins.querySelector('.so-leitor')!.textContent = t;
  ins.querySelector('.decod')!.textContent = t;
}
function decodifica(item: HTMLElement) {
  const alvo = $('.car-cargo ins .decod', item);
  if (!alvo || decodificados.has(item) || reduz) return;
  decodificados.add(item);
  const t = alvo.closest<HTMLElement>('ins')!.dataset.texto || '';
  const quando = [...t].map((_, i) => 650 + i * 16 + Math.random() * 220);
  const t0 = performance.now();
  const passo = (agora: number) => {
    const d = agora - t0;
    let feito = true;
    alvo.textContent = [...t]
      .map((c, i) => {
        if (c === ' ' || d >= quando[i]) return c;
        feito = false;
        return d < 600 ? c : SINAIS[(Math.random() * SINAIS.length) | 0];
      })
      .join('');
    if (!feito) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// contato: copiar e-mail

const copia = $<HTMLButtonElement>('[data-copia]');
if (copia) {
  const aviso = $('.contato-aviso');
  const rotulo = copia.dataset.rolaTexto || copia.textContent || '';
  const poe = (t: string) => (copia.hasAttribute('data-rola') ? montaRola(copia, t) : (copia.textContent = t));
  let volta = 0;
  copia.addEventListener('click', async () => {
    clearTimeout(volta);
    try {
      await navigator.clipboard.writeText(copia.dataset.copia!);
      poe('E-mail copiado');
      const st = $('[data-copia-status]');
      if (st) st.textContent = 'E-mail copiado.';
      if (!reduz) copia.querySelector('.rola')?.animate([{ opacity: 0, transform: 'scale(.9)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 260, easing: REV });
      if (aviso) aviso.textContent = '';
    } catch {
      if (aviso) aviso.textContent = 'Não deu para copiar. Selecione o e-mail acima.';
    }
    volta = window.setTimeout(() => {
      poe(rotulo);
      const st = $('[data-copia-status]');
      if (st) st.textContent = '';
    }, 2400);
  });
}

// prévia que segue o mouse (só em telas com mouse)

if (fino && !reduz) {
  const rotulo = $('.rotulo-cursor')!;
  const imgsPrevia = previa ? $$<HTMLImageElement>('img', previa) : [];
  const alvo = { x: innerWidth / 2, y: innerHeight / 2 };
  // antes do primeiro movimento não dá para saber onde o mouse está
  let temPonteiro = false;
  const c = { ...alvo };
  const pv = { x: 0, y: 0, vx: 0, vy: 0, s: 1, vs: 0, r: 0 };
  let linhaAtual: HTMLElement | null = null;
  let fichaTroca = 0;

  // as imagens da prévia carregam quando a lista chega perto
  if (lista)
    new IntersectionObserver(
      (es, o) => {
        if (!es[0].isIntersecting) return;
        imgsPrevia.forEach((im) => (im.loading = 'eager'));
        o.disconnect();
      },
      { rootMargin: '600px 0px' },
    ).observe(lista);

  const trocaPrevia = (nova: HTMLImageElement | undefined) => {
    const velha = imgsPrevia.find((im) => im.classList.contains('on'));
    if (!nova || !previa || nova === velha) return;
    const ficha = ++fichaTroca;
    dissolve(previa, nova, { duracao: 420, cel: 10, base: velha, topo: true }).then((remove) => {
      if (ficha === fichaTroca) imgsPrevia.forEach((im) => im.classList.toggle('on', im === nova));
      remove();
    });
  };

  const entraNaLinha = (linha: HTMLElement | null) => {
    if (linha === linhaAtual) return;
    linhaAtual = linha;
    if (!previa) return;
    if (!linha) {
      previa.classList.remove('on');
      campo.faixa(0, 0, 0, 0);
      return;
    }
    adianta(linha.dataset.projeto!);
    const img = imgsPrevia.find((im) => im.dataset.previa === linha.dataset.projeto);
    if (!previa.classList.contains('on')) {
      // a prévia nasce no lugar da miniatura
      const m = $('.proj-mini', linha)!.getBoundingClientRect();
      pv.x = m.left;
      pv.y = m.top;
      pv.s = m.width / (previa.offsetWidth || 1);
      pv.vx = pv.vy = pv.vs = 0;
      imgsPrevia.forEach((im) => im.classList.toggle('on', im === img));
      previa.classList.add('on');
    } else trocaPrevia(img);
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      temPonteiro = true;
      alvo.x = e.clientX;
      alvo.y = e.clientY;
      const el = e.target as HTMLElement;
      const linha = (!det?.open && el.closest?.<HTMLElement>('.proj')) || null;
      // em cima do botão o rótulo some (não repete "Ver detalhes")
      rotulo.classList.toggle('on', !!linha && !el.closest?.('.proj-bt'));
      entraNaLinha(linha);
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    temPonteiro = false;
    rotulo.classList.remove('on');
    entraNaLinha(null);
  });
  addEventListener(
    'scroll',
    () => {
      // rolando, a linha sob o mouse muda sem ele se mexer
      if (!temPonteiro || det?.open) return;
      const sob = document.elementFromPoint(alvo.x, alvo.y)?.closest<HTMLElement>('.proj') || null;
      if (sob !== linhaAtual) {
        rotulo.classList.toggle('on', !!sob);
        entraNaLinha(sob);
      }
    },
    { passive: true },
  );

  let antes = performance.now();
  const anda = (agora: number) => {
    requestAnimationFrame(anda);
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    // mesmo passo em 60 e 120 Hz; parado, não escreve nada
    const dx = alvo.x - c.x;
    const dy = alvo.y - c.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.1) {
      const k = 1 - Math.pow(0.7, dt * 60);
      c.x += dx * k;
      c.y += dy * k;
      rotulo.style.transform = `translate3d(${(c.x + 18).toFixed(1)}px, ${(c.y + 20).toFixed(1)}px, 0)`;
    }
    if (!previa || !previa.classList.contains('on')) return;

    const w = previa.offsetWidth;
    const h = previa.offsetHeight;
    // a prévia fica logo abaixo da linha (ou acima, se não couber)
    const tx = limita(alvo.x - w * 0.32, 24, innerWidth - w - 24);
    let ty = alvo.y - h * 0.5;
    if (linhaAtual) {
      const r = linhaAtual.getBoundingClientRect();
      ty = r.bottom + 10 + h < innerHeight - 50 ? r.bottom + 10 : r.top - h - 10;
      campo.faixa(r.top, r.bottom, alvo.x, 1);
    }
    // mola sem quique
    const K = 170;
    const D = 26;
    pv.vx += (K * (tx - pv.x) - D * pv.vx) * dt;
    pv.vy += (K * (ty - pv.y) - D * pv.vy) * dt;
    pv.vs += (120 * (1 - pv.s) - 22 * pv.vs) * dt;
    pv.x += pv.vx * dt;
    pv.y += pv.vy * dt;
    pv.s += pv.vs * dt;
    pv.r += (limita(pv.vx * 0.006, -6, 6) - pv.r) * Math.min(1, dt * 10);
    previa.style.transform = `translate3d(${pv.x.toFixed(1)}px, ${pv.y.toFixed(1)}px, 0) rotate(${pv.r.toFixed(2)}deg) scale(${pv.s.toFixed(4)})`;
  };
  requestAnimationFrame(anda);
}

// abertura: na primeira visita os pontos formam o nome; tecla, clique ou rolagem pula

function libera() {
  html.classList.remove('intro', 'intro-curta');
  html.classList.add('pronto');
}

const fontes = (document.fonts?.ready ?? Promise.resolve()).then(() => true);
const espera = new Promise<boolean>((r) => setTimeout(() => r(false), 2500));

// 404: o número também se monta em pixels

const h404 = $('.nao-achou h1');
if (h404 && !reduz) fontes.then(() => criaNome(h404, h404.parentElement || document.body, 0).abertura());

// para quem abrir o console

console.log(
  '%cHenrique Carvalho%c\nEste site foi feito à mão, com Astro, GSAP e uma luz em WebGL desenhada pixel a pixel.\nVamos conversar? ' +
    ($('a.mail')?.textContent || ''),
  'font: 700 14px system-ui; color: #e3a6b3',
  'font: 12px system-ui; color: inherit',
);

// cede a vez ao navegador entre as etapas
const proximo = () => new Promise<void>((r) => setTimeout(r, 0));

// o que fica abaixo da primeira tela
async function montaResto() {
  await proximo();
  ajustaTitulos();
  travaAlturas();
  await proximo();
  iniciaRodape(reduz);
  ScrollTrigger.sort();
  aoRolar();
  iniciaVelocidade(lenis);
  ScrollTrigger.refresh();
  await proximo();
  diagrama?.mede();
  const titulos = $$('[data-titulo]');
  if (titulos.length && !reduz) {
    // o texto acende quando o título fica completo
    const acende = (textos = criaAcende());
    letreiro = criaLetreiro(titulos, (titulo) => {
      acende.completo(titulo);
      diagrama?.completo(titulo);
    });
    // a página pode abrir já com experiências passadas
    carItens.filter((it) => it.classList.contains('on')).forEach((it) => acende.acende(it));
    letreiro.mede();
    // o refresh do ScrollTrigger muda a posição dos títulos
    ScrollTrigger.addEventListener('refresh', () => letreiro?.mede());
  }
}

// abriu no meio da página (F5 ou link com #): sem abertura
const abriuNoMeio = () => scrollY > 40 || !!location.hash;

Promise.race([fontes, espera]).then(async (chegaram) => {
  // primeiro o nome; o resto monta logo depois, em partes
  ajustaTitulos();
  const resto = montaResto();
  if (!heroNome || reduz) {
    libera();
    return resto;
  }
  const hero = heroNome.closest<HTMLElement>('.hero')!;
  nome = criaNome(heroNome, hero, 0.15);

  if (!html.classList.contains('intro') || !chegaram || abriuNoMeio()) {
    libera();
    await resto;
    nome.mede();
    return;
  }

  // completa (2,4 s) na primeira vez; curta (~1,4 s) depois
  const escala = html.classList.contains('intro-curta') ? 0.58 : 1;
  try {
    sessionStorage.setItem('abertura', '1');
  } catch {}
  lenis?.stop();
  let pediu = false;
  const pula = () => {
    pediu = true;
    nome?.pula();
  };
  const eventos = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  eventos.forEach((ev) => addEventListener(ev, pula, { passive: true }));

  // espera montar o resto para não engasgar a abertura
  await resto;
  if (pediu) {
    // pulou durante a montagem: o nome já aparece pronto
    eventos.forEach((ev) => removeEventListener(ev, pula));
    lenis?.start();
    libera();
    nome.mede();
    return;
  }
  await nome.abertura(escala);

  eventos.forEach((ev) => removeEventListener(ev, pula));
  lenis?.start();
  nome.mede();
  // o nome fica sozinho um instante e depois entra o resto
  setTimeout(libera, escala < 1 ? 120 : 220);
});
