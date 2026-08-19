/**
 * As duas únicas rotas abertas da API: criar conta e entrar.
 *
 * Elas estão num arquivo separado porque são a exceção — todo o resto exige
 * token. Um arquivo só para as rotas públicas transforma "o que é público aqui?"
 * numa pergunta respondida por `ls`.
 */
import { Router } from 'express';
import type { Servico } from '../servico.ts';
import { analisar, credenciaisSchema } from '../schemas.ts';

export function criarRotasContas(servico: Servico): Router {
  const router = Router();

  router.post('/usuarios', async (req, res) => {
    const { email, senha } = analisar(credenciaisSchema, req.body ?? {});
    res.status(201).json(await servico.cadastrar(email, senha));
  });

  // "Sessões" e não "login": criar uma sessão é criar um recurso, e é isso que
  // um POST faz. O nome também deixa o caminho pronto para o dia em que
  // encerrá-la for `DELETE /sessoes`.
  router.post('/sessoes', async (req, res) => {
    const { email, senha } = analisar(credenciaisSchema, req.body ?? {});
    res.json(await servico.entrar(email, senha));
  });

  return router;
}
