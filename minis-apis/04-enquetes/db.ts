/**
 * Abertura da conexão, migrations e seed. Conceito principal: módulo 09.
 *
 * O schema desta API tem uma decisão que decide todo o resto: **voto é linha,
 * não contador**. Não existe coluna `votos` em `opcoes` sendo incrementada;
 * existe uma tabela `votos` com uma linha por voto. A apuração vira uma
 * contagem, e não a leitura de um número que alguém manteve na mão.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type Migration = { nome: string; sql: string };

/**
 * `strftime` em vez de `datetime('now')`: o segundo devolve
 * `2026-08-18 14:03:00`, com espaço no lugar do `T` e sem fuso. Esse texto não
 * é ISO-8601, e o cliente que fizer `new Date()` nele recebe hora local em um
 * ambiente e `Invalid Date` em outro — três horas de diferença que ninguém
 * associa ao formato da coluna. Guardar já no formato certo custa nada.
 */
const AGORA_ISO = `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

const migrations: Migration[] = [
  {
    nome: '001_enquetes_opcoes_votos',
    sql: `
      CREATE TABLE enquetes (
        id        INTEGER PRIMARY KEY,
        pergunta  TEXT NOT NULL,
        criada_em TEXT NOT NULL DEFAULT (${AGORA_ISO}),

        -- O estado da enquete é uma DATA que pode ser nula, não um booleano
        -- "encerrada". Nulo significa aberta; preenchido significa encerrada e
        -- diz QUANDO — a mesma coluna guarda o fato e o carimbo. Com um
        -- booleano, "quando isso encerrou?" viraria uma segunda coluna que
        -- alguém esqueceria de preencher.
        encerrada_em TEXT
      );

      CREATE TABLE opcoes (
        id         INTEGER PRIMARY KEY,
        -- ON DELETE CASCADE: apagar a enquete apaga as opções junto. Sem isso o
        -- DELETE da enquete falharia — a chave estrangeira segura — e a API
        -- responderia 500 num caminho que o usuário considera trivial.
        enquete_id INTEGER NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
        texto      TEXT    NOT NULL,
        -- A posição na cédula. Sem ela a ordem seria a dos ids, que é a mesma
        -- coisa hoje e deixa de ser no dia em que uma opção for apagada e
        -- recriada.
        ordem      INTEGER NOT NULL
      );

      -- Duas opções com o mesmo texto na mesma enquete tornam o resultado
      -- indefensável: ninguém sabe qual das duas "Quarta" o eleitor escolheu, e
      -- a preferência real fica partida em dois pedaços que perdem para uma
      -- terceira opção. O NOCASE fecha a porta também para "Quarta" e "quarta".
      CREATE UNIQUE INDEX idx_opcoes_texto ON opcoes(enquete_id, texto COLLATE NOCASE);

      CREATE TABLE votos (
        id INTEGER PRIMARY KEY,

        -- Esta coluna é REDUNDANTE: pelo opcao_id dá para chegar à enquete
        -- passando pela tabela de opções. Ela existe por causa do índice único
        -- logo abaixo — "um voto por eleitor por enquete" só pode virar
        -- restrição de banco se as duas colunas estiverem na MESMA linha. Sem
        -- ela a regra viraria um SELECT no serviço, e um SELECT não segura duas
        -- requisições simultâneas do mesmo eleitor.
        enquete_id INTEGER NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
        opcao_id   INTEGER NOT NULL REFERENCES opcoes(id)   ON DELETE CASCADE,
        eleitor    TEXT    NOT NULL,
        votado_em  TEXT    NOT NULL DEFAULT (${AGORA_ISO})
      );

      CREATE UNIQUE INDEX idx_votos_um_por_eleitor ON votos(enquete_id, eleitor);

      -- A apuração agrupa votos por opção. Sem este índice cada apuração varre
      -- a tabela inteira de votos — de todas as enquetes — para separar os
      -- poucos de uma opção.
      CREATE INDEX idx_votos_opcao ON votos(opcao_id);
    `,
  },
];

/** Duas enquetes para a API ter o que responder na primeira execução: uma
 *  aberta, onde dá para votar, e uma encerrada, onde dá para ver a recusa. */
const SEED = [
  {
    pergunta: 'Qual dia da semana para a retrospectiva do time?',
    opcoes: ['Terça de manhã', 'Quarta à tarde', 'Sexta de manhã'],
    votos: [
      ['ana@exemplo.com', 'Quarta à tarde'],
      ['bruno@exemplo.com', 'Quarta à tarde'],
      ['carla@exemplo.com', 'Terça de manhã'],
    ],
    encerrada: false,
  },
  {
    pergunta: 'Onde fazer a confraternização de fim de ano?',
    opcoes: ['Restaurante do centro', 'Chácara do Paulo', 'Salão do prédio'],
    votos: [
      ['ana@exemplo.com', 'Chácara do Paulo'],
      ['bruno@exemplo.com', 'Chácara do Paulo'],
      ['carla@exemplo.com', 'Restaurante do centro'],
      ['diego@exemplo.com', 'Salão do prédio'],
    ],
    encerrada: true,
  },
];

export function abrirBanco(caminho: string): DatabaseSync {
  mkdirSync(dirname(caminho), { recursive: true });

  const db = new DatabaseSync(caminho);

  // POR CONEXÃO, não por arquivo: quem abrir este mesmo `.sqlite` sem esta
  // linha volta a ignorar as chaves estrangeiras. Aqui isso é pior do que
  // aceitar um id inexistente — sem o PRAGMA o `ON DELETE CASCADE` não dispara,
  // e apagar uma enquete deixa os votos dela vivos, pendurados num id que o
  // SQLite vai reaproveitar na próxima enquete criada. A apuração da enquete
  // nova nasce com votos de gente que votou em outra coisa.
  db.exec('PRAGMA foreign_keys = ON');

  aplicarMigrations(db);
  semear(db);
  return db;
}

/**
 * Idempotente: a tabela `_migrations` guarda o que já rodou e a execução
 * seguinte pula. `IF NOT EXISTS` em cada comando resolveria só o `CREATE
 * TABLE` — não a migration seguinte, a que altera uma tabela existente e não
 * pode rodar duas vezes.
 */
function aplicarMigrations(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    nome        TEXT PRIMARY KEY,
    aplicada_em TEXT NOT NULL DEFAULT (${AGORA_ISO})
  )`);

  const jaAplicadas = new Set(
    db
      .prepare('SELECT nome FROM _migrations')
      .all()
      .map((linha) => (linha as { nome: string }).nome),
  );

  const registrar = db.prepare('INSERT INTO _migrations (nome) VALUES (?)');

  for (const migration of migrations) {
    if (jaAplicadas.has(migration.nome)) continue;

    // O SQL e o registro na MESMA transação: se o processo morrer entre os
    // dois, o banco ficaria com as tabelas criadas e a migration marcada como
    // não aplicada — e a execução seguinte tentaria criá-las de novo, falhando
    // para sempre.
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      registrar.run(migration.nome);
      db.exec('COMMIT');
      console.log(`  migration aplicada: ${migration.nome}`);
    } catch (erro) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${migration.nome} falhou: ${(erro as Error).message}`);
    }
  }
}

/** Só quando a tabela está vazia. `INSERT OR IGNORE` linha a linha
 *  ressuscitaria, no próximo boot, a enquete que alguém apagou de propósito. */
function semear(db: DatabaseSync): void {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM enquetes').get() as {
    total: number;
  };
  if (total > 0) {
    console.log(`  seed não rodou: já existem ${total} enquetes`);
    return;
  }

  const inserirEnquete = db.prepare('INSERT INTO enquetes (pergunta) VALUES (?)');
  const inserirOpcao = db.prepare(
    'INSERT INTO opcoes (enquete_id, texto, ordem) VALUES (?, ?, ?)',
  );
  const inserirVoto = db.prepare(
    'INSERT INTO votos (enquete_id, opcao_id, eleitor) VALUES (?, ?, ?)',
  );
  const encerrar = db.prepare(
    `UPDATE enquetes SET encerrada_em = ${AGORA_ISO} WHERE id = ?`,
  );

  db.exec('BEGIN');
  for (const enquete of SEED) {
    const enqueteId = Number(inserirEnquete.run(enquete.pergunta).lastInsertRowid);

    const idPorTexto = new Map<string, number>();
    enquete.opcoes.forEach((texto, indice) => {
      idPorTexto.set(
        texto,
        Number(inserirOpcao.run(enqueteId, texto, indice).lastInsertRowid),
      );
    });

    for (const [eleitor, texto] of enquete.votos) {
      // O seed é dado nosso, escrito neste arquivo. Se o texto do voto não
      // casar com nenhuma opção é erro de digitação aqui — e falhar alto é
      // melhor do que semear uma enquete com um voto a menos e ninguém notar.
      const opcaoId = idPorTexto.get(texto ?? '');
      if (opcaoId === undefined) throw new Error(`Seed inválido: opção "${texto}"`);
      inserirVoto.run(enqueteId, opcaoId, eleitor ?? '');
    }

    if (enquete.encerrada) encerrar.run(enqueteId);
  }
  db.exec('COMMIT');

  console.log(`  seed inserido (${SEED.length} enquetes)`);
}
