# 01 — Fundamentos de HTTP

**Em uma frase:** HTTP é o combinado de como um cliente pede algo a um servidor e
como o servidor responde.

## Por que importa

- Todo framework web — Express incluso — é uma casca fina sobre isto.
- Debugar API é, quase sempre, ler uma requisição e uma resposta.
- Escolher o método e o status certo **é** o design da sua API.

## Conceitos

### O ciclo

O cliente manda uma **requisição**, o servidor devolve uma **resposta**. Só isso.
Uma requisição, uma resposta, conexão encerrada.

### Anatomia de uma requisição

```http
POST /cursos?rascunho=true HTTP/1.1     ← método, caminho, query
Host: api.exemplo.com                    ← headers: metadados
Content-Type: application/json
Authorization: Bearer abc123

{ "titulo": "Backend do zero" }          ← body: os dados
```

E da resposta:

```http
HTTP/1.1 201 Created                     ← status code
Content-Type: application/json

{ "id": 7, "titulo": "Backend do zero" }
```

### Métodos

| Método   | Para quê           | Seguro? | Idempotente? |
| -------- | ------------------ | ------- | ------------ |
| `GET`    | Buscar             | Sim     | Sim          |
| `POST`   | Criar              | Não     | **Não**      |
| `PUT`    | Substituir inteiro | Não     | Sim          |
| `PATCH`  | Alterar um pedaço  | Não     | Não          |
| `DELETE` | Remover            | Não     | Sim          |

- **Seguro** = não muda nada no servidor.
- **Idempotente** = repetir 10× dá o mesmo resultado de fazer 1×.

Por isso `POST` não é idempotente: mandar duas vezes cria dois recursos. É esse o
motivo do navegador avisar "reenviar formulário?" ao dar F5.

### Status codes

| Família | Significa          | Os que você usa                                                                                                                                   |
| ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2xx     | Deu certo          | `200` OK · `201` Created · `204` No Content                                                                                                       |
| 3xx     | Redireciona        | `301` permanente · `302` temporário · `304` não mudou                                                                                             |
| 4xx     | **Cliente errou**  | `400` inválido · `401` não autenticado · `403` sem permissão · `404` não existe · `409` conflito · `422` semântica inválida · `429` rápido demais |
| 5xx     | **Servidor errou** | `500` erro interno · `503` indisponível                                                                                                           |

A distinção 4xx vs 5xx é a mais importante: **de quem é a culpa?** Bug seu nunca
deve virar 400, e entrada ruim do cliente nunca deve virar 500.

`401` vs `403`: "não sei quem você é" vs "sei quem você é, e você não pode".

### Headers que aparecem sempre

| Header          | Para quê                                     |
| --------------- | -------------------------------------------- |
| `Content-Type`  | Formato do body (`application/json`)         |
| `Authorization` | Credencial (`Bearer <token>`)                |
| `Accept`        | Formato que o cliente quer de volta          |
| `Cache-Control` | Se e por quanto tempo pode guardar           |
| `Location`      | Onde está o recurso recém-criado (com `201`) |

### Statelessness

O servidor **não lembra** de você entre requisições. Cada uma chega sozinha e
precisa carregar tudo que é necessário — inclusive quem você é (daí o
`Authorization` em toda requisição).

Parece limitação, mas é o que permite ter 10 servidores atrás de um load
balancer: qualquer um atende qualquer requisição. Volta no módulo 15.

## Na prática

Um servidor HTTP sem Express nenhum, para você ver o trabalho manual:

```bash
node src/exemplos/01-http-sem-express/servidor.ts
```

Em outro terminal:

```bash
curl localhost:4001/
curl "localhost:4001/ola?nome=ana"
curl -X POST localhost:4001/eco -H "Content-Type: application/json" -d '{"a":1}'
curl -i localhost:4001/nao-existe     # -i mostra status e headers
```

Repare no código ([`servidor.ts`](../src/exemplos/01-http-sem-express/servidor.ts))
o que é feito na mão. É exatamente o que o Express vai automatizar no módulo 03:

| Na mão aqui                                    | No Express                |
| ---------------------------------------------- | ------------------------- |
| `if (rota === 'GET /ola')`                     | `app.get('/ola', ...)`    |
| Juntar os chunks do body                       | `app.use(express.json())` |
| `res.writeHead(200, {...})` + `JSON.stringify` | `res.json(...)`           |
| 404 no fim do handler                          | Automático                |

## Erros comuns

| Erro                               | O que acontece                              | Correção                     |
| ---------------------------------- | ------------------------------------------- | ---------------------------- |
| Esquecer `res.end()`               | O cliente fica esperando até dar timeout    | Toda rota tem que responder  |
| Responder duas vezes               | `ERR_HTTP_HEADERS_SENT`                     | `return` depois de responder |
| `200` para tudo                    | Cliente não sabe distinguir sucesso de erro | Use o status certo           |
| `500` quando o cliente mandou lixo | Some com o erro real do cliente             | Validação → `400`            |
| Verbo na URL (`/getCursos`)        | O método já diz a ação                      | `GET /cursos`                |
| Achar que query param é número     | `?idade=30` chega como `"30"`               | Converta e valide            |

## Cheatsheet

```
GET    /cursos        lista
GET    /cursos/7      um item
POST   /cursos        cria          → 201
PUT    /cursos/7      substitui     → 200
PATCH  /cursos/7      altera parte  → 200
DELETE /cursos/7      remove        → 204

2xx ok · 3xx redireciona · 4xx culpa do cliente · 5xx culpa sua
```

## Pratique

👉 [`exercicios/01-fundamentos-http/`](../exercicios/01-fundamentos-http/)
