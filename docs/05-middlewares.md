# 05 — Middlewares

**Em uma frase:** um middleware é uma função `(req, res, next)` numa fila; cada
uma pode inspecionar, modificar, passar adiante ou encerrar a requisição.

## Por que importa

- É **o** conceito central do Express. Rota é só o último middleware da fila.
- Tudo que vale para todas as rotas (log, auth, CORS, erro) mora aqui, uma vez.
- O bug mais silencioso do Express é ordem errada ou `next()` esquecido.

## Conceitos

### A assinatura e as três saídas

```ts
function meuMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. lê ou modifica req/res
  // 2. next()               → passa a bola adiante
  // 3. res.json(...)        → responde e ENCERRA a cadeia
  // 4. next(erro)           → pula para o middleware de erro
}
```

`express.json()` sempre foi isso. Não existe categoria especial: o parser de body,
o `cors`, sua rota — tudo é middleware.

### A ordem é a ordem do arquivo

```ts
app.use(a); // roda 1º
app.use(b); // roda 2º
app.get('/x', c); // roda 3º, e só em GET /x
```

Não há prioridade, peso ou config. É a ordem em que você escreveu, e nada mais.

**Consequências práticas:**

| Se você põe...                           | Acontece                           |
| ---------------------------------------- | ---------------------------------- |
| `express.json()` depois das rotas        | `req.body` é `undefined` nas rotas |
| 404 genérico no topo                     | Tudo vira 404                      |
| Middleware de erro no meio               | Erros das rotas abaixo não chegam  |
| Middleware que põe header após responder | `ERR_HTTP_HEADERS_SENT`            |

### Descida e subida

Middleware roda na **descida** (antes do handler). Para agir _depois_ da
resposta, escute o evento `finish`:

```ts
function cronometro(_req, res, next) {
  const inicio = performance.now(); // descida
  res.on('finish', () => {
    // subida: a resposta já foi
    console.log(`${res.statusCode} em ${performance.now() - inicio}ms`);
  });
  next();
}
```

Naquele momento o status já está definido e você **não pode mais** mexer na
resposta — só observar.

### Três escopos

```ts
app.use(logger); // global: toda requisição
app.use('/api', autenticar); // por prefixo: só quem começa com /api
app.get('/admin', exigirAdmin, handler); // por rota: só aqui
```

### Middleware com argumento: fábrica

Middleware tem assinatura fixa. Para configurar, devolva um middleware:

```ts
function exigirPapel(papel: string) {
  return (req, res, next) => {
    if (req.header('X-Papel') !== papel) {
      return res.status(403).json({ erro: `Precisa de "${papel}"` });
    }
    next();
  };
}

app.delete('/tudo', exigirPapel('admin'), handler); // note o () — chamada, não referência
```

Esquecer o `()` passa a fábrica como se fosse o middleware. Ela roda, devolve uma
função que ninguém chama, e a requisição trava.

### Passando dados entre middlewares

```ts
res.locals.usuario = usuario; // vive só nesta requisição
```

`res.locals` é o lugar oficial. Inventar `req.usuario` compila só depois de
estender os tipos do Express (`declare global { namespace Express { ... } }`), e
`namespace` está proibido neste repo pelo `erasableSyntaxOnly`.

### Middleware de erro: 4 argumentos

```ts
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ erro: 'Erro interno' });
});
```

O que faz o Express reconhecer isto é a **aridade**: exatamente 4 parâmetros.
Remover o `_next` — mesmo sem usar — transforma o tratador num middleware normal
que nunca recebe erro. É o [módulo 06](./06-tratamento-de-erros.md) inteiro.

### Os dois de terceiros deste módulo

| Lib        | Resolve                                                                 | Custo / nota                                                                                                |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **cors**   | Manda os headers que o navegador exige para outra origem chamar sua API | CORS é regra **do navegador**, não proteção do servidor: `curl` ignora. Detalhes no [13](./13-seguranca.md) |
| **morgan** | Log de requisição HTTP pronto (`GET /x 200 3ms`)                        | Bom para humano no terminal, ruim para máquina filtrar. Trocado por Pino no [14](./14-observabilidade.md)   |

## Na prática

```bash
node src/exemplos/05-middlewares/pilha.ts
```

Cada requisição imprime a cadeia. O log é o material didático:

```
  → 1 marcarInicio
  → 2 cronometro (registra listener)
  → 3 identificarServidor
  → 4 exigirApiKey
  → HANDLER /privado
GET /privado 200 38 - 0.352 ms        ← morgan
  ← 2 cronometro: 200 em 0.7ms        ← a subida, no evento finish
```

```bash
B=localhost:5053
curl $B/publico                                  # passa por 3 middlewares
curl -i $B/publico | grep -i x-servidor          # header posto por middleware
curl -i $B/privado                               # 401: cadeia encerrada no 4
curl -H 'X-Api-Key: segredo-123' $B/privado      # 200
curl -H 'X-Api-Key: x' $B/privado                # 403: chave errada
curl -X DELETE -H 'X-Api-Key: segredo-123' $B/admin/tudo             # 403
curl -X DELETE -H 'X-Api-Key: segredo-123' -H 'X-Papel: admin' $B/admin/tudo
curl $B/quebra                                   # 500 pelo middleware de erro
curl -m 2 $B/travado                             # trava: faltou next()
```

A rota `/travado` é o experimento mais útil do módulo — rode e veja o `curl`
estourar sem nenhum erro no servidor.

## Erros comuns

| Erro                                  | O que acontece                     | Correção                   |
| ------------------------------------- | ---------------------------------- | -------------------------- |
| Esquecer `next()`                     | Requisição trava, **sem erro**     | `next()` ou responder      |
| `next()` depois de responder          | `ERR_HTTP_HEADERS_SENT`            | `return res.json(...)`     |
| `next()` e responder no mesmo caminho | Mesma coisa, mais difícil de ver   | Um ou outro, nunca os dois |
| `express.json()` depois das rotas     | `req.body` é `undefined`           | Antes de tudo              |
| Erro handler com 3 argumentos         | Nunca recebe erro                  | 4 parâmetros, sempre       |
| `exigirPapel` sem `()`                | A fábrica vira o middleware; trava | `exigirPapel('admin')`     |
| `next(erro)` num middleware de 4 args | Loop no próprio tratador           | Só o Express chama esse    |
| Achar que `cors` protege a API        | Falsa sensação de segurança        | É regra do navegador (13)  |

## Cheatsheet

```ts
app.use(fn); // global
app.use('/api', fn); // por prefixo
app.get('/x', fn1, fn2, handler); // por rota, em ordem
app.use((e, req, res, next) => {}); // erro: 4 args, por último

next(); // adiante
next(erro); // pula para o tratador de erro
res.json(x); // responde e encerra (não chame next depois)
res.locals.x; // dados desta requisição
res.on('finish', fn); // depois da resposta ir
req.header('X-Api-Key');
```

```
ORDEM CANÔNICA
  1. morgan / pino-http      (log: primeiro, para registrar tudo)
  2. cors, helmet            (headers)
  3. express.json()          (body)
  4. middlewares próprios    (auth, rate limit)
  5. rotas
  6. 404 genérico
  7. middleware de erro      (4 args, sempre o último)
```

## Pratique

👉 [`exercicios/05-middlewares/`](../exercicios/05-middlewares/)
