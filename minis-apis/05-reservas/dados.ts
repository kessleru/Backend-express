/**
 * O "banco": dois arrays em memória, com três salas fixas como dado inicial, e
 * as contas de tempo que a agenda usa. Tudo se perde quando o processo cai —
 * persistir é o módulo 09.
 */
import { AGENDA, type CriarReserva } from './schemas.ts';

export type Sala = {
  id: number;
  nome: string;
  /** Quantas pessoas cabem. A API não confere — ver o README. */
  capacidade: number;
};

// Os campos que quem reserva preenche vêm do schema, não são redigitados aqui
// (mesma escolha da mini 02: duas declarações do mesmo dado viram duas
// verdades, e a segunda envelhece).
export type Reserva = CriarReserva & {
  id: number;
  salaId: number;
  criadaEm: string;
};

export const salas: Sala[] = [
  { id: 1, nome: 'Sala Ipê', capacidade: 6 },
  { id: 2, nome: 'Sala Jacarandá', capacidade: 14 },
  { id: 3, nome: 'Auditório Pau-Brasil', capacidade: 60 },
];

/**
 * As duas primeiras se encostam de propósito: uma termina 13:00Z e a outra
 * começa 13:00Z (10h e 11h no relógio do prédio). Elas coexistem, e é o dado
 * inicial que prova que o fim do intervalo fica de fora da conta — sem isso a
 * regra viraria promessa de README.
 *
 * Os instantes são gravados em UTC (o `Z` no fim), inclusive os que chegam como
 * `-03:00`: ver `POST /salas/:id/reservas` em `rotas.ts`.
 */
export const reservas: Reserva[] = [
  {
    id: 1,
    salaId: 1,
    titulo: 'Daily do time de produto',
    responsavel: 'Ana Ribeiro',
    inicio: '2026-08-19T12:00:00.000Z',
    fim: '2026-08-19T13:00:00.000Z',
    criadaEm: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 2,
    salaId: 1,
    titulo: 'Entrevista — vaga de suporte',
    responsavel: 'Bruno Tavares',
    inicio: '2026-08-19T13:00:00.000Z',
    fim: '2026-08-19T14:00:00.000Z',
    criadaEm: '2026-08-11T09:30:00.000Z',
  },
  {
    id: 3,
    salaId: 2,
    titulo: 'Treinamento de atendimento',
    responsavel: 'Carla Nunes',
    inicio: '2026-08-19T17:00:00.000Z',
    fim: '2026-08-19T19:00:00.000Z',
    criadaEm: '2026-08-12T15:00:00.000Z',
  },
];

let proximoId = reservas.length + 1;

export const proximoIdReserva = () => proximoId++;

export const buscarSala = (id: number) => salas.find((s) => s.id === id);

export const buscarReserva = (id: number) => reservas.find((r) => r.id === id);

export const reservasDaSala = (salaId: number) =>
  reservas.filter((r) => r.salaId === salaId);

/**
 * A conta que a agenda inteira usa: dois intervalos `[a, b)` e `[c, d)` se
 * sobrepõem quando `a < d` E `c < b`.
 *
 * A tentação é enumerar os casos — "começa antes e termina dentro", "engole o
 * outro inteiro", "cabe dentro dele", "começa dentro e termina depois" — e é
 * justamente aí que se esquece um, quase sempre o do intervalo que engole o
 * outro. As duas comparações cobrem os quatro de uma vez, porque dizem outra
 * coisa: "cada um começa antes de o outro terminar". Se A começa depois de B
 * terminar, ou B começa depois de A terminar, não há choque; qualquer outra
 * situação é choque.
 *
 * As comparações são `<` e não `<=`, e é essa escolha de um caractere que faz o
 * intervalo ser semiaberto: a reserva das 10h às 11h e a das 11h às 12h têm
 * `a < d` verdadeiro e `c < b` FALSO (11h não é menor que 11h), então passam. Com
 * `<=`, toda reserva bloquearia o instante seguinte e duas reuniões nunca
 * poderiam se encostar.
 */
export const sobrepoe = (aInicio: number, aFim: number, bInicio: number, bFim: number) =>
  aInicio < bFim && bInicio < aFim;

/**
 * A primeira reserva da sala que choca com o intervalo pedido, ou `undefined`.
 *
 * `ignorarId` existe para a remarcação: sem ele, encurtar a reserva 2 acharia a
 * própria reserva 2 no caminho e responderia 409 "a sala já está reservada" —
 * apontando para a reserva que a pessoa está justamente mudando. Nenhum horário
 * seria remarcável, e a mensagem não daria nenhuma pista do porquê.
 */
export function reservaQueChoca(
  salaId: number,
  inicioMs: number,
  fimMs: number,
  ignorarId?: number,
) {
  return reservasDaSala(salaId).find(
    (r) =>
      r.id !== ignorarId &&
      sobrepoe(inicioMs, fimMs, Date.parse(r.inicio), Date.parse(r.fim)),
  );
}

/**
 * O dia `2026-08-19` convertido no intervalo de instantes que ele ocupa.
 *
 * "Dia" só vira instante quando alguém diz de onde: a meia-noite do prédio
 * acontece três horas depois da meia-noite em UTC. Por isso o deslocamento do
 * fuso é SUBTRAÍDO — o relógio de parede marca 00:00 quando o instante em UTC
 * já é 03:00. Com o sinal trocado, a agenda do dia 19 mostraria as reservas da
 * madrugada do dia 20 e esconderia as do fim da tarde do 19.
 *
 * O resultado é um intervalo, e é por isso que o filtro da agenda reaproveita
 * `sobrepoe` em vez de comparar datas em texto: a pergunta "esta reserva
 * aparece no dia 19?" é a mesma pergunta de choque, com o dia no lugar da outra
 * reserva.
 */
export function intervaloDoDia(data: string) {
  const inicio = Date.parse(`${data}T00:00:00Z`) - AGENDA.deslocamentoDoFusoMs;
  return { inicio, fim: inicio + 24 * 60 * 60 * 1000 };
}
