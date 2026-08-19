/**
 * O contrato HTTP: o que o cliente pode mandar. Conceito principal: módulo 07.
 *
 * Formato mora aqui; regra de negócio (o e-mail já existe? o hábito é meu?)
 * depende de consultar o banco e mora no serviço. A mecânica do `analisar` e do
 * `.strict()` é a da mini 3.
 */
import { z } from 'zod';
import { dadosInvalidos } from './erros.ts';

/**
 * `YYYY-MM-DD`. A regex aceita `2026-02-31`, que não existe no calendário; o
 * ida-e-volta pelo `Date` derruba essa data (a mini 3 explica a mecânica).
 *
 * O que esta API **não** checa é se o dia é futuro. Ela não tem como: quem sabe
 * que dia é hoje é o cliente, que está num fuso qualquer. Marcar dezembro
 * inteiro em agosto é aceito, e o custo está declarado no README.
 */
const diaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '`dia` deve estar no formato YYYY-MM-DD')
  .refine(
    (v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    '`dia` não é uma data existente no calendário',
  );

const mesSchema = z
  .string({ error: '`mes` é obrigatório, no formato YYYY-MM' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '`mes` deve estar no formato YYYY-MM');

const idSchema = z.coerce
  .number({ error: '`id` deve ser um número' })
  .int('`id` deve ser inteiro')
  .positive('`id` deve ser positivo');

export const credenciaisSchema = z
  .object({
    email: z.email('`email` precisa ser um e-mail válido').toLowerCase(),
    // Mínimo de 8 e nenhuma exigência de símbolo ou maiúscula: comprimento é o
    // que de fato encarece a força bruta, e regra de composição só empurra as
    // pessoas para "Senha@123" — previsível e curta. Máximo de 200 para o corpo
    // da requisição não virar entrada de um hash caríssimo de propósito.
    senha: z
      .string()
      .min(8, '`senha` precisa de 8+ caracteres')
      .max(200, '`senha` passou de 200 caracteres'),
  })
  .strict();

export const criarHabitoSchema = z
  .object({
    nome: z.string().trim().min(2, '`nome` precisa de 2+ caracteres').max(60),
  })
  .strict();

export const habitoParamsSchema = z.object({ id: idSchema });

export const marcacaoParamsSchema = z.object({ id: idSchema, dia: diaSchema });

export const resumoQuerySchema = z.object({ mes: mesSchema });

export function analisar<S extends z.ZodType>(schema: S, valor: unknown): z.output<S> {
  const resultado = schema.safeParse(valor);
  if (!resultado.success) {
    throw dadosInvalidos(
      resultado.error.issues.map((problema) => ({
        campo: problema.path.join('.') || '(raiz)',
        mensagem: problema.message,
      })),
    );
  }
  return resultado.data;
}
