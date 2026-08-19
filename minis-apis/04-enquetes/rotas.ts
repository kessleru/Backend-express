/**
 * A borda HTTP: lê a requisição, chama UM método do serviço, escolhe o status.
 * Conceitos principais: módulos 04 (roteamento) e 05 (middleware).
 *
 * É também o único arquivo que decide o formato do JSON de saída. O estado da
 * enquete, por exemplo, mora no banco como uma data que pode ser nula e sai
 * daqui como a palavra `aberta` ou `encerrada` — o cliente não deveria precisar
 * saber que "nulo quer dizer aberta" para desenhar uma tela.
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Enquete, EnqueteListada, Opcao } from './dominio.ts';
import type { Cedula, Resultado, Servico } from './servico.ts';
import {
  lerEleitor,
  lerFiltroEnquetes,
  lerId,
  lerNovaEnquete,
  lerVoto,
} from './validacao.ts';

const enqueteJson = (enquete: Enquete) => ({
  id: enquete.id,
  pergunta: enquete.pergunta,
  estado: enquete.encerradaEm === null ? 'aberta' : 'encerrada',
  criadaEm: enquete.criadaEm,
  encerradaEm: enquete.encerradaEm,
});

const listadaJson = (enquete: EnqueteListada) => ({
  ...enqueteJson(enquete),
  totalOpcoes: enquete.totalOpcoes,
  totalVotos: enquete.totalVotos,
});

const cedulaJson = (cedula: Cedula) => ({
  ...enqueteJson(cedula.enquete),
  opcoes: cedula.opcoes.map((opcao: Opcao) => ({ id: opcao.id, texto: opcao.texto })),
});

const resultadoJson = (resultado: Resultado) => ({
  ...enqueteJson(resultado.enquete),
  parcial: resultado.parcial,
  totalVotos: resultado.totalVotos,
  opcoes: resultado.opcoes.map((opcao) => ({
    id: opcao.opcaoId,
    texto: opcao.texto,
    votos: opcao.votos,
    percentual: opcao.percentual,
  })),
  vencedora: resultado.vencedora?.texto ?? null,
  empate: resultado.empate.map((opcao) => opcao.texto),
});

/**
 * Middleware de escopo de rota (módulo 05): resolve quem está votando antes de
 * qualquer handler de voto rodar.
 *
 * A identidade vem no cabeçalho `X-Eleitor` e não no corpo de propósito. Quem
 * vota é **contexto da requisição**, não campo do formulário: o mesmo corpo
 * `{ "opcaoId": 3 }` serve para qualquer pessoa, e é o remetente que muda. É o
 * mesmo lugar onde um token de autenticação entraria no módulo 11 — e a troca
 * seria só deste middleware, sem tocar em rota, serviço ou banco.
 *
 * Enquanto isso, a honestidade do modelo: o cabeçalho é DECLARADO, não provado.
 * Qualquer um manda outro nome e vota de novo. É enquete, não urna.
 */
function identificarEleitor(req: Request, res: Response, next: NextFunction) {
  // `lerEleitor` lança 422 se o cabeçalho faltar ou for curto demais. Com
  // autenticação de verdade este erro seria 401, porque aí a identidade seria
  // provada em vez de declarada — e "não provou" é uma recusa diferente de
  // "mandou um valor inválido".
  res.locals.eleitor = lerEleitor(req.get('X-Eleitor'));
  next();
}

/** `res.locals` é tipado como `any` pelo Express; o cast concentra a mentira
 *  numa linha só, em vez de espalhá-la por cada handler. */
const eleitorDe = (res: Response): string => res.locals.eleitor as string;

export function criarRotas(servico: Servico): Router {
  const router = Router();

  // Registrado ANTES das rotas de voto: middleware só roda no que vem depois
  // dele. Trocar esta linha de lugar com as duas rotas abaixo faz
  // `eleitorDe(res)` devolver `undefined`, e o voto ser gravado com o eleitor
  // vazio — sem erro nenhum, porque a coluna aceita texto.
  router.use('/enquetes/:id/votos', identificarEleitor);

  router.get('/enquetes', async (req, res) => {
    const filtro = lerFiltroEnquetes(req.query);
    const { itens, total } = await servico.listarEnquetes(filtro);
    res.json({
      pagina: filtro.pagina,
      limite: filtro.limite,
      total,
      itens: itens.map(listadaJson),
    });
  });

  router.post('/enquetes', async (req, res) => {
    const cedula = await servico.criarEnquete(lerNovaEnquete(req.body));
    res.status(201).location(`/enquetes/${cedula.enquete.id}`).json(cedulaJson(cedula));
  });

  // O filtro de estado é `?estado=abertas` e não uma rota `/enquetes/abertas`.
  // A segunda forma casaria com `/enquetes/:id` — e como o `:id` desta API é
  // numérico, `/enquetes/abertas` responderia 422 dizendo que "abertas" não é
  // um inteiro. Ordem de rota resolveria (módulo 04), mas ao custo de uma
  // palavra reservada que ninguém pode usar como id daqui para sempre.
  router.get('/enquetes/:id', async (req, res) => {
    res.json(cedulaJson(await servico.buscarCedula(lerId(req.params.id))));
  });

  router.delete('/enquetes/:id', async (req, res) => {
    await servico.removerEnquete(lerId(req.params.id));
    // 204 é "deu certo e não há corpo". Devolver a enquete apagada num 200
    // sugere que ela ainda existe em algum lugar.
    res.status(204).send();
  });

  // POST num sub-recurso, e não `PATCH /enquetes/:id` com `{ encerrada: true }`.
  // O PATCH genérico abriria a porta para editar qualquer campo — inclusive
  // reabrir a enquete escrevendo `false` — e espalharia a regra do encerramento
  // por um handler que aceita tudo. Encerrar é uma ação com regra própria: uma
  // vez só, sem volta.
  router.post('/enquetes/:id/encerramento', async (req, res) => {
    res.json(enqueteJson(await servico.encerrarEnquete(lerId(req.params.id))));
  });

  router.post('/enquetes/:id/votos', async (req, res) => {
    const { opcaoId } = lerVoto(req.body);
    const voto = await servico.votar(lerId(req.params.id), opcaoId, eleitorDe(res));
    res.status(201).json({
      id: voto.id,
      opcaoId: voto.opcaoId,
      eleitor: voto.eleitor,
      votadoEm: voto.votadoEm,
    });
  });

  // Sem `:eleitor` na URL: quem apaga é o dono do voto, identificado pelo mesmo
  // cabeçalho que o gravou. Um `/votos/ana@exemplo.com` deixaria qualquer um
  // apagar o voto de qualquer pessoa — e a URL, que vai para o log do servidor
  // e do proxy, carregaria o e-mail junto.
  router.delete('/enquetes/:id/votos', async (req, res) => {
    await servico.retirarVoto(lerId(req.params.id), eleitorDe(res));
    res.status(204).send();
  });

  router.get('/enquetes/:id/resultado', async (req, res) => {
    res.json(resultadoJson(await servico.resultado(lerId(req.params.id))));
  });

  return router;
}

// Nenhum try/catch neste arquivo: o Express 5 encaminha a rejeição de um
// handler `async` para o tratador central (módulo 06) sozinho. No Express 4 a
// promessa rejeitada era engolida e a requisição ficava pendurada — daí o
// `express-async-handler` que se vê em código antigo.
