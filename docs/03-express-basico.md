# 03 — Express básico

**Em uma frase:** o Express é uma camada fina sobre o `node:http` que resolve
roteamento, leitura de body e escrita de resposta — o trabalho manual do
[módulo 01](./01-fundamentos-http.md).

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=3 orderedList=false} -->

## Por que importa

- É o framework mais usado do ecossistema Node; entender ele é entender os outros.
- Escolher entre route param, query param e body **é** desenhar a API.
- 90% do código de rota que você vai escrever na vida cabe nas 6 rotas deste módulo.

## Conceitos

### O que o framework resolve

| No `node:http` (módulo 01)                 | No Express                     |
| ------------------------------------------ | ------------------------------ |
| `if (metodo === 'GET' && caminho === ...)` | `app.get('/cursos', ...)`      |
| Quebrar `/cursos/7` na mão pra pegar o id  | `'/cursos/:id'` + `req.params` |
| Parsear a query string                     | `req.query`                    |
| Juntar os chunks do body + `JSON.parse`    | `app.use(express.json())`      |
| `writeHead` + `JSON.stringify` + `end`     | `res.json(...)`                |
| 404 escrito à mão no fim                   | automático                     |

> [!NOTE]
> O Express **não** substitui o HTTP. `req` e `res` continuam sendo os objetos do
> `node:http`, só com métodos a mais.

### As três peças

```ts
import express from 'express';

const app = express(); // 1. a aplicação
app.use(express.json()); // 2. middlewares (módulo 05)
app.get('/rota', (req, res) => res.json({})); // 3. rotas
app.listen(5051);
```

```mermaid
flowchart LR
    REQ([requisição]) --> J["express.json()<br/>preenche req.body"]
    J --> ROTA{"casa com<br/>algum app.get/post?"}
    ROTA -- sim --> H["handler<br/>(req, res)"] --> RES([res.json])
    ROTA -- não --> E404["404 automático"]
    style E404 fill:#fed7aa,stroke:#ea580c,color:#000
```

### Os três tipos de parâmetro — a decisão central

| Tipo            | Onde vem          | Acessa por   | Obrigatório? | Para quê                     |
| --------------- | ----------------- | ------------ | ------------ | ---------------------------- |
| **Route param** | `/cursos/:id`     | `req.params` | Sim          | Identificar **um** recurso   |
| **Query param** | `/cursos?horas=5` | `req.query`  | Não          | Filtro, ordenação, paginação |
| **Body**        | corpo JSON        | `req.body`   | Sim (criar)  | Dados de criação/edição      |

```mermaid
flowchart TD
    Q{"O dado..."} -->|"identifica UM recurso"| RP["route param<br/>/cursos/:id"]
    Q -->|"filtra, ordena, pagina<br/>(a lista existe sem ele)"| QP["query param<br/>?horas=5"]
    Q -->|"é conteúdo"| B["body<br/>POST · PUT · PATCH"]
    style RP fill:#dbeafe,stroke:#2563eb,color:#000
    style QP fill:#e9d5ff,stroke:#7c3aed,color:#000
    style B fill:#bbf7d0,stroke:#16a34a,color:#000
```

> [!IMPORTANT]
> Tudo que vem da URL é **string**. `?horas=5` chega como `"5"`. Converter e
> validar é sua responsabilidade — sempre.

### `express.json()`

```ts
app.use(express.json()); // sem isto, req.body é undefined em TODA rota
```

> [!WARNING]
> Ele só age quando o cliente manda `Content-Type: application/json`. Sem esse
> header, o Express 5 deixa `req.body` como **`undefined`** (o Express 4 deixava
> `{}`) — daí `const { x } = req.body` explodir com `TypeError` e virar um 500
> num erro que era do cliente.

### Escrevendo a resposta

```ts
res.json(objeto); // serializa + Content-Type: application/json + encerra
res.status(201).json(x); // encadeia: status primeiro, corpo depois
res.status(204).send(); // sem corpo
res.status(201).location('/cursos/4').json(x); // header extra
res.send('texto'); // Content-Type deduzido (text/html aqui)
```

> [!CAUTION]
> Cada requisição recebe **uma** resposta. Responder duas vezes dá
> `ERR_HTTP_HEADERS_SENT` — daí o `return` antes de todo `res.status(4xx)`.

### PUT vs PATCH na prática

```ts
// PUT substitui o recurso inteiro: campo que não vier é campo PERDIDO.
// Por isso PUT exige o objeto completo.
app.put('/cursos/:id', ...);

// PATCH altera só o que veio. `undefined` significa "não mandou".
if (titulo !== undefined) curso.titulo = titulo;
```

## Na prática

```bash
node src/exemplos/03-express-basico/crud-cursos.ts
```

```bash {cmd=true}
B=localhost:5051
curl $B/cursos                          # lista
curl "$B/cursos?titulo=http&maxHoras=5" # query params combinados
curl $B/cursos/2                        # route param
curl -i $B/cursos/99                    # 404

curl -i -X POST $B/cursos -H 'Content-Type: application/json' \
  -d '{"titulo":"Prisma","horas":5}'    # 201 + header Location

curl -X POST $B/cursos -H 'Content-Type: application/json' -d '{"horas":5}'
                                        # 400: titulo obrigatório
curl -i -X POST $B/cursos -d 'titulo=x' # 400: faltou o Content-Type

curl -X PATCH $B/cursos/1 -H 'Content-Type: application/json' -d '{"horas":3}'
curl -i -X DELETE $B/cursos/1           # 204, sem corpo
```

Repare em [`crud-cursos.ts`](../src/exemplos/03-express-basico/crud-cursos.ts)
como a validação está **espalhada dentro de cada rota**. Funciona, mas repete e
cresce mal — é a dor que o [módulo 07](./07-validacao-zod.md) resolve com Zod.
Do mesmo jeito, o arquivo único vira vários no [módulo 04](./04-roteamento.md).

## Erros comuns

| Erro                              | O que acontece                      | Correção                      |
| --------------------------------- | ----------------------------------- | ----------------------------- |
| Esquecer `express.json()`         | `req.body` é `undefined`            | `app.use(express.json())`     |
| Cliente sem `Content-Type`        | Body ignorado → `TypeError` → 500   | Exigir o header; usar `?? {}` |
| `req.params.id === 1`             | Nunca é true: `"1" !== 1`           | `Number(req.params.id)`       |
| Sem `return` antes do 404         | Responde duas vezes                 | `return res.status(404)...`   |
| Usar body em `GET`                | Vários clientes e proxies descartam | Query param                   |
| `res.json()` em `204`             | Contradiz o próprio status          | `res.status(204).send()`      |
| Verbo na URL (`POST /criarCurso`) | O método já é o verbo               | `POST /cursos`                |
| Confiar no `req.body`             | É `any`: aceita qualquer coisa      | Validar (módulo 07)           |

## Cheatsheet

```ts
app.get(caminho, handler);    app.post(...);   app.put(...);
app.patch(...);               app.delete(...); app.all(...);

req.params.id     // '/cursos/:id'  → sempre string
req.query.pagina  // '?pagina=2'    → string | string[] | undefined
req.body          // precisa de express.json()
req.headers.authorization  // minúsculo, sempre
req.method        // 'GET'
req.path          // '/cursos/7'

res.json(x)            res.status(n)         res.send(x)
res.location(url)      res.set('X-Foo','1')  res.sendStatus(204)
```

| Operação         | Rota                 | Sucesso          |
| ---------------- | -------------------- | ---------------- |
| Listar           | `GET /cursos`        | `200` + array    |
| Buscar um        | `GET /cursos/:id`    | `200` / `404`    |
| Criar            | `POST /cursos`       | `201` + Location |
| Substituir       | `PUT /cursos/:id`    | `200`            |
| Alterar em parte | `PATCH /cursos/:id`  | `200`            |
| Remover          | `DELETE /cursos/:id` | `204`            |

## Pratique

👉 [`exercicios/03-express-basico/`](../exercicios/03-express-basico/) — aqui
começa a **API de biblioteca**, o projeto que cresce até o módulo 20.
