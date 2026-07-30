# 09 — Banco de dados e SQL com SQLite

**Em uma frase:** trocar o array em memória por um banco de verdade — e descobrir
que só a camada de repositório muda.

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=3 orderedList=false} -->

## Por que importa

- Array em memória some no restart. Toda API real tem um banco.
- SQL é a habilidade mais transferível de backend: vale para Postgres, MySQL, tudo.
- Quem aprende ORM antes de SQL não entende o que o ORM está fazendo.

## Conceitos

### Por que SQLite para estudar (e para produção)

|              |                                                       |
| ------------ | ----------------------------------------------------- |
| Instalação   | Zero. `node:sqlite` vem no Node 24                    |
| O banco é    | **um arquivo** — copiar é backup                      |
| SQL          | De verdade. O que você aprende transfere              |
| Concorrência | Um escritor por vez (com WAL, leitores não bloqueiam) |
| Limite real  | Escrita muito concorrente. Aí é Postgres              |

Não é banco de brinquedo: roda em bilhões de dispositivos e serve muito bem APIs
de leitura intensa.

### Modelagem

```sql
CREATE TABLE livros (
  id         INTEGER PRIMARY KEY,       -- alias de ROWID: autoincrementa
  titulo     TEXT    NOT NULL,
  autor_id   INTEGER NOT NULL,
  ano        INTEGER NOT NULL CHECK (ano BETWEEN 1450 AND 2100),
  isbn       TEXT    UNIQUE,            -- UNIQUE aceita vários NULL
  disponivel INTEGER NOT NULL DEFAULT 1, -- não existe BOOLEAN: 0/1
  FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE RESTRICT
);
```

| Restrição     | Garante                                                   |
| ------------- | --------------------------------------------------------- |
| `PRIMARY KEY` | Identidade única; já é um índice                          |
| `NOT NULL`    | Campo obrigatório                                         |
| `UNIQUE`      | Sem duplicata (imune a corrida, ao contrário do seu `if`) |
| `CHECK`       | Faixa de valores                                          |
| `FOREIGN KEY` | A referência existe                                       |

> [!CAUTION]
> **O SQLite ignora `FOREIGN KEY` por padrão.** Sem `PRAGMA foreign_keys = ON` em
> **cada conexão**, suas chaves estrangeiras são comentário.

**Validar no código vs restringir no banco:** a validação protege da sua API; a
restrição protege de tudo — script de importação, migration, alguém no console de
produção às 3 da manhã. Faça as duas.

### Relacionamentos

| Tipo | Como se modela       | Exemplo                               |
| ---- | -------------------- | ------------------------------------- |
| 1-N  | FK no lado "muitos"  | `livros.autor_id`                     |
| N-N  | **tabela de junção** | `livros_generos(livro_id, genero_id)` |
| 1-1  | FK com `UNIQUE`      | `perfis.usuario_id UNIQUE`            |

```mermaid
erDiagram
    AUTORES ||--o{ LIVROS : escreve
    LIVROS ||--o{ LIVROS_GENEROS : tem
    GENEROS ||--o{ LIVROS_GENEROS : classifica

    AUTORES {
        int id PK
        text nome
    }
    LIVROS {
        int id PK
        text titulo
        int autor_id FK
        int ano "CHECK 1450..2100"
        text isbn UK "aceita vários NULL"
        int disponivel "0/1 — não existe BOOLEAN"
    }
    LIVROS_GENEROS {
        int livro_id PK "FK"
        int genero_id PK "FK"
    }
```

Na tabela de junção, use **chave primária composta** — o par vira único e o mesmo
gênero não entra duas vezes no mesmo livro, sem você checar nada:

```sql
PRIMARY KEY (livro_id, genero_id)
```

**Normalização o suficiente:** cada fato num lugar só. O nome do autor mora em
`autores`, não repetido em cada livro — senão corrigir um typo exige um UPDATE em
mil linhas, e duas delas vão ficar diferentes. Desnormalize depois, com número na
mão ([módulo 15](./15-performance-e-cache.md)), não por antecipação.

### SQL injection — e por que `?` resolve

```ts
const malicioso = "x'; DROP TABLE livros; --";

// ERRADO: o valor vira instrução
db.exec(`SELECT * FROM livros WHERE titulo = '${malicioso}'`);
// o banco lê: SELECT ... WHERE titulo = 'x'; DROP TABLE livros; --'

// CERTO: o valor é DADO
db.prepare('SELECT * FROM livros WHERE titulo = ?').get(malicioso); // 0 resultados
```

> [!IMPORTANT]
> Parametrizar **não é escapar aspas**. O valor viaja separado do SQL — o banco
> recebe a query já compilada e os dados à parte. Por isso não existe caractere
> que "escape" da parametrização.

```mermaid
flowchart LR
    subgraph ERRADO["❌ concatenar"]
        A1["string única<br/>SQL + valor juntos"] --> A2["parser do banco"] --> A3["o valor virou INSTRUÇÃO"]
    end
    subgraph CERTO["✅ parametrizar"]
        B1["SQL com ?"] --> B2["compila 1×"]
        B3["valor"] -.->|"entra depois, como DADO"| B2
    end
    style A3 fill:#fecaca,stroke:#dc2626,color:#000
    style B2 fill:#bbf7d0,stroke:#16a34a,color:#000
```

Quando você precisa montar SQL dinâmico, os **pedaços** são strings suas e só os
**valores** vão em `?`:

```ts
if (filtro.titulo) {
  condicoes.push('titulo LIKE ?');
  valores.push(`%${filtro.titulo}%`); // o % vai no VALOR
}
const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
```

### A API do `node:sqlite`

```ts
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/app.sqlite'); // ou ':memory:'
db.exec('PRAGMA foreign_keys = ON'); // sempre
db.exec('PRAGMA journal_mode = WAL'); // leitores não bloqueiam escritor

const stmt = db.prepare('SELECT * FROM livros WHERE ano = ?'); // compila 1×
stmt.get(1969); // primeira linha ou undefined
stmt.all(1969); // array

const r = db.prepare('INSERT INTO livros (titulo) VALUES (?)').run('X');
r.lastInsertRowid; // id gerado
r.changes; // linhas afetadas
```

`changes` é mais útil do que parece: `UPDATE ... WHERE id = ?` com
`changes === 0` significa "esse id não existe" — sem um `SELECT` extra.

É **síncrono**, e para SQLite isso é uma vantagem: sem round-trip de rede, o
overhead de Promise custaria mais que a própria query. Mesmo assim a **interface**
do repositório é `Promise` (ver [módulo 08](./08-arquitetura-em-camadas.md)),
porque Postgres é assíncrono.

### JOIN

```sql
SELECT l.titulo, a.nome AS autor
  FROM livros l
  JOIN autores a ON a.id = l.autor_id;      -- INNER: só quem tem par
```

```sql
SELECT a.nome, COUNT(l.id) AS livros
  FROM autores a
  LEFT JOIN livros l ON l.autor_id = a.id   -- mantém autor sem livro
 GROUP BY a.id;
```

> [!WARNING]
> O `LEFT` aqui é a diferença entre um relatório certo e um relatório que **omite
> silenciosamente** os autores com zero livros.

### GROUP BY, WHERE e HAVING

```sql
SELECT (ano/10)*10 AS decada, COUNT(*) AS quantos
  FROM livros
 WHERE disponivel = 1     -- filtra LINHAS, antes de agrupar
 GROUP BY decada
HAVING COUNT(*) >= 2      -- filtra GRUPOS, depois de agrupar
 ORDER BY decada;
```

```mermaid
flowchart LR
    T[("livros")] --> W["WHERE<br/><i>filtra LINHAS</i>"] --> G["GROUP BY<br/><i>agrupa</i>"] --> H["HAVING<br/><i>filtra GRUPOS</i>"] --> O["ORDER BY"] --> L["LIMIT"]
    style W fill:#dbeafe,stroke:#2563eb,color:#000
    style H fill:#e9d5ff,stroke:#7c3aed,color:#000
```

Confundir `WHERE` com `HAVING` é o erro clássico de quem está aprendendo — e o
diagrama acima é a resposta: um roda antes de agrupar, o outro depois.

### Índices e `EXPLAIN QUERY PLAN`

```sql
EXPLAIN QUERY PLAN SELECT * FROM livros WHERE ano = 1969;
-- SCAN livros                                   ← lê a tabela TODA
CREATE INDEX idx_livros_ano ON livros(ano);
-- SEARCH livros USING INDEX idx_livros_ano      ← vai direto
```

> [!TIP]
> `SCAN` com 5 linhas é instantâneo; com 5 milhões é a diferença entre 1 ms e 4
> segundos. **`EXPLAIN QUERY PLAN` responde "por que minha query está lenta"** —
> use antes de otimizar por palpite.

Índice não é grátis: ocupa espaço e deixa `INSERT`/`UPDATE` mais lentos (o índice
também é atualizado). Indexe as colunas que aparecem em `WHERE`, `JOIN` e
`ORDER BY` das queries que você **realmente roda**.

### Transações e ACID

```ts
db.exec('BEGIN');
try {
  const { changes } = db
    .prepare('UPDATE livros SET disponivel = 0 WHERE id = ? AND disponivel = 1')
    .run(id);
  if (changes === 0) throw new Error('Livro indisponível');

  db.prepare('INSERT INTO emprestimos (livro_id, quem) VALUES (?, ?)').run(id, quem);
  db.exec('COMMIT');
} catch (erro) {
  db.exec('ROLLBACK'); // desfaz TUDO desde o BEGIN
  throw erro;
}
```

| Letra            | Significa                                        |
| ---------------- | ------------------------------------------------ |
| **A**tomicidade  | Tudo ou nada                                     |
| **C**onsistência | As restrições valem no fim da transação          |
| **I**solamento   | Uma transação não vê o meio de outra             |
| **D**urabilidade | Depois do `COMMIT`, sobrevive a queda de energia |

```mermaid
stateDiagram-v2
    [*] --> BEGIN
    BEGIN --> UPDATE: reserva o livro
    UPDATE --> INSERT: changes > 0
    UPDATE --> ROLLBACK: changes == 0 (indisponível)
    INSERT --> COMMIT: registra o empréstimo
    INSERT --> ROLLBACK: qualquer erro
    COMMIT --> [*]: gravado
    ROLLBACK --> [*]: como se nada tivesse acontecido
```

> [!IMPORTANT]
> Repare no `AND disponivel = 1` dentro do `UPDATE`: é assim que se evita
> corrida. Um `SELECT` antes do `UPDATE` deixaria uma janela entre os dois em que
> outra requisição poderia emprestar o mesmo livro.

### Migrations à mão

```ts
export const migrations = [
  { nome: '001_criar_cursos', sql: `CREATE TABLE cursos (...)` },
  { nome: '002_indice_publicado', sql: `CREATE INDEX ...` },
];
```

Uma tabela `_migrations` guarda o que já rodou. Duas regras:

1. **Migration é imutável.** Nunca edite uma que já rodou em produção — o banco de
   lá não vai reexecutá-la. Precisa mudar? Nova migration.
2. **DDL + registro na mesma transação.** Senão uma falha no meio deixa a tabela
   criada e a migration não registrada, e a próxima execução falha para sempre.

O Prisma ([módulo 10](./10-prisma-orm.md)) faz exatamente isso, com uma tabela
`_prisma_migrations`.

### O ganho da camada de repositório, na prática

Compare os dois servidores:

```bash
diff <(sed -n '/^const app/,$p' src/exemplos/08-camadas/servidor.ts) \
     <(sed -n '/^const app/,$p' src/exemplos/09-sqlite/servidor.ts)
```

O que mudou foi a construção do repositório. `criarServicoCursos`,
`criarRotasCursos`, os schemas e o tratador de erro são **importados dos módulos
anteriores**, sem cópia e sem alteração. Era isso que a interface prometia.

### `node:sqlite` vs `better-sqlite3`

`better-sqlite3` é maduro, mais rápido em alguns casos e tem API mais rica
(`.pluck()`, `.iterate()`, transações como função). O `node:sqlite` é embutido —
zero dependência, zero compilação nativa. Para estudar, embutido ganha. Em
produção, `better-sqlite3` ainda é a escolha mais comum.

## Na prática

```bash
node src/exemplos/09-sqlite/01-sql-na-mao.ts   # SQL do zero, banco em memória
node src/exemplos/09-sqlite/servidor.ts        # a API do módulo 08 sobre SQLite
```

O primeiro imprime nove seções, incluindo o `EXPLAIN QUERY PLAN` antes e depois do
índice, e a transação sendo desfeita.

```bash {cmd=true}
B=localhost:5057/api/v1/cursos
curl "$B?publicado=true"
curl -X POST $B -H 'Content-Type: application/json' -d '{"titulo":"SQL na mão","horas":6}'
curl -X POST $B -H 'Content-Type: application/json' -d '{"titulo":"sql NA mão","horas":6}' # 409
curl -X POST $B/2/publicar
```

> [!TIP]
> Depois **derrube o servidor com Ctrl+C e suba de novo**: os dados continuam lá.
> É a diferença que o módulo inteiro existe para mostrar.

## Erros comuns

| Erro                                   | O que acontece               | Correção                           |
| -------------------------------------- | ---------------------------- | ---------------------------------- |
| Esquecer `PRAGMA foreign_keys = ON`    | FKs ignoradas em silêncio    | Em toda conexão                    |
| Concatenar valor no SQL                | SQL injection                | Sempre `?`                         |
| `WHERE x = ${input}` "escapado"        | Ainda é injeção              | Parametrizar, não escapar          |
| `SELECT` antes de `UPDATE` para checar | Corrida entre os dois        | Condição no `UPDATE` + `changes`   |
| Sem `BEGIN`/`COMMIT` em operação dupla | Estado impossível no banco   | Transação                          |
| `INNER JOIN` num relatório de contagem | Omite quem tem zero          | `LEFT JOIN`                        |
| `HAVING` no lugar de `WHERE`           | Filtra grupo em vez de linha | `WHERE` antes de agrupar           |
| `SET x = ?` com valor `undefined`      | Grava `NULL` e apaga o campo | Montar o `SET` dinamicamente       |
| Índice em tudo                         | `INSERT` lento, disco cheio  | Só o que aparece em `WHERE`/`JOIN` |
| Editar migration já aplicada           | Bancos divergem              | Nova migration                     |
| `boolean` no SQLite                    | Não existe                   | `INTEGER` 0/1 + converter          |
| Commitar o `.sqlite`                   | Conflito binário no git      | `.gitignore`                       |

## Cheatsheet

```sql
CREATE TABLE t (id INTEGER PRIMARY KEY, x TEXT NOT NULL UNIQUE, y INTEGER CHECK (y > 0));
CREATE INDEX idx ON t(x);
CREATE UNIQUE INDEX idx2 ON t(x COLLATE NOCASE);   -- único ignorando maiúscula

SELECT * FROM t WHERE x LIKE ? ORDER BY y DESC LIMIT 10 OFFSET 20;
SELECT a.*, b.nome FROM a JOIN b ON b.id = a.b_id;
SELECT k, COUNT(*) FROM t GROUP BY k HAVING COUNT(*) > 1;
INSERT INTO t (x) VALUES (?);
UPDATE t SET x = ? WHERE id = ?;
DELETE FROM t WHERE id = ?;

EXPLAIN QUERY PLAN SELECT ...;    -- SCAN = ruim, SEARCH USING INDEX = bom
PRAGMA foreign_keys = ON;         -- OBRIGATÓRIO
PRAGMA journal_mode = WAL;
BEGIN; ... COMMIT; / ROLLBACK;
```

```ts
db.prepare(sql).get(...p); // 1 linha | undefined
db.prepare(sql).all(...p); // array
db.prepare(sql).run(...p); // { changes, lastInsertRowid }
db.exec(sql); // várias instruções, sem parâmetro
db.close();
```

## Pratique

👉 [`exercicios/09-sqlite/`](../exercicios/09-sqlite/)
