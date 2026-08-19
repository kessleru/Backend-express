/**
 * Abertura da conexão, migrations e seed. Conceito principal: módulo 09.
 *
 * Migration é o passo versionado que leva o banco de um estado ao próximo. Ela
 * mora no código, junto de quem depende dela, porque um clone novo do
 * repositório precisa chegar ao mesmo schema sem ninguém digitar SQL à mão — e
 * porque o banco que já está rodando não pode ser recriado do zero.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type Migration = { nome: string; sql: string };

const migrations: Migration[] = [
  {
    nome: '001_categorias_e_despesas',
    sql: `
      CREATE TABLE categorias (
        id   INTEGER PRIMARY KEY,
        nome TEXT NOT NULL
      );

      -- COLLATE NOCASE: "Lazer" e "lazer" passam a ser o mesmo nome para o
      -- índice. Sem isso a lista de categorias enche de duplicata escrita com
      -- outra caixa, que é exatamente o que ter uma tabela de categorias
      -- deveria impedir. O índice único também é o que segura duas requisições
      -- simultâneas com o mesmo nome — a checagem do serviço, sozinha, tem uma
      -- janela entre o SELECT e o INSERT.
      CREATE UNIQUE INDEX idx_categorias_nome ON categorias(nome COLLATE NOCASE);

      CREATE TABLE despesas (
        id             INTEGER PRIMARY KEY,
        descricao      TEXT    NOT NULL,
        -- Dinheiro é INTEGER de centavos (o porquê está em dominio.ts). O CHECK
        -- fecha a porta para 0 e para negativo direto no banco: nenhum caminho
        -- de escrita — API, seed ou script futuro — grava lançamento inválido.
        valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
        data           TEXT    NOT NULL,  -- 'YYYY-MM-DD', ordenável como texto
        mes            TEXT    NOT NULL,  -- 'YYYY-MM', derivado de data
        categoria_id   INTEGER NOT NULL REFERENCES categorias(id)
      );

      -- O índice do filtro que aparece em TODA consulta pesada: o mês. Sem ele
      -- o banco lê a tabela inteira para achar agosto; com ele vai direto às
      -- linhas de agosto, como um sumário leva à página certa. O custo é espaço
      -- e um pouco mais de trabalho em cada INSERT — por isso só este.
      CREATE INDEX idx_despesas_mes ON despesas(mes);
    `,
  },
];

/** Categorias iniciais: sem elas nenhuma despesa pode ser lançada. */
const CATEGORIAS_INICIAIS = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde'];

export function abrirBanco(caminho: string): DatabaseSync {
  mkdirSync(dirname(caminho), { recursive: true });

  const db = new DatabaseSync(caminho);

  // Este PRAGMA é POR CONEXÃO, não uma propriedade do arquivo do banco: quem
  // abrir o mesmo `.sqlite` sem ele volta a ignorar as chaves estrangeiras.
  // Ignorar significa aceitar `categoria_id = 999` sem reclamar — e o estrago
  // só aparece meses depois, num relatório que perde lançamentos órfãos no
  // JOIN. Repita a linha em toda conexão nova.
  db.exec('PRAGMA foreign_keys = ON');

  aplicarMigrations(db);
  semear(db);
  return db;
}

/**
 * Idempotente: a tabela `_migrations` guarda o que já rodou, e a próxima
 * execução pula o que está lá. Sem esse registro só restaria `IF NOT EXISTS`
 * em cada comando — que resolve o `CREATE TABLE` e não resolve a migration
 * seguinte, a que altera uma tabela existente e não pode rodar duas vezes.
 */
function aplicarMigrations(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    nome        TEXT PRIMARY KEY,
    aplicada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    // O SQL e o registro na MESMA transação. Se o processo morrer entre os
    // dois, o banco fica com as tabelas criadas e a migration "não aplicada" —
    // e a execução seguinte tentaria criá-las de novo, falhando para sempre.
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

/**
 * Seed só quando a tabela está vazia — e não `INSERT OR IGNORE` linha a linha.
 * A diferença aparece no dia em que alguém apaga uma categoria de propósito: o
 * `OR IGNORE` a ressuscita no próximo boot, este seed não.
 */
function semear(db: DatabaseSync): void {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM categorias').get() as {
    total: number;
  };
  if (total > 0) {
    console.log(`  seed não rodou: já existem ${total} categorias`);
    return;
  }

  const inserir = db.prepare('INSERT INTO categorias (nome) VALUES (?)');
  for (const nome of CATEGORIAS_INICIAIS) inserir.run(nome);
  console.log(`  seed inserido (${CATEGORIAS_INICIAIS.length} categorias)`);
}
