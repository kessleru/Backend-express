/**
 * A borda HTTP: lê a requisição, chama UM método do serviço, escolhe o status.
 * Conceitos principais: módulos 04 (roteamento) e 07 (validação).
 */
import { Router } from 'express';
import { autenticar, usuarioAutenticado } from './autenticacao.ts';
import {
  analisar,
  credenciaisSchema,
  criarHabitoSchema,
  habitoParamsSchema,
  marcacaoParamsSchema,
  resumoQuerySchema,
} from './schemas.ts';
import type { Servico } from './servico.ts';

export function criarRotas(servico: Servico): Router {
  const router = Router();

  router.post('/usuarios', async (req, res) => {
    const { email, senha } = analisar(credenciaisSchema, req.body ?? {});
    const usuario = await servico.cadastrar(email, senha);
    res.status(201).json(usuario);
  });

  router.post('/sessoes', async (req, res) => {
    const { email, senha } = analisar(credenciaisSchema, req.body ?? {});
    res.json(await servico.entrar(email, senha));
  });

  // Todas as rotas de hábito exigem token, e o middleware é pendurado no
  // PREFIXO em vez de repetido rota a rota. A diferença aparece na rota que
  // ainda vai ser escrita: com a lista rota a rota, esquecer o `autenticar`
  // publica os hábitos de todo mundo e nada acusa; aqui o padrão de qualquer
  // caminho sob `/habitos` já é "protegido".
  router.use('/habitos', autenticar);

  router.get('/habitos', async (_req, res) => {
    res.json(await servico.listarHabitos(usuarioAutenticado(res)));
  });

  router.post('/habitos', async (req, res) => {
    const { nome } = analisar(criarHabitoSchema, req.body ?? {});
    const habito = await servico.criarHabito(usuarioAutenticado(res), nome);
    res.status(201).location(`/habitos/${habito.id}`).json(habito);
  });

  router.delete('/habitos/:id', async (req, res) => {
    const { id } = analisar(habitoParamsSchema, req.params);
    await servico.removerHabito(usuarioAutenticado(res), id);
    res.status(204).send();
  });

  router.put('/habitos/:id/marcacoes/:dia', async (req, res) => {
    const { id, dia } = analisar(marcacaoParamsSchema, req.params);
    await servico.marcarDia(usuarioAutenticado(res), id, dia);
    // 200 nas duas vezes, e nunca 201 na primeira: o par 201/200 contaria ao
    // cliente se o dia já estava lá — informação que ele não pediu e que quebra
    // a promessa do PUT de que as duas chamadas são a mesma chamada. O corpo é
    // o estado resultante, idêntico em qualquer repetição.
    res.json({ habitoId: id, dia, marcado: true });
  });

  router.delete('/habitos/:id/marcacoes/:dia', async (req, res) => {
    const { id, dia } = analisar(marcacaoParamsSchema, req.params);
    await servico.desmarcarDia(usuarioAutenticado(res), id, dia);
    res.status(204).send();
  });

  router.get('/habitos/:id/resumo', async (req, res) => {
    const { id } = analisar(habitoParamsSchema, req.params);
    const { mes } = analisar(resumoQuerySchema, req.query);
    res.json(await servico.resumo(usuarioAutenticado(res), id, mes));
  });

  return router;
}

// Nenhum try/catch neste arquivo: o Express 5 encaminha a rejeição de um
// handler `async` ao tratador central (módulo 06) sozinho.
