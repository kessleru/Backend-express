# Onde a sessão parou — 2026-08-13 (revisão didática CONCLUÍDA)

> Bilhete para a próxima sessão. O planejamento completo continua em
> [`GUIA-IMPLEMENTACAO.md`](GUIA-IMPLEMENTACAO.md) (seção 2 = achados técnicos,
> seção 7 = régua de qualidade de ensino, seção 9 = tabela de fases).

## Resumo em uma linha

**Revisão didática concluída**: as regras de escrita foram trocadas e **os 14
docs foram reescritos** sob elas, cada um verificado rodando o exemplo. Entraram
também o glossário, os sumários navegáveis, dois SVGs e a limpeza da raiz.

**Nada da revisão foi mergeado em `main`** — está tudo na branch
`revisao-didatica-docs`.

## ▶ POR QUE ESTA REVISÃO ACONTECEU

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

## O que foi feito nesta sessão

As 21 tarefas do plano, todas concluídas. Um commit por tarefa.

**Mudanças estruturais no repo:**

- `GUIA-IMPLEMENTACAO.md`, `GUIA-README.md` e este arquivo saíram da raiz e foram
  para `.projeto/`. Sobram `README.md` e `CLAUDE.md` na raiz.
- `docs/imagens/` virou `assets/` — as imagens são do README, não material de
  estudo, e `docs/` agora só tem os módulos e o glossário. O `gerar.mjs` escreve
  em `import.meta.dirname`, então funciona no lugar novo (verificado: os 4 SVGs
  saem idênticos).
- `docs/00-glossario.md`, novo: **34 termos** em linguagem comum, com link para o
  módulo onde cada ideia é desenvolvida.
- README de 241 → 179 linhas. As 5 tabelas de currículo viraram uma.
- **Sumário navegável em cada doc**, gerado por `.projeto/gerar-sumarios.mjs`
  (idempotente — dá para rodar de novo quando um doc ganhar seções). As 281
  âncoras foram conferidas contra os títulos reais.

### Quatro achados de conteúdo errado, todos corrigidos

1. **Doc 02** prometia `/io 1530ms → outro cliente esperou 13ms` e
   `/cpu 1364ms → 1364ms`. **Essas rotas não existem em lugar nenhum do repo** —
   os números não saíram de medição reproduzível. Trocado pela saída real do
   `medindo-tempo.ts` (~10ms com I/O, ~370ms com cálculo).
2. **Doc 10** afirmava que o repositório do 09 tem 172 linhas e o do 10 tem ~90.
   Têm **134 e 113**. O argumento foi reescrito: o ganho do ORM não é escrever
   menos código, é que tipo de código sumiu.
3. **Docs 06 e 09** tinham 4 links para módulos que não existem (15, 16 e 17).
   Viraram texto simples dizendo "ainda não escrito".
4. **Doc 08** tinha o mesmo aviso duplicado em dois lugares do arquivo.

### Um achado que virou aviso no doc

O exemplo do módulo 09 é o primeiro do curso que **grava em disco**. Os `curl`
dão os status prometidos na primeira execução; na segunda, o `201` vira `409`
porque o curso ficou gravado. O doc não dizia isso — quem rodasse duas vezes
acharia que o material mentiu. Entrou o aviso com `rm -f data/exemplo-09.sqlite*`.

### Os dois SVGs

Pedido do usuário, com limite explícito dito duas vezes: **"não quero que você
encha de imagem, coloque onde cairia muito bem na explicação"**. E não precisa
ser diagrama de caixinha — vale qualquer recurso visual.

Nada de imagem do Google: é obra de terceiro com direito autoral, num repo
público. Os SVGs são escritos à mão, em `assets/`, no mesmo painel escuro
(`#0d1117`) dos que o `gerar.mjs` produz — assim funcionam em tema claro e
escuro sem depender de `prefers-color-scheme`, que não é confiável dentro de
`<img>` no GitHub.

Ficaram **dois**, e só dois:

| Arquivo                       | O que mostra                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `assets/modulo-05-pilha.svg`  | Três momentos da mesma requisição: a pilha parada e o índice `i` andando           |
| `assets/modulo-02-thread.svg` | Linha do tempo: a requisição A espera 300ms e a única thread atende a B nesse meio |

**Descartados de propósito**, e o motivo — vale manter o critério em sessões
futuras:

- **Módulo 01**, anatomia da requisição: o bloco ` ```http ` com as setas `←` já
  mostra isso melhor que um desenho mostraria.
- **Módulo 08**, camadas: o mermaid existente resolve.

A regra que ficou: **se um mermaid ou um bloco de código já resolve, não faça
SVG.**

## Como cada doc foi revisado

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

| Doc | Como foi verificado                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Porta 4001: 4 curl + os resultados dos mini desafios 2, 4, 5 e 6 (5 headers; 201/201/400; `ana`; `HEAD` → 404)                                                                               |
| 02  | Os 3 scripts; a ordem `a d c b` rodada num arquivo separado                                                                                                                                  |
| 03  | Porta 5051: 14 curl, incluindo `?maxHoras=abc` → 400, vazio → 400, `=0` → 200                                                                                                                |
| 04  | Porta 5052: 9 curl + wildcard vira array, literal antes de `:id`, aninhado herda o `:id`. `mergeParams` testado num arquivo à parte: sem ele vem `null`, com ele vem `'3'`                   |
| 05  | Porta 5053: 9 curl, incluindo `/travado` estourando por timeout (curl exit 28)                                                                                                               |
| 06  | Porta 5054: 9 curl. O par que o doc descreve: cliente recebe genérico com `requestId`, terminal recebe a stack                                                                               |
| 07  | Porta 5055: 8 curl. Três erros numa resposta só; `.strict()` rejeitando `hora`; trim com defaults; PATCH que **não** zera `publicado`                                                        |
| 08  | Porta 5056: 7 curl. E a promessa do doc conferida com `diff -rq`: os services do 08 e do 10 são mesmo idênticos                                                                              |
| 09  | Porta 5057, **com banco limpo**: 201 e depois 409 (o `UNIQUE` é case-insensitive). Injeção testada de verdade: título com `DROP TABLE` volta vazio e a tabela fica de pé                     |
| 10  | Porta 5058, depois de `db:generate` + `db:migrate` + `db:seed`: 5 curl                                                                                                                       |
| 11  | Porta 5059: registro, login, `/eu` com e sem token, RBAC (o 1º cadastrado vira admin por desenho — o 403 só aparece do 2º em diante), e a mensagem de login idêntica nos dois casos de falha |
| 12  | `npm test`: 113 testes, 10 arquivos                                                                                                                                                          |
| 13  | Portas 5063 e 5064, cada par insegura × segura: rate limit (429 na 6ª), path traversal (400 × 200), helmet (4 headers × 0), login que vaza × que não vaza                                    |
| 14  | Porta 5064: `/health` continua 200 com o banco fora e `/ready` vai a 503; o `redact` deixa a senha como `[REDACTED]` mesmo com o corpo inteiro sendo logado de propósito                     |

### A passada final

```
grep de aforismo remanescente  → 0  (eram 36)
regra velha que voltou         → 0
uso de [!NOTE] / @import       → 0  (as ocorrências são as regras que os proíbem)
links relativos quebrados      → 0  (fora ../../actions, que é URL do GitHub num exemplo)
âncoras de sumário conferidas  → 281, nenhuma quebrada
npm run typecheck              → passa
npm run typecheck:ex           → passa
npm test                       → 113 testes, verde
npm run build                  → passa, e dist/ sai sem arquivo de teste
```

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
| 06 Tratamento de erros    | ✅  | ✅            | ✅      | ✅        | ✅           |
| 07 Validação (Zod)        | ✅  | ✅            | ✅      | ✅        | ✅           |
| 08 Arquitetura em camadas | ✅  | ✅            | ✅      | ✅        | ✅           |
| 09 SQLite e SQL           | ✅  | ✅            | ✅      | ✅        | ✅           |
| 10 Prisma (ORM)           | ✅  | ✅            | ✅      | ✅        | ✅           |
| 11 Autenticação           | ✅  | ✅            | ✅      | ✅        | ✅           |
| 12 Testes                 | ✅  | ✅            | ✅      | ✅        | ✅           |
| **13 Segurança**          | ✅  | ✅            | ✅      | ✅        | ❌ **falta** |
| **14 Observabilidade**    | ✅  | ✅            | ✅      | ✅        | ❌ **falta** |
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
