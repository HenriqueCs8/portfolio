# Portfólio

Meu site pessoal. Feito com Astro e TypeScript, animações com GSAP e Lenis, e o fundo é um shader
WebGL em pixels. É estático, sem cookies e sem rastreamento.

## Rodando

Precisa do Node 22 ou mais novo.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gera a pasta dist/
npm run preview    # serve o dist/ para conferir
```

## Pastas

```
src/content/       os textos do site (site.yaml, projetos/, conhecimentos.yaml, carreira.yaml,
                   formacao.yaml, paginas/privacidade.md)
src/components/    um componente por seção
src/scripts/       campo.ts é o fundo; app.ts junta o resto das interações
src/styles/        global.css, com as cores dos dois temas no topo
src/assets/        foto e avatar do início, prints dos projetos
public/            currículo, imagem de compartilhamento e ícones
ferramentas/       cabecalhos.mjs, que gera o dist/_headers depois do build
```

## Editando o conteúdo

Quase tudo que muda com frequência está em `src/content`. Os arquivos YAML têm comentários no
topo explicando os campos.

### Projetos

Um `.md` por projeto em `src/content/projetos/`, com o print em `src/assets/projetos/` na
proporção 2:1 (uso 1840 × 920, sem barra de rolagem).

```md
---
titulo: Meu projeto
resumo: Uma frase para a lista.
tipo: Comercial            # Pessoal, Comercial ou Estudo
quando: "2026"
ano: 2026
link: https://meusite.com  # opcional, botão "Abrir site"
codigo: https://github.com/usuario/repo  # opcional, botão "Ver código"
semLink: "É este site."    # opcional, troca a frase quando não tem link
imagem: ../../assets/projetos/meu-projeto.png
stack: [react, node]       # ids de conhecimentos.yaml
extras: [Express]          # opcional, o que não está em conhecimentos.yaml
ordem: 6
provisoria: true           # opcional, mostra o aviso de imagem provisória
---

O primeiro parágrafo aparece em destaque no detalhe.

Os seguintes descrevem o projeto.
```

Contador, paginação e o "Usado em" dos Conhecimentos se atualizam com isso. Sistemas que fiz em
empresa e não posso mostrar ficam em `sistemas`, dentro da experiência em `carreira.yaml`.

### Conhecimentos

```yaml
- { id: rust, nome: Rust, camada: servidor, nivel: aprofundando, desde: 2027 }
```

`camada` é `interface`, `servidor`, `dados`, `automacao` ou `infra` (os nomes exibidos, como
Front-end e Back-end, ficam em `site.yaml`). `nivel` é `diario`, `aplicado` ou `aprofundando`.
`descricao` é opcional e aparece ao passar o mouse no diagrama.

Se um projeto usar em `stack` um id que não existe, o build para e diz qual é.

### Carreira

```yaml
- id: agx
  empresa: AGX
  cargoAnterior: Estagiário de TI   # opcional, aparece riscado
  cargo: Trainee de TI
  inicio: "2026-02"
  fim: "2026-09"                  
  descricao: Uma ou duas frases para a linha do tempo.
  detalhes:                         # lista "O que eu fazia" do "Ver mais"
    - Uma atividade por linha.
  projetos: [dellamore]             # ids de src/content/projetos
  sistemas:
    - id: assistente
      titulo: Assistente corporativo com IA
      descricao:
        - O que o sistema faz.
      stack: [react, node]
  tecnologias: [React, Node.js]
```

As datas viram texto sozinhas: `"2026-02"` a `"2026-09"` aparece como "fevereiro a setembro de
2026". Partes vazias não aparecem no painel.

### Formação

```yaml
- id: origamid
  curso: Formação Full Stack
  tipo: Curso               # ou Formação, para graduação
  instituicao: Origamid
  inicio: 2026
  fim: 2027                 
  situacao: em andamento    # a começar, em andamento ou concluído
  ordem: 3
```

### Outras coisas

- Telefone: campo `telefone` em `site.yaml`. Apagando a linha, some do site.
- Currículo: `public/curriculo.pdf`. Se o arquivo existir, os botões de baixar aparecem.
- Foto e avatar: `foto` e `avatar` (.jpg, .png ou .webp, 4:5) em `src/assets/hero/`. Sem eles,
  aparecem os desenhos .svg.
- Privacidade: `src/content/paginas/privacidade.md`. Se eu ligar analytics ou colocar um
  formulário, atualizo o texto e a data.
- Projetos por página: `projetosPorPagina` em `site.yaml`.

## Cores e movimento

As cores ficam no topo do `global.css`, em dois blocos com os mesmos nomes: o escuro e o
`:root[data-tema='claro']`. Para mudar uma cor, troco nos dois. O texto de apoio precisa de pelo
menos 4,5:1 de contraste sobre o tom mais forte da luz.

Com "reduzir movimento" ligado no sistema, nada anima sozinho (`html.reduz` no CSS, `reduz` no
`app.ts`).

## Deploy

Uso a Cloudflare Pages: build `npm run build`, saída `dist`. A versão do Node vem do
`.node-version`.

A variável `SITE_URL` precisa ter o domínio final. Sem ela, canonical, og:image, sitemap e
robots usam o endereço `*.pages.dev`. Depois de mudar a variável, é preciso rodar um build novo.

O build gera `dist/_headers` com CSP, HSTS e cache longo para `/_astro/`. Se eu ligar o
Cloudflare Web Analytics, preciso liberar `static.cloudflareinsights.com` em `script-src` e
`cloudflareinsights.com` em `connect-src` no `ferramentas/cabecalhos.mjs`.

Se um deploy quebrar algo, dá para voltar em Deployments, no deploy anterior, com "Rollback to
this deployment".

## Licença

O código é MIT (veja `LICENSE`). Os textos, as fotos, as imagens dos projetos, o currículo e a
marca HC8CODE não entram na licença: se usar o projeto como base, troque pelos seus.

De terceiros: Astro e Lenis (MIT), yaml (ISC), GSAP com ScrollTrigger e SplitText
([licença padrão da GSAP](https://gsap.com/standard-license)), as fontes Archivo, Geist e Geist
Mono pelo Fontsource (OFL 1.1) e os ícones de sol, lua, menu e fechar do Font Awesome Free 6.7.2
(CC BY 4.0). A atribuição do Font Awesome fica nos comentários do `Moldura.astro` e precisa
continuar lá.
