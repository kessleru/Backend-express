# Exercício 01 — Uma agenda de contatos sem Express

⏱️ ~35 min · 🎯 Nível: iniciante

## Objetivo

Construir um servidor HTTP com `node:http` puro que guarda contatos na memória —
escolhendo o método e o status code corretos para cada operação.

## O que construir

Crie `src/playground/01-http/agenda.ts` com um servidor na porta **4010** e um
array de contatos em memória (`{ id, nome, email }`).

Rotas:

1. `GET /contatos` — lista todos. Se vier `?nome=an`, devolve só os contatos cujo
   nome **contém** esse texto.
2. `GET /contatos/:id` — um contato. Não existe → `404` com `{ "erro": "..." }`.
3. `POST /contatos` — cria a partir do JSON do body. Gera o `id`. Devolve `201`
   com o contato criado e o header `Location: /contatos/<id>`.
4. `DELETE /contatos/:id` — remove e devolve `204` sem body. Não existe → `404`.
5. Qualquer outra rota → `404`.

Regras:

- `POST` sem `nome` ou sem `email` → `400` com `{ "erro": "..." }`.
- Body que não é JSON válido → `400`.
- Toda resposta com body é JSON, com `Content-Type` correto.

## Critérios de aceite

- [ ] `curl localhost:4010/contatos` → `200` com array
- [ ] `curl "localhost:4010/contatos?nome=an"` filtra
- [ ] `curl localhost:4010/contatos/999` → `404`
- [ ] `POST` válido → `201`, header `Location`, contato no body
- [ ] `POST` sem email → `400`
- [ ] `POST` com body inválido → `400`
- [ ] `DELETE` existente → `204` **sem corpo**
- [ ] `DELETE` de novo no mesmo id → `404`
- [ ] `curl localhost:4010/qualquer` → `404`

Verifique os status com `curl -i` — sem isso você não está testando de verdade.

## Dicas

<details><summary>Dica 1 — extrair o id da URL</summary>

Não existe `:id` no `node:http`. Quebre o caminho você mesmo:

```ts
const partes = url.pathname.split('/').filter(Boolean); // "/contatos/7" → ['contatos','7']
```

Com `noUncheckedIndexedAccess` ligado, `partes[1]` é `string | undefined` — trate
esse caso, o TypeScript vai te cobrar.
</details>

<details><summary>Dica 2 — ler o body</summary>

O body chega em pedaços. Junte antes de interpretar:

```ts
const pedacos: Buffer[] = [];
for await (const p of req) pedacos.push(p as Buffer);
const texto = Buffer.concat(pedacos).toString('utf-8');
```

Envolva o `JSON.parse` em `try/catch` — body inválido é `400`, não `500`.
</details>

<details><summary>Dica 3 — 204 não tem corpo</summary>

`204 No Content` significa literalmente sem conteúdo:

```ts
res.writeHead(204);
res.end(); // sem argumento — nem `{}`, nem string vazia
```

</details>

<details><summary>Dica 4 — gerar id</summary>

Simples e suficiente aqui: `Math.max(0, ...contatos.map((c) => c.id)) + 1`.

Contador que só cresce evita reaproveitar id de contato deletado — o que
confundiria quem já tinha a referência antiga.
</details>

## Desafio extra

Adicione `PATCH /contatos/:id` que altera **só** os campos enviados (mandar
apenas `{ "email": "novo@x.com" }` não pode apagar o nome). Depois pense: por que
`PATCH` não é idempotente enquanto `PUT` é?

---

Terminou? Compare com [`solucao/agenda.ts`](./solucao/agenda.ts) — mas só depois
de fazer funcionar.
