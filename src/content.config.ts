import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const projetos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projetos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      resumo: z.string(),
      // "Cliente" é o nome antigo de Comercial e ainda funciona
      tipo: z
        .enum(['Pessoal', 'Comercial', 'Estudo', 'Cliente'])
        .transform((t) => (t === 'Cliente' ? 'Comercial' : t)),
      quando: z.string(),
      ano: z.number(),
      link: z.string().optional(),
      // repositório no GitHub: botão "Ver código"
      codigo: z.string().url().optional(),
      // texto que aparece no lugar do link
      semLink: z.string().optional(),
      imagem: image(),
      provisoria: z.boolean().default(false),
      stack: z.array(z.string()),
      extras: z.array(z.string()).default([]),
      ordem: z.number(),
    }),
});

const conhecimentos = defineCollection({
  loader: file('./src/content/conhecimentos.yaml'),
  schema: z.object({
    nome: z.string(),
    camada: z.enum(['interface', 'servidor', 'dados', 'automacao', 'infra']),
    nivel: z.enum(['diario', 'aplicado', 'aprofundando']),
    desde: z.number().optional(),
    descricao: z.string().optional(),
  }),
});

const carreira = defineCollection({
  loader: file('./src/content/carreira.yaml'),
  schema: z.object({
    empresa: z.string(),
    cargo: z.string(),
    cargoAnterior: z.string().optional(),
    inicio: z.string().regex(/^\d{4}-\d{2}$/, 'use AAAA-MM'),
    fim: z.string().regex(/^\d{4}-\d{2}$/, 'use AAAA-MM').optional(),
    descricao: z.string(),
    projetos: z.array(z.string()).default([]),
    tecnologias: z.array(z.string()).default([]),
    detalhes: z.array(z.string()).default([]),
    sistemas: z
      .array(
        z.object({
          id: z.string(),
          titulo: z.string(),
          descricao: z.array(z.string()).min(1),
          stack: z.array(z.string()),
          extras: z.array(z.string()).default([]),
        }),
      )
      .default([]),
  }),
});

const formacao = defineCollection({
  loader: file('./src/content/formacao.yaml'),
  schema: z.object({
    curso: z.string(),
    tipo: z.enum(['Formação', 'Curso']), // Formação = graduação; Curso = curso livre
    instituicao: z.string(),
    inicio: z.number(),
    fim: z.number().optional(),
    situacao: z.enum(['a começar', 'em andamento', 'concluído']),
    ordem: z.number(),
  }),
});

const paginas = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/paginas' }),
  schema: z.object({
    titulo: z.string(),
    descricao: z.string(), // aparece no Google e ao compartilhar
    atualizado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD'),
    // quadro "Em resumo"
    resumo: z.array(z.object({ rotulo: z.string(), texto: z.string() })).default([]),
  }),
});

export const collections = { projetos, conhecimentos, carreira, formacao, paginas };
