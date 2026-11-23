# Portfólio de Henrique Carvalho

Site pessoal de Henrique Carvalho, desenvolvedor full stack em Sorocaba. Feito em Astro e
TypeScript, com GSAP, Lenis e um fundo em WebGL desenhado pixel a pixel. É um site estático, sem
cookies e sem rastreamento.

## Rodar no computador

Precisa do Node.js 22 ou mais novo.

```bash
npm install
npm run dev        # abre em http://localhost:4321
npm run build      # gera o site final na pasta dist/
npm run preview    # mostra o site final gerado
```

## Onde fica cada coisa

```
src/
  content/
    site.yaml            nome, marca do topo (HC8CODE), frase, e-mail, links, texto do Sobre e coluna "Agora", título do Contato
    projetos/            um arquivo .md por projeto
    conhecimentos.yaml   tecnologias, com camada e nível
    carreira.yaml        experiências (e o que aparece no painel "Ver mais")
    formacao.yaml        formação e cursos
    paginas/
      privacidade.md     texto da página de privacidade (e o quadro "Em resumo")
  pages/                 as páginas (início, privacidade, 404), o sitemap.xml e o robots.txt
  assets/
    hero/                foto e avatar do início
    projetos/            imagens dos projetos
  components/            uma peça por seção do site
  scripts/
    campo.ts             o fundo (a luz roxa que cresce com o scroll)
    app.ts               todas as interações
  styles/global.css      cores, tipografia e layout
public/
  curriculo.pdf          se existir, "Baixar currículo" (topo) e "Currículo em PDF" (Contato)
                         aparecem sozinhos. Para atualizar, troque o arquivo mantendo o nome.
  og.png                 imagem que aparece ao compartilhar o link (1200 × 630)
  favicon.svg            ícone da aba; favicon.ico é a cópia para navegadores sem SVG
  apple-touch-icon.png   ícone da tela inicial do iPhone (180 × 180)
ferramentas/
  cabecalhos.mjs         roda depois do build e gera dist/_headers (segurança e cache)
```

## Adicionar um projeto

1. Coloque o print em `src/assets/projetos/`: a primeira tela inteira do site, com uns 1800 px de largura,
   na proporção 2:1 (por exemplo 1840 × 920). Sem a barra de rolagem do navegador.
2. Crie um arquivo em `src/content/projetos/`, por exemplo `meu-projeto.md`:

```md
---
titulo: Meu projeto
resumo: Uma frase que aparece na lista.
tipo: Comercial            # Pessoal | Comercial (feito para cliente) | Estudo
quando: "2026"             # texto livre: "2026", "Desde 2025"
ano: 2026
link: https://meusite.com  # opcional. Sem link, aparece "Projeto ... sem link público"
semLink: "É este site."    # opcional: troca a frase que aparece quando não há link
imagem: ../../assets/projetos/meu-projeto.png
stack: [react, node]       # ids que existem em conhecimentos.yaml
extras: [Express]          # opcional: ferramentas que não estão em conhecimentos.yaml
ordem: 6                   # 1 é o primeiro da lista
---

Primeiro parágrafo da descrição, que aparece em destaque no detalhe.

Segundo parágrafo, com o que o projeto faz.
```

O contador, a paginação e o "Usado em" da seção Conhecimentos se atualizam sozinhos.

Projetos são só o que você pode mostrar (código ou imagens). Um sistema feito numa empresa, sem
direito de mostrar, vai em `sistemas` dentro da experiência, em `carreira.yaml`: aparece no "Ver
mais" e continua contando nos Conhecimentos.
Para mudar quantos projetos aparecem por página, altere `projetosPorPagina` em `site.yaml`.

Se um projeto estiver com imagem provisória, use `provisoria: true`; ao trocar pelo print real, apague a linha.

## Adicionar ou mudar um conhecimento

Em `src/content/conhecimentos.yaml`, cada linha é uma tecnologia:

```yaml
- { id: rust, nome: Rust, camada: servidor, nivel: aprofundando, desde: 2027 }
```

- `camada`: `interface` (Front-end), `servidor` (Back-end), `dados`, `automacao` ou `infra` (os nomes que aparecem no site ficam em `site.yaml`).
- `nivel`: `diario`, `aplicado` ou `aprofundando`. Subir de nível é trocar essa palavra.
- `descricao`: o que você faz com a tecnologia, em uma frase. Aparece ao passar o mouse no diagrama.
  Sem ela, uma tecnologia com `desde` mostra "Estudando desde…".

Se um projeto citar em `stack` uma tecnologia que não existe aqui, o `npm run build` para e
avisa qual é.

## Mudar a carreira

Em `src/content/carreira.yaml`, cada bloco é uma experiência:

```yaml
- id: agx                      # nome curto, sem espaço
  empresa: AGX
  cargoAnterior: Estagiário de TI   # opcional: aparece riscado (promoção)
  cargo: Trainee de TI
  inicio: "2026-02"            # ano e mês, entre aspas
  fim: "2026-09"               # opcional. Sem fim, aparece "até hoje"
  descricao: Uma ou duas frases que aparecem na linha do tempo.
  detalhes:                    # opcional: a lista "O que eu fazia" do painel
    - Uma atividade por linha.
    - Outra atividade.
  projetos: [dellamore]        # opcional: nomes dos arquivos em src/content/projetos
  sistemas:                    # opcional: o que foi criado na empresa e não pode ir para Projetos
    - id: assistente
      titulo: Assistente corporativo com IA
      descricao:               # um item por linha
        - O que o sistema faz.
      stack: [react, node]     # ids de conhecimentos.yaml
      extras: [Express]        # opcional: o que não está em conhecimentos.yaml
  tecnologias: [React, Node.js]    # opcional: texto livre
```

- A data é escrita por extenso sozinha: `"2026-02"` a `"2026-09"` vira "fevereiro a setembro de 2026".
- O botão "Ver mais" abre um painel pela direita com período, cargo, resumo, `detalhes` (com o
  título "O que eu fazia", ou "O que eu faço" quando não há `fim`), os projetos daquela fase
  (links que abrem o detalhe do projeto) e as tecnologias. As seções sem conteúdo não aparecem.
- Se `projetos` citar um projeto que não existe, o `npm run build` para e avisa qual é.

## Mudar a formação e os cursos

Em `src/content/formacao.yaml`, cada bloco é um curso, todos no mesmo padrão:

```yaml
- id: origamid
  curso: Formação Full Stack
  tipo: Curso               # ou: Formação (graduação)
  instituicao: Origamid
  inicio: 2026
  fim: 2027                 # opcional. Sem fim, aparece "desde 2026"
  situacao: em andamento    # ou: a começar, concluído
  ordem: 3                  # 1 é o primeiro da lista
```

## Telefone

Fica em `telefone` no `site.yaml`, do jeito que deve aparecer: `"(15) 99620-4439"`. O link de
ligar é montado sozinho. Para tirar do site, apague a linha.

## Página de privacidade

O texto fica em `src/content/paginas/privacidade.md`, em Markdown comum (`##` para os títulos,
`-` para as listas). O quadro "Em resumo" é a lista `resumo` no topo do mesmo arquivo. O nome e o
e-mail do responsável vêm do `site.yaml`, os mesmos do Contato. O link fica no rodapé.

Mudou algo que mexe com dados de quem visita (por exemplo, ligou o Cloudflare Web Analytics ou
colocou um formulário)? Atualize o texto e a data em `atualizado`.

## Cores e tema claro

O site tem dois temas: escuro (padrão) e claro, trocados pelo botão de sol e lua no topo. A
escolha fica guardada no navegador.

Todas as cores estão no começo de `src/styles/global.css`, com nomes por função (`--fundo`,
`--texto`, `--destaque`, `--luz-1` a `--luz-4`...). O primeiro bloco é o tema escuro; o bloco
`:root[data-tema='claro']` tem os mesmos nomes com as cores do claro. Para mudar uma cor, troque
nos dois blocos. A luz do fundo e os pixels dos títulos leem essas variáveis sozinhos.

Antes de escurecer a luz do tema claro ou clarear a do escuro, confira o contraste do texto de
apoio sobre o tom mais forte: precisa ficar em 4,5:1 ou mais.

## Movimento

O site sempre anima; não há botão para desligar. A única exceção é o "reduzir movimento" do
sistema operacional: com ele ligado, nada se mexe sozinho. No código, tudo que anima consulta a
classe `html.reduz` (CSS) ou a constante `reduz` (`src/scripts/app.ts`).

## Trocar a foto e o avatar

Coloque os arquivos em `src/assets/hero/` com os nomes `foto` e `avatar` (`.jpg`, `.png` ou
`.webp`), na proporção 4:5. Enquanto existirem só os `.svg`, o site mostra os desenhos
provisórios. Com os arquivos reais na pasta, eles passam a valer.

## Publicar

O site é estático. Na Cloudflare Pages:

- **Comando de build:** `npm run build`. **Pasta de saída:** `dist`.
- **Node:** a versão vem do arquivo `.node-version` (22.23.4, a mínima do Astro 7).
- **Variável `SITE_URL`:** o endereço final, por exemplo `https://seudominio.com.br`. Com ela, o
  link canônico, a imagem de compartilhamento (`public/og.png`), o `sitemap.xml` e o `robots.txt`
  saem com o endereço completo, que é o que LinkedIn, WhatsApp e Google pedem. Sem ela, vale o
  endereço `*.pages.dev` da própria Cloudflare.
- **Cabeçalhos:** o build gera `dist/_headers` (`ferramentas/cabecalhos.mjs`) com cache de um ano
  para `/_astro/`, HTTPS obrigatório (HSTS) e uma política de segurança que só aceita scripts do
  próprio site.
- **Endereços:** as páginas saem como arquivos (`privacidade.html`) e abrem sem barra no fim
  (`/privacidade`).
- **Cloudflare Web Analytics:** se ligar, acrescente `https://static.cloudflareinsights.com` em
  `script-src` e `https://cloudflareinsights.com` em `connect-src`, dentro de
  `ferramentas/cabecalhos.mjs`; senão a política bloqueia o script deles. E conte isso na página
  de privacidade.

### Checklist do primeiro deploy

Antes:

- [ ] `npm run build` sem erros
- [ ] Foto real em `src/assets/hero/` (4:5)
- [ ] Currículo em PDF atualizado em `public/curriculo.pdf`
- [ ] Autorização dos clientes para mostrar os projetos comerciais

Deploy:

- [ ] Cloudflare Pages: Create project, conectar este repositório
- [ ] Framework Astro, build `npm run build`, saída `dist`
- [ ] Abrir o endereço `*.pages.dev` e conferir: abertura, rolagem até o Contato, abrir e fechar
      um projeto, copiar e-mail, menu no celular, trocar o tema, página de privacidade
- [ ] Ligar o domínio próprio em Custom domains e definir `SITE_URL` com ele
- [ ] Rodar o deploy de novo (a variável só vale num build novo) e repetir a conferência
- [ ] Colar o link no LinkedIn (Post Inspector) ou no WhatsApp e ver a prévia com imagem

Depois:

- [ ] Cadastrar o site no Google Search Console e enviar `https://seudominio/sitemap.xml`
- [ ] PageSpeed Insights no endereço final, no celular e no computador
- [ ] Atualizar o link do portfólio no LinkedIn, no GitHub e no currículo

Se algo der errado (página em branco, erro de política de segurança no console, projeto ou menu
que não abre): em Cloudflare Pages, Deployments, escolha o deploy anterior e use "Rollback to this
deployment". Leva segundos e não exige build.

## Licença e créditos

O código deste repositório está sob a licença MIT (arquivo `LICENSE`): pode estudar, copiar e
reaproveitar, mantendo o aviso de copyright.

Ficam de fora da licença MIT, com todos os direitos reservados: os textos do site, as fotos e
imagens dos projetos, o currículo e a marca HC8CODE. Se for usar este projeto como base, troque
esses itens pelos seus.

Partes de terceiros, cada uma com a própria licença:

| O quê | Licença |
| --- | --- |
| Astro, Lenis | MIT |
| yaml | ISC |
| GSAP, com ScrollTrigger e SplitText | [Licença padrão sem custo da GSAP](https://gsap.com/standard-license) |
| Fontes Archivo, Geist e Geist Mono (via Fontsource) | SIL Open Font License 1.1 |
| Ícones sol, lua, menu e fechar (Font Awesome Free 6.7.2) | CC BY 4.0. A atribuição fica no comentário junto de cada ícone, em `Moldura.astro`: não apague. |
