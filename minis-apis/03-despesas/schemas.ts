/**
 * O contrato HTTP: o que o cliente pode mandar. Conceito principal: módulo 07.
 *
 * Nada aqui é regra de negócio — o schema decide se o dado tem FORMATO válido.
 * Se a categoria existe e se o nome já foi usado depende de consultar o banco,
 * e isso é trabalho do serviço.
 */
import { z } from 'zod';
import { dadosInvalidos } from './erros.ts';

/**
 * `YYYY-MM`: o formato do filtro mensal e da chave do relatório.
 *
 * A mensagem no `z.string()` é a do campo AUSENTE — sem ela, quem esquece o
 * `?mes=` recebe "expected string, received undefined", que descreve o tipo em
 * vez de dizer o que fazer.
 */
const mesSchema = z
  .string({ error: '`mes` é obrigatório, no formato YYYY-MM' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '`mes` deve estar no formato YYYY-MM');

const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '`data` deve estar no formato YYYY-MM-DD')
  // A regex aceita `2026-02-31`, que não existe. O ida-e-volta pelo `Date`
  // pega isso: o JavaScript normaliza 31/02 para 03/03 e o texto não bate mais.
  // Sem esta linha, um dia inválido entra no banco e some do relatório do mês.
  .refine(
    (v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    '`data` não é uma data existente no calendário',
  );

export const idSchema = z.object({
  // Sem a mensagem no `coerce`, `/despesas/abc` responde "expected number,
  // received NaN" — o NaN é detalhe da conversão, não algo que o cliente mandou.
  id: z.coerce
    .number({ error: '`id` deve ser um número' })
    .int('`id` deve ser inteiro')
    .positive('`id` deve ser positivo'),
});

export const criarCategoriaSchema = z
  .object({
    nome: z.string().trim().min(2, '`nome` precisa de 2+ caracteres').max(40),
  })
  // `.strict()` recusa campo desconhecido em vez de descartá-lo em silêncio.
  // Quem mandou `nomes` em vez de `nome` recebe a lista do que sobrou, em vez
  // de "campo obrigatório ausente" sem entender por quê.
  .strict();

export const criarDespesaSchema = z
  .object({
    descricao: z.string().trim().min(2, '`descricao` precisa de 2+ caracteres').max(120),

    // O cliente manda REAIS (`12.34`), porque é o que ele tem na mão; quem
    // converte para centavos é a borda, em `rotas.ts`.
    valor: z
      .number({ error: '`valor` deve ser um número em reais' })
      .positive('`valor` deve ser maior que zero')
      .max(1_000_000, '`valor` acima de R$ 1.000.000 é erro de digitação')
      // `12.345` seria arredondado para 12,35 na conversão. Arredondar dinheiro
      // sem avisar é pior que recusar: o cliente jura que lançou um valor e o
      // extrato mostra outro. `toFixed(2)` de volta a número é a checagem mais
      // curta de "cabe em centavos".
      .refine((v) => Number(v.toFixed(2)) === v, '`valor` só aceita duas casas decimais'),

    data: dataSchema,
    categoriaId: z.number().int().positive(),
  })
  .strict();

export const listarDespesasSchema = z.object({
  mes: mesSchema.optional(),
  // Query string é SEMPRE texto: `?categoria=3` chega como `"3"` e um
  // `z.number()` puro recusaria — corretamente. `z.coerce` roda `Number()`
  // antes de validar. Isto vale para os três campos numéricos abaixo.
  categoria: z.coerce.number().int().positive().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  // 20 por página: cabe numa tela de extrato sem rolagem infinita e mantém a
  // resposta pequena. O teto de 100 impede `?limite=999999`, que devolveria a
  // tabela inteira e anularia a paginação.
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const relatorioMensalSchema = z.object({ mes: mesSchema });

/**
 * Valida e devolve o dado já tipado, ou lança 422 com a lista de campos.
 *
 * O formato dos detalhes importa mais do que parece: com `campo` e `mensagem`,
 * a tela sabe qual input pintar de vermelho. Uma string única obrigaria a
 * mostrar um alerta genérico e o usuário a caçar o próprio erro.
 */
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
