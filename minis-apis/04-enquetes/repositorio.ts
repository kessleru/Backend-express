/**
 * O ÚNICO arquivo que escreve SQL. Conceitos principais: módulos 08 e 09.
 *
 * Serviço e rotas conversam com o tipo `Repositorio` (em `dominio.ts`) e não
 * sabem que existe SQLite do outro lado. Aqui também mora a tradução entre os
 * dois vocabulários: o banco fala `snake_case` (`encerrada_em`), o resto do
 * sistema fala `camelCase`.
 */
import type { DatabaseSync } from 'node:sqlite';
import type {
  Enquete,
  EnqueteListada,
  FiltroEnquetes,
  NovaEnquete,
  Opcao,
  OpcaoApurada,
  Repositorio,
  Voto,
} from './dominio.ts';

/** SQLITE_CONSTRAINT_UNIQUE. O código genérico de restrição é 19; este é o
 *  específico do índice único, e é o único que esta API sabe interpretar. */
const ERRO_UNIQUE = 2067;

type LinhaEnquete = {
  id: number;
  pergunta: string;
  criada_em: string;
  encerrada_em: string | null;
};

type LinhaOpcao = { id: number; enquete_id: number; texto: string; ordem: number };

type LinhaVoto = {
  id: number;
  enquete_id: number;
  opcao_id: number;
  eleitor: string;
  votado_em: string;
};

const paraEnquete = (linha: LinhaEnquete): Enquete => ({
  id: linha.id,
  pergunta: linha.pergunta,
  criadaEm: linha.criada_em,
  encerradaEm: linha.encerrada_em,
});

const paraOpcao = (linha: LinhaOpcao): Opcao => ({
  id: linha.id,
  enqueteId: linha.enquete_id,
  texto: linha.texto,
  ordem: linha.ordem,
});

const paraVoto = (linha: LinhaVoto): Voto => ({
  id: linha.id,
  enqueteId: linha.enquete_id,
  opcaoId: linha.opcao_id,
  eleitor: linha.eleitor,
  votadoEm: linha.votado_em,
});

export function criarRepositorioSqlite(db: DatabaseSync): Repositorio {
  // `prepare` compila o SQL. Preparar uma vez, na abertura, e reusar evita
  // recompilar a mesma query a cada requisição.
  const stmtEnquetePorId = db.prepare('SELECT * FROM enquetes WHERE id = ?');
  const stmtInserirEnquete = db.prepare('INSERT INTO enquetes (pergunta) VALUES (?)');
  const stmtInserirOpcao = db.prepare(
    'INSERT INTO opcoes (enquete_id, texto, ordem) VALUES (?, ?, ?)',
  );
  const stmtRemoverEnquete = db.prepare('DELETE FROM enquetes WHERE id = ?');
  const stmtEncerrar = db.prepare(
    // O `AND encerrada_em IS NULL` é a regra "encerra uma vez só" escrita como
    // condição do próprio UPDATE. Conferir antes com um SELECT e atualizar
    // depois deixa uma janela entre os dois: duas requisições simultâneas
    // passariam as duas pelo SELECT, e a segunda sobrescreveria o horário de
    // encerramento da primeira. Aqui a segunda simplesmente não acha linha.
    `UPDATE enquetes
        SET encerrada_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE id = ? AND encerrada_em IS NULL`,
  );

  const stmtOpcoes = db.prepare(
    'SELECT * FROM opcoes WHERE enquete_id = ? ORDER BY ordem',
  );
  // A opção é buscada pelo par (enquete, opção), nunca só pelo id. A chave
  // estrangeira garante que a opção existe; ela não garante que a opção
  // pertence à enquete da URL — sem este WHERE duplo, votar em `/enquetes/1`
  // com uma opção da enquete 2 seria aceito, e o voto sumiria da apuração das
  // duas.
  const stmtOpcao = db.prepare('SELECT * FROM opcoes WHERE enquete_id = ? AND id = ?');

  const stmtInserirVoto = db.prepare(
    'INSERT INTO votos (enquete_id, opcao_id, eleitor) VALUES (?, ?, ?)',
  );
  const stmtVotoPorId = db.prepare('SELECT * FROM votos WHERE id = ?');
  const stmtVotoDoEleitor = db.prepare(
    'SELECT * FROM votos WHERE enquete_id = ? AND eleitor = ?',
  );
  const stmtRemoverVoto = db.prepare(
    'DELETE FROM votos WHERE enquete_id = ? AND eleitor = ?',
  );

  const stmtApurar = db.prepare(
    // LEFT JOIN, e não JOIN: com o JOIN interno a opção que ninguém escolheu
    // não aparece no resultado, e some da apuração justamente a informação de
    // que ela ficou com zero. O leitor conclui que a opção não existia.
    //
    // E `COUNT(v.id)`, não `COUNT(*)`: o LEFT JOIN produz uma linha para a
    // opção sem voto, com as colunas de `votos` nulas — `COUNT(*)` conta essa
    // linha e responde 1. `COUNT` de uma coluna ignora nulo e responde 0. É o
    // erro mais fácil de cometer aqui e o mais difícil de notar, porque só
    // aparece na opção que ninguém votou.
    `SELECT o.id    AS opcaoId,
            o.texto AS texto,
            o.ordem AS ordem,
            COUNT(v.id) AS votos
       FROM opcoes o
       LEFT JOIN votos v ON v.opcao_id = o.id
      WHERE o.enquete_id = ?
      GROUP BY o.id, o.texto, o.ordem
      ORDER BY votos DESC, o.ordem`,
  );

  return {
    async listarEnquetes(filtro: FiltroEnquetes) {
      const where = condicaoDoEstado(filtro.estado);

      // A contagem total é uma segunda query com o MESMO WHERE: é ela que
      // permite ao cliente saber se existe página seguinte sem pedir e receber
      // vazio. Contar no JavaScript exigiria trazer todas as linhas, que é o
      // que a paginação existe para evitar.
      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM enquetes e ${where}`)
        .get() as { total: number };

      // Duas subconsultas em vez de dois LEFT JOIN + GROUP BY. Juntar opções e
      // votos na mesma query multiplica as linhas — três opções e quatro votos
      // viram doze linhas — e aí `COUNT` passa a contar o produto, não os
      // votos: a enquete com 4 votos apareceria com 12. A subconsulta responde
      // uma pergunta por vez e cada uma continua certa.
      const linhas = db
        .prepare(
          `SELECT e.*,
                  (SELECT COUNT(*) FROM votos  v WHERE v.enquete_id  = e.id) AS total_votos,
                  (SELECT COUNT(*) FROM opcoes o WHERE o.enquete_id  = e.id) AS total_opcoes
             FROM enquetes e
             ${where}
            ORDER BY e.id DESC
            LIMIT ? OFFSET ?`,
        )
        .all(filtro.limite, (filtro.pagina - 1) * filtro.limite) as (LinhaEnquete & {
        total_votos: number;
        total_opcoes: number;
      })[];

      const itens: EnqueteListada[] = linhas.map((linha) => ({
        ...paraEnquete(linha),
        totalVotos: linha.total_votos,
        totalOpcoes: linha.total_opcoes,
      }));

      return { itens, total };
    },

    async buscarEnquete(id) {
      const linha = stmtEnquetePorId.get(id) as LinhaEnquete | undefined;
      return linha ? paraEnquete(linha) : null;
    },

    async criarEnquete(dados: NovaEnquete) {
      // A transação é a regra "enquete sem opção não existe" escrita em SQL.
      // Sem ela, um erro no meio do laço deixaria no banco uma enquete com duas
      // das cinco opções — publicada, votável, e com a preferência de quem
      // votar dividida entre as opções que sobraram. O ROLLBACK é o que
      // transforma cinco escritas numa só, do ponto de vista de quem lê.
      db.exec('BEGIN');
      try {
        const enqueteId = Number(stmtInserirEnquete.run(dados.pergunta).lastInsertRowid);
        dados.opcoes.forEach((texto, indice) => {
          stmtInserirOpcao.run(enqueteId, texto, indice);
        });
        db.exec('COMMIT');
        return paraEnquete(stmtEnquetePorId.get(enqueteId) as LinhaEnquete);
      } catch (erro) {
        db.exec('ROLLBACK');
        throw erro;
      }
    },

    async encerrarEnquete(id) {
      if (stmtEncerrar.run(id).changes === 0) return null;
      return paraEnquete(stmtEnquetePorId.get(id) as LinhaEnquete);
    },

    async removerEnquete(id) {
      // `changes` diz quantas linhas o DELETE atingiu; zero significa "esse id
      // não existe", sem precisar de um SELECT antes. As opções e os votos vão
      // junto pelo ON DELETE CASCADE — desde que o PRAGMA da conexão esteja
      // ligado (ver `db.ts`).
      return stmtRemoverEnquete.run(id).changes > 0;
    },

    async listarOpcoes(enqueteId) {
      return (stmtOpcoes.all(enqueteId) as LinhaOpcao[]).map(paraOpcao);
    },

    async buscarOpcao(enqueteId, opcaoId) {
      const linha = stmtOpcao.get(enqueteId, opcaoId) as LinhaOpcao | undefined;
      return linha ? paraOpcao(linha) : null;
    },

    async apurar(enqueteId) {
      return stmtApurar.all(enqueteId) as OpcaoApurada[];
    },

    async registrarVoto(enqueteId, opcaoId, eleitor) {
      try {
        const { lastInsertRowid } = stmtInserirVoto.run(enqueteId, opcaoId, eleitor);
        return paraVoto(stmtVotoPorId.get(Number(lastInsertRowid)) as LinhaVoto);
      } catch (erro) {
        // Tentar o INSERT e tratar a recusa, em vez de consultar antes e
        // inserir depois: entre o SELECT e o INSERT cabe outra requisição do
        // mesmo eleitor, e as duas passariam. O índice único não tem essa
        // janela — ele decide no momento da escrita.
        //
        // A checagem do código é estreita de propósito: qualquer erro que não
        // seja a violação de unicidade sobe e vira 500, porque é bug nosso.
        // Um `catch` que devolvesse `null` para tudo transformaria coluna
        // inexistente em "já votou".
        if ((erro as { errcode?: number }).errcode === ERRO_UNIQUE) return null;
        throw erro;
      }
    },

    async votoDoEleitor(enqueteId, eleitor) {
      const linha = stmtVotoDoEleitor.get(enqueteId, eleitor) as LinhaVoto | undefined;
      return linha ? paraVoto(linha) : null;
    },

    async removerVoto(enqueteId, eleitor) {
      return stmtRemoverVoto.run(enqueteId, eleitor).changes > 0;
    },
  };
}

/**
 * O único pedaço de SQL montado em tempo de execução — e nele não entra valor
 * nenhum do cliente.
 *
 * O `estado` já saiu do validador como uma das três palavras conhecidas, então
 * o que este `switch` escolhe é entre três textos escritos aqui. Se a condição
 * dependesse de um valor livre, ele iria por `?` como todos os outros:
 * parametrizar não é escapar aspas, é fazer o valor viajar separado da
 * instrução.
 */
function condicaoDoEstado(estado: FiltroEnquetes['estado']): string {
  switch (estado) {
    case 'abertas':
      return 'WHERE e.encerrada_em IS NULL';
    case 'encerradas':
      return 'WHERE e.encerrada_em IS NOT NULL';
    default:
      return '';
  }
}
