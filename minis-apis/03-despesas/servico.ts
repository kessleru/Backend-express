/**
 * As regras de negócio. Conceito principal: módulo 08.
 *
 * Este arquivo não conhece `req`, `res` nem status HTTP — quem traduz é
 * `rotas.ts` — e não conhece SQL — quem guarda é `repositorio.ts`. Ele recebe o
 * repositório como argumento em vez de importá-lo: é injeção de dependência sem
 * framework nenhum, e é o que permite testar as regras sem subir banco.
 */
import type {
  Categoria,
  Despesa,
  DespesaComCategoria,
  FiltroDespesas,
  NovaDespesa,
  Repositorio,
  TotalPorCategoria,
} from './dominio.ts';
import { conflito, naoEncontrado } from './erros.ts';

/** `mes` não vem do cliente: é derivado da data, aqui. */
export type EntradaDespesa = Omit<NovaDespesa, 'mes'>;

export type RelatorioMensal = {
  mes: string;
  categorias: TotalPorCategoria[];
  totalCentavos: number;
};

export function criarServico(repositorio: Repositorio) {
  return {
    async listarCategorias(): Promise<Categoria[]> {
      return repositorio.listarCategorias();
    },

    async criarCategoria(nome: string): Promise<Categoria> {
      // Regra de negócio, não formato: só dá para responder consultando o que
      // já está gravado, e por isso o Zod não tem como cobrir isto. O nome
      // repetido é 409 — o corpo está correto, o estado atual é que recusa.
      const existente = await repositorio.buscarCategoriaPorNome(nome);
      if (existente)
        throw conflito(`Já existe uma categoria chamada "${existente.nome}"`);

      return repositorio.criarCategoria(nome);
    },

    async listarDespesas(filtro: FiltroDespesas) {
      return repositorio.listarDespesas(filtro);
    },

    async buscarDespesa(id: number): Promise<DespesaComCategoria> {
      const despesa = await repositorio.buscarDespesaPorId(id);
      // O serviço lança em vez de devolver `null` para o chamador decidir:
      // assim a decisão "despesa ausente é 404" fica num lugar só.
      if (!despesa) throw naoEncontrado('Despesa', id);
      return despesa;
    },

    async criarDespesa(dados: EntradaDespesa): Promise<Despesa> {
      // 404 e não 422: `categoriaId: 99` é um inteiro perfeitamente válido — o
      // formato está certo. O que não existe é o recurso apontado, e é isso que
      // o 404 diz. A checagem serve para dar essa mensagem; quem de fato impede
      // a linha órfã é a chave estrangeira, porque entre este SELECT e o INSERT
      // cabe uma requisição concorrente apagando a categoria.
      const categoria = await repositorio.buscarCategoriaPorId(dados.categoriaId);
      if (!categoria) throw naoEncontrado('Categoria', dados.categoriaId);

      // O mês é derivado da data num lugar só. Guardá-lo em coluna é
      // redundância assumida: paga um pedaço de escrita e compra um índice
      // simples para o filtro que a API usa o tempo todo.
      return repositorio.criarDespesa({ ...dados, mes: dados.data.slice(0, 7) });
    },

    async removerDespesa(id: number): Promise<void> {
      const removeu = await repositorio.removerDespesa(id);
      if (!removeu) throw naoEncontrado('Despesa', id);
    },

    async relatorioMensal(mes: string): Promise<RelatorioMensal> {
      const categorias = await repositorio.totaisDoMes(mes);

      // Somar os grupos aqui não contradiz "a soma é do banco": o que era caro
      // já foi feito lá, sobre todos os lançamentos do mês. O que chegou são
      // poucas linhas — uma por categoria — e somá-las custa nada.
      const totalCentavos = categorias.reduce(
        (soma, item) => soma + item.totalCentavos,
        0,
      );

      return { mes, categorias, totalCentavos };
    },
  };
}

export type Servico = ReturnType<typeof criarServico>;
