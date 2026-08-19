/**
 * As seis rotas. O formato já foi conferido pelos middlewares de `validar.ts`;
 * o que sobra dentro de cada handler é o que depende da agenda gravada — e é
 * exatamente por isso que sobra aqui (módulos 04 e 07).
 */
import { Router, type Response } from 'express';
import {
  buscarReserva,
  buscarSala,
  intervaloDoDia,
  proximoIdReserva,
  reservaQueChoca,
  reservas,
  reservasDaSala,
  salas,
  sobrepoe,
  type Reserva,
} from './dados.ts';
import { conflito, dadosInvalidos, naoEncontrado } from './erros.ts';
import {
  agendaSchema,
  criarReservaSchema,
  idSchema,
  problemasDoIntervalo,
  remarcarReservaSchema,
} from './schemas.ts';
import { validados, validar } from './validar.ts';

export const rotas = Router();

/** Exige `validar(idSchema, 'params')` antes na cadeia: é de lá que sai o id. */
function exigirSala(res: Response) {
  const { id } = validados(res, idSchema, 'params');
  const sala = buscarSala(id);
  if (!sala) throw naoEncontrado('Sala', id);
  return sala;
}

function exigirReserva(res: Response) {
  const { id } = validados(res, idSchema, 'params');
  const reserva = buscarReserva(id);
  if (!reserva) throw naoEncontrado('Reserva', id);
  return reserva;
}

/**
 * A mensagem do 409 nomeia a reserva que estava no caminho. Um "horário
 * indisponível" genérico obrigaria quem chamou a baixar a agenda inteira para
 * descobrir o que fazer com o pedido recusado.
 */
const mensagemDeChoque = (choque: Reserva) =>
  `O horário choca com a reserva ${choque.id}, de ${choque.inicio} a ${choque.fim}`;

rotas.get('/salas', (_req, res) => {
  res.json({ dados: salas });
});

rotas.get(
  '/salas/:id/reservas',
  validar(idSchema, 'params'),
  validar(agendaSchema, 'query'),
  (_req, res) => {
    const sala = exigirSala(res);
    const { data, pagina, limite } = validados(res, agendaSchema, 'query');

    let lista = reservasDaSala(sala.id);
    if (data) {
      const dia = intervaloDoDia(data);
      lista = lista.filter((r) =>
        sobrepoe(Date.parse(r.inicio), Date.parse(r.fim), dia.inicio, dia.fim),
      );
    }

    // Agenda se lê em ordem de horário, e a ordem de criação não é a de
    // horário: basta alguém remarcar uma reserva para a lista sair embaralhada.
    //
    // Comparar como TEXTO só funciona porque todo instante foi gravado na mesma
    // forma canônica em UTC. Guardando o fuso de quem pediu,
    // `2026-08-19T08:00:00-06:00` (14:00Z) viria antes de
    // `2026-08-19T09:00:00-03:00` (12:00Z) — ordem alfabética certa, agenda
    // errada.
    lista.sort((a, b) => a.inicio.localeCompare(b.inicio));

    const inicio = (pagina - 1) * limite;
    res.json({
      sala: sala.nome,
      dados: lista.slice(inicio, inicio + limite),
      pagina,
      limite,
      total: lista.length,
      totalPaginas: Math.max(1, Math.ceil(lista.length / limite)),
    });
  },
);

/**
 * A reserva. O schema já garantiu tudo que dá para saber lendo o corpo — par na
 * ordem certa, duração dentro do teto, expediente. Sobra a única pergunta que
 * nenhum schema responde, porque depende do que já está gravado: este intervalo
 * encosta em algum outro desta sala?
 *
 * E ela é respondida AQUI, uma linha antes do `push`, não na tela que mostrou a
 * sala livre — aquela foi uma fotografia de alguns minutos atrás. Entre a foto
 * e a gravação cabe qualquer quantidade de gente; quem decide é quem grava.
 *
 * Duas requisições simultâneas não se atropelam porque isto é um processo só e
 * não há nenhum `await` entre a checagem e o `push`: nada roda no meio. Essa
 * garantia é de graça aqui e some com banco e dois processos, onde o assunto
 * vira transação (módulo 09).
 */
rotas.post(
  '/salas/:id/reservas',
  validar(idSchema, 'params'),
  validar(criarReservaSchema),
  (_req, res) => {
    const sala = exigirSala(res);
    const dados = validados(res, criarReservaSchema);

    const inicioMs = Date.parse(dados.inicio);
    const fimMs = Date.parse(dados.fim);

    const choque = reservaQueChoca(sala.id, inicioMs, fimMs);
    if (choque) throw conflito(mensagemDeChoque(choque));

    const reserva: Reserva = {
      id: proximoIdReserva(),
      salaId: sala.id,
      titulo: dados.titulo,
      responsavel: dados.responsavel,
      // Gravar em UTC normaliza o instante: `14:00-03:00` e `17:00Z` são o
      // mesmo momento e viram o mesmo texto. Guardar a string como ela chegou
      // custaria duas coisas — comparar horários exigiria converter tudo a cada
      // leitura, e ordenar por texto mentiria (ver o `sort` da agenda). O preço
      // é que a resposta volta em UTC, e quem exibe converte para o fuso de
      // quem lê.
      inicio: new Date(inicioMs).toISOString(),
      fim: new Date(fimMs).toISOString(),
      criadaEm: new Date().toISOString(),
    };
    reservas.push(reserva);

    // `Location` é o cabeçalho que aponta para o recurso recém-criado: o cliente
    // guarda o endereço para remarcar ou cancelar sem montar a URL na mão.
    res.status(201).location(`/reservas/${reserva.id}`).json(reserva);
  },
);

rotas.get('/reservas/:id', validar(idSchema, 'params'), (_req, res) => {
  res.json(exigirReserva(res));
});

/**
 * A remarcação. É aqui que o par `inicio`/`fim` existe inteiro pela primeira
 * vez: quem manda só `fim` está pedindo para comparar o `fim` novo com o
 * `inicio` que já está gravado, e o schema não enxerga o que está gravado (ver
 * `remarcarReservaSchema`).
 *
 * Por isso a ordem destas linhas é a regra: primeiro junta, depois confere o
 * par (422), depois confere a agenda (409), e só então grava. Conferir antes de
 * juntar aceitaria "das 15h às 09h" desde que os dois campos não viessem no
 * mesmo pedido.
 */
rotas.patch(
  '/reservas/:id',
  validar(idSchema, 'params'),
  validar(remarcarReservaSchema),
  (_req, res) => {
    const reserva = exigirReserva(res);
    const mudancas = validados(res, remarcarReservaSchema);

    const inicioMs = Date.parse(mudancas.inicio ?? reserva.inicio);
    const fimMs = Date.parse(mudancas.fim ?? reserva.fim);

    const problemas = problemasDoIntervalo(inicioMs, fimMs);
    if (problemas.length > 0) throw dadosInvalidos(problemas);

    // A própria reserva sai da conta de choque — senão ela seria seu próprio
    // conflito (`reservaQueChoca`, em `dados.ts`).
    const choque = reservaQueChoca(reserva.salaId, inicioMs, fimMs, reserva.id);
    if (choque) throw conflito(mensagemDeChoque(choque));

    if (mudancas.titulo !== undefined) reserva.titulo = mudancas.titulo;
    reserva.inicio = new Date(inicioMs).toISOString();
    reserva.fim = new Date(fimMs).toISOString();

    res.json(reserva);
  },
);

rotas.delete('/reservas/:id', validar(idSchema, 'params'), (_req, res) => {
  const reserva = exigirReserva(res);
  reservas.splice(reservas.indexOf(reserva), 1);

  // O horário volta a ficar livre sem nenhuma linha aqui: "livre" não é um
  // campo, é o que sobra quando não há reserva cobrindo aquele instante.
  //
  // 204 é "deu certo e não há o que mostrar" — devolver a reserva apagada
  // sugeriria que ela ainda existe. `.end()` porque corpo em 204 é descartado.
  res.status(204).end();
});
