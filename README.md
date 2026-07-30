# Backend do zero — Node.js + Express + TypeScript

Guia de estudo prático de backend. Cada módulo tem **teoria curta**, **código que
roda** e **um exercício**. Sem enrolação.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5050
```

## Como estudar

Para cada módulo, na ordem:

1. Ler `docs/NN-*.md` — teoria enxuta, direto ao ponto.
2. Rodar o exemplo em `src/exemplos/NN-*/` e mexer nele até quebrar.
3. Resolver `exercicios/NN-*/` dentro de `src/playground/`.
4. Só então comparar com `exercicios/NN-*/solucao/`.

O passo 3 é o que fixa. Ler código pronto dá sensação de aprendizado; escrever
do zero mostra o que você realmente sabe.

## Currículo

✅ = pronto para estudar · ⬜ = ainda não escrito

### Parte I — Fundamentos

| #   | Módulo                                                     | O que você aprende                               |     |
| --- | ---------------------------------------------------------- | ------------------------------------------------ | --- |
| 01  | [Fundamentos de HTTP](./docs/01-fundamentos-http.md)       | Request/response, métodos, status codes, headers | ✅  |
| 02  | [Node, módulos e async](./docs/02-node-modulos-e-async.md) | Event loop, ESM, npm, Promises                   | ✅  |

### Parte II — Express

| #   | Módulo                                                  | O que você aprende                     |     |
| --- | ------------------------------------------------------- | -------------------------------------- | --- |
| 03  | [Express básico](./docs/03-express-basico.md)           | Rotas, params, query, body, CRUD       | ✅  |
| 04  | [Roteamento](./docs/04-roteamento.md)                   | Router, versionamento, design de URLs  | ✅  |
| 05  | [Middlewares](./docs/05-middlewares.md)                 | A cadeia `(req, res, next)`, CORS      | ✅  |
| 06  | [Tratamento de erros](./docs/06-tratamento-de-erros.md) | Handler central, `AppError`            | ✅  |
| 07  | [Validação](./docs/07-validacao-zod.md)                 | Zod, schemas, nunca confiar no cliente | ✅  |

### Parte III — Arquitetura e dados

| #   | Módulo                                                        | O que você aprende                         |     |
| --- | ------------------------------------------------------------- | ------------------------------------------ | --- |
| 08  | [Arquitetura em camadas](./docs/08-arquitetura-em-camadas.md) | Route → controller → service → repository  | ✅  |
| 09  | [SQLite e SQL](./docs/09-sqlite-e-sql.md)                     | SQL na mão, modelagem, índices, transações | ✅  |
| 10  | [Prisma (ORM)](./docs/10-prisma-orm.md)                       | Schema, migrations, client tipado, N+1     | ✅  |
| 11  | [Autenticação](./docs/11-autenticacao.md)                     | Hash de senha, JWT, cookies, RBAC          | ✅  |
| 12  | Testes                                                        | Vitest, Supertest, mocks, TDD              | ⬜  |

### Parte IV — Produção

| #   | Módulo              | O que você aprende                           |
| --- | ------------------- | -------------------------------------------- |
| 13  | Segurança           | OWASP, rate limit, CORS de verdade, segredos |
| 14  | Observabilidade     | Logs estruturados, request ID, health check  |
| 15  | Performance e cache | Redis, paginação, load testing               |
| 16  | Deploy e CI/CD      | Docker, GitHub Actions                       |

### Parte V — Avançado

| #   | Módulo       | O que você aprende              |
| --- | ------------ | ------------------------------- |
| 17  | Filas e jobs | BullMQ, retry, idempotência     |
| 18  | Tempo real   | WebSocket, SSE                  |
| 19  | Uploads      | Multipart, validação, streaming |
| 20  | Além do REST | OpenAPI/Swagger, GraphQL, tRPC  |

### Apêndices

Glossário · Cheatsheet HTTP · Checklist de produção · Erros comuns · Catálogo de ferramentas

## Estrutura

```
docs/              📚 teoria — um arquivo por módulo
src/exemplos/      🧪 código de referência (rode e modifique)
exercicios/        🏋️ enunciados + soluções
src/playground/    🔒 SEU espaço — só você mexe aqui
src/server.ts      o servidor, que cresce junto com o curso
```

## Comandos

| Comando                  | O que faz                          |
| ------------------------ | ---------------------------------- |
| `npm run dev`            | Servidor com reload automático     |
| `npm run typecheck`      | Confere os tipos do projeto        |
| `npm run typecheck:play` | Confere os tipos do seu playground |
| `npm run typecheck:ex`   | Confere os tipos das soluções      |
| `npm run build`          | Gera `dist/`                       |
| `npm start`              | Roda o build de produção           |
| `npm run format`         | Formata tudo com Prettier          |

A partir do módulo 10 (Prisma):

| Comando               | O que faz                                     |
| --------------------- | --------------------------------------------- |
| `npm run db:migrate`  | Cria e aplica migration a partir do schema    |
| `npm run db:generate` | Regera o Prisma Client                        |
| `npm run db:seed`     | Popula o banco com os dados de exemplo        |
| `npm run db:reset`    | Apaga, reaplica as migrations e roda o seed   |
| `npm run db:studio`   | Abre o navegador de banco em `localhost:5555` |

## Stack

Node.js 24 · TypeScript 7 · Express 5 · SQLite · Prisma

O Node 24 roda TypeScript direto (`node arquivo.ts`), então **não existe passo de
build durante o desenvolvimento** — e nada de `ts-node`, `nodemon` ou `dotenv`,
que o Node já substitui nativamente.

---

Planejamento completo e estado do projeto: [`GUIA-IMPLEMENTACAO.md`](./GUIA-IMPLEMENTACAO.md)
