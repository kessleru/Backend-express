/**
 * Os itens de uma lista — acrescentar, marcar como comprado, apagar.
 *
 * Nenhuma destas rotas exige ser dono: convidado que não pudesse riscar item
 * tornaria o convite inútil. Quem confere que você participa da lista é o
 * serviço, na mesma função que decide o 404.
 */
import { Router } from 'express';
import type { Servico } from '../servico.ts';
import { usuarioDe } from '../auth.ts';
import {
  alterarItemSchema,
  analisar,
  criarItemSchema,
  idSchema,
  idsItemSchema,
} from '../schemas.ts';

export function criarRotasItens(servico: Servico): Router {
  const router = Router();

  router.post('/listas/:id/itens', async (req, res) => {
    const { id } = analisar(idSchema, req.params);
    const dados = analisar(criarItemSchema, req.body ?? {});
    const item = await servico.acrescentarItem(id, usuarioDe(req).id, dados);
    res.status(201).json(item);
  });

  router.patch('/listas/:id/itens/:itemId', async (req, res) => {
    const { id, itemId } = analisar(idsItemSchema, req.params);
    const campos = analisar(alterarItemSchema, req.body ?? {});
    res.json(await servico.alterarItem(id, usuarioDe(req).id, itemId, campos));
  });

  router.delete('/listas/:id/itens/:itemId', async (req, res) => {
    const { id, itemId } = analisar(idsItemSchema, req.params);
    await servico.removerItem(id, usuarioDe(req).id, itemId);
    // 204 é "deu certo e não há corpo". Devolver o item apagado num 200 sugere
    // que ele ainda existe em algum lugar.
    res.status(204).send();
  });

  return router;
}
