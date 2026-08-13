# Revisão didática dos docs — desenho

Data: 2026-08-13 · Escopo: `docs/01` a `docs/14`, `README.md`, regras de escrita,
organização da raiz.

## 1. O problema

O leitor (dono do repo, estudando pelo material) relatou, ao chegar no módulo 05:

> "parece que os docs estão querendo explicar de maneira rápida e preguiçosa,
> comendo palavra pra economizar e deixando a explicação difícil e chata, usando
> palavras que nem sei o que é. Muita frase de efeito. Quero explicação clara e
> simples, abordando todos os aspectos."

O caso que ele citou (`docs/05-middlewares.md:41`):

> "O princípio: middleware é composição de funções sobre um valor mutável. O
> Express não tem nada além disso — a 'mágica' do framework é uma lista de
> funções e um índice que anda."

As perguntas dele — "que valor mutável é esse?", "além disso o quê?", "que índice
é esse?" — **não têm resposta no módulo**. A lista e o índice são citados como se
já fossem conhecidos e nunca são mostrados.

### O defeito é sistêmico, não pontual

Levantamento: **36 blocos `**O princípio:**`** em 13 dos 14 docs. A maioria
aparece **antes** da mecânica que os justificaria. Não é descuido de um módulo —
é o que as regras de escrita mandam fazer.

### A causa está escrita

`GUIA-IMPLEMENTACAO.md` seção 7 manda, literalmente:

> "**Sempre nomeie o princípio**, em negrito, com uma frase que faça sentido fora
> do contexto da ferramenta."

Isso é um **pedido de aforismo**. Combinado com "parágrafo: máximo 4 linhas",
"enxuto em texto" e "se dá pra mostrar em código comentado, mostre em código —
não em prosa", o resultado inevitável é frase de efeito comprimida, sem o texto
que a sustenta. As regras produziram exatamente o material que o leitor rejeitou.

### Defeitos secundários confirmados

| # | Defeito | Evidência |
| - | ------- | --------- |
| 1 | Princípio antes da mecânica | 36 ocorrências; `05:41` é o caso extremo |
| 2 | Jargão sem definição | `composição`, `valor mutável`, `preocupação transversal` (05), `aridade` (05, 06), `chain of responsibility`/`interceptor` (05), `assimetria` (05), `acoplamento` (12), `backpressure` (14) |
| 3 | Comparação avançada cedo | `05:123-133` compara com Koa e ASP.NET antes de a cadeia do Express estar firme |
| 4 | Diagrama com conteúdo de módulo futuro | `05:281` lista `morgan`, `pino-http`, `cors`, `helmet`, rate limit — o leitor viu 2 de 7 |
| 5 | Falta o diagrama simples | Não existe, em nenhum doc, um fluxo `req → mw1 → mw2 → handler → res` |
| 6 | Ordem de exposição invertida | `04:26-34` mostra `mergeParams: true` no diagrama antes de o texto dizer o que é |
| 7 | Raiz poluída | 4 arquivos `.md` de navegação concorrentes: README (241), GUIA-IMPLEMENTACAO (975), GUIA-README (552, sobre como escrever READMEs), ULTIMO (200) |

## 2. Decisões tomadas com o leitor

| Decisão | Escolha |
| ------- | ------- |
| Tom do texto | Conversar mais: antecipar a dúvida, comparar com o já visto, repetir o ponto de outra forma. Docs crescem ~80-100%. |
| Ordem de trabalho | Sequencial, `01` → `14`. Não pular para 04/05. |
| Fases | Fase 1 e Fase 2 seguidas, sem parada obrigatória entre elas. |
| Raiz | README enxuto; os outros três `.md` movidos para `.projeto/`. |

## 3. As regras novas

### 3.1 Quatro regras substituídas

Alteram `CLAUDE.md` e `GUIA-IMPLEMENTACAO.md` seção 7.

| Regra atual | Regra nova |
| ----------- | ---------- |
| "Sempre nomeie o princípio, em negrito, numa frase que faça sentido fora do contexto da ferramenta" | O princípio vem **depois** da mecânica e é escrito em frase comum. Se a frase precisa ser decorada para fazer sentido, está errada. |
| "Parágrafo: até 4 linhas" | Uma ideia por parágrafo. O limite é a ideia, não a contagem de linhas. |
| "Se dá pra mostrar em código comentado, mostre em código — não em prosa" | Código mostra o **quê**; o texto ao redor diz o **porquê** e o que observar. Bloco de código sem texto antes e depois não ensina. |
| "Completo em cobertura, denso em conteúdo, enxuto em texto" | Completo em cobertura **e** em explicação. O corte é por redundância, nunca por concisão. |

### 3.2 Três regras novas

1. **Termo técnico é definido na primeira vez que aparece**, na própria linha
   ou na seguinte, e entra em `docs/00-glossario.md`.
2. **Diagrama só usa o que já foi ensinado até aquele módulo.** Elemento de
   módulo futuro só aparece em `## Se quiser ir mais fundo`, marcado como tal.
3. **Rampa obrigatória.** `## Conceitos` abre no caso mínimo e cresce. Comparação
   com outros frameworks, caso de borda e nome acadêmico do padrão saem do corpo.

### 3.3 A ordem das cinco camadas muda

| Hoje | Passa a ser |
| ---- | ----------- |
| problema → **princípio** → mecânica → trade-off → consequência | problema → **mecânica** → princípio → trade-off → consequência |

O leitor vê a coisa acontecer antes de ouvir o nome dela. O princípio deixa de
ser premissa e vira conclusão.

Isto **não reduz profundidade** — as cinco camadas continuam obrigatórias. Muda
só a ordem e a forma de escrever a camada 3.

## 4. O template ganha uma seção

```markdown
# NN — Título
**Em uma frase:** ...
## Por que importa
## Conceitos                    ← mecânica antes do princípio; rampa do mínimo
## Na prática
## Erros comuns
## Cheatsheet
## Os princípios deste módulo   ← frase comum, não aforismo
## Mini desafios
## Se quiser ir mais fundo      ← NOVO
## Para ir além
## Pratique
```

`## Se quiser ir mais fundo` recebe: comparação com outros frameworks, nome
acadêmico do padrão, caso de borda, detalhe de implementação e qualquer coisa que
dependa de módulo ainda não estudado. O conteúdo **não é apagado** — é movido,
para não atrapalhar a primeira leitura.

## 5. `docs/00-glossario.md`, arquivo novo

Formato: termo · uma frase em linguagem comum · em que módulo aparece primeiro.

Termos de partida (levantados no diagnóstico): `middleware`, `handler`, `pilha`,
`índice`, `composição`, `valor mutável`, `preocupação transversal`, `aridade`,
`idempotente`, `acoplamento`, `assimetria`, `backpressure`, `thread pool`,
`efeito colateral`, `inversão de dependência`, `abstração vaza`.

A lista cresce conforme cada doc é revisado: todo termo definido num doc é
acrescentado aqui. É linkado do README e citado no doc na primeira ocorrência.

## 6. Trabalho por documento

Todos os 14 docs passam pelo mesmo procedimento:

1. Ler o doc inteiro e listar cada bloco `**O princípio:**`.
2. Para cada um: a mecânica que o justifica já está antes dele? Se não, escrever
   a mecânica (código que roda, com texto explicando o que observar) e mover o
   princípio para depois, reescrito em frase comum.
3. Marcar todo termo técnico não definido; definir na primeira ocorrência e
   acrescentar ao glossário.
4. Conferir cada mermaid: contém elemento de módulo futuro? Contém detalhe que o
   texto ainda não explicou? Se sim, simplificar ou mover.
5. Mover comparação com outro framework / caso de borda para
   `## Se quiser ir mais fundo`.
6. Reescrever a tabela `## Os princípios deste módulo` em frase comum.
7. Verificar a rampa: o primeiro exemplo do doc é o mínimo possível?

### Trabalho extra por doc (já identificado)

Só o 04 e o 05 foram lidos por inteiro no diagnóstico. A tabela abaixo cresce
conforme cada doc é aberto — ausência de linha aqui significa "ainda não lido",
não "nada a fazer".

| Doc | Além do procedimento padrão |
| --- | --------------------------- |
| 04 | Diagrama `26-34` mostra `mergeParams` antes de o texto explicar — reordenar. Versionamento e design de URL descem para o fim: não são necessários para fazer a coisa funcionar. |
| 05 | Nova seção de abertura: a pilha, o índice, o `next()` que anda uma casa (rascunho aprovado pelo leitor, seção 8 desta spec). Novo diagrama simples `req → mw1 → mw2 → handler → res`. Diagrama de ordem canônica (`281`) vai para o fim, reduzido ao já ensinado. Koa e ASP.NET (`123-133`) para "Se quiser ir mais fundo". |

## 7. README e raiz

### README: de 241 para ~90 linhas

Fica: o que é o repo, como rodar, o passo extra do módulo 10, como estudar
(o fluxo docs → exemplos → exercícios), a tabela dos 20 módulos, onde fica cada
coisa, os comandos.

Sai do meio do caminho: o mermaid do currículo (a tabela logo abaixo diz o
mesmo), o mermaid da estrutura (idem), a seção "Stack" (vira uma linha).

As imagens **não são apagadas** — o README é a vitrine do repo no GitHub e elas
são geradas da saída real dos comandos. O banner e o quickstart ficam no topo; as
três de demonstração (módulos 12, 13, 14) e o `<details>` de como são geradas
descem para o fim, depois dos comandos. Assim a parte de cima do arquivo é só
navegação, que é o que o leitor procura quando abre.

### Raiz

| Arquivo | Destino |
| ------- | ------- |
| `GUIA-IMPLEMENTACAO.md` | `.projeto/GUIA-IMPLEMENTACAO.md` |
| `GUIA-README.md` | `.projeto/GUIA-README.md` |
| `ULTIMO.md` | `.projeto/ULTIMO.md` |

`CLAUDE.md` fica na raiz (o harness o lê de lá) e tem os caminhos atualizados.
Todo link relativo para esses arquivos, em qualquer `.md` do repo, é atualizado.

Sobra na raiz, para o leitor: `README.md`, `docs/`, `exercicios/`, `src/`.

## 8. Rascunho aprovado — abertura do doc 05

O leitor aprovou este texto como referência de tom. Ele é o padrão a imitar nos
14 docs:

> ### O que o Express guarda quando você chama `app.use`
>
> Você já escreveu `app.use(express.json())` sem pensar no que aquilo faz. Vamos
> abrir.
>
> Quando o servidor sobe, nenhuma requisição existe ainda. Então `app.use(fn)`
> não pode estar executando `fn` — não há o que executar. Ele só guarda `fn` numa
> lista, na ordem: [código]
>
> Repare que `app.get` entra na MESMA lista. Sua rota não é uma categoria
> especial: é o item `[2]` da pilha, com a condição extra de só rodar em
> `GET /x`.
>
> Agora chega uma requisição. O Express precisa percorrer essa lista, mas não com
> um `for` — porque uma função pode demorar (ler o banco) e ele não pode ficar
> esperando. Então ele passa o controle: cria um contador `i = 0`, chama
> `pilha[0]` e entrega junto uma função `next`. [código]
>
> Esse `i` é o "índice": o marcador de em que altura da lista a requisição está.
> Quem faz ele andar é você, chamando `next()`. O Express não anda sozinho.
>
> Daí vem o bug mais silencioso do Express. Se a sua função não chama `next()` e
> também não responde, o `i` fica parado. Ninguém dá erro, ninguém avisa: a
> requisição simplesmente nunca termina, e o cliente espera até desistir.

O que caracteriza o tom, e é o que deve ser replicado:

- Parte de algo que o leitor já fez (`app.use(express.json())`).
- Deriva o fato em vez de afirmá-lo ("não pode estar executando, porque não há o
  que executar").
- Antecipa a dúvida antes que ela seja feita ("mas não com um `for` — porque...").
- Nomeia o termo **depois** de mostrar a coisa ("esse `i` é o 'índice'").
- Fecha com a consequência prática, não com um aforismo.

## 9. O que não muda

Para deixar explícito e evitar interpretação larga demais:

- **O currículo.** Nenhum módulo é criado, apagado ou renumerado.
- **A profundidade.** As cinco camadas continuam obrigatórias; nada de conteúdo
  técnico é removido. Conteúdo avançado é **movido**, não cortado.
- **`src/exemplos/`, `exercicios/` e `src/playground/`.** Esta revisão é dos
  `.md` de `docs/` e do README. Código só muda se um doc revisado descrever
  comportamento que o exemplo não tem — e aí a correção é do doc, não do código,
  salvo erro real.
- **As regras de Markdown puro.** Sem `> [!NOTE]`, sem sintaxe de Markdown
  Preview Enhanced. Continua valendo.
- **A regra do `src/playground/`.** Intocável.

## 10. Verificação

Antes de declarar qualquer doc pronto:

| Checagem | Como |
| -------- | ---- |
| Tipos passam | `npm run typecheck` |
| O exemplo do módulo roda | `node src/exemplos/NN-*/...` e conferir a saída prometida |
| Todo comando `curl` do doc devolve o que o doc promete | Rodar contra o exemplo no ar |
| Nenhum link relativo quebrado | Varredura de `](./` e `](../` conferindo existência no disco |
| Nenhum mermaid quebrado | Conferir sintaxe de cada bloco alterado |
| Nenhum termo novo fora do glossário | Comparar termos em negrito com `docs/00-glossario.md` |

A regra do `CLAUDE.md` continua valendo e é o portão final: **todo exemplo tem
que rodar antes de o módulo ser dado como pronto.**

## 11. Ordem de execução

| Etapa | Conteúdo |
| ----- | -------- |
| 0 | Regras novas em `CLAUDE.md` e `GUIA-IMPLEMENTACAO.md` §7; template com a seção nova |
| 1 | `docs/00-glossario.md` com os termos de partida |
| 2 | Raiz: mover os três `.md` para `.projeto/`, atualizar todos os links |
| 3 | `README.md` enxuto |
| 4 | `docs/01` … `docs/14`, **em ordem**, um por vez, cada um verificado antes do seguinte |
| 5 | Passada final: glossário completo, links, `typecheck`, suíte de testes |

As etapas 0-3 vêm antes dos docs porque as regras precisam existir antes de serem
aplicadas, e porque o leitor está perdido na navegação **agora**.

Depois do `docs/01` (etapa 4, primeiro item) o resultado é reportado ao leitor
para conferência de tom, mas o trabalho **não para** esperando resposta — ele
pediu as duas fases seguidas e pode interromper se o estilo não servir.
