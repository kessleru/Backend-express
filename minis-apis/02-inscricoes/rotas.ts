/**
 * As cinco rotas. O que sobrou dentro de cada handler é regra de negócio: o
 * formato já foi conferido pelos middlewares de `validar.ts` (módulos 04 e 07).
 */
import { Router, type Response } from 'express';
import {
  buscarEvento,
  comVagas,
  eventos,
  inscricoes,
  inscricoesDoEvento,
  proximoIdInscricao,
  vagasRestantes,
  type Inscricao,
} from './dados.ts';
import { conflito, naoEncontrado } from './erros.ts';
import { criarInscricaoSchema, idSchema, listarInscricoesSchema } from './schemas.ts';
import { validados, validar } from './validar.ts';

export const rotas = Router();

/**
 * Três rotas precisam do mesmo par "converte o `:id` e confirma que o evento
 * existe". Exige `validar(idSchema, 'params')` antes na cadeia — é de lá que
 * `validados` lê o id já convertido para número.
 */
function exigirEvento(res: Response) {
  const { id } = validados(res, idSchema, 'params');
  const evento = buscarEvento(id);
  if (!evento) throw naoEncontrado('Evento', id);
  return evento;
}

// A lista sempre leva `vagasRestantes` junto: é a única pergunta que quem abre a
// tela de inscrição realmente tem, e sem ela o cliente teria que buscar as
// inscrições de cada evento só para subtrair.
rotas.get('/eventos', (_req, res) => {
  res.json({ dados: eventos.map(comVagas) });
});

rotas.get('/eventos/:id', validar(idSchema, 'params'), (_req, res) => {
  res.json(comVagas(exigirEvento(res)));
});

/**
 * A inscrição. Os dois `validar` da cadeia já garantiram que o `:id` é um
 * inteiro e que o corpo tem nome e e-mail bem formados — o que sobra aqui são as
 * duas perguntas que NENHUM schema consegue responder, porque dependem do que já
 * está gravado e não do que chegou: ainda há vaga, e este e-mail já entrou?
 *
 * E elas são respondidas AQUI, uma linha antes da gravação. A tela que mostrou
 * "restam 3 vagas" respondeu a mesma pergunta cinco minutos atrás, com o dado
 * daquele momento; entre aquele número e este `push` cabe qualquer quantidade de
 * gente. Quem decide é sempre a última checagem antes de gravar.
 */
rotas.post(
  '/eventos/:id/inscricoes',
  validar(idSchema, 'params'),
  validar(criarInscricaoSchema),
  (_req, res) => {
    const evento = exigirEvento(res);
    const dados = validados(res, criarInscricaoSchema);

    if (vagasRestantes(evento) <= 0) {
      throw conflito(`O evento "${evento.nome}" está lotado`);
    }

    // Compara texto exato, e é por isso que o schema baixa o e-mail para
    // minúsculas: sem isso `Ana@exemplo.com` entra como segunda pessoa.
    const jaInscrito = inscricoesDoEvento(evento.id).some((i) => i.email === dados.email);
    if (jaInscrito) {
      throw conflito(`O e-mail ${dados.email} já está inscrito neste evento`);
    }

    const inscricao: Inscricao = {
      id: proximoIdInscricao(),
      eventoId: evento.id,
      ...dados,
      criadaEm: new Date().toISOString(),
    };
    inscricoes.push(inscricao);

    // `Location` é o cabeçalho que aponta para o recurso recém-criado: o cliente
    // guarda esse endereço para cancelar depois, sem precisar montar a URL.
    res.status(201).location(`/inscricoes/${inscricao.id}`).json(inscricao);
  },
);

rotas.get(
  '/eventos/:id/inscricoes',
  validar(idSchema, 'params'),
  validar(listarInscricoesSchema, 'query'),
  (_req, res) => {
    const evento = exigirEvento(res);
    const { pagina, limite, busca } = validados(res, listarInscricoesSchema, 'query');

    let lista = inscricoesDoEvento(evento.id);
    // A busca é aplicada ANTES do fatiamento. Filtrar depois devolveria uma
    // página com menos itens que o `limite` pedido — e páginas seguintes
    // aleatoriamente vazias, com o cliente achando que a lista acabou.
    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (i) => i.nome.toLowerCase().includes(termo) || i.email.includes(termo),
      );
    }

    const inicio = (pagina - 1) * limite;
    res.json({
      dados: lista.slice(inicio, inicio + limite),
      pagina,
      limite,
      // `total` e `totalPaginas` viajam junto porque sem eles o cliente não tem
      // como saber que chegou ao fim: teria que pedir a página seguinte e ver se
      // volta vazia — uma requisição inteira gasta para descobrir que não havia
      // nada. Também é o que permite desenhar "1 de 7" na tela.
      total: lista.length,
      totalPaginas: Math.max(1, Math.ceil(lista.length / limite)),
    });
  },
);

rotas.delete('/inscricoes/:id', validar(idSchema, 'params'), (_req, res) => {
  const { id } = validados(res, idSchema, 'params');
  const posicao = inscricoes.findIndex((i) => i.id === id);
  if (posicao === -1) throw naoEncontrado('Inscrição', id);

  inscricoes.splice(posicao, 1);

  // A vaga volta ao evento sem nenhuma linha aqui: `vagasRestantes` (dados.ts)
  // conta a lista toda vez em vez de manter um contador.
  //
  // 204 é "deu certo e não há o que mostrar" — devolver o objeto apagado
  // sugeriria que ele ainda existe. `.end()` porque corpo em 204 é descartado.
  res.status(204).end();
});
