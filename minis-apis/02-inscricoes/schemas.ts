/**
 * Os schemas: a regra de FORMATO de tudo que entra. Regra de negócio (vaga,
 * e-mail repetido) não mora aqui — ver `rotas.ts`. Zod 4, conceito do módulo 07.
 */
import { z } from 'zod';

/**
 * O `:id` da rota — e o falso amigo que morde todo mundo uma vez.
 *
 * Nada que vem no endereço é número: `/eventos/3` entrega a STRING `"3"`, e
 * `?limite=20` entrega `"20"`. Com `z.number()` aqui, todo id legítimo seria
 * recusado. Pior é não validar: `"3" === 3` é `false`, então
 * `eventos.find((e) => e.id === req.params.id)` não acha NADA e a API responde
 * 404 para um evento que existe — sem erro, sem log, sem pista.
 *
 * `z.coerce.number()` roda `Number(valor)` antes de validar, e o `.int()` que
 * vem depois é que barra `/eventos/3.5` e `/eventos/abc` (que viram `3.5` e
 * `NaN`). Coerção sem checagem depois só troca um problema por outro.
 */
export const idSchema = z.object({
  id: z.coerce
    .number({ error: '`id` deve ser um número' })
    .int('`id` deve ser um inteiro')
    .positive('`id` deve ser positivo'),
});

/**
 * O corpo do formulário de inscrição.
 *
 * `.strict()` RECUSA campo que não está no schema, em vez de descartar em
 * silêncio. Se o cliente mandou `vagas: 999` junto, só existem duas
 * explicações — ele acha que esse campo faz alguma coisa (bug dele, que vai
 * demorar semanas a aparecer) ou está sondando o que o servidor aceita
 * (ataque). Ignorar esconde as duas; responder "campo desconhecido: vagas"
 * resolve a primeira na hora e nega a segunda.
 */
export const criarInscricaoSchema = z
  .object({
    nome: z
      .string({ error: '`nome` deve ser um texto' })
      // `.trim()` roda ANTES do `.min()`: sem ele, três espaços passariam como
      // nome de 3 caracteres e a lista de presença sairia com uma linha em
      // branco. 80 é folga para nome composto inteiro sem virar campo livre.
      .trim()
      .min(3, '`nome` precisa de ao menos 3 caracteres')
      .max(80, '`nome` passa de 80 caracteres'),

    // No Zod 4 é `z.email()`; `z.string().email()` está deprecado. Ele valida
    // FORMATO, não existência: ninguém confirma e-mail sem mandar mensagem.
    // O `.toLowerCase()` não é enfeite — é o que faz `Ana@x.com` e `ana@x.com`
    // colidirem na checagem de inscrição repetida, que compara texto exato.
    email: z.email('`email` precisa ser um e-mail válido').toLowerCase(),

    // Opcional de verdade: quem não deixa telefone continua se inscrevendo.
    telefone: z
      .string()
      .trim()
      .min(8, '`telefone` precisa de ao menos 8 caracteres')
      .max(20, '`telefone` passa de 20 caracteres')
      .optional(),
  })
  .strict();

export type CriarInscricao = z.infer<typeof criarInscricaoSchema>;

/**
 * A query da listagem. Os defaults são o que a API faz quando o cliente não
 * pede nada — e um cliente que não pede nada é o caso comum.
 */
export const listarInscricoesSchema = z.object({
  pagina: z.coerce
    .number({ error: '`pagina` deve ser um número' })
    .int()
    .positive('`pagina` começa em 1')
    .default(1),

  // 20 cabe numa tela sem rolagem e mantém a resposta em poucos kilobytes. O
  // teto de 100 é o que impede `?limite=999999` de devolver a lista inteira e
  // anular a paginação — sem ele, o parâmetro protege só quem se comporta.
  limite: z.coerce
    .number({ error: '`limite` deve ser um número' })
    .int()
    .min(1, '`limite` mínimo é 1')
    .max(100, '`limite` máximo é 100')
    .default(20),

  // `.min(1)` porque `?busca=` (vazio) casaria com todo mundo e daria a
  // impressão de que o filtro não funciona.
  busca: z.string().trim().min(1, '`busca` não pode ser vazia').optional(),
});

export type ListarInscricoes = z.infer<typeof listarInscricoesSchema>;
