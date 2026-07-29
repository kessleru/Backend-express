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

### Parte I — Fundamentos

| #   | Módulo                | O que você aprende                               |
| --- | --------------------- | ------------------------------------------------ |
| 01  | Fundamentos de HTTP   | Request/response, métodos, status codes, headers |
| 02  | Node, módulos e async | Event loop, ESM, npm, Promises                   |

### Parte II — Express

| #   | Módulo              | O que você aprende                     |
| --- | ------------------- | -------------------------------------- |
| 03  | Express básico      | Rotas, params, query, body, CRUD       |
| 04  | Roteamento          | Router, versionamento, design de URLs  |
| 05  | Middlewares         | A cadeia `(req, res, next)`, CORS      |
| 06  | Tratamento de erros | Handler central, `AppError`            |
| 07  | Validação           | Zod, schemas, nunca confiar no cliente |

### Parte III — Arquitetura e dados

| #   | Módulo                 | O que você aprende                         |
| --- | ---------------------- | ------------------------------------------ |
| 08  | Arquitetura em camadas | Route → controller → service → repository  |
| 09  | SQLite e SQL           | SQL na mão, modelagem, índices, transações |
| 10  | Prisma (ORM)           | Schema, migrations, client tipado, N+1     |
| 11  | Autenticação           | Hash de senha, JWT, cookies, RBAC          |
| 12  | Testes                 | Vitest, Supertest, mocks, TDD              |

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
| `npm run build`          | Gera `dist/`                       |
| `npm start`              | Roda o build de produção           |
| `npm run format`         | Formata tudo com Prettier          |

## Stack

Node.js 24 · TypeScript 7 · Express 5 · SQLite · Prisma

O Node 24 roda TypeScript direto (`node arquivo.ts`), então **não existe passo de
build durante o desenvolvimento** — e nada de `ts-node`, `nodemon` ou `dotenv`,
que o Node já substitui nativamente.

---

Planejamento completo e estado do projeto: [`GUIA-IMPLEMENTACAO.md`](./GUIA-IMPLEMENTACAO.md)
