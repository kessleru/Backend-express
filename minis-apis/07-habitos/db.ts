/**
 * Abertura da conexão e migration. Conceito principal: módulo 09.
 *
 * A mecânica da migration idempotente (tabela `_migrations`, transação em volta
 * de cada passo) é a mesma da mini 3 — veja `minis-apis/03-despesas/db.ts`. O
 * que muda aqui é o schema, e é só sobre ele que este arquivo comenta.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type Migration = { nome: string; sql: string };

const migrations: Migration[] = [
  {
    nome: '001_usuarios_habitos_marcacoes',
    sql: `
      CREATE TABLE usuarios (
        id         INTEGER PRIMARY KEY,
        email      TEXT NOT NULL,
        senha_hash TEXT NOT NULL,
        criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- COLLATE NOCASE porque e-mail não distingue caixa na prática: quem se
      -- cadastrou como "Ana@x.com" e tenta de novo como "ana@x.com" é a mesma
      -- pessoa, e sem isto ela ganharia duas contas — cada uma enxergando
      -- metade dos hábitos, sem explicação possível na tela.
      CREATE UNIQUE INDEX idx_usuarios_email ON usuarios(email COLLATE NOCASE);

      CREATE TABLE habitos (
        id         INTEGER PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome       TEXT    NOT NULL,
        criado_em  TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      -- A unicidade é do PAR (dono, nome), nunca do nome sozinho. Um índice só
      -- em nome faria o "Correr" de uma pessoa impedir o "Correr" de todas as
      -- outras — e o 409 devolvido entregaria que aquele nome já existe na base,
      -- que é justamente o vazamento que uma API privada não pode ter.
      CREATE UNIQUE INDEX idx_habitos_dono_nome
        ON habitos(usuario_id, nome COLLATE NOCASE);

      CREATE TABLE marcacoes (
        id        INTEGER PRIMARY KEY,
        habito_id INTEGER NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
        dia       TEXT    NOT NULL  -- 'YYYY-MM-DD', ordenável e comparável como texto
      );

      -- A regra "um registro por dia" mora AQUI, e não num if antes do
      -- INSERT: entre o SELECT e o INSERT de um if cabe outra requisição, e
      -- dois toques rápidos no botão gravariam o mesmo dia duas vezes. Quem
      -- decide é quem grava.
      --
      -- O índice também é o que faz o resumo do mês ser rápido: ele está
      -- ordenado por (habito_id, dia), que é exatamente o filtro da consulta do
      -- resumo. Aqui não existe um índice extra como o idx_despesas_mes da
      -- mini 3 porque a restrição de unicidade já entregou um de graça.
      CREATE UNIQUE INDEX idx_marcacoes_habito_dia ON marcacoes(habito_id, dia);
    `,
  },
];

export function abrirBanco(caminho: string): DatabaseSync {
  mkdirSync(dirname(caminho), { recursive: true });

  const db = new DatabaseSync(caminho);

  // PRAGMA por conexão, não por banco (o porquê está na mini 3). O que ele
  // decide nesta API é o `ON DELETE CASCADE`: sem a linha, apagar um hábito
  // deixa as marcações dele órfãs no banco, ocupando espaço e reaparecendo no
  // dia em que o SQLite reaproveitar aquele `id` para outro hábito — de outra
  // pessoa.
  db.exec('PRAGMA foreign_keys = ON');

  aplicarMigrations(db);
  return db;
}

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
