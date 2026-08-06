# Onde a sessão parou — 2026-08-03

> Este arquivo é o bilhete para a próxima sessão. O planejamento completo continua
> em `GUIA-IMPLEMENTACAO.md` (a seção 2 tem os achados técnicos, a 7 tem a régua
> de qualidade de ensino, a 9 tem a tabela de fases).

## Resumo em uma linha

**Fase 3 fechada: módulos 01 a 12 completos**, com doc, exemplo, enunciado e
solução — e os docs 01–11 revisados sob a régua nova de profundidade. Faltam as
fases 4, 5 e 6.

## O que está pronto

| Módulo                    | Doc | Exemplo | Enunciado | Solução |
| ------------------------- | --- | ------- | --------- | ------- |
| 01 Fundamentos de HTTP    | ✅  | ✅      | ✅        | ✅      |
| 02 Node, módulos e async  | ✅  | ✅      | ✅        | ✅      |
| 03 Express básico         | ✅  | ✅      | ✅        | ✅      |
| 04 Roteamento             | ✅  | ✅      | ✅        | ✅      |
| 05 Middlewares            | ✅  | ✅      | ✅        | ✅      |
| 06 Tratamento de erros    | ✅  | ✅      | ✅        | ✅      |
| 07 Validação (Zod)        | ✅  | ✅      | ✅        | ✅      |
| 08 Arquitetura em camadas | ✅  | ✅      | ✅        | ✅      |
| 09 SQLite e SQL           | ✅  | ✅      | ✅        | ✅      |
| 10 Prisma (ORM)           | ✅  | ✅      | ✅        | ✅      |
| 11 Autenticação           | ✅  | ✅      | ✅        | ✅      |
| 12 Testes                 | ✅  | ✅      | ✅        | ✅      |
| 13–20                     | ❌  | ❌      | ❌        | ❌      |

## Verificado nesta sessão

```
npm run typecheck      → passa
npm run typecheck:ex   → passa
npm run build          → passa (dist/ sem arquivo de teste)
npm test               → 113 testes, 10 arquivos, verde
npm test (2ª vez)      → mesmo resultado (isolamento ok)
npm run test:cov       → ~80% statements
```

> **Atenção:** numa árvore recém-clonada o `typecheck` **falha** com 4 erros em
> `src/exemplos/10-prisma/`, porque o Prisma Client é gerado em `gerado/`, que é
> git-ignored. A sequência que resolve é `npm install` → `npm run db:generate`.
> Não é bug do código, mas é a primeira pedra no caminho de quem clona.

Solução do exercício 11 conferida com `curl` contra os 18 critérios de aceite:
**30 checagens, 0 falhas**. Mais: sem `JWT_SECRET` (ou com menos de 32
caracteres) o servidor recusa subir, e `grep senhaHash controllers/` não acha
código nenhum.

Servidores que sobem e respondem: `4110` (solução 11), `4120` (solução 12),
`5060` (exemplo 12).

## A REGRA NOVA desta sessão

O usuário pediu **mais profundidade de ensino**, e isso virou norma escrita:

- `GUIA-IMPLEMENTACAO.md` seção 7 → subseção **"Qualidade de ensino"**, com as
  **cinco camadas obrigatórias** de todo conceito (problema → **princípio** →
  mecânica → trade-off → consequência) e a tabela de regras de material.
- `CLAUDE.md` foi alinhado: "corte redundância, nunca profundidade"; o princípio
  é sempre **nomeado em negrito**, numa frase que vale fora da ferramenta.

Os módulos 11 e 12 já nasceram sob essa régua. Os **01 a 10, não** — foi por isso
que a revisão entrou como pendência.

## Revisão de profundidade dos docs 01–11 — FEITA nesta sessão

Todos os 11 docs anteriores foram passados sob a régua nova. O que entrou em cada
um, sem reescrever nada do que já existia:

- **Um bloco "princípio" por conceito central**, sempre nomeado em negrito e numa
  frase que vale fora da ferramenta.
- **Uma seção "Os princípios deste módulo"** no fim de cada doc (01 a 11), em
  tabela, com a coluna "onde reaparece" ligando ao resto do currículo.
- **Custos declarados** onde só havia elogio: o que o Express cobra (03), o que
  camadas custam (08), o que o ORM esconde (10), o que JWT troca por escala (11).

Adições de conteúdo que valem citar, porque não estavam em lugar nenhum:

| Doc | O que entrou                                                                         |
| --- | ------------------------------------------------------------------------------------ |
| 01  | Quem depende de "seguro/idempotente" (CDN, retry, fila); pares de status confundidos |
| 02  | Comparação com thread-por-requisição; `Promise.all` vs série; o dono do erro         |
| 03  | O teste "tire o parâmetro e veja se a URL faz sentido"; PUT/PATCH e idempotência     |
| 04  | Por que o Express não reordena rotas sozinho; custo real de versionar                |
| 05  | Express vs Koa (a cadeia só desce); CORS não é segurança do servidor                 |
| 06  | Classificação por "quem resolve"; `throw` interrompe e estreita o tipo               |
| 07  | Validação é função pura × regra depende do estado; `UNIQUE` fecha a corrida          |
| 08  | Volatilidade como critério; camada é investimento e tem que retornar                 |
| 09  | Injeção como família (SQL, shell, HTML, log); transação é unidade de negócio         |
| 10  | Toda abstração vaza; N+1 com a conta de latência por ambiente                        |
| 11  | Revogação × escala como a MESMA escolha vista de ângulos                             |

## O PRÓXIMO PASSO exato

### 1. Fase 4 — módulos 13 a 16

Na ordem: 13 Segurança (`helmet`, `express-rate-limit`), 14 Observabilidade
(`pino`, `pino-http`), 15 Performance e cache (`redis`/`ioredis`,
`compression`, `autocannon`), 16 Deploy (Docker, GitHub Actions).

Duas coisas que o módulo 12 preparou para o 13:

- O `limitar()` escrito à mão (módulo 05) agora tem testes — dá para trocá-lo
  por `express-rate-limit` e provar que o comportamento não mudou.
- A suíte de `seguranca.test.ts` é a base natural do 13: testes de ausência já
  cobrem stack e hash; faltam os headers do `helmet`.

### 2. Depois

Fases 5 (17–20) e 6 (apêndices A–E).

## Convenções que se firmaram e valem manter

- **Portas:** exemplo do módulo NN → `50NN` (`src/exemplos`); solução do
  exercício NN → `4NN0`. O módulo 01 usa 4001/4010.
- Cada exercício NN copia a solução do NN−1 e evolui. É duplicação de propósito:
  cada solução roda sozinha, e o `diff` entre duas vizinhas mostra exatamente o
  que o módulo acrescentou. O 11 é a exceção deliberada — ele copia o **08**
  (memória), porque auth em memória é mais fácil de testar que auth sobre Prisma,
  e o enunciado permite qualquer repositório.
- **A partir do 12, todo app novo se monta com `criarApp(deps)`;** só
  `servidor.ts` chama `listen`. Os módulos 01–11 ficaram como estão de propósito.
- Todo achado de comportamento (Express 5, Zod 4, Prisma 7, Vitest 4) vira
  **conteúdo comentado no código** e uma linha na tabela "Erros comuns" do doc.
  Não vira só correção silenciosa.
- Teste que trava um achado vale mais que teste de caminho feliz. Exemplo vivo:
  o `POST` sem `Content-Type` → 400, que protege o `?? {}` do módulo 07.

## Nada foi commitado

Todo o trabalho está no working tree. `git status` mostra tudo como
novo/modificado.
