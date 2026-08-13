# Onde a sessão parou — 2026-08-13

> Bilhete para a próxima sessão. O planejamento completo continua em
> [`GUIA-IMPLEMENTACAO.md`](GUIA-IMPLEMENTACAO.md) (seção 2 = achados técnicos,
> seção 7 = régua de qualidade de ensino, seção 9 = tabela de fases).

## Resumo em uma linha

**Revisão didática em andamento**: as regras de escrita foram trocadas e os
**docs 01 a 05 já foram reescritos** sob elas. Faltam os docs 06 a 14, a passada
final, os SVGs e os sumários.

## ▶ O QUE ESTÁ ACONTECENDO AGORA

O usuário travou no módulo 05 e disse o que estava errado:

> "parece que os docs estão querendo explicar de maneira rápida e preguiçosa,
> comendo palavra pra economizar (…) usando palavras que nem sei o que é. Muita
> frase de efeito. Quero explicação clara e simples, abordando todos os aspectos."

O caso concreto era `docs/05-middlewares.md`:

> "O princípio: middleware é composição de funções sobre um valor mutável. O
> Express não tem nada além disso — a 'mágica' do framework é uma lista de
> funções e um índice que anda."

As perguntas dele — **que valor mutável? além disso o quê? que índice?** — não
tinham resposta no módulo. A lista e o índice eram citados e nunca mostrados.

### A causa era estrutural, não pontual

Levantamento inicial: **36 blocos `**O princípio:**`** em 13 dos 14 docs, a
maioria **antes** da mecânica que os justificaria. Não era descuido de um
módulo — era o que a seção 7 do guia mandava fazer:

> "**Sempre nomeie o princípio**, em negrito, com uma frase que faça sentido fora
> do contexto da ferramenta."

Isso é um pedido de aforismo. Somado a "parágrafo: máximo 4 linhas", "enxuto em
texto" e "se dá pra mostrar em código, mostre em código", produzia exatamente o
material que o leitor rejeitou.

### Documentos desta revisão

| Arquivo                                            | O que é                                    |
| -------------------------------------------------- | ------------------------------------------ |
| `specs/2026-08-13-revisao-didatica-docs-design.md` | Diagnóstico completo e decisões aprovadas  |
| `plans/2026-08-13-revisao-didatica-docs.md`        | As 21 tarefas, com verificação de cada uma |

**Branch:** `revisao-didatica-docs` (não mergeada). Um commit por tarefa.

## As regras que mudaram

Estão em `CLAUDE.md` e na seção 7 do guia. **A mais importante:**

| Antes                                                          | Agora                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| problema → **princípio** → mecânica → trade-off → consequência | problema → **mecânica** → princípio → trade-off → consequência |

O princípio virou **conclusão**, não premissa: só aparece depois de o leitor ver
a coisa funcionar, e é escrito em frase comum. Aforismo está proibido.

Quatro regras substituídas e três novas:

1. Princípio depois da mecânica, em frase comum.
2. Parágrafo é uma ideia (caiu o teto de 4 linhas).
3. Código mostra o **quê**; o texto ao redor diz o **porquê**.
4. Cobertura completa **e explicação completa** (caiu "enxuto em texto").
5. **Novo:** termo técnico definido na estreia, e vai para `docs/00-glossario.md`.
6. **Novo:** diagrama só usa o que já foi ensinado até aquele módulo.
7. **Novo:** rampa — `## Conceitos` abre no mínimo; o avançado vai para a seção
   nova `## Se quiser ir mais fundo`.

## O que já foi feito nesta sessão

| #   | Tarefa                           | Estado |
| --- | -------------------------------- | ------ |
| 1   | Regras novas no CLAUDE.md e guia | ✅     |
| 2   | `docs/00-glossario.md` criado    | ✅     |
| 3   | Raiz limpa                       | ✅     |
| 4   | README enxuto                    | ✅     |
| 5   | Doc 01 — HTTP                    | ✅     |
| 6   | Doc 02 — Node e async            | ✅     |
| 7   | Doc 03 — Express básico          | ✅     |
| 8   | Doc 04 — Roteamento              | ✅     |
| 9   | Doc 05 — Middlewares             | ✅     |

**Mudanças estruturais no repo:**

- `GUIA-IMPLEMENTACAO.md`, `GUIA-README.md` e este arquivo saíram da raiz e foram
  para `.projeto/`. Sobram `README.md` e `CLAUDE.md` na raiz.
- `docs/imagens/` virou `assets/` — as imagens são do README, não material de
  estudo. O `gerar.mjs` escreve em `import.meta.dirname`, então funciona no lugar
  novo (verificado: os 4 SVGs saem idênticos).
- `docs/00-glossario.md`, novo: 30 termos em linguagem comum, com link para o
  módulo onde cada ideia é desenvolvida. **Cresce a cada doc revisado.**
- README de 241 → 179 linhas. As 5 tabelas de currículo viraram uma.

### Dois achados de conteúdo errado

1. **Doc 02** prometia `/io 1530ms → outro cliente esperou 13ms` e
   `/cpu 1364ms → 1364ms`. **Essas rotas não existem em lugar nenhum do repo** —
   os números não saíram de medição reproduzível. Trocado pela saída real do
   `medindo-tempo.ts` (~10ms com I/O, ~370ms com cálculo).
2. **Docs 06 e 09** têm 4 links para módulos que não existem
   (`15-performance-e-cache.md`, `16-deploy-docker-ci.md`, `17-jobs-e-filas.md`).
   **Ainda não corrigidos** — estão anotados nas tarefas 10 e 13.

## O que falta

| #     | Tarefa                                   |
| ----- | ---------------------------------------- |
| 10–18 | Docs **06 a 14**, um por vez, na ordem   |
| 19    | Passada final (glossário, links, testes) |
| 20    | SVGs conceituais                         |
| 21    | Sumário em cada doc                      |

### Tarefa 20 — SVGs

Pedido do usuário, com limite explícito dito duas vezes: **"não quero que você
encha de imagem, coloque onde cairia muito bem na explicação"**. E não precisa
ser diagrama de caixinha — vale qualquer recurso visual.

Nada de imagem do Google: é obra de terceiro com direito autoral, num repo
público. Os SVGs são escritos à mão, em `assets/`, no mesmo painel escuro
(`#0d1117`) dos que o `gerar.mjs` produz — assim funcionam em tema claro e
escuro sem depender de `prefers-color-scheme`, que não é confiável dentro de
`<img>` no GitHub.

**Feito:** `assets/modulo-05-pilha.svg` — três momentos da mesma requisição, a
pilha parada e o índice `i` andando. É a coisa que mermaid não consegue mostrar.

**Candidatos restantes:** módulo 02 (a thread devolvida ao event loop durante um
`await`), módulo 01 (anatomia anotada de uma requisição HTTP), módulo 08 (as
camadas e quem chama quem).

### Tarefa 21 — Sumários

Índice navegável no topo de cada doc, logo depois do "Em uma frase", para quem
chega com uma dúvida específica. Markdown puro com âncoras (`[Título](#titulo)`),
que rolam a página sozinhas no GitHub e no preview do VS Code. **Não usar**
`@import "[TOC]"` — é sintaxe do Markdown Preview Enhanced e está proibida.

Fazer numa passada só, depois dos 14 docs, para o formato sair consistente. Falta
conferir como as âncoras se comportam com acento.

## Como cada doc está sendo revisado

1. Ler o doc inteiro antes de editar.
2. Para cada bloco de princípio: a mecânica que o justifica já apareceu antes? Se
   não, escrever a mecânica e mover o princípio para depois, em frase comum.
3. Marcar todo termo não definido; definir na estreia e pôr no glossário.
4. Conferir cada mermaid contra a regra de não adiantar módulo.
5. Mover comparação com outro framework e caso de borda para
   `## Se quiser ir mais fundo`.
6. Reescrever a tabela de princípios do fim em frase comum.
7. **Verificar rodando** o exemplo do módulo e todo `curl` que o doc promete.

### Verificações feitas por módulo

| Doc | Como foi verificado                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Porta 4001: 4 curl + os resultados dos mini desafios 2, 4, 5 e 6 (5 headers; 201/201/400; `ana`; `HEAD` → 404)                                                             |
| 02  | Os 3 scripts; a ordem `a d c b` rodada num arquivo separado                                                                                                                |
| 03  | Porta 5051: 14 curl, incluindo `?maxHoras=abc` → 400, vazio → 400, `=0` → 200                                                                                              |
| 04  | Porta 5052: 9 curl + wildcard vira array, literal antes de `:id`, aninhado herda o `:id`. `mergeParams` testado num arquivo à parte: sem ele vem `null`, com ele vem `'3'` |
| 05  | Porta 5053: 9 curl, incluindo `/travado` estourando por timeout (curl exit 28)                                                                                             |

## Pendências anteriores, que continuam de pé

Nada disto foi tocado nesta sessão, e nada disto está no escopo da revisão:

1. **Mini desafios dos módulos 02 a 14.** Só o 01 tem. O formato que se firmou:
   seção entre `## Cheatsheet` e `## Para ir além`, pergunta em negrito +
   `<details>` com a resposta, e **todo desafio exige rodar, medir ou quebrar de
   propósito**. Peça a previsão antes ("aposte o status"). Os melhores nascem de
   comportamento surpreendente do próprio exemplo.
2. **Soluções dos exercícios 13 e 14** (os enunciados existem).
3. **Módulos 15 a 20** e os apêndices.
4. `limitar()` escrito à mão no módulo 05 tem testes — dá para trocá-lo por
   `express-rate-limit` na solução do 13 e provar que o comportamento não mudou.

## Estado do que está pronto

| Módulo                    | Doc | Revisto 08-13 | Exemplo | Enunciado | Solução      |
| ------------------------- | --- | ------------- | ------- | --------- | ------------ |
| 01 Fundamentos de HTTP    | ✅  | ✅            | ✅      | ✅        | ✅           |
| 02 Node, módulos e async  | ✅  | ✅            | ✅      | ✅        | ✅           |
| 03 Express básico         | ✅  | ✅            | ✅      | ✅        | ✅           |
| 04 Roteamento             | ✅  | ✅            | ✅      | ✅        | ✅           |
| 05 Middlewares            | ✅  | ✅            | ✅      | ✅        | ✅           |
| 06 Tratamento de erros    | ✅  | ⬜            | ✅      | ✅        | ✅           |
| 07 Validação (Zod)        | ✅  | ⬜            | ✅      | ✅        | ✅           |
| 08 Arquitetura em camadas | ✅  | ⬜            | ✅      | ✅        | ✅           |
| 09 SQLite e SQL           | ✅  | ⬜            | ✅      | ✅        | ✅           |
| 10 Prisma (ORM)           | ✅  | ⬜            | ✅      | ✅        | ✅           |
| 11 Autenticação           | ✅  | ⬜            | ✅      | ✅        | ✅           |
| 12 Testes                 | ✅  | ⬜            | ✅      | ✅        | ✅           |
| **13 Segurança**          | ✅  | ⬜            | ✅      | ✅        | ❌ **falta** |
| **14 Observabilidade**    | ✅  | ⬜            | ✅      | ✅        | ❌ **falta** |
| 15–20                     | ❌  | —             | ❌      | ❌        | ❌           |

## Convenções que se firmaram e valem manter

- **Portas:** exemplo do módulo NN → `50NN`; solução do exercício NN → `4NN0`. O
  módulo 01 usa 4001/4010. **13 e 14 colidem na 5064** — não subir os dois juntos.
- **Módulo 10 exige setup:** `db:generate` → `db:migrate` → `db:seed`, senão o
  typecheck acusa 4 erros e o exemplo lança `P2021`.
- Cada exercício NN copia a solução do NN−1 e evolui. Duplicação de propósito: o
  `diff` entre duas vizinhas mostra o que o módulo acrescentou. O 11 é exceção
  deliberada — copia o **08** (memória).
- **A partir do 12, todo app novo se monta com `criarApp(deps)`;** só
  `servidor.ts` chama `listen`. Os 01–11 ficaram como estão de propósito.
- Todo achado de comportamento (Express 5, Zod 4, Prisma 7, Vitest 4) vira
  comentário no código **e** uma linha na tabela "Erros comuns" do doc.
- `curl -d '{"json":1}'` com aspas simples não funciona em `cmd.exe` nem
  PowerShell (eles não removem aspas simples). São 17 ocorrências em 8 módulos; o
  aviso está no módulo 01, com a forma escapada. Dívida em aberto se o repo
  virar multiplataforma de verdade.

## Estado do git

Branch `revisao-didatica-docs`, **não mergeada em `main`**. Um commit por tarefa,
cada um dizendo o que mudou e como foi verificado.

> **Atenção:** `PROMPT.md` aparece como deletado na árvore de trabalho. **Foi o
> usuário quem apagou**, durante a sessão, e a deleção **não foi commitada** de
> propósito — os commits desta revisão usam caminhos explícitos, nunca
> `git add -A`. Perguntar antes de apagar ou restaurar.
