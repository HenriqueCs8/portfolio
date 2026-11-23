// GSAP + Lenis, texto que rola no hover, botões, links e rodapé

import Lenis from 'lenis';
import { curvaTroca } from './ritmo';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

// scroll suave

/** depois de rolar até uma seção, o foco vai junto */
export function focaSecao(alvo: HTMLElement) {
  if (!alvo.matches('a, button, input, select, textarea, [tabindex]')) alvo.setAttribute('tabindex', '-1');
  alvo.focus({ preventScroll: true });
}

export function criaRolagem(reduz: boolean) {
  if (reduz) return null;
  const lenis = new Lenis({ autoRaf: false, anchors: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // links para seções: quanto mais longe, mais demora (0,7 a 1,6 s). pelo teclado vai direto.
  // quem já tratou o clique (menu, detalhe, painel) cancela o padrão
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
    const id = a ? decodeURIComponent(a.hash.slice(1)) : '';
    const alvo = id ? document.getElementById(id) : null;
    if (!alvo) return;
    e.preventDefault();
    const peloTeclado = e.detail === 0;
    const distancia = Math.abs(alvo.getBoundingClientRect().top);
    lenis.scrollTo(alvo, {
      immediate: peloTeclado,
      duration: Math.min(1.6, 0.7 + distancia / 4000),
      easing: curvaTroca,
      onComplete: () => focaSecao(alvo),
    });
    if (peloTeclado) focaSecao(alvo);
  });
  return lenis;
}

// texto que rola

/** monta o texto que rola de um [data-rola]; o nome acessível fica num .so-leitor */
export function montaRola(el: HTMLElement, texto?: string) {
  const extra = el.querySelector('.so-leitor:not(.rola-nome)')?.textContent ?? '';
  const visivel =
    texto ??
    el.dataset.rolaTexto ??
    [...el.childNodes]
      .filter((n) => !(n instanceof HTMLElement && n.classList.contains('so-leitor')))
      .map((n) => n.textContent)
      .join('')
      .trim();
  el.dataset.rolaTexto = visivel;
  // uma caixa por palavra para poder quebrar linha
  let i = 0;
  const esc = (c: string) => c.replace(/[<&>"]/g, (x) => `&#${x.charCodeAt(0)};`);
  const palavras = visivel.split(/(\s+)/).map((w) => {
    if (!w) return '';
    if (/^\s+$/.test(w)) {
      i += w.length;
      return ' ';
    }
    const letras = (ini: number) => [...w].map((c, j) => `<span class="rl" style="--i:${ini + j}">${esc(c)}</span>`).join('');
    const html = `<span class="rw"><span class="rw-a">${letras(i)}</span><span class="rw-b">${letras(i)}</span></span>`;
    i += [...w].length;
    return html;
  });
  el.innerHTML = `<span class="rola" aria-hidden="true">${palavras.join('')}</span><span class="so-leitor rola-nome"></span>`;
  el.querySelector('.rola-nome')!.textContent = visivel + extra;
}

export function iniciaRola() {
  $$('[data-rola]').forEach((el) => montaRola(el));
}

// botões que enchem pelo lado de entrada

export function iniciaBotoes() {
  for (const bt of $$('.bt')) {
    const marca = (e: PointerEvent) => {
      const r = bt.getBoundingClientRect();
      // botão que acabou de sumir mede 0 e a conta daria NaN
      if (!r.width || !r.height) return;
      bt.style.setProperty('--bx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      bt.style.setProperty('--by', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    bt.addEventListener('pointerenter', marca);
    bt.addEventListener('pointerleave', marca);
  }
}

// sublinhado dos links

/** o sublinhado recolhe e volta; a classe só sai no fim da animação */
export function iniciaLinks(reduz: boolean) {
  if (reduz || !matchMedia('(hover: hover)').matches) return;
  document.addEventListener('pointerover', (e) => {
    // .texto-legal a: links do Markdown, que não têm a classe .lk
    const lk = (e.target as Element).closest?.<HTMLElement>('.lk, .texto-legal a');
    if (!lk || lk.classList.contains('sublinhando') || lk.contains(e.relatedTarget as Node | null)) return;
    lk.classList.add('sublinhando');
    const fim = (ev: AnimationEvent) => {
      if (ev.target !== lk || ev.animationName !== 'sublinha') return;
      lk.classList.remove('sublinhando');
      lk.removeEventListener('animationend', fim);
      lk.removeEventListener('animationcancel', fim);
    };
    lk.addEventListener('animationend', fim);
    lk.addEventListener('animationcancel', fim);
  });
}

// inclinação pela velocidade

export function iniciaVelocidade(lenis: Lenis | null) {
  if (!lenis) return;
  const els = $$('[data-vel]');
  if (!els.length) return;
  const st = { v: 0 };
  const aplica = () => {
    const graus = st.v.toFixed(3);
    for (const el of els) el.style.setProperty('--vel', graus);
  };
  const vai = gsap.quickTo(st, 'v', { duration: 0.6, ease: 'power3.out', onUpdate: aplica });
  lenis.on('scroll', (l: Lenis) => vai(gsap.utils.clamp(-1.2, 1.2, l.velocity * -0.06)));
}

// rodapé

/** o rodapé sobe por baixo do Contato, como uma cortina */
export function iniciaRodape(reduz: boolean) {
  const dentro = document.querySelector<HTMLElement>('.rodape-dentro');
  if (!dentro || reduz) return;
  gsap.fromTo(
    dentro,
    { yPercent: -55, clipPath: 'inset(0% 0% 100% 0%)' },
    {
      yPercent: 0,
      clipPath: 'inset(0% 0% 0% 0%)',
      ease: 'none',
      scrollTrigger: { trigger: dentro, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 },
    },
  );
}

export { gsap, ScrollTrigger, SplitText };
