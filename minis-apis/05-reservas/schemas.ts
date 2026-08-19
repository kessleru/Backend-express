/**
 * As regras que dá para conferir olhando só o pedido: o formato dos campos e as
 * regras fixas da casa (expediente, duração, fuso do prédio). Tudo aqui vira
 * 422. O que depende da agenda já gravada vira 409 e mora em `rotas.ts`.
 * Zod 4, módulo 07.
 */
import { z } from 'zod';

/**
 * Os números da casa. Nenhum deles é lei da natureza, e é por isso que ficam
 * juntos e nomeados: mudar o expediente é editar uma linha, não caçar `7` e
 * `22` espalhados por três arquivos.
 *
 * O deslocamento do fuso é o que transforma um instante no relógio de parede do
 * prédio. Ele existe porque "o prédio fecha às 22h" é uma frase sobre o relógio
 * de quem está lá — e o servidor pode rodar em qualquer lugar. Usar a hora
 * local do processo faria a mesma reserva ser aceita na máquina de quem
 * desenvolve e recusada no servidor de produção, sem ninguém mudar uma linha.
 */
export const AGENDA = {
  /** O prédio fica em Brasília, três horas atrás de UTC. */
  deslocamentoDoFusoMs: -3 * 60 * 60 * 1000,
  abreEmMinutos: 7 * 60,
  fechaEmMinutos: 22 * 60,
  /** Abaixo disso é engano de digitação com mais frequência que reunião. */
  duracaoMinimaMinutos: 15,
  /** Meio período. Acima disso a sala vira posse de alguém, não recurso. */
  duracaoMaximaMinutos: 4 * 60,
};

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/** O instante lido no relógio de parede do prédio. */
const relogioLocal = (instanteMs: number) => instanteMs + AGENDA.deslocamentoDoFusoMs;

const minutosDoDia = (instanteMs: number) =>
  Math.floor((relogioLocal(instanteMs) % DIA_EM_MS) / 60_000);

const diaLocal = (instanteMs: number) => Math.floor(relogioLocal(instanteMs) / DIA_EM_MS);

const hhmm = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/**
 * As regras do PAR `inicio`/`fim`, num lugar só.
 *
 * Nenhuma delas cabe num campo. "`fim` precisa ser depois de `inicio`" não é
 * uma regra sobre `fim`: é sobre os dois juntos, e um validador de `fim`
 * sozinho não tem com o que comparar. Tentar prender a regra ao campo é o falso
 * amigo desta mini API.
 *
 * A função recebe instantes em milissegundos — não os schemas, não a reserva —
 * porque é chamada de dois lugares que enxergam coisas diferentes: no `POST` o
 * par inteiro veio no corpo, e no `PATCH` ele só existe depois de juntar o que
 * veio com o que já estava gravado.
 */
export function problemasDoIntervalo(inicioMs: number, fimMs: number) {
  const problemas: { campo: 'inicio' | 'fim'; mensagem: string; codigo: 'custom' }[] = [];
  const anotar = (campo: 'inicio' | 'fim', mensagem: string) =>
    problemas.push({ campo, mensagem, codigo: 'custom' });

  if (fimMs <= inicioMs) {
    anotar('fim', '`fim` precisa ser depois de `inicio`');
    // Sai aqui de propósito: com o par invertido, "duração negativa" e "termina
    // fora do expediente" são consequências do mesmo engano, e três mensagens
    // para um problema só fazem quem lê procurar três correções.
    return problemas;
  }

  const duracao = (fimMs - inicioMs) / 60_000;
  if (duracao < AGENDA.duracaoMinimaMinutos) {
    anotar('fim', `a reserva precisa de ao menos ${AGENDA.duracaoMinimaMinutos} minutos`);
  }
  if (duracao > AGENDA.duracaoMaximaMinutos) {
    anotar('fim', `a reserva passa de ${AGENDA.duracaoMaximaMinutos} minutos`);
  }

  if (minutosDoDia(inicioMs) < AGENDA.abreEmMinutos) {
    anotar('inicio', `o prédio abre às ${hhmm(AGENDA.abreEmMinutos)}`);
  }

  // A comparação de dia não é preciosismo: sem ela, uma reserva das 23h à
  // meia-noite passaria, porque zero minuto é menor que o horário de
  // fechamento. O relógio deu a volta, e a checagem de hora sozinha não vê.
  if (
    diaLocal(fimMs) !== diaLocal(inicioMs) ||
    minutosDoDia(fimMs) > AGENDA.fechaEmMinutos
  ) {
    anotar('fim', `o prédio fecha às ${hhmm(AGENDA.fechaEmMinutos)}, no mesmo dia`);
  }

  return problemas;
}

// Tudo que vem no endereço é texto; o porquê do `z.coerce` e do `.int()` logo
// depois dele está na mini 02.
export const idSchema = z.object({
  id: z.coerce
    .number({ error: '`id` deve ser um número' })
    .int('`id` deve ser um inteiro')
    .positive('`id` deve ser positivo'),
});

/**
 * O instante, exigido com fuso.
 *
 * `{ offset: true }` aceita `2026-08-19T14:00:00-03:00` e a forma em `Z`, e
 * RECUSA `2026-08-19T14:00:00` solto. Aceitar a forma solta é o que parece
 * gentil e custa caro: "14:00" não é um instante, é a leitura de um relógio.
 * Alguém em Lisboa pedindo "14:00" e alguém em São Paulo pedindo "14:00"
 * pediram horários com quatro horas de diferença, e nenhum dos dois digitou
 * errado — quem teria de adivinhar qual relógio cada um leu é o servidor.
 */
const instante = (campo: 'inicio' | 'fim') =>
  z.iso.datetime({
    offset: true,
    error: `\`${campo}\` precisa ser uma data-hora ISO 8601 com fuso, como 2026-08-19T14:00:00-03:00`,
  });

/**
 * Os dois campos de texto da reserva têm exatamente a mesma regra, então são a
 * mesma função — duas cópias significariam corrigir o limite em dois lugares.
 *
 * `.trim()` roda antes do `.min()`: sem ele, três espaços passariam como título
 * de 3 caracteres e a agenda mostraria uma linha em branco.
 */
const texto = (campo: 'titulo' | 'responsavel') =>
  z
    .string({ error: `\`${campo}\` deve ser um texto` })
    .trim()
    .min(3, `\`${campo}\` precisa de ao menos 3 caracteres`)
    .max(80, `\`${campo}\` passa de 80 caracteres`);

/**
 * O corpo da reserva. `.strict()` recusa campo fora do schema em vez de
 * descartar em silêncio — mandar `capacidade: 999` numa reserva é bug do
 * cliente ou sondagem, e o silêncio esconde os dois (mini 02).
 *
 * O `.superRefine()` só roda depois de todos os campos passarem: se `inicio`
 * veio malformado, ele nem é chamado, e por isso nunca recebe um par pela
 * metade.
 */
export const criarReservaSchema = z
  .object({
    titulo: texto('titulo'),
    responsavel: texto('responsavel'),
    inicio: instante('inicio'),
    fim: instante('fim'),
  })
  .strict()
  .superRefine((reserva, ctx) => {
    const problemas = problemasDoIntervalo(
      Date.parse(reserva.inicio),
      Date.parse(reserva.fim),
    );
    for (const problema of problemas) {
      // O `path` é o que faz o erro sair com o nome do campo em vez de
      // "(raiz)" — quem preencheu precisa saber onde corrigir.
      ctx.addIssue({
        code: problema.codigo,
        path: [problema.campo],
        message: problema.mensagem,
      });
    }
  });

export type CriarReserva = z.infer<typeof criarReservaSchema>;

/**
 * A remarcação — e o falso amigo mais caro do `PATCH`.
 *
 * O caminho óbvio é `criarReservaSchema.partial()`, e ele nem chega a rodar: o
 * Zod 4 lança `.partial() cannot be used on object schemas containing
 * refinements` ao carregar o módulo, e o servidor morre antes do primeiro
 * pedido. Tirar o `.superRefine()` para o `.partial()` funcionar troca o
 * estouro por algo pior — silêncio: `{}` vira sucesso que não muda nada, e
 * `{ "fim": ... }` sozinho passa sem conferência nenhuma, porque o `inicio` que
 * daria sentido à comparação está gravado e o schema não enxerga o que está
 * gravado.
 *
 * Por isso os campos são escritos opcionais aqui, um a um, e a regra do par só
 * é conferida na rota, depois da junção com a reserva que já existe.
 */
export const remarcarReservaSchema = z
  .object({
    titulo: texto('titulo').optional(),
    inicio: instante('inicio').optional(),
    fim: instante('fim').optional(),
  })
  .strict()
  // Sem isto, um `PATCH` com `{}` responde 200 sem ter mudado nada, e quem
  // chamou acha que remarcou.
  .refine(
    (mudancas) => Object.keys(mudancas).length > 0,
    'informe ao menos um campo: `titulo`, `inicio` ou `fim`',
  );

/**
 * A query da agenda. Sem `.strict()`, ao contrário dos corpos: link colado em
 * conversa chega com `?utm_source=` grudado, e derrubar a agenda inteira por um
 * parâmetro que o cliente nem escreveu troca um problema inexistente por uma
 * tela quebrada.
 */
export const agendaSchema = z.object({
  // Um dia é `2026-08-19`, sem hora: quem pergunta "o que tem na quarta?" não
  // está falando de instante nenhum. Quem transforma isso em intervalo de
  // instantes é `intervaloDoDia`, em `dados.ts`.
  data: z.iso.date({ error: '`data` precisa estar no formato AAAA-MM-DD' }).optional(),

  pagina: z.coerce
    .number({ error: '`pagina` deve ser um número' })
    .int()
    .positive('`pagina` começa em 1')
    .default(1),

  // 20 cabe numa tela sem rolagem; o teto de 100 é o que impede `?limite=999999`
  // de anular a paginação.
  limite: z.coerce
    .number({ error: '`limite` deve ser um número' })
    .int()
    .min(1, '`limite` mínimo é 1')
    .max(100, '`limite` máximo é 100')
    .default(20),
});
