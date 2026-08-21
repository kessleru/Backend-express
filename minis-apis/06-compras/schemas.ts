/**
 * O contrato HTTP: o que o cliente pode mandar. Conceito principal: módulo 07.
 *
 * Nada aqui é regra de negócio. Se o e-mail já tem conta, se você é membro da
 * lista, se o item pertence a ela — tudo isso depende de consultar o banco, e
 * quem decide é `servico.ts`.
 */
import { z } from 'zod';
import { dadosInvalidos } from './erros.ts';

/**
 * `.toLowerCase()` roda ANTES da unicidade do banco decidir qualquer coisa, e é
 * o que impede `Ana@x.com` e `ana@x.com` de virarem duas contas. Sem ele, a
 * pessoa cadastra com uma caixa, tenta entrar com outra e leva 401 sem entender.
 */
const emailSchema = z.email('`email` precisa ser um e-mail válido').toLowerCase();

/**
 * Mínimo de 8 caracteres, não 6: é o piso que a recomendação do OWASP usa, e
 * cada caractere a mais multiplica o espaço de busca de quem tenta adivinhar.
 * O teto de 200 não é sobre segurança — é sobre custo: o argon2 é lento de
 * propósito, e deixar alguém mandar uma senha de 1 MB é entregar um jeito barato
 * de ocupar o servidor.
 */
const senhaSchema = z
  .string()
  .min(8, '`senha` precisa de 8+ caracteres')
  .max(200, '`senha` acima de 200 caracteres não é senha');

export const credenciaisSchema = z
  .object({ email: emailSchema, senha: senhaSchema })
  // `.strict()` recusa campo desconhecido em vez de descartá-lo em silêncio. No
  // cadastro isso tem um efeito extra: quem mandar `papel: "dono"` no corpo leva
  // 422 em vez de ser ignorado — e fica claro que papel não é coisa que o
  // cliente escolhe.
  .strict();

export const idSchema = z.object({
  // Query e parâmetro de rota são sempre TEXTO: `/listas/7` chega como `"7"`.
  // `z.coerce` roda `Number()` antes de validar.
  id: z.coerce.number({ error: '`id` deve ser um número' }).int().positive(),
});

export const idsItemSchema = z.object({
  id: z.coerce.number({ error: '`id` deve ser um número' }).int().positive(),
  itemId: z.coerce.number({ error: '`itemId` deve ser um número' }).int().positive(),
});

export const criarListaSchema = z
  .object({ nome: z.string().trim().min(2, '`nome` precisa de 2+ caracteres').max(60) })
  .strict();

export const convidarSchema = z.object({ email: emailSchema }).strict();

export const criarItemSchema = z
  .object({
    nome: z.string().trim().min(1, '`nome` não pode ser vazio').max(80),
    // O teto de 999 é o que cabe num carrinho de supermercado. Sem teto,
    // `quantidade: 1e9` entra no banco e o total da lista vira ficção.
    quantidade: z
      .number({ error: '`quantidade` deve ser um número' })
      .int('`quantidade` deve ser inteira')
      .positive('`quantidade` deve ser maior que zero')
      .max(999, '`quantidade` máxima é 999')
      .default(1),
  })
  .strict();

export const alterarItemSchema = z
  .object({
    nome: z.string().trim().min(1).max(80).optional(),
    quantidade: z
      .number({ error: '`quantidade` deve ser um número' })
      .int('`quantidade` deve ser inteira')
      .positive('`quantidade` deve ser maior que zero')
      .max(999, '`quantidade` máxima é 999')
      .optional(),
    comprado: z.boolean().optional(),
  })
  .strict()
  // Todos os campos são opcionais porque um PATCH manda só o que mudou — mas
  // isso faz `{}` virar um corpo válido, e um PATCH vazio é sempre engano do
  // cliente (campo escrito errado, JSON montado errado). Responder 200 sem ter
  // mudado nada esconde o engano; o `.refine()` o transforma em 422.
  .refine(
    (dados) => Object.keys(dados).length > 0,
    'Mande ao menos um campo: `nome`, `quantidade` ou `comprado`',
  );

/**
 * Valida e devolve o dado já tipado, ou lança 422 com a lista de campos.
 *
 * O formato dos detalhes importa: com `campo` e `mensagem`, a tela sabe qual
 * input pintar de vermelho.
 */
export function analisar<S extends z.ZodType>(schema: S, valor: unknown): z.output<S> {
  const resultado = schema.safeParse(valor);
  if (!resultado.success) {
    throw dadosInvalidos(
      resultado.error.issues.map((problema) => {
        // O `.strict()` reprova a chave desconhecida no OBJETO, não num campo:
        // o caminho do problema vem vazio e viraria `(raiz)`, escondendo do
        // cliente justamente o nome que ele precisa corrigir. A chave recusada
        // está em `problema.keys`, e é ela que vai para o campo. A mensagem
        // padrão do Zod também chega em inglês; aqui tudo é português.
        if (problema.code === 'unrecognized_keys') {
          return {
            campo: problema.keys.join(', '),
            mensagem: 'campo desconhecido: esta rota não aceita este campo',
          };
        }
        return {
          campo: problema.path.join('.') || '(raiz)',
          mensagem: problema.message,
        };
      }),
    );
  }
  return resultado.data;
}
