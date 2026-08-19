/**
 * A montagem da borda HTTP: onde a fronteira entre público e protegido é
 * desenhada. Conceitos principais: módulos 04 (roteamento) e 05 (middlewares).
 *
 * A ordem das três linhas abaixo é o desenho de segurança inteiro desta API, e
 * dá para lê-lo sem abrir nenhum dos arquivos: `contas` fica antes do
 * `autenticar`, tudo o mais fica depois.
 */
import { Router } from 'express';
import type { Servico } from '../servico.ts';
import { autenticar } from '../auth.ts';
import { criarRotasContas } from './contas.ts';
import { criarRotasItens } from './itens.ts';
import { criarRotasListas } from './listas.ts';

export function criarRotas(servico: Servico): Router {
  const router = Router();

  router.use(criarRotasContas(servico));

  // `router.use` aplica o `autenticar` a tudo que for registrado DEPOIS desta
  // linha. Repetir o middleware rota a rota daria no mesmo até o dia em que
  // alguém acrescentasse a décima rota e esquecesse — e uma rota que esquece de
  // autenticar não quebra: ela responde, com os dados de outra pessoa, a quem
  // não mandou token nenhum. Aqui, esquecer significa registrar a rota nova no
  // lugar errado desta lista, que é um erro bem mais visível.
  router.use(autenticar);

  router.use(criarRotasListas(servico));
  router.use(criarRotasItens(servico));

  return router;
}

// Nenhum try/catch nos três arquivos: o Express 5 encaminha a rejeição de um
// handler `async` para o tratador central (módulo 06) sozinho. No Express 4 a
// promessa rejeitada era engolida e a requisição ficava pendurada — daí o
// `express-async-handler` que se vê em código antigo.
