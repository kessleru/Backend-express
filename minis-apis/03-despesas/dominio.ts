/**
 * Os tipos e o contrato do repositório. Conceito principal: módulo 08.
 *
 * Este arquivo não importa nada — nem Express, nem Zod, nem `node:sqlite`. É o
 * que permite trocar a implementação do repositório sem tocar no serviço.
 */

export type Categoria = { id: number; nome: string };

/**
 * O valor mora aqui em CENTAVOS, sempre. `12,34` é `1234`.
 *
 * Ponto flutuante não representa 0,1 exatamente: `0.1 + 0.2` dá
 * `0.30000000000000004`. Num extrato com centenas de lançamentos, esses
 * resíduos se acumulam e o fechamento do mês sai um centavo fora — todo mês,
 * sem ninguém achar de onde veio. Inteiro não tem resíduo: 10 + 20 é 30.
 *
 * A conversão reais → centavos acontece na borda HTTP (`rotas.ts`); daqui para
 * dentro, o número é inteiro e o nome do campo diz a unidade.
 */
export type Despesa = {
  id: number;
  descricao: string;
  valorCentavos: number;
  /** `YYYY-MM-DD` */
  data: string;
  /** `YYYY-MM` — derivado de `data`, é por onde o filtro mensal entra. */
  mes: string;
  categoriaId: number;
};

/** O que o `GET /despesas/:id` devolve: a despesa mais o nome da categoria. */
export type DespesaComCategoria = Despesa & { categoriaNome: string };

export type NovaDespesa = Omit<Despesa, 'id'>;

export type FiltroDespesas = {
  mes?: string | undefined;
  categoriaId?: number | undefined;
  pagina: number;
  limite: number;
};

/** Uma linha do relatório: um grupo do `GROUP BY`. */
export type TotalPorCategoria = {
  categoriaId: number;
  categoriaNome: string;
  totalCentavos: number;
  lancamentos: number;
};

/**
 * O contrato. O serviço depende DESTE tipo, não do arquivo que fala SQL.
 *
 * Os métodos são `async` mesmo com o `node:sqlite` sendo síncrono: a assinatura
 * precisa servir a um banco de rede (Postgres) sem que o serviço mude de forma.
 */
export type Repositorio = {
  listarCategorias(): Promise<Categoria[]>;
  buscarCategoriaPorId(id: number): Promise<Categoria | null>;
  buscarCategoriaPorNome(nome: string): Promise<Categoria | null>;
  criarCategoria(nome: string): Promise<Categoria>;

  listarDespesas(filtro: FiltroDespesas): Promise<{ itens: Despesa[]; total: number }>;
  buscarDespesaPorId(id: number): Promise<DespesaComCategoria | null>;
  criarDespesa(dados: NovaDespesa): Promise<Despesa>;
  removerDespesa(id: number): Promise<boolean>;

  totaisDoMes(mes: string): Promise<TotalPorCategoria[]>;
};
