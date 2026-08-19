/**
 * As listas e quem participa delas. É onde a autorização aparece.
 */
import { Router } from 'express';
import type { Servico } from '../servico.ts';
import { exigirDono, usuarioDe } from '../auth.ts';
import { analisar, convidarSchema, criarListaSchema, idSchema } from '../schemas.ts';

export function criarRotasListas(servico: Servico): Router {
  const router = Router();
  const soODono = exigirDono(servico);

  router.get('/listas', async (req, res) => {
    res.json(await servico.listarMinhasListas(usuarioDe(req).id));
  });

  router.post('/listas', async (req, res) => {
    const { nome } = analisar(criarListaSchema, req.body ?? {});
    const lista = await servico.criarLista(nome, usuarioDe(req).id);
    res.status(201).location(`/listas/${lista.id}`).json(lista);
  });

  router.get('/listas/:id', async (req, res) => {
    const { id } = analisar(idSchema, req.params);
    res.json(await servico.verLista(id, usuarioDe(req).id));
  });

  // A autorização entra entre o roteamento e o handler: dá para ler quem pode
  // usar cada rota sem abrir o serviço. Esta é a única rota da API com dois
  // middlewares, e a única que responde 403.
  router.post('/listas/:id/membros', soODono, async (req, res) => {
    const { id } = analisar(idSchema, req.params);
    const { email } = analisar(convidarSchema, req.body ?? {});
    res.status(201).json(await servico.convidar(id, email));
  });

  return router;
}
