# Guia de Implementação — Repositório de Estudos de Backend

> Documento de planejamento e continuidade. Serve para **você** saber onde está no
> currículo e para **sessões futuras do Claude Code** entenderem o projeto sem
> precisar redescobrir tudo.
>
> Última atualização: 2026-08-13

---

## 1. Objetivo do repositório

Transformar este repo num **guia de estudo completo de Express e backend**, com:

- **Teoria** — princípios de backend, não só sintaxe de framework.
- **Exemplos executáveis** — todo conceito tem código que roda de verdade.
- **Ferramentas do ecossistema** — do básico ao avançado, cada uma introduzida
  quando existe um problema real que ela resolve (seção 6).
- **Espaço reservado** — uma área exclusiva sua, onde você constrói suas coisas
  sem que o material de estudo atrapalhe (e sem que ninguém sobrescreva).

Público-alvo: você, estudando do zero até conseguir projetar uma API de produção.

Idioma: **português** em toda documentação e comentários.

**Estilo: completo em cobertura e em explicação.** Todos os 20 módulos existem,
cada um vai ao fundo do assunto, e o corte é de redundância — nunca de
profundidade nem de clareza. Tabela compara e enumera **depois** da explicação,
não no lugar dela. O padrão obrigatório está na seção 7, e a régua de qualidade
de ensino é a subseção "Qualidade de ensino" — ela vale acima das outras regras
de estilo.

---

## 2. Estado atual e achados técnicos

**Onde o trabalho parou:** veja [`ULTIMO.md`](ULTIMO.md). A tabela da seção 9
deste arquivo tem as fases.

Em resumo: **módulos 01 a 14 completos** (doc, exemplo, exercício e solução),
faltando as soluções dos exercícios 13 e 14, os mini desafios dos módulos 02 a
14, os módulos 15–20 e os apêndices.

### Achados de comportamento, todos verificados rodando

Esta é a parte desta seção que não envelhece. Cada linha custou tempo de
depuração e virou conteúdo de módulo — não repita a descoberta.

**Express 5**

| Achado                                                                                              | Onde virou conteúdo |
| --------------------------------------------------------------------------------------------------- | ------------------- |
| `req.body` fica **`undefined`** (não `{}`) quando falta o `Content-Type`                            | 03, 07              |
| `req.query` virou **getter**: atribuir (`req.query = validado`) lança `TypeError`. Use `res.locals` | 07                  |
| Wildcard `/*resto` devolve **array** de segmentos, não string                                       | 04                  |
| `*` **exige** nome no caminho; `/:formato?` virou `{/:formato}`                                     | 04                  |
| `throw` em rota `async` agora chega ao tratador sozinho — `asyncHandler` é código morto             | 06                  |

**Zod 4**

| Achado                                                                                                                              | Onde |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `schemaComDefault.partial()` **não** serve para PATCH: os `.default()` continuam valendo e sobrescrevem o registro salvo            | 07   |
| `z.string().email()` está deprecado; use `z.email()`                                                                                | 07   |
| `validar()` precisa de `req.body ?? {}`, senão body ausente produz "expected object, received undefined" em vez de listar os campos | 07   |

**Prisma 7**

| Achado                                                                                                                              | Onde |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| O `url` saiu do `datasource` (erro **P1012**): vai para `prisma.config.ts`, e o client recebe um **adapter**                        | 10   |
| O export do adapter é `PrismaBetterSqlite3` — **s** minúsculo, ao contrário do que a doc de várias versões sugere                   | 10   |
| `createMany({ skipDuplicates: true })` não funciona no SQLite                                                                       | 10   |
| `COUNT`/`SUM`/`MIN` via `$queryRaw` voltam `bigint`, e `JSON.stringify` de bigint lança — 500 misterioso                            | 10   |
| `exactOptionalPropertyTypes: true` briga com o idioma do Prisma (`data: { x: undefined }` não compila). Solução: spread condicional | 10   |

**Segurança (módulo 13)**

| Achado                                                                                                                                                                                                                                                  | Onde |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `helmet()` liga 12 headers e remove `x-powered-by`. `x-xss-protection` vem **`0`** de propósito: o filtro antigo do navegador tinha bugs que criavam vulnerabilidades. "Corrigir" para `1; mode=block` **piora** a segurança — virou falso amigo no doc | 13   |
| `express-rate-limit` 8 usa `standardHeaders: 'draft-8'`: o header vem como `ratelimit="2-in-1min"; r=0; t=60`, não mais `X-RateLimit-*`                                                                                                                 | 13   |
| `req.params.nome` é `string \| string[] \| undefined` com `noUncheckedIndexedAccess` — normalize com `String(... ?? '')` antes de `resolve()`                                                                                                           | 13   |
| `npm audit` acusou um **high real** (`fast-uri`, transitiva). Virou o exemplo de auditoria, em vez de um caso inventado                                                                                                                                 | 13   |

**Observabilidade (módulo 14)**

| Achado                                                                                                                                                                                                                                                                                                                                           | Onde |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| **O `redact` do Pino vazou uma senha durante a escrita do exemplo.** A lista tinha `senha` e `req.body.senha`, mas a rota logava `{ corpo: req.body }` — o caminho real era `corpo.senha`. Ele age nos **caminhos listados**, não no nome do campo em qualquer profundidade. O que pegou o vazamento foi um **teste que procura a senha no log** | 14   |
| `import pinoHttp from 'pino-http'` **não compila** com `verbatimModuleSyntax` (o pacote é CommonJS). Use `import { pinoHttp }`                                                                                                                                                                                                                   | 14   |
| `genReqId`/`customLogLevel` recebem `IncomingMessage`/`ServerResponse` do `node:http`, e **não são inferidos** — anotar é obrigatório (TS7006)                                                                                                                                                                                                   | 14   |
| **Pino não é mais rápido que `JSON.stringify` na mão** (220ms × 156ms, 50 mil linhas). O que ele compra é nível, redação, child logger e serialização de `Error`                                                                                                                                                                                 | 14   |
| `JSON.stringify(new Error('x'))` devolve `{}` — as propriedades são não-enumeráveis, e a stack se perde justamente no log que mais importa                                                                                                                                                                                                       | 14   |

**Testes e build**

| Achado                                                                                                                                                                                                                                              | Onde   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `criarApp()` precisou ser extraído: os módulos 01–11 chamam `listen` no topo, e importar isso num teste sobe servidor de verdade (`EADDRINUSE`, o processo não encerra). Os anteriores **não** foram reescritos, e o contraste virou conteúdo do 12 | 12     |
| **Rate limit versus suíte**: baldes separados por rota e `criarApp(deps, { rateLimit: false })` no teste. Nunca afrouxar o limite de produção para o teste caber                                                                                    | 12, 13 |
| `tsconfig.build.json` foi necessário para os testes serem checados por `npm run typecheck` e ficarem **fora** de `dist/`                                                                                                                            | 12     |
| `process.loadEnvFile()` (nativo) no `vitest.setup.ts` é o que faz `npm test` rodar sem `--env-file` e sem `dotenv`                                                                                                                                  | 12     |
| `tsconfig.exercicios.json` precisou de `rootDir: "."` para a solução do 10 importar o Prisma Client gerado em `src/`                                                                                                                                | 10     |

### Nomes de arquivo já reservados

Os docs têm links apontando para módulos futuros. Eles só vão funcionar se os
arquivos usarem **exatamente** estes nomes:

| Arquivo                     | Citado em |
| --------------------------- | --------- |
| `15-performance-e-cache.md` | 06, 09    |
| `16-deploy-docker-ci.md`    | 06        |
| `17-jobs-e-filas.md`        | 06        |

> **Nota:** na revisão de 2026-08-13 esses três links viraram texto simples
> ("módulo 15, ainda não escrito"), porque link para arquivo inexistente dá 404
> no GitHub. Ao criar os módulos, vale voltar e transformá-los em link de novo.

### Setup numa árvore recém-clonada

Duas coisas do módulo 10 não vêm no git, e cada uma quebra de um jeito diferente:

| O que falta                     | Como se manifesta                                                      | Resolve com           |
| ------------------------------- | ---------------------------------------------------------------------- | --------------------- |
| Prisma Client (`gerado/`)       | `npm run typecheck` acusa 4 erros em `src/exemplos/10-prisma/`         | `npm run db:generate` |
| Banco `data/*.sqlite` (migrado) | O exemplo roda e lança **P2021**: "table `main.livros` does not exist" | `npm run db:migrate`  |

A sequência completa:

```bash
npm install
npm run db:generate   # gera o client em src/exemplos/10-prisma/gerado/
npm run db:migrate    # cria as tabelas
npm run db:seed       # popula (2 autores, 3 livros)
```

Sem o terceiro passo o exemplo roda, mas devolve listas vazias — o que confunde
mais do que um erro.

---

> **Atenção:** desde 2026-08-18 as soluções dos exercícios **11, 12 e 13** também
> usam Prisma, não só o módulo 10. Sem `db:generate` + `db:migrate` + `db:seed`
> os servidores delas falham na primeira query. `npm test` continua verde — os
> testes usam repositórios em memória, e a suíte de contrato se pula sozinha com
> aviso visível. Para subir qualquer uma sem banco: `REPO=memoria node ...`.

## 3. Decisões técnicas (e o porquê de cada uma)

| Decisão                                     | Motivo                                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ESM** (`"type": "module"`)                | Exigido pela combinação `verbatimModuleSyntax` + `module: nodenext` já presente no tsconfig. Também é o padrão do ecossistema hoje.                                                                          |
| **Node 24 com type stripping nativo**       | `node src/server.ts` roda TypeScript direto, sem build e sem `ts-node`/`tsx`. Menos ferramenta = menos coisa pra explicar pra quem está estudando.                                                           |
| **`node --watch`** em vez de `nodemon`      | O Node 24 já tem watch mode embutido. O `nodemon` vira dependência morta. **Ação:** remover `nodemon` do `package.json`.                                                                                     |
| **`node --env-file`** em vez de `dotenv`    | O Node moderno lê `.env` nativamente. O `dotenv` só entra na doc como nota histórica (você vai ver em todo tutorial antigo).                                                                                 |
| **`erasableSyntaxOnly: true`**              | O type stripping do Node só apaga tipos, não transforma código. Essa flag faz o `tsc` recusar `enum`, `namespace` e `import =`, que quebrariam em runtime. Erro na hora de escrever, não na hora de rodar.   |
| **`rewriteRelativeImportExtensions: true`** | Permite escrever `import { x } from './foo.ts'` (o que o Node exige ao rodar direto) e mesmo assim gerar `./foo.js` no build.                                                                                |
| **`tsc` só para build e typecheck**         | Rodar (`dev`) não passa pelo `tsc`. Ele existe para checar tipos (`typecheck`) e gerar `dist/` (`build`).                                                                                                    |
| **Banco: SQLite**                           | Zero instalação, banco é um arquivo, e é **SQL de verdade** — o que você aprende transfere para Postgres. Ainda por cima o Node 24 tem `node:sqlite` embutido, então dá pra começar sem dependência nenhuma. |
| **Progressão de acesso a dados**            | `node:sqlite` (SQL na mão) → Prisma (ORM). Nessa ordem, de propósito: quem aprende ORM antes de SQL não entende o que o ORM está fazendo — nem por que ele às vezes gera uma query horrível.                 |
| **Uma dependência por vez, quando dói**     | Cada lib entra no módulo que a justifica, depois de você sentir o problema sem ela. Ver a dor antes do remédio é o que faz a ferramenta fazer sentido.                                                       |
| **Documentação em Markdown puro**           | Sem MDX, AsciiDoc ou Notion — e sem depender de extensão do editor. Detalhe abaixo.                                                                                                                          |

### Por que Markdown puro, e não um formato "mais bonito"

O ganho visual que se quer — diagrama colorido, fórmula, destaque — **já existe
no Markdown**: o VS Code renderiza **mermaid** e KaTeX no preview nativo
(`Ctrl+K V`) desde a versão **1.121**, sem instalar nada, e o GitHub faz o mesmo.

Os formatos descartados, e o motivo:

| Formato               | O que ganharia          | Por que **não** aqui                                                                              |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| **MDX**               | Componente React na doc | Precisa de build, dependência e um site para renderizar. Você aprenderia Docusaurus, não backend. |
| **AsciiDoc**          | Include, PDF, cross-ref | Sintaxe que só ele usa, e o GitHub renderiza pior. Some a portabilidade que o `.md` dá de graça.  |
| **Notion / Obsidian** | Editor bonito           | Sai do git. Doc que não vive ao lado do código apodrece — é o argumento do próprio módulo 20.     |

Pela mesma razão, nada de sintaxe que **só uma extensão entende**: `{cmd=true}`
e `@import "[TOC]"` (Markdown Preview Enhanced) viram lixo visual para quem não a
tem instalada. O `.md` daqui abre igual no VS Code, no GitHub e em qualquer
editor de texto — que é exatamente o ponto.

---

## 4. Estrutura de pastas alvo

```
Backend-express/
├── CLAUDE.md                    # regras curtas para o Claude Code
├── README.md                    # porta de entrada + índice do currículo
├── .gitignore                   # restaurado (foi deletado)
├── .env.example                 # variáveis de ambiente documentadas
├── package.json
├── tsconfig.json
│
├── .projeto/                    # 🔧 INTERNO — nada aqui é material de estudo
│   ├── GUIA-IMPLEMENTACAO.md    #    este arquivo
│   ├── GUIA-README.md           #    como fazer o README do GitHub
│   ├── ULTIMO.md                #    bilhete entre sessões
│   ├── specs/                   #    desenhos aprovados
│   └── plans/                   #    planos de execução
│
├── assets/                      # 🖼️ imagens do README (geradas por gerar.mjs)
│
├── docs/                        # 📚 TEORIA — um arquivo por módulo
│   ├── 00-glossario.md          #    toda palavra técnica, em uma frase
│   ├── 01-fundamentos-http.md
│   ├── 02-node-modulos-e-async.md
│   ├── ...
│   └── 20-alem-do-rest.md
│
├── src/
│   ├── server.ts                # servidor principal, evolui junto com o curso
│   │
│   ├── exemplos/                # 🧪 CÓDIGO DE ESTUDO — referência, não editar
│   │   ├── 01-http-sem-express/
│   │   ├── 03-express-basico/
│   │   └── ...                  # uma pasta por módulo que tem código
│   │
│   └── playground/              # 🔒 SEU ESPAÇO — ninguém mexe aqui
│       ├── README.md            # explica as regras da área
│       └── .gitkeep
│
├── exercicios/                  # 🏋️ EXERCÍCIOS — um enunciado por módulo
│   ├── 01-fundamentos-http/
│   │   ├── README.md            # enunciado, critérios de aceite, dicas
│   │   └── solucao/             # resolução comentada (olhe só depois de tentar)
│   └── ...
│
├── prisma/                      # schema e migrations (a partir do módulo 10)
├── data/                        # arquivos .sqlite (ignorados no git)
└── dist/                        # gerado por `npm run build` (ignorado no git)
```

### A regra do `src/playground/`

Esta é a parte mais importante da organização:

- **`docs/` e `src/exemplos/`** são material didático. O Claude pode criar,
  editar e reorganizar à vontade.
- **`src/playground/`** é seu. Sessões futuras do Claude **não devem criar,
  editar ou apagar nada aí dentro sem você pedir explicitamente**. Se você pedir
  ajuda com um arquivo do playground, aí sim.

Essa regra fica registrada no `CLAUDE.md` para valer em toda sessão futura.

---

## 5. Currículo — 20 módulos

Cada módulo = 1 arquivo em `docs/`. Os marcados com 🧪 têm código executável em
`src/exemplos/`. A coluna de ferramentas mostra o que entra de novo ali.

### Parte I — Fundamentos (antes do framework)

**01 — Fundamentos de HTTP e da web** 🧪 · _`node:http`_
Cliente/servidor, o ciclo request/response. Anatomia de uma requisição: método,
URL, headers, body. Métodos HTTP e seus significados — e o que são idempotência
e segurança de um método. Status codes: as cinco famílias e os ~12 que você usa
de verdade. Headers importantes (`Content-Type`, `Authorization`,
`Cache-Control`). Statelessness: por que o servidor não lembra de você entre
requisições, e o que isso força no design.
_Exemplo: um servidor com `node:http` puro, sem Express — para você ver
exatamente o que o Express faz por você depois._

**02 — Node.js, módulos e assincronia** 🧪 · _`npm`, semver_
O que o Node é (runtime V8 + libuv). Event loop explicado sem mistificação: por
que I/O não bloqueia mas um `for` de 10 milhões de iterações bloqueia. CommonJS
vs ESM e por que este repo usa ESM. `package.json` campo a campo. Semver e o que
`^5.2.1` realmente permite. `dependencies` vs `devDependencies`. Callbacks →
Promises → `async/await`. O `try/catch` que não pega nada.
_Exemplo: o mesmo trabalho feito de forma bloqueante e não-bloqueante, medindo._

### Parte II — Express

**03 — Express básico** 🧪 · _`express`_
O que um framework web resolve. `app`, rotas, `request`, `response`. Os três
tipos de parâmetro e quando usar cada um: **route params** (identificar um
recurso, obrigatório), **query params** (filtro/paginação, opcional), **body**
(dados de criação/edição). `express.json()` e por que sem ele `req.body` é
`undefined`. `res.json()`, `res.status()`, `res.send()`.
_Exemplo: o CRUD de `/courses` do commit original, portado para TypeScript._

**04 — Roteamento e organização de rotas** 🧪
Padrões de rota, parâmetros opcionais, wildcards. `express.Router()` para quebrar
o servidor em arquivos. Prefixos e montagem (`app.use('/api/v1', ...)`). Ordem de
rotas importa: por que `/courses/new` precisa vir antes de `/courses/:id`.
Versionamento de API. Design de URLs REST: substantivo no plural, hierarquia,
o que não fazer (`/getCourses`).
_Exemplo: o CRUD do módulo 03 refatorado em routers separados._

**05 — Middlewares** 🧪 · _`cors`, `morgan`_
O conceito central do Express: uma cadeia de funções com `(req, res, next)`.
Middleware global, de rota e de erro. O que acontece se você esquecer o `next()`.
Ordem de execução. Escrevendo os seus: logger, timer, verificador de API key.
Middlewares de terceiros e onde encaixar.
_Exemplo: uma pilha de middlewares com log mostrando a ordem real de execução._

**06 — Tratamento de erros** 🧪
Por que `throw` dentro de rota async derruba o processo no Express 4 (e o que
mudou no Express 5). Error-handling middleware (a função de 4 argumentos).
Classe `AppError` própria com status code. Erros esperados vs bugs. Nunca vazar
stack trace para o cliente. Formato consistente de resposta de erro.
_Exemplo: um handler de erro central + `AppError` aplicados ao CRUD._

**07 — Validação e contratos de entrada** 🧪 · _`zod`_
Regra de ouro: **nunca confie no cliente**. Validar tipo, formato,
obrigatoriedade e limites. Validação manual e sua dor. Zod: schemas, `parse` vs
`safeParse`, inferência de tipo (`z.infer`) — validação e tipagem da mesma fonte.
Middleware genérico `validate(schema)`. Diferença entre validação (formato) e
regra de negócio.
_Exemplo: `POST /courses` com schema Zod e middleware de validação._

### Parte III — Arquitetura e dados

**08 — Arquitetura em camadas**
O problema: rotas de 200 linhas fazendo tudo. Separação **route → controller →
service → repository**, com a responsabilidade de cada camada. Regra da direção
das dependências. Injeção de dependência sem framework. DTOs. Quando _não_ usar
camadas (projeto pequeno não precisa de 4 níveis). Uma passada honesta em Clean
Architecture e DDD: o que vale a pena e o que é excesso.

**09 — Banco de dados e SQL com SQLite** 🧪 · _`node:sqlite`_
Do array em memória para o banco. Por que SQLite é um ótimo banco de estudo (e
de produção, em muitos casos). SQL na mão: `CREATE TABLE`, `INSERT`, `SELECT`,
`UPDATE`, `DELETE`, `JOIN`, `GROUP BY`. Modelagem relacional: chaves primárias e
estrangeiras, relacionamentos 1-N e N-N, tabela de junção. Normalização o
suficiente. Índices e por que sua query fica lenta sem eles (`EXPLAIN QUERY
PLAN`). Transações e ACID. **SQL injection** e por que query parametrizada
resolve. Migrations escritas à mão.
_Exemplo: o repositório de courses reescrito sobre `node:sqlite`, sem nenhuma
dependência externa — o resto do app não muda, que era o objetivo da camada
repository._

**10 — ORM com Prisma** 🧪 · _`prisma`, `@prisma/client`_
O que um ORM resolve e o que ele cobra em troca. Driver vs query builder vs ORM.
`schema.prisma`: modelos, relações, tipos. `prisma migrate` e por que o schema
vive no git. Prisma Client tipado de ponta a ponta. Queries, includes e o
**problema N+1** — como detectar e resolver. Transações no Prisma. Seeds.
Prisma Studio. Quando cair de volta pra SQL cru. Comparação rápida com Drizzle
e Knex.
_Exemplo: o mesmo repositório do módulo 09, agora com Prisma sobre o mesmo
SQLite — mostrando que só a camada de dados mudou._

**11 — Autenticação e autorização** 🧪 · _`argon2`, `jsonwebtoken`, `cookie-parser`_
A diferença entre as duas (quem você é × o que você pode). Hash de senha: por
que Argon2/bcrypt e nunca SHA-256. Salt e fator de custo. Sessão com cookie vs
JWT: trade-offs reais, não hype. Anatomia de um JWT e o que **não** colocar no
payload. Access token + refresh token. Cookies `httpOnly` e `SameSite`.
Middleware de autenticação e de autorização por papel (RBAC). OAuth2 em visão
geral.
_Exemplo: registro, login, rota protegida e rota só-para-admin._

**12 — Testes** 🧪 · _`vitest`, `supertest`_
A pirâmide: unitário, integração, e2e. O que testar em cada nível. Vitest como
runner. Testando rotas HTTP com Supertest sem subir servidor de verdade. Mocks,
stubs e por que a camada repository torna o service fácil de testar. Fixtures e
banco de teste (SQLite em memória — aqui ele brilha). Cobertura como sintoma,
não como meta. TDD numa feature real.
_Exemplo: suíte cobrindo o CRUD e o fluxo de autenticação._

### Parte IV — Produção

**13 — Segurança** 🧪 · _`helmet`, `express-rate-limit`_
OWASP Top 10 aplicado a uma API Node. Injeção de SQL (retomando o módulo 09).
XSS e por que ainda importa numa API. CSRF e quando você precisa se preocupar.
Rate limiting e brute force. CORS explicado de verdade — o que o header faz e o
que ele **não** faz. `helmet` e os headers que ele liga. Segredos: `.env`,
variáveis de ambiente, o que nunca vai pro git. Validação de upload.
Dependências vulneráveis (`npm audit`).

**14 — Observabilidade** 🧪 · _`pino`, `pino-http`_
Logs estruturados (JSON) vs `console.log`. Níveis de log. Request ID para
correlacionar uma requisição inteira. Pino. O que **nunca** logar (senha, token,
CPF). Métricas: RED (Rate, Errors, Duration). Health check e readiness check.
Tracing distribuído e OpenTelemetry em visão geral.
_Exemplo: logger com request ID atravessando toda a stack._

**15 — Performance, cache e escala** 🧪 · _`redis`/`ioredis`, `compression`_
Medir antes de otimizar. Caching: em memória, Redis, HTTP cache headers
(`ETag`, `Cache-Control`). Estratégias e invalidação de cache. Paginação
(offset vs cursor) e por que offset degrada. Compressão. Keep-alive. Escala
vertical vs horizontal. Statelessness como pré-requisito de escala horizontal.
Graceful shutdown. Load balancing e `node:cluster`. Load testing com `autocannon`.
_Exemplo: rota lenta, medida, depois cacheada — com número antes e depois._

**16 — Deploy, Docker e CI/CD** 🧪 · _Docker, GitHub Actions_
Configuração por ambiente sem `if (production)` espalhado. Build de produção.
Docker: Dockerfile multi-stage, `.dockerignore`, imagem pequena, usuário não-root.
`docker-compose` para subir app + Redis junto. Variáveis de ambiente em produção.
CI/CD com GitHub Actions: lint → typecheck → test → build. Migrations no deploy.
Rollback.
_Exemplo: Dockerfile + workflow do GitHub Actions funcionando._

### Parte V — Tópicos avançados

**17 — Jobs, filas e trabalho em background** 🧪 · _`bullmq`_
Por que não fazer trabalho pesado dentro do request. Filas: produtor, consumidor,
worker. BullMQ sobre Redis. Retry, backoff exponencial e dead letter queue.
Idempotência de job (o mesmo job pode rodar duas vezes — e vai). Jobs agendados
(cron). Processamento de e-mail e relatório como casos clássicos.
_Exemplo: envio de e-mail de boas-vindas movido para uma fila._

**18 — Tempo real: WebSocket e SSE** 🧪 · _`ws`_
Quando polling basta e quando não basta. Server-Sent Events vs WebSocket:
trade-offs. Handshake e o ciclo de vida de uma conexão. Broadcast, salas e
autenticação numa conexão WebSocket. O problema de escalar WebSocket
horizontalmente (e o pub/sub do Redis como resposta).
_Exemplo: um chat mínimo e um endpoint SSE de progresso._

**19 — Arquivos e uploads** 🧪 · _`multer`_
`multipart/form-data` e por que `express.json()` não dá conta. Multer: memória vs
disco. Limites de tamanho e validação de tipo real (magic bytes, não a extensão).
Storage local vs S3. URLs pré-assinadas. Streaming de arquivos grandes sem
estourar a memória. Servir estáticos.
_Exemplo: upload de imagem de capa do curso, com validação._

**20 — Além do REST: documentação, GraphQL e RPC** 🧪 · _`swagger-ui-express`, `zod-to-openapi`_
OpenAPI/Swagger: documentação gerada a partir dos schemas Zod que você já
escreveu no módulo 07. Por que doc que não vem do código apodrece. Visão geral e
comparação honesta: REST vs GraphQL vs tRPC vs gRPC — que problema cada um
resolve e quando o custo não compensa. Webhooks.
_Exemplo: Swagger UI navegável servido pela própria API._

### Apêndices

- **A — Glossário** de termos (idempotência, middleware, ORM, JWT, CORS...).
- **B — Cheatsheet HTTP**: métodos, status codes e headers em tabela.
- **C — Checklist de API de produção**: o que revisar antes de subir.
- **D — Erros comuns de iniciante** e como reconhecê-los.
- **E — Catálogo de ferramentas**: a seção 6 deste guia, extraída para consulta.

---

## 6. Ecossistema de ferramentas — o que cada uma faz e quando entra

Ordem de introdução do básico ao avançado. Nada é instalado antes do módulo que
justifica a ferramenta.

### Nível 0 — Já no repositório

| Ferramenta       | Para que serve                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js 24**   | O runtime. Aqui usamos três recursos modernos que dispensam libs: type stripping (`node arquivo.ts`), `--watch` e `--env-file`. |
| **TypeScript 7** | Tipos em tempo de escrita. Neste repo ele **não** compila para rodar — só faz typecheck e o build de produção.                  |
| **Express 5**    | O framework web. Roteamento + middlewares.                                                                                      |
| **npm**          | Gerenciador de pacotes e executor de scripts.                                                                                   |

### Nível 1 — Qualidade de código (Fase 0)

| Ferramenta              | Para que serve                                                                                                                                 | Entra em                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **ESLint**              | Encontra código problemático (variável não usada, `await` esquecido, promise solta). Diferente do TS: o TS checa tipo, o ESLint checa prática. | ⛔ bloqueado — peer exige TS <6.1 |
| **Prettier**            | Formatação automática. Acaba com discussão de estilo.                                                                                          | Fase 0                            |
| **EditorConfig**        | Alinha o editor (indentação, fim de linha) entre máquinas.                                                                                     | Fase 0                            |
| **Husky + lint-staged** | Git hooks: roda lint/format no que você está commitando. Impede commit quebrado.                                                               | Fase 0 (opcional)                 |

### Nível 2 — Aplicação (Parte II)

| Ferramenta | Para que serve                                                                                                                 | Entra em |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **cors**   | Libera o navegador a chamar sua API de outra origem. Sem isso, front em `localhost:3000` não fala com API em `localhost:5050`. | 05       |
| **morgan** | Log de requisição HTTP pronto. Didático — no módulo 14 é substituído por Pino.                                                 | 05       |
| **zod**    | Valida a entrada **e** gera o tipo TypeScript do mesmo schema. Uma fonte de verdade.                                           | 07       |

### Nível 3 — Dados (Parte III)

| Ferramenta                      | Para que serve                                                                                                     | Entra em  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| **node:sqlite**                 | Módulo embutido do Node 24. Banco SQL real, zero dependência, banco = 1 arquivo. Aqui você escreve SQL na mão.     | 09        |
| **better-sqlite3**              | Alternativa madura ao `node:sqlite`, síncrona e muito rápida. Citada como comparação.                              | 09 (nota) |
| **prisma** + **@prisma/client** | ORM com schema declarativo, migrations e client totalmente tipado. Sobre o mesmo SQLite.                           | 10        |
| **drizzle-orm** / **knex**      | Alternativas — Drizzle (mais próximo do SQL, tipado) e Knex (query builder clássico). Comparação, sem implementar. | 10 (nota) |

### Nível 4 — Auth e testes

| Ferramenta              | Para que serve                                                                     | Entra em  |
| ----------------------- | ---------------------------------------------------------------------------------- | --------- |
| **argon2**              | Hash de senha. Vencedor da Password Hashing Competition; hoje preferido ao bcrypt. | 11        |
| **bcrypt**              | O padrão anterior, ainda onipresente. Você vai encontrar em código legado.         | 11 (nota) |
| **jsonwebtoken**        | Assina e verifica JWT.                                                             | 11        |
| **cookie-parser**       | Lê cookies do request — necessário para refresh token em cookie `httpOnly`.        | 11        |
| **vitest**              | Test runner rápido, com TypeScript e ESM nativos — sem transformador.              | 12        |
| **supertest**           | Dispara requisições HTTP contra o `app` Express sem abrir porta.                   | 12        |
| **@vitest/coverage-v8** | Relatório de cobertura pelo V8, sem instrumentar o código.                         | 12        |
| **node:test**           | Runner embutido no Node. Citado como alternativa mínima ao Vitest.                 | 12 (nota) |

### Nível 5 — Produção

| Ferramenta                   | Para que serve                                                                       | Entra em |
| ---------------------------- | ------------------------------------------------------------------------------------ | -------- |
| **helmet**                   | Liga headers HTTP de segurança de uma vez.                                           | 13       |
| **express-rate-limit**       | Limita requisições por IP. Freia brute force e abuso.                                | 13       |
| **pino** + **pino-http**     | Log estruturado em JSON, rápido. É o que máquina consegue ler e filtrar.             | 14       |
| **compression**              | Gzip/Brotli nas respostas. Menos banda, resposta mais rápida.                        | 15       |
| **redis** (client `ioredis`) | Cache em memória compartilhado entre instâncias. Também é a base de filas e pub/sub. | 15       |
| **autocannon**               | Load testing por linha de comando. Gera o número que justifica a otimização.         | 15       |
| **Docker**                   | Empacota app + dependências numa imagem que roda igual em qualquer lugar.            | 16       |
| **docker-compose**           | Sobe vários serviços juntos (API + Redis) com um comando.                            | 16       |
| **GitHub Actions**           | CI/CD: roda lint, typecheck e testes a cada push.                                    | 16       |

### Nível 6 — Avançado

| Ferramenta                                  | Para que serve                                                        | Entra em  |
| ------------------------------------------- | --------------------------------------------------------------------- | --------- |
| **bullmq**                                  | Filas e workers sobre Redis. Retry, agendamento, concorrência.        | 17        |
| **ws**                                      | WebSocket cru — o suficiente para entender o protocolo.               | 18        |
| **socket.io**                               | Camada de conveniência sobre WebSocket (salas, reconexão, fallback).  | 18 (nota) |
| **multer**                                  | Upload `multipart/form-data`.                                         | 19        |
| **swagger-ui-express** + **zod-to-openapi** | Documentação OpenAPI navegável gerada dos schemas Zod que já existem. | 20        |
| **OpenTelemetry**                           | Padrão de tracing/métricas. Visão geral, sem implementar.             | 14 (nota) |

### Ferramentas que este repo deliberadamente **não** usa

Vale saber por quê — você vai encontrá-las em tutoriais:

- **nodemon** — `node --watch` faz o mesmo, embutido.
- **ts-node / tsx** — o Node 24 roda `.ts` direto.
- **dotenv** — `node --env-file=.env` é nativo.
- **body-parser** — virou parte do Express (`express.json()`).
- **NestJS** — excelente framework, mas esconde o Express atrás de decorators e
  DI. Ruim para _aprender_ o que está acontecendo por baixo. Vale estudar depois.

---

## 7. Padrão de escrita dos módulos

A meta é o leitor **entender**, não passar rápido pelo texto. Cobertura completa
e explicação completa: o corte é por redundância, nunca por concisão.

> **Atenção:**
> Aqui dizia "cobertura completa, **texto curto**". Essa frase produziu módulos
> que citavam conceito sem explicar, e foi trocada na revisão de 2026-08-13.
> Módulo longo não é defeito; módulo em que o leitor trava numa palavra é.

### Template obrigatório de cada `docs/NN-*.md`

```markdown
# NN — Título

**Em uma frase:** o que é isso.

## Por que importa

3 bullets, no máximo. Que problema resolve.

## Conceitos

Um conceito por vez, e cada um pelas cinco camadas na ordem: problema →
mecânica → princípio → trade-off → consequência. Abre no caso mínimo e cresce.
Tabela serve para comparar e enumerar, **depois** da explicação — nunca no
lugar dela.

## Na prática

O exemplo do módulo rodando, com os comandos e a saída que eles devolvem
de verdade.

## Erros comuns

| Erro | O que acontece | Correção |

## Cheatsheet

O resumo que você volta pra consultar depois.

## Os princípios deste módulo

Tabela: o princípio em frase comum + em que módulos ele reaparece. É recapitulação
do que o leitor já viu no corpo — nunca a primeira aparição da ideia.

## Mini desafios

Perguntas curtas que se respondem RODANDO. Formato na subseção abaixo.

## Se quiser ir mais fundo

Comparação com outros frameworks, nome acadêmico do padrão, caso de borda,
detalhe de implementação. Tudo que é verdade mas atrapalha a primeira leitura.
Some a seção inteira se o módulo não tiver nada assim.

## Para ir além

Referências externas comentadas — por que ler cada uma.

## Pratique

Link para `exercicios/NN-*/` + 1 desafio extra opcional.
```

### Mini desafios — o formato

Servem para **fixar fazendo**, não para revisar lendo. Ficam no doc do módulo,
depois dos princípios, e não substituem o exercício da pasta `exercicios/`.

| Regra                       | Detalhe                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **Exige ação**              | Rodar, medir ou quebrar de propósito. Se dá para responder relendo, não é desafio.      |
| **Peça a previsão antes**   | "Aposte o status antes de rodar." Errar a previsão é o que fixa o conceito.             |
| **Resposta em `<details>`** | O leitor tenta primeiro. A resposta explica o **porquê**, não só o resultado.           |
| **Prefira a surpresa**      | Os melhores nascem de comportamento inesperado do próprio exemplo do módulo.            |
| **Verifique antes**         | **Todo resultado prometido tem que ser rodado antes de escrever.** Ver o alerta abaixo. |
| Quantidade                  | Livre. O módulo 01 ficou com 10 — o critério é cobrir os conceitos que importam.        |

> **Atenção:** ao escrever os desafios do módulo 01, um deles prometia `400` onde
> o servidor devolve `201` — o exemplo ignora o `Content-Type` e tenta
> `JSON.parse` em qualquer corpo. Um desafio com resultado errado ensina errado e
> destrói a confiança no material. **Rode antes de prometer.**

### Regras

| Regra             | Limite                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tamanho do módulo | **Sem limite.** Acaba quando o assunto acaba, não na linha N.                                                                                     |
| Parágrafo         | **Uma ideia.** O limite é a ideia, não a linha: um parágrafo de 8 linhas que desenvolve um raciocínio fica; dois de 3 dizendo a mesma coisa saem. |
| Prosa e código    | Código mostra o **quê**; o texto ao redor diz o **porquê** e o que observar. Bloco de código entre dois títulos, sem texto, é defeito.            |
| Listas e tabelas  | Preferidas a texto corrido para comparação e enumeração — **não** para substituir a explicação que precede a comparação.                          |
| Teoria            | Só a que muda uma decisão sua. História e curiosidade ficam de fora.                                                                              |
| Repetição         | Conceito já explicado vira link para o módulo, não é reexplicado.                                                                                 |

### Qualidade de ensino — o padrão que vale acima de tudo

"Enxuto" nunca é desculpa para raso. **Corte redundância, não profundidade.** Um
módulo que cabe em 100 linhas mas deixa o leitor sem entender _por que_ a coisa
funciona assim falhou — e precisa crescer.

O teste de cada módulo: depois de lê-lo, o leitor consegue **decidir sozinho**
num caso que o módulo não mostrou?

#### As cinco camadas obrigatórias de todo conceito

Todo conceito que entra num módulo passa pelas cinco, **nesta ordem**. Faltou
uma, o conceito está pela metade; fora de ordem, o leitor trava:

| #   | Camada           | Pergunta que responde                               | Como cortar se ficar longo                 |
| --- | ---------------- | --------------------------------------------------- | ------------------------------------------ |
| 1   | **Problema**     | Que dor existia antes disto?                        | Vira uma frase, nunca some                 |
| 2   | **Mecânica**     | Como funciona por baixo?                            | **Não corte. É o que responde "por quê".** |
| 3   | **Princípio**    | Que ideia geral isto que você acabou de ver mostra? | Vira uma frase, sempre depois da mecânica  |
| 4   | **Trade-off**    | O que isto custa e quando **não** usar?             | Vira linha de tabela                       |
| 5   | **Consequência** | O que muda no código de quem usa?                   | Vira o exemplo executável                  |

> **Atenção:**
> **A ordem é obrigatória.** Princípio antes da mecânica foi o defeito que
> motivou a revisão de 2026-08-13: o leitor ouvia o nome de uma coisa que ainda
> não tinha visto acontecer, e parava ali.
>
> O caso que provocou a mudança estava no módulo 05: _"middleware é composição de
> funções sobre um valor mutável — a mágica do framework é uma lista de funções e
> um índice que anda"_. A lista e o índice nunca eram mostrados. O leitor
> perguntou, com razão: **que valor mutável? que índice?**

A camada 3 continua sendo a razão de o repositório existir — Express, Zod e
Prisma mudam; "não confie no cliente" e "estado compartilhado precisa de
coordenação" não. Mas ela é **conclusão, não premissa**: só entra depois que o
leitor viu a coisa funcionar, e é escrita em frase comum.

> **Cuidado:**
> Se a frase precisa ser decorada para fazer sentido, ela está errada.
>
> "**A senha nunca é armazenada**" é princípio: qualquer pessoa entende, e
> continua valendo quando o argon2 for substituído.
>
> "**Middleware é composição de funções sobre um valor mutável**" é aforismo:
> soa profundo, exige três definições que não foram dadas, e não ensina ninguém
> a decidir nada.

#### Regras de material e exemplo

| Regra                          | Detalhe                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Princípio derivado**         | Aparece **depois** da mecânica que o sustenta, em frase comum. O leitor tem que conseguir dizer "ah, é isso que eu acabei de ver". |
| **Mostre a dor primeiro**      | O jeito ruim (comentado como ruim) antes do bom. Ferramenta sem dor prévia vira ritual.                                            |
| **Toda decisão tem um porquê** | Nenhum número, flag ou opção entra sem a frase que explica a escolha. `memoryCost: 19456` — por quê?                               |
| **Diga o custo**               | Toda técnica tem contrapartida. Módulo que só elogia a ferramenta não ensina a escolher.                                           |
| **Exemplo é progressivo**      | Começa mínimo e cresce. Um arquivo de 200 linhas despejado de uma vez não ensina, só impressiona.                                  |
| **Exemplo é real**             | Reusa o domínio da biblioteca. Nada de `foo`/`bar` — o leitor tem que reconhecer o problema.                                       |
| **Erro comum é reproduzível**  | A tabela "Erros comuns" descreve o sintoma exato (mensagem, status, comportamento), não "pode dar erro".                           |
| **Falso amigo explicitado**    | O que "parece certo e está errado" (`.partial()` no PATCH, `decode` no lugar de `verify`) vira destaque.                           |
| **Fecha o ciclo**              | O módulo lembra o que veio antes e diz qual módulo resolve o que ficou em aberto (`// TODO`).                                      |

#### Três regras que entraram na revisão de 2026-08-13

| Regra                           | Detalhe                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Termo definido na estreia**   | Toda palavra técnica é explicada na primeira vez que aparece, na própria linha ou na seguinte, e entra em [`docs/00-glossario.md`](../docs/00-glossario.md). Escreveu "aridade" sem dizer que é o número de parâmetros? O leitor parou ali. |
| **Diagrama não adianta módulo** | Um mermaid só pode conter o que já foi ensinado **até aquele módulo**. `helmet` num fluxo do 05 é ruído: o leitor vê sete caixas e reconhece duas. O que depende de módulo futuro vai para `## Se quiser ir mais fundo`.                    |
| **Rampa**                       | `## Conceitos` abre no caso mínimo e cresce. Comparação com outro framework, caso de borda e nome acadêmico do padrão saem do corpo do módulo.                                                                                              |

#### O mesmo padrão no código

Comentário de exemplo é material didático, não anotação. Ele explica o
**princípio e a armadilha**, não a sintaxe:

```ts
// ❌ Descreve o óbvio — sai
const hash = await argon2.hash(senha); // faz o hash da senha

// ✅ Explica a decisão — fica
// O salt não é passado: o argon2 gera um por senha e o embute no resultado. É o
// que faz duas senhas iguais terem hashes diferentes — e o que impede uma
// rainbow table de servir para todos os usuários de uma vez.
const hash = await argon2.hash(senha, CUSTO);
```

### Recursos de Markdown (só o padrão)

Os `.md` usam **Markdown puro** — nada que dependa de extensão. Tudo abaixo
renderiza igual no preview do VS Code (`Ctrl+K V`) e no GitHub.

| Recurso                 | Onde                                                  |
| ----------------------- | ----------------------------------------------------- |
| ` ```mermaid `          | Fluxo, sequência, camadas, ER, estado                 |
| `> **Atenção:** …`      | Armadilha e erro caro (citação com rótulo em negrito) |
| `<details>`             | Aprofundamento opcional — nunca o conteúdo principal  |
| Linguagem em todo bloco | ` ```ts `, ` ```sql `, ` ```http `, ` ```bash `       |
| `- [ ]`                 | Critérios de aceite                                   |

**Diagrama substitui prosa, não soma** — ao inserir um, corte o parágrafo que
ficou redundante.

**Não use** `> [!NOTE]`/`[!WARNING]`/`[!CAUTION]` nem sintaxe do Markdown
Preview Enhanced (`{cmd=true}`, `@import "[TOC]"`): a primeira é ruído visual
fora do GitHub, e a segunda não renderiza sem aquela extensão instalada.

### Comentários no código

Comentário é para o que muda uma decisão: o ponto-chave do trecho, a armadilha, o
porquê. `// TODO` marca o que um módulo à frente resolve. Código errado só
aparece se vier acompanhado da versão correta logo abaixo.

### O que **não** entrar

- História do protocolo/biblioteca, salvo se explicar um comportamento estranho.
- Enumerar API completa — para isso existe a documentação oficial, com link.
- Três formas de fazer a mesma coisa. Mostre a recomendada; cite as outras em
  uma linha.
- Aviso genérico tipo "lembre-se de sempre testar". Ou é específico, ou sai.

### Exercícios — um por módulo

Todo módulo tem uma pasta `exercicios/NN-nome/`. É a parte que fixa o conteúdo:
ler código pronto dá sensação de aprendizado, escrever do zero mostra o que você
realmente sabe.

**Formato do `exercicios/NN-nome/README.md`:**

```markdown
# Exercício NN — Título

⏱️ ~30 min · 🎯 Nível: iniciante | intermediário | avançado

## Objetivo

Uma frase.

## O que construir

Requisitos numerados e verificáveis. Nada vago.

## Critérios de aceite

- [ ] Checklist do que precisa funcionar.

## Dicas

<details><summary>Dica 1</summary>Empurrão pequeno.</details>
<details><summary>Dica 2</summary>Empurrão maior.</details>

## Desafio extra

Opcional, para quem terminou rápido.
```

**Regras dos exercícios:**

| Regra               | Detalhe                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| Onde resolver       | Em `src/playground/`. O enunciado nunca manda editar `src/exemplos/`.     |
| Tamanho             | 20–45 min. Exercício de 3h vira projeto e ninguém termina.                |
| Critérios de aceite | Sempre verificáveis — "retorna 404 com `{ error }`", não "trate o erro".  |
| Dicas               | Progressivas e escondidas em `<details>`, para não entregar de graça.     |
| Solução             | Em `solucao/`, comentada explicando as decisões — não só o código pronto. |
| Progressão          | O exercício usa só o que já foi ensinado até aquele módulo.               |

A partir do módulo 03 os exercícios formam um **projeto contínuo** (uma API de
biblioteca: livros, autores, empréstimos, usuários), que cresce junto com o
currículo — no fim você tem uma API completa que construiu do zero, e não 20
exercícios soltos.

---

## 8. Configurações a aplicar

### `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "rootDir": "./src", // descomentado — resolve o TS5011 no build
    "outDir": "./dist", // descomentado
    "module": "nodenext",
    "target": "esnext",
    "types": ["node"],

    "erasableSyntaxOnly": true, // novo — compatível com o Node
    "allowImportingTsExtensions": true, // novo
    "rewriteRelativeImportExtensions": true, // novo

    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
  },
  "include": ["src/**/*.ts"],
}
```

Também será **removido** `"jsx": "react-jsx"` — não existe JSX num projeto de
backend, a flag só polui.

### `package.json`

```jsonc
{
  "main": "dist/server.js", // era "index.js", arquivo que nem existe mais
  "scripts": {
    "dev": "node --watch --env-file=.env src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
  },
}
```

Scripts de `lint`, `format` e `test` entram junto com as ferramentas
correspondentes (Fase 0 e módulo 12).

E remover `nodemon` de `devDependencies` (substituído por `node --watch`).

### `.gitignore`

Restaurar o arquivo deletado. Conteúdo original já era bom (`node_modules/`,
`dist/`, `.env`, logs, arquivos de editor/SO) — acrescentar `data/*.sqlite*`.

### `.env.example`

Versionado, sem valores reais. Documenta que variáveis existem: `PORT`,
`NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`.

### Lockfile

O repo tem `pnpm-lock.yaml` versionado mas deletado no working tree, e um
`package-lock.json` novo (npm). **Escolher um gerenciador e ficar com ele.**
Recomendação: **npm**, que é o que está em uso — commitar `package-lock.json` e
remover `pnpm-lock.yaml` do git.

---

## 9. Roadmap de execução

Cada fase é entregável sozinha. Dá pra parar entre fases.

| Fase                        | O que entra                                                                                                                                  | Status                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **0 — Base**                | `.gitignore`, `tsconfig.json`, `package.json`, `.env.example`, ESLint + Prettier, `src/playground/`, `exercicios/`, `CLAUDE.md`, `README.md` | ✅ (menos ESLint)                               |
| **1 — Fundamentos**         | docs 01–02 + exemplos + exercícios                                                                                                           | ✅                                              |
| **2 — Express**             | docs 03–07 + exemplos + exercícios (início da API de biblioteca)                                                                             | ✅                                              |
| **3 — Arquitetura e dados** | docs 08–12 + exemplos + exercícios (SQLite → Prisma → auth → testes)                                                                         | ✅                                              |
| **4 — Produção**            | docs 13–16 + exemplos + exercícios                                                                                                           | 🔶 13 completo; 14 sem solução; 15–16 pendentes |
| **5 — Avançado**            | docs 17–20 + exemplos + exercícios                                                                                                           | ⬜                                              |
| **6 — Apêndices**           | A, B, C, D, E                                                                                                                                | ⬜                                              |

Marque `✅` conforme concluir. Sessões futuras leem esta tabela para saber onde
retomar.

---

## 10. Instruções para sessões futuras do Claude Code

1. **Leia este arquivo primeiro.** A tabela da seção 9 diz onde o trabalho parou.
2. **Nunca toque em `src/playground/`** sem pedido explícito. É a área do usuário.
3. **Escreva em português**, incluindo comentários de código.
4. **Todo exemplo tem que rodar.** Antes de dizer que um módulo está pronto:
   execute o exemplo e rode `npm run typecheck`.
5. **Uma dependência nova só entra no módulo que a justifica** (seção 6) — e a
   doc precisa explicar qual problema ela resolve e o que ela custa.
6. **Explique o porquê, não só o como.** O objetivo é ensinar princípios de
   backend; o Express é o veículo. Todo conceito passa pelas cinco camadas da
   seção 7 **nesta ordem** (problema → **mecânica** → princípio → trade-off →
   consequência). O princípio vem depois de o leitor ver a coisa funcionar, e é
   escrito em frase comum — nunca aforismo.
7. **Não reescreva módulos já concluídos** por preferência de estilo. Corrija
   erro e acrescente profundidade que falta — não troque redação por gosto.
8. **Siga o padrão de escrita da seção 7.** Corte o que se repete ou não muda uma
   decisão; nunca corte profundidade nem por contagem de linhas. Módulo raso é
   defeito, módulo longo não é.
9. Ao terminar uma fase, **atualize a tabela da seção 9** neste arquivo.

---

## 11. Como você usa o repositório

```bash
npm install          # uma vez
npm run dev          # sobe o servidor com reload automático
npm run typecheck    # confere os tipos
npm run build        # gera dist/
npm start            # roda o build
```

Sugestão de rotina de estudo por módulo:

1. Ler o `docs/NN-*.md`.
2. Rodar o exemplo em `src/exemplos/NN-*/` e mexer nele para ver o que quebra.
3. Reimplementar a ideia do seu jeito em `src/playground/`.

O passo 3 é o que fixa. Ler e rodar código pronto dá sensação de aprendizado;
escrever do zero mostra o que você realmente sabe.
