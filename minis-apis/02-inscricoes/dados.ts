/**
 * O "banco": dois arrays em memória, com três eventos fixos como dado inicial.
 * Tudo se perde quando o processo cai — persistência é a mini API 3 (módulo 09).
 */
import type { CriarInscricao } from './schemas.ts';

export type Evento = {
  id: number;
  nome: string;
  data: string;
  local: string;
  /** O teto de vagas. Nunca muda: quem varia é o número de inscritos. */
  vagas: number;
};

/**
 * Os campos que a pessoa preenche vêm do schema, não são redigitados aqui: o
 * `CriarInscricao` já é o tipo que sai da validação. Declarar `nome` e `email`
 * de novo criaria duas verdades sobre o mesmo dado, e a segunda envelhece no dia
 * em que um campo novo entra no formulário.
 */
export type Inscricao = CriarInscricao & {
  id: number;
  eventoId: number;
  criadaEm: string;
};

export const eventos: Evento[] = [
  {
    id: 1,
    nome: 'Workshop de Node.js na prática',
    data: '2026-09-12',
    local: 'Auditório A',
    vagas: 40,
  },
  {
    id: 2,
    nome: 'Oficina de TypeScript para quem já sabe JavaScript',
    data: '2026-09-19',
    local: 'Sala 12',
    vagas: 25,
  },
  // Duas vagas e duas inscrições no dado inicial: este evento já nasce lotado,
  // e é ele que torna o 409 de "sem vagas" testável com um `curl` só.
  {
    id: 3,
    nome: 'Mesa-redonda: carreira em backend',
    data: '2026-09-26',
    local: 'Sala 3',
    vagas: 2,
  },
];

export const inscricoes: Inscricao[] = [
  {
    id: 1,
    eventoId: 1,
    nome: 'Ana Ribeiro',
    email: 'ana.ribeiro@exemplo.com',
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 2,
    eventoId: 1,
    nome: 'Bruno Tavares',
    email: 'bruno.tavares@exemplo.com',
    telefone: '11 98888-1010',
    criadaEm: '2026-08-02T14:30:00.000Z',
  },
  {
    id: 3,
    eventoId: 3,
    nome: 'Carla Nunes',
    email: 'carla.nunes@exemplo.com',
    criadaEm: '2026-08-03T10:15:00.000Z',
  },
  {
    id: 4,
    eventoId: 3,
    nome: 'Diego Prado',
    email: 'diego.prado@exemplo.com',
    criadaEm: '2026-08-04T11:45:00.000Z',
  },
];

let proximoId = inscricoes.length + 1;

export const proximoIdInscricao = () => proximoId++;

export const buscarEvento = (id: number) => eventos.find((e) => e.id === id);

export const inscricoesDoEvento = (eventoId: number) =>
  inscricoes.filter((i) => i.eventoId === eventoId);

/**
 * Vaga restante é CALCULADA, não guardada.
 *
 * O caminho natural seria um campo `vagasRestantes` no evento, decrementado na
 * inscrição e incrementado no cancelamento. Ele é mais rápido de ler e tem um
 * defeito que só aparece em produção: são duas verdades sobre o mesmo fato. Uma
 * exceção no meio do `DELETE`, um `push` esquecido num caminho novo, e o
 * contador diz 3 enquanto a lista tem 5 nomes — e ninguém consegue dizer qual
 * dos dois está certo. Derivando da lista, cancelar já devolve a vaga sem
 * nenhuma linha a mais, e divergir fica impossível.
 *
 * O custo é uma varredura por chamada, aceitável enquanto os dados cabem na
 * memória. Com banco, essa conta vira um `COUNT` (módulo 09).
 */
export const vagasRestantes = (evento: Evento) =>
  evento.vagas - inscricoesDoEvento(evento.id).length;

export const comVagas = (evento: Evento) => ({
  ...evento,
  vagasRestantes: vagasRestantes(evento),
});
