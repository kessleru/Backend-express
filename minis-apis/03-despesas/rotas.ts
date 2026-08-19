/**
 * A borda HTTP: lê a requisição, chama UM método do serviço, escolhe o status.
 * Conceitos principais: módulos 04 (roteamento) e 07 (validação).
 *
 * É também a fronteira do dinheiro: daqui para dentro tudo é centavo inteiro,
 * daqui para fora tudo é real. As duas conversões acontecem neste arquivo e em
 * nenhum outro — espalhá-las é como se perde a garantia do inteiro.
 */
import { Router } from 'express';
import type { Despesa, DespesaComCategoria } from './dominio.ts';
import type { RelatorioMensal, Servico } from './servico.ts';
import {
  analisar,
  criarCategoriaSchema,
  criarDespesaSchema,
  idSchema,
  listarDespesasSchema,
  relatorioMensalSchema,
} from './schemas.ts';

/** `12.34` → `1234`. O `Math.round` cobre o resíduo de `12.34 * 100`, que em
 *  ponto flutuante dá `1233.9999999999998` — sem ele, um centavo evapora. */
const reaisParaCentavos = (reais: number): number => Math.round(reais * 100);

/** `1234` → `12.34`. Uma única divisão, no último instante antes do JSON: o
 *  número aproximado nunca volta a ser somado com outro. */
const centavosParaReais = (centavos: number): number => centavos / 100;

const despesaJson = (despesa: Despesa) => ({
  id: despesa.id,
  descricao: despesa.descricao,
  valor: centavosParaReais(despesa.valorCentavos),
  data: despesa.data,
  mes: despesa.mes,
  categoriaId: despesa.categoriaId,
});

const despesaComCategoriaJson = (despesa: DespesaComCategoria) => ({
  ...despesaJson(despesa),
  categoria: despesa.categoriaNome,
});

const relatorioJson = (relatorio: RelatorioMensal) => ({
  mes: relatorio.mes,
  totalGeral: centavosParaReais(relatorio.totalCentavos),
  categorias: relatorio.categorias.map((item) => ({
    categoriaId: item.categoriaId,
    categoria: item.categoriaNome,
    total: centavosParaReais(item.totalCentavos),
    lancamentos: item.lancamentos,
  })),
});

export function criarRotas(servico: Servico): Router {
  const router = Router();

  router.get('/categorias', async (_req, res) => {
    res.json(await servico.listarCategorias());
  });

  router.post('/categorias', async (req, res) => {
    const { nome } = analisar(criarCategoriaSchema, req.body ?? {});
    const categoria = await servico.criarCategoria(nome);
    res.status(201).json(categoria);
  });

  router.get('/despesas', async (req, res) => {
    const filtro = analisar(listarDespesasSchema, req.query);
    const { itens, total } = await servico.listarDespesas({
      mes: filtro.mes,
      categoriaId: filtro.categoria,
      pagina: filtro.pagina,
      limite: filtro.limite,
    });

    // A resposta paginada leva `total` junto: sem ele o cliente não tem como
    // saber se existe página seguinte a não ser pedindo e recebendo vazio.
    res.json({
      pagina: filtro.pagina,
      limite: filtro.limite,
      total,
      itens: itens.map(despesaJson),
    });
  });

  router.post('/despesas', async (req, res) => {
    const dados = analisar(criarDespesaSchema, req.body ?? {});
    const despesa = await servico.criarDespesa({
      descricao: dados.descricao,
      valorCentavos: reaisParaCentavos(dados.valor),
      data: dados.data,
      categoriaId: dados.categoriaId,
    });
    res.status(201).location(`/despesas/${despesa.id}`).json(despesaJson(despesa));
  });

  router.get('/despesas/:id', async (req, res) => {
    const { id } = analisar(idSchema, req.params);
    res.json(despesaComCategoriaJson(await servico.buscarDespesa(id)));
  });

  router.delete('/despesas/:id', async (req, res) => {
    const { id } = analisar(idSchema, req.params);
    await servico.removerDespesa(id);
    // 204 é "deu certo e não há corpo". Devolver a despesa apagada num 200
    // sugere que ela ainda existe em algum lugar.
    res.status(204).send();
  });

  router.get('/relatorios/mensal', async (req, res) => {
    const { mes } = analisar(relatorioMensalSchema, req.query);
    res.json(relatorioJson(await servico.relatorioMensal(mes)));
  });

  return router;
}

// Nenhum try/catch neste arquivo: o Express 5 encaminha a rejeição de um
// handler `async` para o tratador central (módulo 06) sozinho. No Express 4 a
// promessa rejeitada era engolida e a requisição ficava pendurada — daí o
// `express-async-handler` que se vê em código antigo.
