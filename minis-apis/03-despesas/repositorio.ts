/**
 * O ÚNICO arquivo que escreve SQL. Conceito principal: módulos 08 e 09.
 *
 * Serviço e rotas conversam com o tipo `Repositorio` (em `dominio.ts`) e não
 * sabem que existe SQLite do outro lado. Trocar este arquivo por um sobre
 * Postgres não muda uma linha das outras camadas.
 *
 * Aqui também mora a tradução entre os dois vocabulários: o banco fala
 * `snake_case` (`valor_centavos`), o resto do sistema fala `camelCase`.
 */
import type { DatabaseSync } from 'node:sqlite';
import type {
  Categoria,
  Despesa,
  FiltroDespesas,
  NovaDespesa,
  Repositorio,
  TotalPorCategoria,
} from './dominio.ts';

type LinhaDespesa = {
  id: number;
  descricao: string;
  valor_centavos: number;
  data: string;
  mes: string;
  categoria_id: number;
};

const paraDespesa = (linha: LinhaDespesa): Despesa => ({
  id: linha.id,
  descricao: linha.descricao,
  valorCentavos: linha.valor_centavos,
  data: linha.data,
  mes: linha.mes,
  categoriaId: linha.categoria_id,
});

export function criarRepositorioSqlite(db: DatabaseSync): Repositorio {
  // `prepare` compila o SQL. Preparar uma vez, na abertura, e reusar o
  // statement evita recompilar a mesma query a cada requisição.
  const stmtCategorias = db.prepare('SELECT * FROM categorias ORDER BY nome');
  const stmtCategoriaPorId = db.prepare('SELECT * FROM categorias WHERE id = ?');
  const stmtCategoriaPorNome = db.prepare(
    // O `COLLATE NOCASE` tem que estar aqui também, e não só no índice: é ele
    // que faz a busca por "lazer" encontrar "Lazer" e o serviço responder 409
    // em vez de deixar o INSERT estourar lá na frente.
    'SELECT * FROM categorias WHERE nome = ? COLLATE NOCASE',
  );
  const stmtInserirCategoria = db.prepare('INSERT INTO categorias (nome) VALUES (?)');

  const stmtDespesaPorId = db.prepare('SELECT * FROM despesas WHERE id = ?');
  const stmtInserirDespesa = db.prepare(
    `INSERT INTO despesas (descricao, valor_centavos, data, mes, categoria_id)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const stmtRemoverDespesa = db.prepare('DELETE FROM despesas WHERE id = ?');

  return {
    async listarCategorias() {
      return stmtCategorias.all() as Categoria[];
    },

    async buscarCategoriaPorId(id) {
      return (stmtCategoriaPorId.get(id) as Categoria | undefined) ?? null;
    },

    async buscarCategoriaPorNome(nome) {
      return (stmtCategoriaPorNome.get(nome.trim()) as Categoria | undefined) ?? null;
    },

    async criarCategoria(nome) {
      const { lastInsertRowid } = stmtInserirCategoria.run(nome);
      // Reler a linha em vez de montar `{ id, nome }` na mão: o que volta é o
      // que o banco realmente gravou, com defaults e CHECKs já aplicados.
      return stmtCategoriaPorId.get(Number(lastInsertRowid)) as Categoria;
    },

    async listarDespesas(filtro: FiltroDespesas) {
      const { where, valores } = montarWhere(filtro);

      // A contagem total é uma segunda query com o MESMO WHERE — é ela que
      // permite ao cliente saber quantas páginas existem. Contar no
      // JavaScript exigiria trazer todas as linhas, que é o que a paginação
      // existe para evitar.
      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM despesas ${where}`)
        .get(...valores) as { total: number };

      const linhas = db
        .prepare(
          `SELECT * FROM despesas ${where}
            ORDER BY data DESC, id DESC
            LIMIT ? OFFSET ?`,
        )
        // LIMIT e OFFSET também entram por `?`. Eles vêm de `?pagina=` e
        // `?limite=`, ou seja, do cliente — não há valor "seguro por ser
        // número" antes de o Zod ter dito que é número.
        .all(...valores, filtro.limite, (filtro.pagina - 1) * filtro.limite);

      return { itens: (linhas as LinhaDespesa[]).map(paraDespesa), total };
    },

    async buscarDespesaPorId(id) {
      // JOIN: puxa o nome que mora na outra tabela. Sem ele o cliente receberia
      // `categoriaId: 3` e precisaria de uma segunda requisição para descobrir
      // que 3 é "Moradia" — e a economia de guardar o nome num lugar só viraria
      // custo na leitura.
      const linha = db
        .prepare(
          `SELECT d.*, c.nome AS categoria_nome
             FROM despesas d
             JOIN categorias c ON c.id = d.categoria_id
            WHERE d.id = ?`,
        )
        .get(id) as (LinhaDespesa & { categoria_nome: string }) | undefined;

      if (!linha) return null;
      return { ...paraDespesa(linha), categoriaNome: linha.categoria_nome };
    },

    async criarDespesa(dados: NovaDespesa) {
      const { lastInsertRowid } = stmtInserirDespesa.run(
        dados.descricao,
        dados.valorCentavos,
        dados.data,
        dados.mes,
        dados.categoriaId,
      );
      return paraDespesa(stmtDespesaPorId.get(Number(lastInsertRowid)) as LinhaDespesa);
    },

    async removerDespesa(id) {
      // `changes` diz quantas linhas o DELETE atingiu. Zero significa "esse id
      // não existe" sem precisar de um SELECT antes.
      return stmtRemoverDespesa.run(id).changes > 0;
    },

    /**
     * O relatório: a pergunta "quanto gastei em agosto, por categoria" escrita
     * em SQL. `GROUP BY` junta as linhas que têm a mesma categoria num grupo só,
     * e `SUM` devolve um número por grupo — a soma acontece no banco, ao lado do
     * dado, e o que viaja pela rede são as cinco linhas do resultado, não os
     * cinquenta mil lançamentos que as originaram.
     *
     * O JOIN é interno de propósito: categoria sem gasto no mês fica de fora do
     * relatório. Para incluí-la com total zero seria `categorias LEFT JOIN
     * despesas` — e aí o `WHERE d.mes = ?` teria que migrar para o `ON`, porque
     * no WHERE ele descarta as linhas nulas e transforma o LEFT em INNER de
     * novo, silenciosamente.
     */
    async totaisDoMes(mes: string) {
      // Aqui a tradução de vocabulário está no próprio SELECT, em `AS`: como
      // nenhuma coluna precisa de conversão de tipo, apelidar já entrega a
      // linha no formato de `TotalPorCategoria` e dispensa a função de mapa.
      return db
        .prepare(
          `SELECT c.id   AS categoriaId,
                  c.nome AS categoriaNome,
                  SUM(d.valor_centavos) AS totalCentavos,
                  COUNT(*)              AS lancamentos
             FROM despesas d
             JOIN categorias c ON c.id = d.categoria_id
            WHERE d.mes = ?
            GROUP BY c.id, c.nome
            ORDER BY totalCentavos DESC`,
        )
        .all(mes) as TotalPorCategoria[];
    },
  };
}

/**
 * O WHERE opcional — o lugar onde a concatenação de valor tenta entrar.
 *
 * O que é montado com template string são os PEDAÇOS de SQL, que são texto
 * escrito por nós e nunca vêm do cliente. Os VALORES saem em `valores` e entram
 * por `?`, sempre. Um `WHERE mes = '${filtro.mes}'` funcionaria hoje e daria ao
 * cliente um canal para mandar comando junto com o dado — parametrizar não é
 * escapar aspas, é fazer o valor viajar separado da instrução.
 */
function montarWhere(filtro: FiltroDespesas): {
  where: string;
  valores: (string | number)[];
} {
  const condicoes: string[] = [];
  const valores: (string | number)[] = [];

  if (filtro.mes !== undefined) {
    condicoes.push('mes = ?');
    valores.push(filtro.mes);
  }
  if (filtro.categoriaId !== undefined) {
    condicoes.push('categoria_id = ?');
    valores.push(filtro.categoriaId);
  }

  return {
    where: condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '',
    valores,
  };
}
