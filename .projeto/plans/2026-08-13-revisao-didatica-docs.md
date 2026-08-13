# Revisão didática dos docs — plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** reescrever os 14 documentos de `docs/`, o `README.md` e as regras de escrita do repo para que a explicação venha antes do nome da coisa, sem jargão não definido e sem frase de efeito.

**Arquitetura:** primeiro as regras (`CLAUDE.md` e `GUIA-IMPLEMENTACAO.md` §7), porque são elas que produziram o defeito; depois o glossário, que os docs vão referenciar; depois a limpeza da raiz e do README, que resolve a navegação; e só então os 14 docs, em ordem, um verificado antes do próximo.

**Stack:** Markdown puro (sem extensão), mermaid nativo, Node 24 rodando TypeScript direto. Verificação com `npm run typecheck` e execução real dos exemplos.

**Spec:** `.projeto/specs/2026-08-13-revisao-didatica-docs-design.md`

## Restrições globais

Valem para **toda** tarefa deste plano.

| Restrição | Valor exato |
| --------- | ----------- |
| Idioma | Tudo em português — texto, comentários, mensagens de commit. |
| Markdown | Puro. **Proibido** `> [!NOTE]`/`[!WARNING]`/`[!CAUTION]`, `{cmd=true}` e `@import "[TOC]"`. Aviso é `>` com rótulo em negrito: `> **Atenção:** ...`. |
| `src/playground/` | **Nunca** criar, editar ou apagar nada lá. |
| Tamanho de doc | Sem limite. O corte é por redundância, nunca por concisão. |
| Escopo | Só `.md`. Não mexer em `src/exemplos/`, `exercicios/` nem em código, salvo erro real encontrado — e aí a correção é reportada, não silenciosa. |
| Fora de escopo | **Mini desafios.** Só o doc 01 os tem; escrevê-los nos outros 13 é trabalho de outra sessão (registrado em `ULTIMO.md`). Não escrever nenhum aqui. |
| Fora de escopo | Módulos 15-20 e apêndices. Não existem e continuam não existindo. |
| Números de linha | Todos os citados neste plano são do estado **antes** de qualquer edição. Localize por conteúdo, não por linha. |

### As sete regras de escrita novas

São o critério de aceite de toda tarefa de doc. Decoradas na Tarefa 1, aplicadas da Tarefa 5 em diante.

1. **Mecânica antes do princípio.** A ordem das cinco camadas é problema → **mecânica** → princípio → trade-off → consequência. O princípio é conclusão do que o leitor acabou de ver funcionar, nunca premissa.
2. **Princípio em frase comum.** Se a frase precisa ser decorada para fazer sentido, está errada. Proibido aforismo (`middleware é composição de funções sobre um valor mutável`).
3. **Uma ideia por parágrafo.** O limite é a ideia, não a contagem de linhas. A regra antiga de "máximo 4 linhas" não vale mais.
4. **Código não substitui explicação.** Código mostra o **quê**; o texto antes e depois diz o **porquê** e o que observar. Bloco solto entre dois títulos é defeito.
5. **Termo técnico definido na primeira aparição**, na própria linha ou na seguinte, e acrescentado a `docs/00-glossario.md`.
6. **Diagrama só com o que já foi ensinado** até aquele módulo. Elemento de módulo futuro só em `## Se quiser ir mais fundo`, marcado como tal.
7. **Rampa.** `## Conceitos` abre no caso mínimo e cresce. Comparação com outro framework, caso de borda e nome acadêmico do padrão saem do corpo.

### O tom de referência

Aprovado pelo leitor. Está transcrito na seção 8 da spec — **leia antes de escrever qualquer doc**. O que o caracteriza:

- Parte de algo que o leitor já fez.
- **Deriva** o fato em vez de afirmá-lo ("não pode estar executando `fn`, porque não há o que executar").
- Antecipa a dúvida antes de ela ser feita ("mas não com um `for` — porque...").
- Nomeia o termo **depois** de mostrar a coisa ("esse `i` é o 'índice'").
- Fecha na consequência prática, não num aforismo.

### Procedimento padrão de revisão de doc

As Tarefas 5 a 18 executam **este mesmo procedimento**, cada uma no seu arquivo, com os alvos específicos listados na tarefa.

1. Ler o doc inteiro antes de editar qualquer coisa.
2. Para cada bloco `**O princípio...**` listado na tarefa: a mecânica que o justifica já apareceu antes dele? Se não, escrever a mecânica (código que roda + texto dizendo o que observar) e mover o princípio para depois, reescrito em frase comum.
3. Marcar todo termo técnico não definido. Definir na primeira ocorrência e acrescentar a `docs/00-glossario.md` na mesma tarefa.
4. Conferir cada bloco mermaid: tem elemento de módulo futuro? Tem detalhe que o texto ainda não explicou? Simplificar ou mover.
5. Mover comparação com outro framework e caso de borda para `## Se quiser ir mais fundo` (criar a seção se não existir; omitir se não houver o que pôr).
6. Reescrever a tabela `## Os princípios deste módulo` em frase comum, mantendo a coluna "Onde reaparece".
7. Conferir a rampa: o primeiro exemplo do doc é o mínimo possível?
8. Verificar rodando (comandos exatos na tarefa) e commitar.

### Portas dos exemplos

Usadas nos passos de verificação. Convenção: exemplo do módulo NN → `50NN`.

| Módulo | Comando | Porta |
| ------ | ------- | ----- |
| 01 | `node src/exemplos/01-http-sem-express/servidor.ts` | 4001 |
| 02 | `node src/exemplos/02-node-async/*.ts` | — (scripts, sem servidor) |
| 03 | `node src/exemplos/03-express-basico/crud-cursos.ts` | 5051 |
| 04 | `node src/exemplos/04-roteamento/servidor.ts` | 5052 |
| 05 | `node src/exemplos/05-middlewares/pilha.ts` | 5053 |
| 06 | `node src/exemplos/06-erros/servidor.ts` | 5054 |
| 07 | `node src/exemplos/07-validacao/servidor.ts` | 5055 |
| 08 | `node src/exemplos/08-camadas/servidor.ts` | 5056 |
| 09 | `node src/exemplos/09-sqlite/servidor.ts` | 5057 |
| 10 | `node src/exemplos/10-prisma/servidor.ts` | 5058 |
| 11 | `node src/exemplos/11-auth/servidor.ts` | 5059 |
| 12 | `node src/exemplos/12-testes/servidor.ts` | 5060 |
| 13 | `node src/exemplos/13-seguranca/servidor.ts` | 5063 (e 5064 sem helmet) |
| 14 | `node src/exemplos/14-observabilidade/servidor.ts` | 5064 |

> **Atenção:** o módulo 10 exige `npm run db:generate && npm run db:migrate && npm run db:seed` antes de rodar, senão falha com `P2021 — table main.livros does not exist`. Os módulos 13 e 14 colidem na porta 5064 — não suba os dois ao mesmo tempo.

---

## Tarefa 1: As regras novas

**Arquivos:**
- Modificar: `CLAUDE.md` (seção "Estilo de escrita", linhas 22-48)
- Modificar: `GUIA-IMPLEMENTACAO.md` seção 7 (linhas 621-840), subseções "Regras" (688), "Qualidade de ensino" (699) e "Template obrigatório" (625)

**Interfaces:**
- Produz: as sete regras de escrita e o template com `## Se quiser ir mais fundo`, que toda tarefa de doc (5 a 18) consome.

- [ ] **Passo 1: Substituir as quatro regras em `GUIA-IMPLEMENTACAO.md`**

Na tabela da subseção "Regras" (linha ~690) e na subseção "Qualidade de ensino":

| Sai | Entra |
| --- | ----- |
| "Parágrafo: máximo 4 linhas. Sem muro de texto." | "Parágrafo: uma ideia. O limite é a ideia, não a linha — parágrafo de 8 linhas que desenvolve um raciocínio fica; dois de 3 linhas dizendo a mesma coisa saem." |
| "Prosa vs código: se dá pra mostrar em código comentado, mostre em código." | "Código mostra o **quê**; o texto ao redor diz o **porquê** e o que observar. Bloco de código entre dois títulos, sem texto, é defeito." |
| Bloco "**Importante:** A camada 2 é a razão de o repositório existir... **Sempre nomeie o princípio**, em negrito, com uma frase que faça sentido fora do contexto da ferramenta." | "O princípio vem **depois** da mecânica e é escrito em frase comum. Se a frase precisa ser decorada para fazer sentido, ela está errada. `a senha nunca é armazenada` é princípio; `middleware é composição de funções sobre um valor mutável` é aforismo — e aforismo não ensina, só soa bem." |
| Linha "Princípio nomeado \| Em negrito e numa frase transferível" da tabela "Regras de material" | "Princípio derivado \| Aparece depois da mecânica que o sustenta, em frase comum. O leitor tem que conseguir dizer 'ah, é isso que eu acabei de ver'." |

- [ ] **Passo 2: Inverter a ordem das cinco camadas**

Na tabela "As cinco camadas obrigatórias de todo conceito" (linha ~713), trocar a ordem das linhas 2 e 3, e ajustar a coluna "Como cortar":

| # | Camada | Pergunta que responde | Como cortar se ficar longo |
| - | ------ | --------------------- | -------------------------- |
| 1 | **Problema** | Que dor existia antes disto? | Vira uma frase, nunca some |
| 2 | **Mecânica** | Como funciona por baixo? | **Não corte. É o que responde "por quê".** |
| 3 | **Princípio** | Que ideia geral isto acabou de mostrar? | Vira uma frase, depois da mecânica |
| 4 | **Trade-off** | O que isto custa e quando **não** usar? | Vira linha de tabela |
| 5 | **Consequência** | O que muda no código de quem usa? | Vira o exemplo executável |

Acrescentar logo abaixo:

> **Atenção:** a ordem é obrigatória. Princípio antes da mecânica é o defeito que motivou esta revisão — o leitor ouve o nome de uma coisa que ainda não viu acontecer e trava.

- [ ] **Passo 3: Acrescentar as três regras novas**

Nova subseção em `GUIA-IMPLEMENTACAO.md` §7, depois de "Regras de material e exemplo":

```markdown
#### Três regras que não existiam antes

| Regra | Detalhe |
| ----- | ------- |
| **Termo definido na estreia** | Toda palavra técnica é explicada na primeira vez que aparece, na própria linha ou na seguinte, e entra em `docs/00-glossario.md`. Se você escreveu "aridade" sem dizer que é o número de parâmetros, o leitor parou ali. |
| **Diagrama não adianta módulo** | Um mermaid só pode conter o que já foi ensinado até aquele módulo. `helmet` num fluxo do 05 é ruído: o leitor vê sete caixas e reconhece duas. |
| **Rampa** | `## Conceitos` abre no caso mínimo e cresce. Comparação com outro framework, caso de borda e nome acadêmico do padrão vão para `## Se quiser ir mais fundo`. |
```

- [ ] **Passo 4: Acrescentar `## Se quiser ir mais fundo` ao template**

No bloco "Template obrigatório de cada `docs/NN-*.md`" (linha ~627), entre `## Mini desafios` e `## Para ir além`:

```markdown
## Se quiser ir mais fundo

Comparação com outros frameworks, nome acadêmico do padrão, caso de borda,
detalhe de implementação. Tudo que é verdade mas atrapalha a primeira leitura.
Some da seção se o módulo não tiver nada assim.
```

- [ ] **Passo 5: Alinhar o `CLAUDE.md`**

Na seção "Estilo de escrita":

- Trocar "Completo em cobertura, **denso em conteúdo**, enxuto em texto. Corte redundância, nunca profundidade" por "Completo em cobertura **e em explicação**. Corte redundância, nunca profundidade nem clareza — módulo raso é defeito, módulo longo não é."
- Trocar o parágrafo "Todo conceito passa pelas cinco camadas... O princípio é sempre **nomeado em negrito**, numa frase que vale fora da ferramenta" por: "Todo conceito passa pelas cinco camadas na ordem: problema → **mecânica** → princípio → trade-off → consequência. O princípio vem **depois** de o leitor ver a coisa funcionar, e é escrito em frase comum — nunca aforismo."
- Trocar o bullet "Parágrafo: até 4 linhas" por "Parágrafo: uma ideia."
- Trocar "Se dá pra mostrar em código comentado, mostre em código — não em prosa" por "Código mostra o quê; o texto ao redor diz o porquê e o que observar."
- Acrescentar três bullets: termo definido na estreia, diagrama não adianta módulo, rampa.

- [ ] **Passo 6: Verificar que nenhuma regra velha sobreviveu**

```bash
grep -rn "máximo 4 linhas\|até 4 linhas\|Sempre nomeie o princípio\|frase que vale fora\|enxuto em texto\|mostre em código — não em prosa" CLAUDE.md GUIA-IMPLEMENTACAO.md
```

Esperado: **nenhuma saída.** Qualquer resultado é uma regra velha que escapou.

- [ ] **Passo 7: Commit**

```bash
git add CLAUDE.md GUIA-IMPLEMENTACAO.md
git commit -m "docs: inverter a ordem das cinco camadas e proibir aforismo

O princípio passa a vir depois da mecânica, em frase comum. Some o teto
de 4 linhas por parágrafo e a regra de trocar prosa por código. Entram:
termo definido na estreia, diagrama sem módulo futuro e rampa."
```

---

## Tarefa 2: O glossário

**Arquivos:**
- Criar: `docs/00-glossario.md`

**Interfaces:**
- Produz: `docs/00-glossario.md`, que as Tarefas 5 a 18 alimentam e os docs linkam.

- [ ] **Passo 1: Criar o arquivo com a estrutura e os termos de partida**

Formato: uma tabela ordenada alfabeticamente, três colunas — termo, explicação em uma frase de linguagem comum, módulo onde aparece primeiro.

Cabeçalho do arquivo:

```markdown
# 00 — Glossário

Toda palavra técnica que aparece nos módulos, explicada em uma frase. Se você
travou numa palavra durante a leitura, ela tem que estar aqui — se não estiver,
é falha do material.

A explicação aqui é a versão curta. O módulo da última coluna é onde a ideia
é desenvolvida de verdade.
```

Termos obrigatórios de partida, com a explicação já escrita (não deixar para o executor inventar):

| Termo | Explicação em uma frase | Onde |
| ----- | ----------------------- | ---- |
| **abstração vaza** | Toda camada que esconde complexidade acaba deixando algum detalhe do que ela esconde aparecer — e você precisa entender o que estava embaixo. | 10 |
| **acoplamento** | O quanto uma parte do código precisa saber sobre outra para funcionar. Alto acoplamento = mexer aqui quebra ali. | 08, 12 |
| **aridade** | O número de parâmetros que uma função declara. O Express usa isso para diferenciar um middleware normal (3) de um tratador de erro (4). | 05, 06 |
| **backpressure** | Quando quem produz dados é mais rápido que quem consome, e o excesso precisa ser segurado em algum lugar. | 14 |
| **composição** | Encadear funções pequenas de forma que a saída de uma alimenta a próxima, em vez de escrever uma função grande. | 05 |
| **efeito colateral** | Qualquer coisa que uma função faz além de devolver um valor: gravar no banco, mandar e-mail, escrever em log. | 02, 13 |
| **handler** | A função que de fato responde a uma rota. No Express é o último item da fila de funções daquela requisição. | 03, 05 |
| **idempotente** | Repetir a operação 10 vezes deixa o sistema no mesmo estado que fazer 1 vez. | 01, 03 |
| **índice (da pilha)** | O contador que o Express usa para lembrar em que altura da fila de funções aquela requisição está. `next()` faz ele andar uma casa. | 05 |
| **inversão de dependência** | Em vez de a peça criar sozinha o que ela usa, ela recebe pronto de fora. Isso permite trocar a peça de baixo sem tocar na de cima. | 08 |
| **middleware** | Uma função que roda no meio do caminho entre a requisição chegar e a resposta sair. Pode olhar, alterar, deixar passar ou encerrar. | 05 |
| **pilha (de middlewares)** | A lista de funções que o Express monta a cada `app.use` e `app.get`, na ordem em que você escreveu. | 05 |
| **preocupação transversal** | Algo que precisa acontecer em quase toda requisição (log, autenticação, CORS) e não pertence a nenhuma rota específica. | 05 |
| **thread pool** | Um grupinho de threads que o Node mantém de lado (4 por padrão) para tarefas que não dá para delegar ao sistema operacional. | 02 |
| **valor mutável** | Um objeto que pode ser alterado depois de criado. `req` e `res` são assim: o que um middleware escreve neles, o próximo enxerga. | 05 |

- [ ] **Passo 2: Verificar que todo termo de partida realmente aparece no doc citado**

```bash
grep -l "aridade" docs/*.md          # esperado: 05 e 06
grep -l "preocupação transversal" docs/*.md   # esperado: 05
grep -l "backpressure" docs/*.md     # esperado: 14
grep -l "acoplamento" docs/*.md      # esperado: 08 ou 12
```

Se um termo não aparece em doc nenhum, tirar do glossário — ele não faz falta.

- [ ] **Passo 3: Commit**

```bash
git add docs/00-glossario.md
git commit -m "docs: criar o glossário com os termos que travavam a leitura"
```

---

## Tarefa 3: Limpar a raiz

**Arquivos:**
- Mover: `GUIA-IMPLEMENTACAO.md` → `.projeto/GUIA-IMPLEMENTACAO.md`
- Mover: `GUIA-README.md` → `.projeto/GUIA-README.md`
- Mover: `ULTIMO.md` → `.projeto/ULTIMO.md`
- Modificar: `CLAUDE.md` (linha 6), `README.md` (linhas 8 e 239), `.projeto/GUIA-IMPLEMENTACAO.md` (linhas 180 e 294), `.projeto/ULTIMO.md` (linhas 4 e 130), `.projeto/GUIA-README.md` (linha 504)

**Interfaces:**
- Consome: nada.
- Produz: a raiz com um só `.md` de navegação (`README.md`) mais o `CLAUDE.md`.

- [ ] **Passo 1: Mover com `git mv` para preservar o histórico**

```bash
git mv GUIA-IMPLEMENTACAO.md .projeto/GUIA-IMPLEMENTACAO.md
git mv GUIA-README.md .projeto/GUIA-README.md
git mv ULTIMO.md .projeto/ULTIMO.md
```

- [ ] **Passo 2: Atualizar as sete referências conhecidas**

| Arquivo | Linha | Correção |
| ------- | ----- | -------- |
| `CLAUDE.md` | 6 | `` `GUIA-IMPLEMENTACAO.md` `` → `` `.projeto/GUIA-IMPLEMENTACAO.md` `` |
| `README.md` | 8 | badge aponta para `./GUIA-IMPLEMENTACAO.md#9-roadmap-de-execução` → `./.projeto/GUIA-IMPLEMENTACAO.md#9-roadmap-de-execução` |
| `README.md` | 239 | idem no rodapé |
| `.projeto/GUIA-IMPLEMENTACAO.md` | 294 | a árvore de pastas mostra `GUIA-IMPLEMENTACAO.md` na raiz — corrigir para `.projeto/` |
| `.projeto/GUIA-IMPLEMENTACAO.md` | 180 | menção a `ULTIMO.md` |
| `.projeto/ULTIMO.md` | 4, 130 | menções a `GUIA-IMPLEMENTACAO.md` |
| `.projeto/GUIA-README.md` | 504 | prompt reutilizável cita `GUIA-README.md` |

Referências dentro de `.projeto/` podem ficar relativas simples (`GUIA-IMPLEMENTACAO.md`), já que os três agora são vizinhos.

- [ ] **Passo 3: Varredura — nenhuma referência ao caminho velho sobrou**

```bash
grep -rn "](./GUIA-\|](./ULTIMO\|](GUIA-\|](ULTIMO" --include=*.md . | grep -v node_modules
```

Esperado: **nenhuma saída.**

- [ ] **Passo 4: Todo link relativo de todo `.md` existe no disco**

```bash
grep -rhoE '\]\((\./|\.\./)[^)#]+' --include=*.md . | grep -v node_modules | \
  sed 's/^](//' | sort -u | while read -r p; do
    [ -e "$p" ] || echo "QUEBRADO: $p"
  done
```

Esperado: nenhum `QUEBRADO:`. Este comando roda da raiz, então links de `docs/` com `../` vão acusar falso positivo — confira caso a caso antes de "corrigir".

- [ ] **Passo 5: Commit**

```bash
git add -A
git commit -m "chore: mover os guias internos para .projeto/

A raiz tinha quatro .md de navegação competindo. Sobram README.md
(para quem estuda) e CLAUDE.md (que o harness lê da raiz)."
```

---

## Tarefa 4: README enxuto

**Arquivos:**
- Modificar: `README.md` (241 linhas → ~90-110)

**Interfaces:**
- Consome: os caminhos `.projeto/` da Tarefa 3; o link para `docs/00-glossario.md` da Tarefa 2.

> **Atenção:** `.projeto/GUIA-README.md` é o padrão que este repo definiu para README de GitHub — estrutura canônica (seção 2), checklist de 60 segundos (2.1), hierarquia de impacto das imagens (3.1) e erros comuns (5). **Leia antes de editar** e siga. Ele não tem nada a ver com as regras de escrita dos módulos; é só sobre o README. Onde ele conflitar com este plano, ele ganha — as sete regras novas valem para `docs/`, não para a vitrine do repo.

- [ ] **Passo 1: Reordenar — navegação em cima, vitrine embaixo**

Ordem nova das seções:

1. Banner + badges (como está)
2. **O que é este repo** (2 parágrafos; hoje está na linha 40, desce demais)
3. **Rodando** (o bloco de 30 segundos + o passo extra do módulo 10)
4. **Como estudar** (o fluxo mermaid docs → exemplos → exercícios → solução; fica, é pequeno e útil)
5. **Currículo** — as 5 tabelas, **sem** o mermaid de 25 linhas que diz a mesma coisa
6. **Onde fica cada coisa** — a tabela de pastas, **sem** o mermaid
7. **Comandos** — as 3 tabelas
8. **Vitrine** — as 3 imagens de demonstração (módulos 12, 13, 14) e o `<details>` de como são geradas
9. Rodapé

- [ ] **Passo 2: Cortar o que é duplicata**

| Corte | Por quê |
| ----- | ------- |
| Mermaid do currículo (linhas 98-123) | As 5 tabelas logo abaixo dizem o mesmo, com link. |
| Mermaid da estrutura (linhas 176-185) | Vira tabela de 5 linhas. |
| Seção "Stack" (linhas 227-233) | Vira uma linha no fim de "O que é este repo". |
| Parágrafo "A diferença para um tutorial: cada assunto passa por problema → princípio → mecânica..." (45-48) | Reescrever na ordem nova (mecânica antes do princípio) e encurtar para uma frase. |

- [ ] **Passo 3: Acrescentar a linha que faltava**

Em "Onde fica cada coisa", incluir `docs/00-glossario.md` com a frase: "travou numa palavra? ela está aqui".

- [ ] **Passo 4: Rodar o checklist de 60 segundos do próprio guia**

`.projeto/GUIA-README.md` seção 2.1 traz dois comandos prontos: um confere que todo link/imagem relativo existe no disco, outro que toda badge responde (o shields.io devolve 404 em parâmetro inválido). Rodar os dois — a badge da linha 8 aponta para um caminho que mudou na Tarefa 3.

- [ ] **Passo 5: Conferir o tamanho e os links**

```bash
wc -l README.md          # esperado: entre 85 e 115
grep -oE '\]\([^)]+\)' README.md | sed 's/](//;s/)//' | grep -v '^http' | \
  while read -r p; do [ -e "${p#./}" ] || echo "QUEBRADO: $p"; done
```

Esperado: nenhum `QUEBRADO:`.

- [ ] **Passo 6: Commit**

```bash
git add README.md
git commit -m "docs: enxugar o README de 241 para ~100 linhas

Navegação em cima, vitrine embaixo. Saem os dois mermaid que repetiam
as tabelas logo abaixo deles."
```

---

## Tarefas 5 a 18: os catorze documentos

Cada tarefa executa o **Procedimento padrão de revisão de doc** (nas restrições globais) no seu arquivo, com os alvos abaixo. **Uma tarefa por vez, verificada antes da seguinte.**

Todas terminam com os mesmos três passos, que não são repetidos em cada uma:

- [ ] **Passo final A: verificar rodando** — subir o exemplo do módulo (tabela de portas nas restrições globais) e conferir que **todo** comando `curl` do doc devolve o que o doc promete. Divergência é reportada, não maquiada.
- [ ] **Passo final B: `npm run typecheck`** — esperado: passa.
- [ ] **Passo final C: commit** — `docs: revisar o módulo NN sob as regras novas`, com o corpo dizendo o que mudou de lugar.

### Tarefa 5: `docs/01-fundamentos-http.md` (595 linhas)

- Blocos de princípio: linha 29 (`HTTP é um protocolo de texto, sem estado e iniciado pelo cliente`) e 173 (`statelessness empurra o estado para as pontas`).
- O bloco de 29 vem **logo depois** do primeiro mermaid e antes de qualquer mecânica — é o caso mais grave do doc. A anatomia da requisição (linhas ~46-60) tem que vir antes dele.
- Termo a definir: `statelessness` (o doc usa a palavra em inglês sem traduzir), `keep-alive`, `multiplexa` (nota da linha ~40).
- 3 mermaid, 10 `<details>` (os mini desafios — **não mexer neles**, só conferir que continuam corretos depois das edições).
- Verificação: `node src/exemplos/01-http-sem-express/servidor.ts`, porta 4001.

### Tarefa 6: `docs/02-node-modulos-e-async.md` (342 linhas)

- Blocos de princípio: 43 (`o Node não é rápido porque é paralelo`) e 203 (`uma Promise é um valor que ainda não chegou`).
- Termos a definir: `thread pool` (linha 68, citado sem explicação), `libuv`, `event loop`, `semver`.
- 3 mermaid. O da linha 28 mostra libuv e thread pool antes de o texto os explicar.
- Verificação: os scripts de `src/exemplos/02-node-async/` (sem servidor) — rodar cada um e conferir a saída prometida.

### Tarefa 7: `docs/03-express-basico.md` (360 linhas)

- Blocos de princípio: 29, 86, 113, 174. **Quatro em 360 linhas** — o doc com maior densidade de aforismo do repo.
- O de 113 (`cada posição carrega um tipo diferente de...`) é o que mais precisa da mecânica antes.
- Termo a definir: `idempotente` reaparece aqui (linha 229) — linkar para o 01 em vez de reexplicar, conforme a regra de repetição.
- Verificação: `node src/exemplos/03-express-basico/crud-cursos.ts`, porta 5051.

### Tarefa 8: `docs/04-roteamento.md` (311 linhas)

Além do procedimento padrão:

- Blocos de princípio: 43 (`quem é montado não decide onde é montado`), 166, 204.
- **Reordenar o mermaid das linhas 26-34:** ele mostra `mergeParams: true` numa caixa, e `mergeParams` só é explicado na linha 137. Ou tirar do diagrama, ou adiantar a explicação.
- **Descer versionamento (189-222) e design de URL REST (154-188) para o fim do `## Conceitos`**, depois de `404 no fim`. Não são necessários para fazer roteamento funcionar; são decisão de design de API.
- Comparação com o roteamento por arquivo do Next.js (83-95) → `## Se quiser ir mais fundo`.
- Verificação: `node src/exemplos/04-roteamento/servidor.ts`, porta 5052. São 8 comandos `curl` no doc (linhas 242-250) — rodar os 8.

### Tarefa 9: `docs/05-middlewares.md` (325 linhas)

O módulo que motivou a revisão. Além do procedimento padrão:

- [ ] **Escrever a nova seção de abertura** com o texto aprovado na seção 8 da spec: a pilha, o índice, o `next()` que anda uma casa. Vai **antes** de tudo em `## Conceitos`, inclusive antes da assinatura `(req, res, next)`.
- [ ] **Criar o diagrama simples que não existe:** `req → mw1 → mw2 → handler → res`, com o `i` andando ao lado. Só isso — nenhuma lib, nenhum caminho de erro. O diagrama de três saídas que hoje está na linha 25 vem **depois** dele.
- [ ] **Apagar o bloco de princípio da linha 41** (`middleware é composição de funções sobre um valor mutável`). O conteúdo dele passa a ser a seção de abertura. No lugar, depois da mecânica, uma frase comum do tipo: "É por isso que a ordem em que você escreve é a ordem em que roda: não existe prioridade, só a posição na lista."
- [ ] **Mover para `## Se quiser ir mais fundo`:** a comparação com Koa e ASP.NET (123-133), os nomes `chain of responsibility` / `pipeline` / `interceptor` (45-46).
- [ ] **Simplificar o mermaid da ordem canônica (281-293):** hoje tem 7 caixas, das quais o leitor conhece 2. Reduzir ao que foi ensinado (`express.json` → middlewares próprios → rotas → 404 → erro) e mover para depois dos princípios, marcado como "o que você vai montar até o módulo 14".
- [ ] **Definir na estreia:** `preocupação transversal` (48), `aridade` (188), `valor mutável`, `composição`.
- [ ] Verificação: `node src/exemplos/05-middlewares/pilha.ts`, porta 5053. São 9 comandos `curl` (236-246), incluindo `curl -m 2 $B/travado` que **tem** que estourar por timeout — confirmar que ainda estoura.

### Tarefa 10: `docs/06-tratamento-de-erros.md` (359 linhas)

- Blocos de princípio: 29, 88, 170, 251 — quatro.
- Termo a definir: `aridade` reaparece na linha 160 — linkar para o glossário, não reexplicar.
- Verificação: `node src/exemplos/06-erros/servidor.ts`, porta 5054.

### Tarefa 11: `docs/07-validacao-zod.md` (385 linhas)

- Blocos de princípio: 24, 86, 250.
- Termo a definir: `função pura` (250, usado como se fosse conhecido).
- Falso amigo já documentado (`.partial()` no PATCH) — conferir que está em destaque, conforme a regra do `CLAUDE.md`.
- Verificação: `node src/exemplos/07-validacao/servidor.ts`, porta 5055.

### Tarefa 12: `docs/08-arquitetura-em-camadas.md` (382 linhas)

- Blocos de princípio: 65, 136, 183, 258 — quatro, e o de 65 abre com o nome acadêmico (`inversão de dependência`) antes de qualquer mecânica. É o padrão a inverter.
- Termos a definir: `inversão de dependência`, `acoplamento`, `volatilidade` (usado como critério).
- Verificação: `node src/exemplos/08-camadas/servidor.ts`, porta 5056.

### Tarefa 13: `docs/09-sqlite-e-sql.md` (450 linhas)

- Blocos de princípio: 119, 286.
- 4 mermaid — o maior número do repo. Conferir cada um contra a regra 6.
- Verificação: `node src/exemplos/09-sqlite/servidor.ts`, porta 5057.

### Tarefa 14: `docs/10-prisma-orm.md` (443 linhas)

- Blocos de princípio: 49 (`toda abstração vaza`), 213 (`a diferença entre O(1) e O(N)`).
- Termos a definir: `abstração vaza`, `N+1`, `O(1)`/`O(N)` (notação assumida como conhecida).
- **Pré-requisito:** `npm run db:generate && npm run db:migrate && npm run db:seed` antes de verificar.
- Verificação: `node src/exemplos/10-prisma/servidor.ts`, porta 5058.

### Tarefa 15: `docs/11-autenticacao.md` (419 linhas)

- Um bloco de princípio (112), mas o doc é denso em jargão de segurança.
- Termos a definir: `salt`, `rainbow table`, `claim`, `revogação`, `RBAC`.
- Falso amigo já documentado (`decode` no lugar de `verify`) — conferir o destaque.
- Verificação: `node src/exemplos/11-auth/servidor.ts`, porta 5059. Exige `JWT_SECRET` com 32+ caracteres, senão o servidor recusa subir — é comportamento de propósito.

### Tarefa 16: `docs/12-testes.md` (399 linhas)

- **Zero blocos `**O princípio:**`** — mas tem afirmação-aforismo solta na linha 16 (`é consequência de acoplamento baixo`) e 134.
- Só 1 mermaid; conferir se falta algum diagrama onde hoje há prosa.
- Verificação: `npm test` (113 testes) e `node src/exemplos/12-testes/servidor.ts`, porta 5060.

### Tarefa 17: `docs/13-seguranca.md` (468 linhas)

- Blocos de princípio: 102, 161, 313.
- O maior doc do repo depois do 01.
- Verificação: `node src/exemplos/13-seguranca/servidor.ts`, portas 5063 e 5064. As rotas vêm em par (insegura × segura) — conferir os dois lados de cada par.

### Tarefa 18: `docs/14-observabilidade.md` (413 linhas)

- Blocos de princípio: 124, 182, 295.
- Termo a definir: `backpressure` (102), `redigir`/`redaction`.
- Só 1 mermaid num doc de 413 linhas — candidato a ganhar um.
- Verificação: `node src/exemplos/14-observabilidade/servidor.ts`, porta 5064. **Não subir junto com o 13.**

---

## Tarefa 19: Passada final

**Arquivos:**
- Modificar: `docs/00-glossario.md`, `.projeto/ULTIMO.md`

- [ ] **Passo 1: Nenhum aforismo sobreviveu**

```bash
grep -rn "^\*\*O princípio" docs/*.md
```

Cada resultado tem que ter a mecânica **antes** dele. Conferir um por um; a contagem inicial era 36.

- [ ] **Passo 2: Nenhuma regra velha voltou**

```bash
grep -rn "máximo 4 linhas\|Sempre nomeie o princípio\|frase que vale fora" CLAUDE.md .projeto/GUIA-IMPLEMENTACAO.md
```

Esperado: nenhuma saída.

- [ ] **Passo 3: Todo termo em negrito de doc está no glossário**

Levantar os termos técnicos definidos em cada doc e conferir contra `docs/00-glossario.md`. Acrescentar os que faltarem.

- [ ] **Passo 4: Links e tipos**

```bash
npm run typecheck
npm run typecheck:ex
npm test
grep -rhoE '\]\((\./|\.\./)[^)#]+' --include=*.md . | grep -v node_modules | sort -u
```

Esperado: typecheck e testes verdes (113 testes); todo caminho listado existe no disco.

- [ ] **Passo 5: Atualizar o bilhete de sessão**

Reescrever `.projeto/ULTIMO.md` registrando: a revisão didática feita, as regras novas, o glossário criado, a raiz limpa. E o que continua pendente: mini desafios dos módulos 02-14, soluções dos exercícios 13 e 14, módulos 15-20, apêndices.

- [ ] **Passo 6: Commit**

```bash
git add -A
git commit -m "docs: passada final da revisão didática

Glossário completo, links conferidos, typecheck e suíte verdes."
```

---

## Autorrevisão do plano

**Cobertura da spec:** §3.1 e §3.2 → Tarefa 1. §3.3 → Tarefa 1 passo 2. §4 (template) → Tarefa 1 passo 4. §5 (glossário) → Tarefa 2, alimentado pelas 5-18, fechado na 19. §6 (procedimento) → restrições globais + Tarefas 5-18. §6 trabalho extra do 04 e 05 → Tarefas 8 e 9. §7 (README e raiz) → Tarefas 3 e 4. §9 (o que não muda) → restrições globais. §10 (verificação) → passos finais A/B/C e Tarefa 19. §11 (ordem) → numeração das tarefas. **Sem lacuna.**

**Placeholders:** nenhum "TBD"/"a definir". As explicações do glossário estão escritas, não delegadas. Os textos de substituição da Tarefa 1 estão literais.

**Consistência:** `docs/00-glossario.md` tem o mesmo nome na Tarefa 2, no README (Tarefa 4 passo 3), nas Tarefas 5-18 (passo 3 do procedimento) e na Tarefa 19. `## Se quiser ir mais fundo` idêntico em todas as ocorrências. `.projeto/` idêntico nas Tarefas 3, 4 e 19.

**Ponto fraco conhecido:** as Tarefas 5, 6, 7 e 10-18 listam os blocos de princípio (levantados por `grep`) mas não o trabalho extra de cada doc — só o 04 e o 05 foram lidos por inteiro. Quem executar cada uma faz o levantamento no passo 1 do procedimento (ler o doc inteiro antes de editar). Está declarado na spec §6 e é aceito de propósito: ler 14 docs por inteiro para planejar seria repetir o trabalho de executá-los.
