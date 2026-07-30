# Onde a sessão parou — 2026-07-30

> Este arquivo é o bilhete para a próxima sessão. O planejamento completo continua
> em `GUIA-IMPLEMENTACAO.md` (a seção 2 tem os achados técnicos, a 9 tem a tabela
> de fases).

## Resumo em uma linha

**Fases 1 e 2 concluídas. Fase 3 até o módulo 11.** Faltam: a solução do exercício
11, o módulo 12 e as fases 4, 5 e 6.

## O que está pronto

| Módulo                    | Doc | Exemplo | Enunciado | Solução      |
| ------------------------- | --- | ------- | --------- | ------------ |
| 01 Fundamentos de HTTP    | ✅  | ✅      | ✅        | ✅           |
| 02 Node, módulos e async  | ✅  | ✅      | ✅        | ✅           |
| 03 Express básico         | ✅  | ✅      | ✅        | ✅           |
| 04 Roteamento             | ✅  | ✅      | ✅        | ✅           |
| 05 Middlewares            | ✅  | ✅      | ✅        | ✅           |
| 06 Tratamento de erros    | ✅  | ✅      | ✅        | ✅           |
| 07 Validação (Zod)        | ✅  | ✅      | ✅        | ✅           |
| 08 Arquitetura em camadas | ✅  | ✅      | ✅        | ✅           |
| 09 SQLite e SQL           | ✅  | ✅      | ✅        | ✅           |
| 10 Prisma (ORM)           | ✅  | ✅      | ✅        | ✅           |
| 11 Autenticação           | ✅  | ✅      | ✅        | ❌ **falta** |
| 12 Testes                 | ❌  | ❌      | ❌        | ❌           |
| 13–20                     | ❌  | ❌      | ❌        | ❌           |

## Verificado nesta sessão

```
npm run typecheck      → passa
npm run typecheck:ex   → passa
npm run build          → passa
```

Os **20 servidores** (11 exemplos + 9 soluções) sobem e respondem `200`. Todos os
9 scripts não-servidores rodam sem erro. Cada exercício foi testado contra os
próprios critérios de aceite, com `curl`, um por um.

`npm run typecheck:play` dá `TS18003` porque `src/playground/` não tem nenhum
`.ts` ainda. É esperado — não é problema.

## O PRÓXIMO PASSO exato

### 1. Solução do exercício 11 (`exercicios/11-auth/solucao/`)

O enunciado (`exercicios/11-auth/README.md`) está completo, com 7 dicas
progressivas e 18 critérios de aceite. A solução foi **começada e removida** para
não deixar código pela metade no repo — comece do zero.

Plano que estava em andamento:

1. Copiar a base do exercício 08 (memória, mais simples de testar que SQLite):
   ```bash
   cp -r exercicios/08-camadas/solucao/{dominio,repositorios,servicos,controllers,rotas,schemas,middlewares,erros} \
         exercicios/11-auth/solucao/
   ```
2. `dominio/usuario.ts` — `Usuario`, `NovoUsuario`, `UsuarioPublico` (via `Pick`,
   para o TS recusar `res.json(usuario)` com o hash dentro), `RepositorioUsuarios`
   (precisa de `buscarPorEmail`) e `RepositorioRefresh` (indexado por `jti`, é o
   que torna o logout possível).
3. `dominio/emprestimo.ts` — com `buscarAbertoPorLivro` e `listarPorUsuario`.
4. `auth/senhas.ts` e `auth/tokens.ts` — podem ser adaptados de
   `src/exemplos/11-auth/`, mas o `JWT_SECRET` tem que **derrubar o processo** se
   estiver ausente ou com menos de 32 caracteres (é critério de aceite).
5. `middlewares/autenticar.ts` — `autenticar` (401) e `exigirPapel` (403).
6. `servicos/autenticacao.ts` e `servicos/emprestimos.ts`.
7. `rotas/auth.ts` + montar em `servidor.ts` na porta **4110**.

**A parte que dá o conteúdo do módulo:** autorização por **dono do recurso** (só
quem pegou o livro, ou um admin, devolve). Ela **não** cabe num middleware, porque
precisa buscar o recurso para saber quem é o dono — logo é regra de negócio e mora
no service. Está explicado na dica 3 do enunciado.

Cuidado com dois critérios de aceite que costumam escapar:

- `usuarioId` vem **do token**, nunca do body.
- Remover a `X-Api-Key` dos módulos 05–10 — ela era o placeholder disto.

### 2. Módulo 12 — testes (fecha a Fase 3)

```bash
npm i -D vitest supertest @types/supertest
```

O currículo pede (seção 5 do guia): pirâmide de testes, Vitest como runner,
Supertest batendo no `app` sem abrir porta, mocks, fixtures, SQLite em memória
(`:memory:`) para o banco de teste, cobertura como sintoma e TDD numa feature real.

Duas coisas que a Fase 3 preparou de propósito para este módulo:

- **A interface de repositório do módulo 08** — testar o service com um
  repositório falso passado por argumento, sem mockar módulo.
- **O teste da stack trace** — o desafio extra do exercício 06 pede um teste que
  garanta que a stack nunca vaza em produção. É um bom primeiro caso.

Para o Supertest funcionar, os servidores precisam **exportar o `app`** em vez de
só chamar `listen`. Hoje nenhum faz isso: vale extrair um `criarApp()` no exemplo
do módulo 12 e mencionar por que — sem reescrever os módulos anteriores (regra 7
da seção 10 do guia).

### 3. Depois

Fases 4 (13–16), 5 (17–20) e 6 (apêndices A–E), na ordem da tabela da seção 9.

## Convenções que se firmaram e valem manter

- **Portas:** exemplo do módulo NN → `50NN` (`src/exemplos`); solução do
  exercício NN → `4NN0`. O módulo 01 usa 4001/4010.
- Cada exercício NN copia a solução do NN−1 e evolui. É duplicação de propósito:
  cada solução roda sozinha, e o `diff` entre duas soluções vizinhas mostra
  exatamente o que o módulo acrescentou. Os módulos 09 e 10 dependem disso —
  `diff -rq` entre `servicos/` de 08, 09 e 10 dá "idênticos", que é a prova de que
  a camada de repositório cumpriu a promessa.
- Todo achado de comportamento (Express 5, Zod 4, Prisma 7) vira **conteúdo
  comentado no código** e uma linha na tabela "Erros comuns" do doc. Não vira só
  correção silenciosa.
- O `.env` já tem `DATABASE_URL_PRISMA`; o banco do Prisma
  (`data/prisma-10.sqlite`) é separado do módulo 09 (`data/biblioteca-09.sqlite`)
  para os dois exemplos conviverem.

## Nada foi commitado

Todo o trabalho está no working tree. `git status` mostra tudo como novo/modificado.
