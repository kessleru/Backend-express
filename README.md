# Backend do zero — Node.js + Express + TypeScript

Guia de estudo prático de backend. Cada módulo tem **teoria curta**, **código que
roda** e **um exercício**. Sem enrolação.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5050
```

Os módulos 01–09 rodam só com isso. **A partir do módulo 10** (Prisma) são
necessários mais três passos, porque o client e o banco não vêm no git:

```bash
npm run db:generate  # gera o Prisma Client
npm run db:migrate   # cria as tabelas
npm run db:seed      # popula com dados de exemplo
```

Sem eles, `npm run typecheck` acusa erros no módulo 10 e o exemplo falha com
`P2021 — table main.livros does not exist`.

## Leia no preview do VS Code

Os `.md` deste repo são **Markdown puro**: não precisam de extensão nenhuma.
`Ctrl+K V` abre o preview lado a lado, e os diagramas já renderizam — o suporte a
**mermaid** é embutido no VS Code desde a versão 1.121. No GitHub, idem.

### Recursos de Markdown usados nos docs

| Recurso                 | Onde aparece                                 |
| ----------------------- | -------------------------------------------- |
| Diagramas **mermaid**   | Fluxos, camadas, sequências, modelo de dados |
| `> **Atenção:** …`      | Avisos, armadilhas e decisões                |
| `<details>`             | Aprofundamento opcional, recolhido           |
| Linguagem em todo bloco | Destaque de sintaxe (`ts`, `sql`, `http`)    |
| Listas de tarefas       | Critérios de aceite dos exercícios           |

## Como estudar

```mermaid
flowchart LR
    A["📚 docs/NN-*.md<br/>teoria enxuta"] --> B["🧪 src/exemplos/NN-*/<br/>rode e quebre"]
    B --> C["🏋️ exercicios/NN-*/<br/>resolva no playground"]
    C --> D["🔍 exercicios/NN-*/solucao/<br/>só agora compare"]
    D --> A
```

O passo 3 é o que fixa. Ler código pronto dá sensação de aprendizado; escrever
do zero mostra o que você realmente sabe.

> **Importante:**
> Resolva em `src/playground/`. É a única pasta que é sua — nada mais no repo
> escreve lá.

## Currículo

✅ = pronto para estudar · ⬜ = ainda não escrito

```mermaid
flowchart TD
    subgraph I["Parte I — Fundamentos"]
        M01[01 HTTP] --> M02[02 Node e async]
    end
    subgraph II["Parte II — Express"]
        M03[03 Express] --> M04[04 Roteamento] --> M05[05 Middlewares]
        M05 --> M06[06 Erros] --> M07[07 Validação]
    end
    subgraph III["Parte III — Arquitetura e dados"]
        M08[08 Camadas] --> M09[09 SQLite] --> M10[10 Prisma]
        M10 --> M11[11 Auth] --> M12[12 Testes]
    end
    subgraph IV["Parte IV — Produção"]
        M13[13 Segurança] --> M14[14 Observabilidade]
        M14 --> M15[15 Performance] --> M16[16 Deploy]
    end
    subgraph V["Parte V — Avançado"]
        M17[17 Filas] --> M18[18 Tempo real]
        M18 --> M19[19 Uploads] --> M20[20 Além do REST]
    end
    M02 --> M03
    M07 --> M08
    M12 --> M13
    M16 --> M17
```

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
| 12  | [Testes](./docs/12-testes.md)                                 | Pirâmide, Vitest, Supertest, dublês, TDD   | ✅  |

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

```mermaid
flowchart LR
    R((repo)) --> D["📚 docs/<br/>teoria, 1 arquivo por módulo"]
    R --> E["🧪 src/exemplos/<br/>código de referência"]
    R --> X["🏋️ exercicios/<br/>enunciados + soluções"]
    R --> P["🔒 src/playground/<br/>SEU espaço"]
    R --> S["⚙️ src/server.ts<br/>cresce junto com o curso"]

    style P fill:#fde68a,stroke:#d97706,color:#000
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

A partir do módulo 12 (testes):

| Comando              | O que faz                                     |
| -------------------- | --------------------------------------------- |
| `npm test`           | Roda a suíte uma vez                          |
| `npm run test:watch` | Reexecuta o que muda enquanto você escreve    |
| `npm run test:cov`   | Cobertura; relatório em `coverage/index.html` |

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
