// fundo em WebGL: luz em pixels que cresce com o scroll e segue o ponteiro

// 3 px de CSS por pixel de luz; 4 px em aparelhos fracos
const nav = navigator as Navigator & { deviceMemory?: number };
export const CELULA = (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2 ? 4 : 3;

/** arredonda para pixels inteiros da tela; com zoom as colunas saíam desiguais */
export function celula(base: number = CELULA) {
  const dpr = devicePixelRatio || 1;
  return Math.max(1, Math.round(base * dpr)) / dpr;
}

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

// rastro do ponteiro, que apaga aos poucos
const FRAG_PINTA = `
precision mediump float;
uniform sampler2D U;
uniform vec2 R;
uniform vec2 A;
uniform vec2 B;
uniform float S;
uniform float D;
uniform float RAIO;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);return length(pa-ba*h);}
void main(){
  vec2 uv=gl_FragCoord.xy/R;
  float v=texture2D(U,uv).r*D-.006;
  float d=seg(gl_FragCoord.xy,A,B);
  float s=exp(-d*d/(RAIO*RAIO))*S;
  gl_FragColor=vec4(max(max(v,0.),s),0.,0.,1.);
}`;

const FRAG = `
precision highp float;
uniform vec2 R;
uniform float T;
uniform float P;
uniform vec2 M;
uniform vec3 F;
uniform sampler2D Q;
uniform float K;
uniform vec4 FX;

/* os cinco tons vêm do CSS (--luz-0-rgb a --luz-4-rgb), um conjunto por tema */
uniform vec3 C0;
uniform vec3 C1;
uniform vec3 C2;
uniform vec3 C3;
uniform vec3 C4;

float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fb(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}

float bayer(vec2 c){
  vec2 m=mod(c,4.);
  float x=m.x,y=m.y;
  if(y<1.)return x<1.?0.:x<2.?8.:x<3.?2.:10.;
  if(y<2.)return x<1.?12.:x<2.?4.:x<3.?14.:6.;
  if(y<3.)return x<1.?3.:x<2.?11.:x<3.?1.:9.;
  return x<1.?15.:x<2.?7.:x<3.?13.:5.;
}

void main(){
  vec2 uv=gl_FragCoord.xy/R;
  float asp=R.x/R.y;
  float larg=min(asp,1.6);
  vec2 p=vec2(uv.x*larg,uv.y);

  float e=P*P*(3.-2.*P);

  /* centro da luz: nasce abaixo do canto direito, sobe e vai para o meio */
  vec2 c=vec2(mix(.82,.52,e),mix(-.36,-.10,e));
  c+=(M-c)*.04;
  c=mix(c,F.xy,F.z*.2);
  c.x*=larg;

  /* a névoa anda devagar sozinha e desliza com o scroll */
  vec2 s=p+vec2(0.,P*1.4);
  vec2 q=vec2(fb(s*1.3+T*.030),fb(s*1.3-T*.024+3.1));
  float w=fb(s*1.05+q*1.5+T*.016);

  float raio=mix(.58,1.16,e)*mix(.78,1.,smoothstep(.5,1.4,asp));
  float forca=mix(.54,.92,e);
  vec2 d=(p-c)*vec2(.62,1.);
  float g=exp(-dot(d,d)/(raio*raio*.5))*forca*(.36+1.28*w);

  /* um segundo brilho, bem mais fraco, que só aparece da metade em diante */
  vec2 c2=vec2(.12*larg,1.18);
  vec2 d2=(p-c2)*vec2(.8,1.);
  g+=exp(-dot(d2,d2)/.34)*.3*smoothstep(.3,.9,P)*(.4+w);

  /* a luz pintada pelo cursor, mais forte conforme o scroll avança */
  g+=texture2D(Q,uv).r*K*(.75+.5*w);

  /* faixa de luz atrás da linha de projeto sob o mouse: presa às bordas da linha */
  float dentro=step(FX.x,gl_FragCoord.y)*step(gl_FragCoord.y,FX.y);
  float lado=(gl_FragCoord.x-FX.z)/(R.x*.26);
  g+=FX.w*dentro*exp(-lado*lado)*(.5+.7*w);

  /* cinco tons, misturados por pontilhado ordenado */
  float lim=(bayer(gl_FragCoord.xy)+.5)/16.;
  float t=clamp(g*2.6,0.,3.999);
  float nivel=floor(t)+step(lim,fract(t));
  vec3 col=C0;
  col=mix(col,C1,step(.5,nivel));
  col=mix(col,C2,step(1.5,nivel));
  col=mix(col,C3,step(2.5,nivel));
  col=mix(col,C4,step(3.5,nivel));
  gl_FragColor=vec4(col,1.);
}`;

export interface Campo {
  progresso(p: number): void;
  /** faixa de luz entre dois y da tela, centrada em x; forca 0 apaga */
  faixa(topo: number, base: number, x: number, forca: number): void;
  foco(x: number, y: number, forca: number): void;
  /** posição do ponteiro (clientX, clientY) */
  ponteiro(x: number, y: number): void;
  /** true quando algo opaco cobre a tela: o campo para de desenhar */
  pausa(v: boolean): void;
  /** relê os tons do tema e redesenha */
  tema(): void;
}

const nulo: Campo = { progresso() {}, faixa() {}, foco() {}, ponteiro() {}, pausa() {}, tema() {} };

export function criaCampo(canvas: HTMLCanvasElement | null, reduz: boolean): Campo {
  const html = document.documentElement;
  if (!canvas) return nulo;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) {
    html.classList.add('sem-gl');
    return nulo;
  }

  const compila = (tipo: number, fonte: string) => {
    const s = gl.createShader(tipo)!;
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    return s;
  };
  const programa = (frag: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compila(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compila(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  };
  const prog = programa(FRAG);
  const progPinta = programa(FRAG_PINTA);
  if (!prog || !progPinta) {
    html.classList.add('sem-gl');
    return nulo;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const liga = (p: WebGLProgram) => {
    gl.useProgram(p);
    const a = gl.getAttribLocation(p, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  };
  const un = (p: WebGLProgram, nomes: string[]) =>
    Object.fromEntries(nomes.map((n) => [n, gl.getUniformLocation(p, n)])) as Record<string, WebGLUniformLocation | null>;
  const u = un(prog, ['R', 'T', 'P', 'M', 'F', 'Q', 'K', 'FX', 'C0', 'C1', 'C2', 'C3', 'C4']);

  // tons da luz: "5 3 10" no CSS vira [0.02, 0.012, 0.039]
  let tons: number[][] = [];
  const leTons = () => {
    const css = getComputedStyle(html);
    tons = [0, 1, 2, 3, 4].map((i) =>
      css
        .getPropertyValue(`--luz-${i}-rgb`)
        .trim()
        .split(/\s+/)
        .map((v) => Number(v) / 255),
    );
  };
  leTons();
  const up = un(progPinta, ['U', 'R', 'A', 'B', 'S', 'D', 'RAIO']);

  // duas texturas: uma é lida enquanto a outra é escrita
  const alvos: { tex: WebGLTexture; fb: WebGLFramebuffer }[] = [];
  const criaAlvos = (w: number, h: number) => {
    for (const a of alvos) {
      gl.deleteTexture(a.tex);
      gl.deleteFramebuffer(a.fb);
    }
    alvos.length = 0;
    for (let i = 0; i < 2; i++) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      alvos.push({ tex, fb });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  let vez = 0;

  const alvo = { p: 0, mx: 0.8, my: -0.4, fx: 0.5, fy: 0.5, fz: 0, bt: 0, bb: 0, bx: 0, bf: 0 };
  const at = { ...alvo };
  // ponteiro em pixels do canvas: anterior (a) e atual (b)
  const pt = { ax: -999, ay: -999, bx: -999, by: -999, mexeu: 0 };

  let medir = true;
  addEventListener('resize', () => (medir = true));
  canvas.addEventListener('webglcontextlost', () => html.classList.add('sem-gl'));
  // o canvas pode passar um pouco da tela para cada célula ter o tamanho exato
  let cel = celula();
  let alturaCss = innerHeight;
  const mede = () => {
    if (!medir) return;
    medir = false;
    cel = celula();
    const w = Math.max(2, Math.ceil(innerWidth / cel));
    const h = Math.max(2, Math.ceil(innerHeight / cel));
    alturaCss = h * cel;
    canvas.style.width = `${w * cel}px`;
    canvas.style.height = `${alturaCss}px`;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      criaAlvos(w, h);
    }
  };

  const pinta = (dt: number) => {
    const ler = alvos[vez];
    const escrever = alvos[1 - vez];
    liga(progPinta);
    gl.bindFramebuffer(gl.FRAMEBUFFER, escrever.fb);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ler.tex);
    gl.uniform1i(up.U, 0);
    gl.uniform2f(up.R, canvas.width, canvas.height);
    gl.uniform2f(up.A, pt.ax, pt.ay);
    gl.uniform2f(up.B, pt.bx, pt.by);
    // mais luz com o ponteiro em movimento; parado, só um brilho pequeno
    gl.uniform1f(up.S, pt.mexeu);
    gl.uniform1f(up.D, Math.pow(0.95, dt * 60));
    gl.uniform1f(up.RAIO, Math.max(10, canvas.width / 42));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    vez = 1 - vez;
    pt.ax = pt.bx;
    pt.ay = pt.by;
    pt.mexeu *= Math.pow(0.82, dt * 60);
  };

  const desenha = (t: number) => {
    liga(prog);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, alvos[vez].tex);
    gl.uniform1i(u.Q, 0);
    gl.uniform2f(u.R, canvas.width, canvas.height);
    gl.uniform1f(u.T, t);
    gl.uniform1f(u.P, at.p);
    gl.uniform2f(u.M, at.mx, at.my);
    gl.uniform3f(u.F, at.fx, at.fy, at.fz);
    gl.uniform4f(u.FX, at.bb, at.bt, at.bx, at.bf);
    const e = at.p * at.p * (3 - 2 * at.p);
    gl.uniform1f(u.K, reduz ? 0 : 0.95 + 0.45 * e);
    tons.forEach((c, i) => gl.uniform3f(u[`C${i}`], c[0] || 0, c[1] || 0, c[2] || 0));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  if (reduz) {
    // sem animação: a luz acompanha o scroll, mas não anda sozinha nem segue o cursor
    let pedido = 0;
    const pede = () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        mede();
        Object.assign(at, alvo);
        desenha(20);
      });
    };
    addEventListener('resize', pede);
    pede();
    return {
      progresso(p) {
        alvo.p = p;
        pede();
      },
      faixa() {},
      foco() {},
      ponteiro() {},
      pausa() {},
      tema() {
        leTons();
        pede();
      },
    };
  }

  const inicio = performance.now();
  let antes = inicio;
  let pausado = false;
  // parada há 2,5 s cai para 30 fps; na grade de pixels não se nota
  // 2 ms de folga para 60 Hz não virar 20
  const OCIOSO = 2500;
  const PASSO_OCIOSO = 1000 / 30 - 2;
  let mexeuEm = inicio;
  const acorda = () => {
    mexeuEm = performance.now();
  };
  addEventListener('resize', acorda);
  const quadro = (agora: number) => {
    requestAnimationFrame(quadro);
    if (document.hidden || pausado) {
      antes = agora;
      return;
    }
    if (agora - mexeuEm > OCIOSO && agora - antes < PASSO_OCIOSO) return;
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    mede();
    const k = 1 - Math.pow(1 - 0.07, dt * 60);
    at.p += (alvo.p - at.p) * k;
    at.mx += (alvo.mx - at.mx) * k * 0.45;
    at.my += (alvo.my - at.my) * k * 0.45;
    at.fx += (alvo.fx - at.fx) * k * 0.7;
    at.fy += (alvo.fy - at.fy) * k * 0.7;
    at.fz += (alvo.fz - at.fz) * k * 0.7;
    // a faixa troca de linha na hora; só a força e o centro andam suaves
    at.bt = alvo.bt;
    at.bb = alvo.bb;
    at.bx += (alvo.bx - at.bx) * k * 1.4;
    at.bf += (alvo.bf - at.bf) * k * 1.6;
    pinta(dt);
    desenha((agora - inicio) / 1000);
  };
  requestAnimationFrame(quadro);

  return {
    progresso(p) {
      if (p !== alvo.p) acorda();
      alvo.p = p;
    },
    faixa(topo, base, x, forca) {
      // a prévia de projeto chama isto a cada quadro: só acorda o campo se algo mudou
      const { bt, bb, bx, bf } = alvo;
      if (forca > 0) {
        // em pixels do canvas, contados de baixo para cima
        alvo.bt = (alturaCss - topo) / cel;
        alvo.bb = (alturaCss - base) / cel;
        if (at.bf < 0.02) at.bx = x / cel;
        alvo.bx = x / cel;
      }
      alvo.bf = forca;
      if (alvo.bt !== bt || alvo.bb !== bb || alvo.bx !== bx || alvo.bf !== bf) acorda();
    },
    pausa(v) {
      pausado = v;
      acorda();
    },
    tema() {
      leTons();
      acorda();
    },
    foco(x, y, forca) {
      if (forca > 0) {
        alvo.fx = x;
        alvo.fy = y;
      }
      alvo.fz = forca;
      acorda();
    },
    ponteiro(x, y) {
      acorda();
      const cx = x / cel;
      const cy = (alturaCss - y) / cel;
      if (pt.bx < -100) {
        pt.ax = cx;
        pt.ay = cy;
      }
      const dist = Math.hypot(cx - pt.bx, cy - pt.by);
      pt.bx = cx;
      pt.by = cy;
      pt.mexeu = Math.min(0.75, Math.max(pt.mexeu, 0.22 + dist * 0.06));
      alvo.mx = x / innerWidth;
      alvo.my = 1 - y / innerHeight;
    },
  };
}
