# Onde a sessão parou — 2026-08-18

> Bilhete para a próxima sessão. O planejamento completo continua em
> [`GUIA-IMPLEMENTACAO.md`](GUIA-IMPLEMENTACAO.md) (seção 2 = achados técnicos,
> seção 7 = régua de qualidade de ensino, seção 9 = tabela de fases).

## Resumo em uma linha

Duas entregas: a **solução do exercício 13** ficou pronta, e as **soluções 11, 12
e 13 passaram a usar Prisma** como persistência de produção, com os repositórios
em memória virando dublê de teste. A suíte saiu de 113 para **245 testes**.

Tudo commitado na `main`, no commit `e72911b` ("att") — 75 arquivos, incluindo
`prisma/schema.prisma`, a migration e a correção do `.env.example`.

## ▶ O QUE FAZER NA PRÓXIMA SESSÃO

Em ordem. Os dois primeiros itens são resíduo desta sessão e são rápidos:

1. **Atualizar os enunciados 11, 12 e 13** (`exercicios/NN-*/README.md`). Eles
   ainda descrevem a persistência como estava: o do 11 diz "memória, SQLite ou
   Prisma" sem apontar o que a solução de referência faz, e nenhum menciona a
   suíte de contrato nem o `REPO=memoria`. **O código está pronto; o enunciado
   ficou para trás.**
2. **Conferir se `docs/11`, `docs/12` e `docs/13` afirmam algo que mudou.** Não
   foi verificado nesta sessão. O candidato mais provável é o módulo 12, que fala
   de suíte de contrato e SQLite `:memory:` — agora as soluções têm isso de fato.
3. **Solução do exercício 14** (o enunciado existe desde 2026-08-13). É o que
   fecha a Fase 4 junto com 15 e 16.
4. **Mini desafios dos módulos 02 a 14.** Só o 01 tem. Os achados desta sessão
   (listados abaixo) são material pronto para os módulos 12 e 13.
5. **Seção de Postgres, em pasta à parte.** Pedido do usuário nesta sessão. A
   ideia é uma trilha separada, não um módulo no meio do currículo: o repo
   continua em SQLite por decisão da seção 3 do guia (zero instalação, e SQL que
   transfere). O material tem gancho pronto — as diferenças que o ORM não apaga
   já estão comentadas no código (`enum` que o SQLite não tem,
   `mode: 'insensitive'` ignorado em silêncio, índice único parcial).

## O que foi feito nesta sessão

### 1. Solução do exercício 13 (`exercicios/13-seguranca/solucao/`)

Cópia da solução 12 evoluída — a convenção do repo: cada solução copia a
anterior, e o `diff` entre as duas é o material de estudo.

| Arquivo                    | Mudança                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `app.ts`                   | `helmet()`, `cors` com lista de origens, limitadores       |
| `middlewares/limites.ts`   | **novo** — `criarLimites()`, quatro baldes por finalidade  |
| `middlewares/limitar.ts`   | **apagado** — o escrito à mão no módulo 05 saiu            |
| `servicos/emprestimos.ts`  | `buscarVisivel` fecha o IDOR: empréstimo de outro vira 404 |
| `rotas/emprestimos.ts`     | `GET /emprestimos/:id` e `POST /emprestimos/:id/devolver`  |
| `servicos/arquivos.ts`     | **novo** — resolve o caminho e o confina em `capas/`       |
| `rotas/arquivos.ts`        | **novo** — `GET /arquivos/:nome`, com duas capas SVG       |
| `schemas/livro.ts`         | busca `q`, com teto de 100 caracteres                      |
| `testes/seguranca.test.ts` | de 7 para 25 casos                                         |
| `solucao/README.md`        | **novo** — inclui o registro do `npm audit`                |

Isso fechou a pendência 4 da sessão anterior: `limitar()` escrito à mão foi
trocado por `express-rate-limit`.

### 2. Prisma nas soluções 11, 12 e 13

**O motivo, na palavra do usuário:** a ideia do repositório é aprender a fazer
sistemas reais, e num sistema real nenhum `servidor.ts` sobe com array em
memória. Até aqui as soluções 11–13 tinham copiado o **08** (memória) e largado a
progressão 09 → 10 (SQL → ORM) pelo caminho.

**A decisão que orienta tudo:** não é "Prisma ou memória" — num sistema real os
dois existem, em lugares diferentes.

| Onde                   | Implementação | Por quê                                      |
| ---------------------- | ------------- | -------------------------------------------- |
| `servidor.ts`          | Prisma        | produção não pode perder dados no restart    |
| testes de rota/serviço | memória       | suíte em segundos, sem banco nem migration   |
| suíte de contrato      | **as duas**   | pega o dublê desviando da implementação real |

O que entrou:

- `prisma/schema.prisma`: modelos `Usuario`, `Emprestimo` e `RefreshToken`, sob
  um cabeçalho dizendo de qual módulo são. Migration
  `20260818141303_modulo_11_auth_emprestimos`.
- Um schema só para o repositório inteiro, de propósito: um projeto Prisma tem um
  schema, um client e um histórico de migrations. Um segundo projeto obrigaria
  quem estuda o módulo 11 a configurar Prisma antes de aprender autenticação.
- `db/prisma.ts` e cinco `repositorios/*-prisma.ts` em cada uma das três soluções.
- Os repositórios Prisma recebem o **cliente por parâmetro**, com o singleton
  como padrão — é o que permite a suíte de contrato apontar para um banco
  temporário em vez de escrever no `.sqlite` de desenvolvimento.
- `servidor.ts` escolhe a implementação: Prisma por padrão, `REPO=memoria` para
  subir sem nenhum setup de banco.
- `testes/repositorio.test.ts` (soluções 12 e 13): a suíte de contrato.

## Quatro achados desta sessão, todos verificados rodando

Os quatro estão escritos por extenso no código, e três mudaram decisão de
desenho. São material pronto para mini desafio.

### 1. `export const rateLimit(...)` prende o balde ao MÓDULO, não ao app

Um teste recebia 429 porque o caso anterior gastara as cinco tentativas — **em
outro app, criado do zero, com outros repositórios.** O contador vivia no módulo.
Virou a fábrica `criarLimites()`, chamada dentro de `criarApp`.

### 2. O path traversal cru nem chega ao seu código

`GET /arquivos/../../.env` responde **404**: são quatro segmentos, a rota
`/:nome` casa com um só, e o handler nunca roda. Só a forma codificada
(`..%2f..%2f.env`) chega ao service e leva 400. Quem testa só a forma crua vê
404 e conclui que está protegido sem ter exercitado uma linha da defesa.

> **Atenção:** o `curl` normaliza `../` antes de enviar. Sem `--path-as-is` você
> mede outra coisa. O Supertest não normaliza.

### 3. O payload de injeção famoso não é o que morde

Sabotando o repositório de propósito (`$queryRawUnsafe`), `'; DROP TABLE
livros; --` **não apaga a tabela**: o `better-sqlite3` recusa mais de uma
instrução por consulta, e o `;` torna o payload duas. Quem testa só com ele se
protege do payload de camiseta, não de injeção.

O que passa é o de **uma instrução**: `' OR 1=1 --` devolve a tabela inteira —
vazamento, que é o que a maioria dos incidentes reais é. O teste afirma as duas
coisas: a busca não quebra **e o filtro continua filtrando**.

### 4. `describe.runIf(false)` marca como PULADO, não deixa de registrar

A suíte de contrato pula a parte Prisma quando o client não está gerado. A
primeira versão usava `describe.runIf`, e o aviso "rode db:generate" aparecia no
resumo **até quando o Prisma estava rodando** — aviso mentiroso. Trocado por um
`if` comum em volta do `describe`.

O princípio que ficou: teste que exige infraestrutura é **pulado com aviso
visível**, nunca sumido em silêncio. Sem o marcador, 26 casos desapareciam de um
total de 245 sem nada indicar.

## Um bug PRÉ-EXISTENTE corrigido no caminho

`.env` e `.env.example` traziam `DATABASE_URL_PRISMA=file:../data/prisma-10.sqlite`.
O `../` só faz sentido rodando de dentro de uma subpasta, e **todos os comandos
documentados são rodados da raiz** — então o `better-sqlite3` procurava a pasta
fora do repositório.

O efeito: **a solução do módulo 10 estava quebrada**. O servidor subia sem erro e
a primeira query devolvia 500 com `Cannot open database because the directory
does not exist`. Corrigido para `file:./data/prisma-10.sqlite` nos dois arquivos,
com o porquê no `.env.example`. Verificado: as soluções 10 e 11 voltaram a
responder.

O `.env` é local e não versionado — num clone novo, quem copiar o `.env.example`
já pega a versão certa.

## Como foi verificado

```
npm run typecheck        → passa
npm run typecheck:ex     → passa
npm run format:check     → limpo
npm test                 → 245 testes, 17 arquivos, verde (eram 113 em 10)
npx vitest run exercicios/13-seguranca → 110 testes
```

Servidores no ar, um por um:

| Solução | Porta | O que foi conferido                                                         |
| ------- | ----- | --------------------------------------------------------------------------- |
| 10      | 4100  | voltou a responder depois da correção do `.env`                             |
| 11      | 4110  | registrar → login → `/auth/eu` → emprestar → `/meus`, tudo gravado no banco |
| 12      | 4120  | sobe com Prisma e lista livros do banco                                     |
| 13      | 4130  | idem, e também com `REPO=memoria`                                           |

E na solução 13, com o servidor no ar:

| O quê          | Resultado observado                                                                    |
| -------------- | -------------------------------------------------------------------------------------- |
| helmet         | CSP, HSTS, `nosniff`, `X-Frame-Options`; `x-powered-by` ausente                        |
| rate limit     | `401 401 401 401 401 429`, com `Retry-After: 60` e corpo no formato da API             |
| leitura        | `GET /livros` segue 200 com a cota de login esgotada                                   |
| path traversal | cru → 404 (roteamento), codificado → 400 (a defesa), capa → 200 `image/svg+xml`        |
| CORS           | origem listada recebe o `allow-origin`; a não listada **recebe os dados sem o header** |
| IDOR           | dona 200, admin 200, terceiro 404 — corpo idêntico ao de um id que nunca existiu       |

A suíte de contrato foi verificada nos dois cenários: com o client gerado (52
casos, os mesmos contra memória e Prisma) e com a pasta `gerado/` renomeada para
simular clone novo (26 passam, 2 pulados com o aviso visível).

E o teste de injeção foi verificado **sabotando o repositório de propósito** —
ficou vermelho, como tinha que ficar. O arquivo foi restaurado e conferido com
`diff` contra a cópia limpa.

## Estado do que está pronto

| Módulo                 | Doc | Exemplo | Enunciado   | Solução      |
| ---------------------- | --- | ------- | ----------- | ------------ |
| 01 a 10                | ✅  | ✅      | ✅          | ✅           |
| 11 Autenticação        | ✅  | ✅      | ⚠️ atrasado | ✅ + Prisma  |
| 12 Testes              | ✅  | ✅      | ⚠️ atrasado | ✅ + Prisma  |
| 13 Segurança           | ✅  | ✅      | ⚠️ atrasado | ✅ **novo**  |
| **14 Observabilidade** | ✅  | ✅      | ✅          | ❌ **falta** |
| 15–20                  | ❌  | ❌      | ❌          | ❌           |

⚠️ = o enunciado não menciona a mudança de persistência. É o item 1 da lista do
topo.

## Convenções que se firmaram e valem manter

- **Portas:** exemplo do módulo NN → `50NN`; solução do exercício NN → `4NN0`. O
  módulo 01 usa 4001/4010. **Os exemplos 13 e 14 colidem na 5064** — não subir os
  dois juntos.
- **Setup de banco agora vale para 10, 11, 12 e 13:** `db:generate` →
  `db:migrate` → `db:seed`. Sem ele, os servidores dessas soluções falham na
  primeira query (mas `npm test` continua verde, e a suíte de contrato pula com
  aviso).
- **Um schema, um client, um banco** para toda a biblioteca. O arquivo se chama
  `prisma-10.sqlite` porque nasceu no módulo 10; o nome ficou.
- Cada exercício NN copia a solução do NN−1 e evolui. O 11 copiava o **08**
  (memória) — essa exceção acabou nesta sessão.
- **A partir do 12, todo app novo se monta com `criarApp(deps)`;** só
  `servidor.ts` chama `listen`, e é o único arquivo que sabe se existe banco.
- **Estado que não parece estado também entra por injeção.** Contador de rate
  limit, cache em memória e cliente de banco são globais se declarados no topo do
  módulo. Foi o achado nº 1 desta sessão.
- Todo achado de comportamento vira comentário no código **e** uma linha na
  tabela "Erros comuns" do doc.
- `curl -d '{"json":1}'` com aspas simples não funciona em `cmd.exe` nem
  PowerShell. São 17 ocorrências em 8 módulos; o aviso está no módulo 01.
- **`morgan` não pode sair do `package.json`**, mesmo o exercício 14 pedindo: o
  repositório tem um `package.json` só, e o exemplo do módulo 05 usa `morgan`.
  Registrar a decisão no README da solução 14.

## Restrições do repositório que valem lembrar

- `npm audit --omit=dev` acusa **4 high**, todas transitivas da CLI do Prisma.
  Nenhuma roda no caminho de uma requisição; `npm audit fix --force` rebaixaria o
  `prisma` de major e quebraria o módulo 10. Registro completo em
  `exercicios/13-seguranca/solucao/README.md`.
- ESLint continua fora: `typescript-eslint` exige TypeScript `<6.1.0` e o projeto
  usa TS 7.
- `PROMPT.md` foi removido no commit `ce49d57` e não está mais na árvore. O
  aviso antigo ("deletado, não commitado de propósito") não vale mais — a
  deleção já entrou no histórico.
