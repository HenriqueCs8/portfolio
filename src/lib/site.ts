import { parse } from 'yaml';
import { z } from 'astro/zod';
import bruto from '../content/site.yaml?raw';

const esquema = z.object({
  nome: z.string(),
  marca: z.string().optional(),
  nomeCompleto: z.string(),
  cargo: z.string(),
  frase: z.string(),
  status: z.string(),
  cidade: z.string(),
  fuso: z.string(),
  email: z.string(),
  telefone: z.string().optional(),
  linkedin: z.string(),
  github: z.string(),
  projetosPorPagina: z.number().int().positive(),
  sobre: z.object({ abertura: z.string(), texto: z.array(z.string()).min(1) }),
  agora: z.object({
    atualizado: z.string().regex(/^\d{4}-\d{2}$/, 'use AAAA-MM'),
    itens: z.array(z.object({ rotulo: z.string(), texto: z.string() })).min(1),
  }),
  camadas: z.array(z.object({ id: z.string(), nome: z.string() })),
  idiomas: z.array(z.object({ nome: z.string(), nivel: z.string() })),
  contato: z.object({ titulo: z.array(z.string()), apoio: z.string() }),
});

const lido = esquema.safeParse(parse(bruto));
if (!lido.success) {
  throw new Error('src/content/site.yaml tem um problema:\n' + lido.error.message);
}

export const site = lido.data;

/** projeto ou sistema da Carreira, do jeito que os Conhecimentos usam. car = a experiência */
export type Trabalho = { id: string; titulo: string; stack: string[]; car?: string };

/** "(15) 99620-4439" → "tel:+5515996204439" */
export const linkTelefone = (t: string) => `tel:+55${t.replace(/\D/g, '')}`;
export const escapa = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const dois = (n: number) => String(n).padStart(2, '0');

/** "/index.html" → "/", "/privacidade.html" → "/privacidade" (o build usa format "file") */
export const caminho = (p: string) => p.replace(/(\/index)?\.html$/, '').replace(/\/$/, '') || '/';

/** evita quebra de linha em "full stack" e "e-mail" */
export const semQuebra = (s: string) =>
  s.replace(/\b(full) (stack)\b/gi, '$1\u00a0$2').replace(/\b(e)-(mail)\b/gi, '$1-\u2060$2');

export const secoes = [
  { id: 'topo', nome: 'Início' },
  { id: 'sobre', nome: 'Sobre' },
  { id: 'projetos', nome: 'Projetos' },
  { id: 'conhecimentos', nome: 'Conhecimentos' },
  { id: 'carreira', nome: 'Carreira' },
  { id: 'formacao', nome: 'Formação' },
  { id: 'contato', nome: 'Contato' },
];
export const niveis = {
  diario: 'Uso diário',
  aplicado: 'Aplicado em projetos',
  aprofundando: 'Em aprofundamento',
} as const;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesAno = (v: string) => {
  const [a, m] = v.split('-').map(Number);
  return { a, m: MESES[m - 1] };
};
/** "2026-02", "2026-09" → ["fevereiro", "a setembro de 2026"] */
export function periodoPartes(inicio: string, fim?: string): string[] {
  const i = mesAno(inicio);
  if (!fim) return [`${i.m} de ${i.a}`, 'até hoje'];
  const f = mesAno(fim);
  if (i.a === f.a) return i.m === f.m ? [`${i.m} de ${i.a}`] : [i.m, `a ${f.m} de ${f.a}`];
  return [`${i.m} de ${i.a}`, `a ${f.m} de ${f.a}`];
}
export const periodoPorExtenso = (inicio: string, fim?: string) => periodoPartes(inicio, fim).join(' ');
