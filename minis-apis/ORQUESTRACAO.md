# minis-apis — briefing de orquestração

Esta pasta é um **repertório de APIs pequenas e reais**, cada uma resolvendo um
problema que existe no mundo (encurtar link, inscrever gente num evento,
controlar gasto). Serve para ver o conteúdo dos módulos aplicado fora do domínio
da biblioteca, que é o exemplo fixo de `docs/` e `exercicios/`.

Este arquivo é o **briefing dos agentes**: cada agente pega uma tarefa da seção
4, constrói uma mini API completa e para. Ele não é material de ensino — quem
ensina são os `docs/`. Aqui o texto é operacional.

---

## 1. O que vale para as três

| Regra                     | Detalhe                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Piso: módulo 03**       | Toda mini API começa no Express básico. Nenhuma pressupõe leitura anterior além do 03.                          |
| **Teto: módulo 09**       | Nada de Prisma, JWT, argon2, helmet, rate-limit, Pino ou Vitest nesta leva. Cada tarefa tem o seu teto exato.   |
| **Zero dependência nova** | Só o que já está no `package.json`: `express`, `cors`, `morgan`, `zod`, `node:sqlite`. Instalar algo é erro.    |
| **Domínio próprio**       | Nenhuma delas é biblioteca/livros/cursos. O ponto da pasta é variar o domínio.                                  |
| **Pequena de verdade**    | Cada tarefa traz um teto de linhas. Passou muito do teto, o escopo cresceu sozinho — corte, não peça exceção.   |
| **Roda sem setup**        | `node minis-apis/NN-nome/servidor.ts` e pronto. A de SQLite cria e popula o banco sozinha na primeira execução. |

### Convenções técnicas (as mesmas do repositório)

- **ESM**, `import` sempre, `require` nunca.
- **Import relativo com extensão `.ts`**: `import { rotas } from './rotas.ts'`.
- **Sem `enum`, `namespace`, `import =`** — `erasableSyntaxOnly` está ligado.
- **Tudo em português**: nome de arquivo, variável, rota, mensagem de erro, doc.
- **Portas 6001, 6002, 6003.** A faixa `50NN` é dos exemplos e a `4NN0` das
  soluções; a `600N` é desta pasta e não colide com nada.
- **Banco em `data/minis-NN-nome.sqlite`** — o `.gitignore` já ignora `data/*.sqlite`.
- **`src/playground/` é intocável.** Nenhum agente lê, escreve ou cita.

### Comentário: explique o que é fundamental, e uma vez só

Estas APIs são lidas sozinhas, sem o `docs/` do lado — então onde o comentário
existe, ele **explica de verdade**, com o porquê e a consequência, não uma
etiqueta na linha.

Mas **não é regra**: aparecer no arquivo não obriga a explicar. A pergunta é uma
só, e é de julgamento:

> **Sem este comentário, o leitor entende o que está acontecendo e por que foi
> feito assim?** Se sim, o comentário não entra.

Quase sempre é fundamental o que **decide o comportamento** e não se deduz
lendo: a escolha entre duas opções que parecem iguais (302 × 301, 409 × 422), o
porquê daquele número ou flag, a armadilha que morde quem "simplifica" a linha, e
o que a linha faz por baixo quando o efeito não está à vista. Quase nunca é
fundamental o que o nome já diz — `criarRotasLinks()` não precisa de "cria as
rotas de links" em cima.

**E não repita.** Uma explicação por conceito, no lugar onde ele importa mais:

- Explicou `z.coerce.number()` na query de `GET /eventos/:id/inscricoes`? A
  segunda query com `coerce` não recebe comentário nenhum.
- Conceito que os `docs/` já ensinam entra como referência de uma linha
  (`// ordem de rota: módulo 04`), não como reexplicação.
- Comentário que existe só para cumprir régua sai. Um arquivo com três
  comentários certos ensina mais que um com doze corretos e óbvios.

Onde o comentário entra, ele:

- Diz **o problema antes da solução**: "sem isto o SQLite aceita `categoria_id`
  inexistente e você descobre meses depois, com o banco cheio de órfãos" ensina;
  "liga a checagem de chave estrangeira" não.
- Nomeia a **consequência concreta** — o status que muda, o dado que se perde, a
  query que fica lenta. Consequência vaga ("pode dar problema") não conta.
- Tem o tamanho que a explicação pedir, em frase completa e em português.
  Costuma dar duas a cinco linhas; é observação, não cota.
- Fica **em cima** do trecho que explica, quando passa de uma linha.

O cabeçalho de cada arquivo, curto: o que ele faz, de qual módulo vem o conceito
principal, e — no `servidor.ts` — como rodar e em que porta.

```ts
// ❌ Descreve o óbvio — sai
res.redirect(302, link.url); // redireciona

// ✅ Explica a decisão — fica
// 302 (temporário) e não 301 (permanente): o navegador cacheia o 301 e, da
// segunda visita em diante, vai direto ao destino sem passar por aqui. O
// contador de cliques congelaria em 1 e ninguém entenderia por quê.
res.redirect(302, link.url);
```

**O teto de linhas de cada tarefa conta código, não comentário.** Explicar bem
nunca é motivo para cortar escopo, e escopo nunca é desculpa para explicar mal.

### Markdown do README de cada mini API

Markdown puro (sem `> [!NOTE]`, sem sintaxe de extensão). Aviso é `>` com rótulo
em negrito: `> **Atenção:** ...`. Bloco de código sempre com linguagem.

---

## 2. Passo 0 — antes de despachar qualquer agente

`npm run typecheck` cobre só `src/**/*.ts`; esta pasta ficaria sem checagem
nenhuma. O orquestrador cria **uma vez** o `tsconfig.minis.json` na raiz:

```json
// Config para checar os tipos das minis APIs, que ficam fora de src/.
// Uso: npm run typecheck:minis
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false
  },
  "include": ["minis-apis/**/*.ts"],
  "exclude": []
}
```

E o script em `package.json`, ao lado de `typecheck:ex`:

```json
"typecheck:minis": "tsc --noEmit -p tsconfig.minis.json"
```

Sem isso os agentes não têm como cumprir o critério de aceite.

---

## 3. O que cada agente entrega

Para a tarefa `NN-nome`:

```
minis-apis/NN-nome/
├── README.md      ← ensina como a API foi construída (seção 3)
├── servidor.ts    ← único arquivo que chama listen()
└── (demais arquivos conforme a tarefa)
```

### O `README.md` ensina — ele não é um índice de rotas

Este é um repositório de estudo: a tabela de endpoints diz **o que** a API faz, e
sozinha ela não ensina nada. O README de cada mini API responde a duas perguntas,
nesta ordem:

1. **Como funciona a coisa?** Um encurtador de link é um mecanismo — existe
   independente de Express, de Node e deste repositório. Quem lê tem que
   terminar sabendo explicar o encurtador para outra pessoa **sem citar
   biblioteca nenhuma**: o que é o código curto, o que o navegador faz quando
   recebe a resposta, de onde sai a contagem de cliques.
2. **Como esta API implementa isso?** Aí sim o código: a ordem em que as peças
   entraram, o problema que cada uma resolveu, o que foi descartado no caminho.

Pular a primeira e ir direto para o código é o defeito que este briefing existe
para evitar. Sem ela o leitor copia um `res.redirect(302, ...)` que funciona e
continua sem saber por que funciona — e não consegue decidir nada num caso que a
mini API não mostrou.

É o mesmo padrão dos `docs/`, aplicado a uma API inteira em vez de a um conceito:
**problema → mecânica → princípio → trade-off → consequência**, nesta ordem. O
princípio vem depois de o leitor ver a coisa funcionar, e em frase comum.

| Seção                        | O que tem que estar lá                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `# Mini API — Título`        | Abaixo, a linha `📦 Módulos 03–NN · 🔌 porta 600N · 💾 memória` ou `SQLite`                                                                                                                                                                                                                                       |
| `## O problema`              | A situação real que pede esta API, em duas ou três frases. Não "uma API de links": **por que** alguém encurta um link, e o que a API precisa saber para isso.                                                                                                                                                     |
| `## Como funciona`           | **O mecanismo, antes e independente do código.** O que acontece de ponta a ponta quando alguém usa a coisa, quem faz cada parte, e por que o desenho é esse. Sem `app.get`, sem nome de biblioteca. Um `mermaid` de sequência quando ele substituir prosa. O que cada tarefa precisa cobrir aqui está na seção 4. |
| `## Rodar`                   | Bloco `bash` com `node minis-apis/NN-nome/servidor.ts`, a porta, e o que aparece no terminal                                                                                                                                                                                                                      |
| `## Como ela foi construída` | Agora sim o código: a construção em 3 a 5 passos, na ordem em que foram pensados — o que existia, que problema apareceu, o que resolveu. Cada passo com o trecho curto que o representa                                                                                                                           |
| `## Endpoints`               | Tabela: método, rota, o que faz, status possíveis                                                                                                                                                                                                                                                                 |
| `## As decisões e o porquê`  | Uma subseção por escolha não óbvia. Cada uma diz a alternativa que foi descartada e **o que ela custaria** — decisão sem alternativa declarada não ensina a escolher                                                                                                                                              |
| `## Onde é fácil errar`      | Tabela de sintoma → causa: a mensagem ou o status exato que aparece, e por quê. Inclui o falso amigo — o que parece certo e está errado                                                                                                                                                                           |
| `## Testando`                | Quatro a oito `curl` que foram **de fato rodados**, com a resposta real ao lado. Caminho feliz e pelo menos dois erros                                                                                                                                                                                            |
| `## O que ficou de fora`     | O que ela não faz, por que ficou fora e **qual módulo resolve** (ex.: "sem login — módulo 11")                                                                                                                                                                                                                    |
| `## Para estudar`            | Link para os módulos de `docs/` que a mini API aplica                                                                                                                                                                                                                                                             |

Três regras que valem em todo o README:

- **Mostre a dor primeiro.** O jeito ruim, marcado como ruim, antes do bom. A
  validação na mão da tarefa 1 é a dor que justifica o Zod na tarefa 2 — o README
  da 1 tem que deixar essa dor visível, não escondê-la.
- **Todo número tem um porquê.** `limite` padrão de 20, código de 6 caracteres,
  valor em centavos: nenhum entra sem a frase que explica a escolha.
- **Resultado prometido é resultado rodado.** Se o README diz que responde `409`,
  é porque o `curl` respondeu `409` na máquina do agente.
- **Termo técnico é definido na estreia** (`Location`, colisão, `GROUP BY`), na
  própria linha ou na seguinte. Palavra não explicada trava a leitura.

Tamanho: sem limite fixo. Acaba quando o assunto acabou — o corte é por
redundância, não por linha.

> **Atenção:** `curl -d '{"json":1}'` com aspas simples não funciona em `cmd.exe`
> nem no PowerShell. Se o README trouxer `curl` com corpo JSON, repita o aviso
> que está no módulo 01.

---

## 4. As três tarefas

### Tarefa 1 — `01-encurtador` · módulos 03 → 05 · porta 6001

Encurtador de links: recebe uma URL longa, devolve um código curto, redireciona
e conta os cliques.

**Teto: ~180 linhas de código, em 2 ou 3 arquivos.** Armazenamento é um `Map` em
memória — sem banco, sem Zod, sem camadas. Validação é `if` na mão **de
propósito**: é a dor que a tarefa 2 resolve com Zod.

| Método   | Rota             | O que faz                                             |
| -------- | ---------------- | ----------------------------------------------------- |
| `POST`   | `/links`         | `{ url, codigo? }` → 201 com `{ codigo, curto, url }` |
| `GET`    | `/links`         | lista os links com contagem de cliques                |
| `GET`    | `/links/:codigo` | estatística de um link                                |
| `DELETE` | `/links/:codigo` | 204, ou 404 se não existe                             |
| `GET`    | `/:codigo`       | **302** para a URL original e soma um clique          |

**O que a seção `## Como funciona` do README precisa explicar** — o mecanismo do
encurtador, sem citar Express:

- **Encurtar não comprime nada.** A URL longa continua inteira, guardada no
  servidor; o que se cria é uma **chave** curta que aponta para ela. O
  "encurtador" é um dicionário `código → URL` com um servidor na frente.
- **O que o navegador faz ao abrir o link curto**, passo a passo: ele pede
  `/abc123` ao servidor do encurtador, recebe uma resposta de redirecionamento
  (status 302) com o cabeçalho **`Location`** — que é o campo onde vai o endereço
  de destino — e **refaz a requisição sozinho** nesse endereço. São duas
  requisições, não uma, e é isso que dá para desenhar num `mermaid` de sequência.
- **De onde sai a contagem de cliques**: como toda visita passa pelo encurtador
  antes de chegar ao destino, contar é somar 1 nessa passagem. Diga também o que
  ela **não** mede — a mesma pessoa abrindo duas vezes conta dois, e o destino
  nunca sabe quantos cliques houve.
- **Como o código curto é gerado e por que ele é assim**: quantos caracteres, de
  que alfabeto, e o que é uma **colisão** (duas URLs sorteando o mesmo código) —
  com a conta de quantas combinações o tamanho escolhido oferece. Explique por
  que um id sequencial (`/1`, `/2`, `/3`) seria pior: qualquer um enumera os
  links de todo mundo digitando números.
- **O limite honesto do modelo**: quem tem o código tem o link. Link curto não é
  link secreto, e o encurtador não tem como saber se quem clicou devia clicar.

O que a tarefa tem que deixar visível no código:

- **A ordem das rotas decide o comportamento** (módulo 04): `/:codigo` casa com
  `links` também. Se ela for registrada antes, `GET /links` vira busca por um
  link de código `"links"` e responde 404. Registrar por último não é estilo, é
  requisito — e o README precisa dizer isso.
- **302 e não 301.** O 301 é permanente e o navegador cacheia: da segunda visita
  em diante ele nem chama a API, e o contador congela. Este é o comentário mais
  importante do arquivo.
- **Middlewares** (módulo 05): `cors()`, `morgan('dev')` e um seu, curto, que
  carimba `X-Tempo-ms` na resposta. Três middlewares, não sete.
- Código repetido → **409**; URL sem `http://`/`https://` → **400** com
  mensagem que diz o campo.

---

### Tarefa 2 — `02-inscricoes` · módulos 03 → 07 · porta 6002

Inscrição em evento com vaga limitada. É a API de formulário: o corpo vem do
cliente e **nada nele é confiável**.

**Teto: ~320 linhas, em 5 ou 6 arquivos** (`servidor.ts`, `rotas.ts`,
`schemas.ts`, `erros.ts`, `validar.ts`, `dados.ts`). Ainda em memória — banco é
a tarefa 3. Dois ou três eventos fixos como dado inicial.

| Método   | Rota                      | O que faz                                       |
| -------- | ------------------------- | ----------------------------------------------- |
| `GET`    | `/eventos`                | lista com vagas restantes                       |
| `GET`    | `/eventos/:id`            | um evento, 404 se não existe                    |
| `POST`   | `/eventos/:id/inscricoes` | inscreve: 201, 409 se lotado ou e-mail repetido |
| `GET`    | `/eventos/:id/inscricoes` | `?pagina=&limite=&busca=`                       |
| `DELETE` | `/inscricoes/:id`         | 204 e devolve a vaga ao evento                  |

**O que a seção `## Como funciona` do README precisa explicar** — o mecanismo de
um formulário que grava, sem citar Zod:

- **O caminho de um formulário**: alguém preenche campos numa tela, o navegador
  monta um JSON e manda no corpo de um `POST`. O servidor **não recebe o
  formulário**, recebe um texto que diz ser JSON — e qualquer um pode montar esse
  texto na mão, sem tela nenhuma.
- **Por que validar no servidor mesmo com validação na tela**: a checagem do
  navegador é conveniência para quem digitou errado, não barreira. Mostre o
  `curl` que passa por cima dela — é o argumento inteiro em uma linha.
- **O que é uma vaga limitada**: um contador contra um teto. Explique por que a
  conferência tem que acontecer no servidor, no momento da gravação, e não na
  tela que mostrou "restam 3 vagas" cinco minutos atrás.
- **Duas famílias de recusa, e por que elas são diferentes**: "esse e-mail não é
  um e-mail" é um problema de **formato** — o dado está malformado e nenhuma
  informação sobre o evento muda isso. "Esse e-mail já se inscreveu" e "acabaram
  as vagas" são problemas de **estado**: o dado está perfeito, o mundo é que não
  aceita. É daí que sai a escolha entre 422 e 409, e é o conceito mais
  transferível da mini API.
- **Por que a listagem é paginada**: um evento com 5 mil inscritos numa resposta
  só é lenta para o servidor, para a rede e para quem lê. Página e limite são a
  forma de o cliente pedir um pedaço.

O que a tarefa tem que deixar visível no código:

- **Middleware `validar(schema)` genérico** (módulo 07), aplicado a `body`,
  `params` e `query` — um só middleware, parametrizado, não três cópias.
- **Query string é sempre texto.** `?limite=20` chega como `"20"`; sem
  `z.coerce.number()` a comparação silenciosamente compara string com número.
  Falso amigo que merece comentário.
- **Validação × regra de negócio** — a distinção que o módulo 07 cobra. E-mail
  malformado é formato → **422** com a lista de campos que falharam. Evento
  lotado é regra de negócio → **409**, e o Zod não tem nada a ver com isso.
- **Tratador de erro central + `AppError`** (módulo 06): toda resposta de erro
  sai no mesmo formato, e stack trace nunca vaza para o cliente.
- O `POST` recusa campo desconhecido em vez de ignorar — se o cliente mandou
  `vagas: 999`, é bug dele ou ataque, e silêncio esconde os dois.

---

### Tarefa 3 — `03-despesas` · módulos 03 → 09 · porta 6003 · SQLite

Controle de gastos pessoais: lança despesa numa categoria e fecha o mês. É a
mini API que existe para mostrar **SQL respondendo pergunta** — o relatório é o
ponto alto, não um extra.

**Teto: ~450 linhas**, com as camadas do módulo 08 (`rotas → servico →
repositorio`) e SQL na mão do 09. Dois recursos apenas: `categorias` e
`despesas`, 1-N. Banco em `data/minis-03-despesas.sqlite`, com migration
idempotente e seed de categorias.

| Método   | Rota                 | O que faz                                           |
| -------- | -------------------- | --------------------------------------------------- |
| `GET`    | `/categorias`        | lista                                               |
| `POST`   | `/categorias`        | cria, 409 se o nome repete                          |
| `GET`    | `/despesas`          | `?mes=2026-08&categoria=3&pagina=&limite=`          |
| `POST`   | `/despesas`          | cria, 422 no formato, 404 se a categoria não existe |
| `GET`    | `/despesas/:id`      | uma despesa com o nome da categoria (`JOIN`)        |
| `DELETE` | `/despesas/:id`      | 204                                                 |
| `GET`    | `/relatorios/mensal` | `?mes=2026-08` → total por categoria + total geral  |

**O que a seção `## Como funciona` do README precisa explicar** — o mecanismo de
guardar e somar dinheiro, sem citar SQLite:

- **Por que sai da memória e vai para um banco**: o array morre quando o processo
  reinicia. Um controle de gastos que esquece o mês passado não serve para nada —
  é a primeira mini API da leva em que persistir é requisito, não luxo.
- **Como dinheiro é guardado de verdade**: em número inteiro de centavos. Mostre
  a conta que quebra (`0.1 + 0.2` dá `0.30000000000000004`) e diga onde isso
  aparece: soma de centenas de lançamentos que fecha um centavo fora do extrato,
  todo mês, sem ninguém achar o erro.
- **O que é uma relação 1-N**, em palavras antes de tabela: uma categoria tem
  muitas despesas, cada despesa pertence a uma. Isso vira uma coluna na despesa
  apontando para a categoria — a **chave estrangeira** — e é o que impede
  "Alimentação" escrito de seis jeitos diferentes.
- **Por que a soma é feita pelo banco**: a pergunta "quanto gastei em agosto, por
  categoria" é agrupar linhas e somar. Trazer as linhas todas pela rede para somar
  no JavaScript devolve a mesma resposta com 50 lançamentos e derrete com 50 mil,
  porque paga transporte de dado que vai ser jogado fora. Explique `GROUP BY` e
  `SUM` no nível de "agrupa por categoria e soma o valor de cada grupo".
- **O que é um índice**, com a analogia útil: sem ele o banco lê a tabela inteira
  para achar as despesas de agosto, como procurar um assunto num livro sem
  sumário. O índice é o sumário — custa espaço e um pouco de escrita.
- **O que é uma migration e por que ela mora no código**: o banco começa vazio, e
  alguém precisa criar as tabelas. Guardar esse passo em arquivo versionado é o
  que faz um clone novo chegar ao mesmo banco sem ninguém digitar SQL à mão.

O que a tarefa tem que deixar visível no código:

- **Dinheiro é `INTEGER` em centavos.** `0.1 + 0.2 !== 0.3` em ponto flutuante, e
  em relatório financeiro isso vira centavo perdido que ninguém acha. A API
  aceita reais e converte na borda; o banco só vê centavos.
- **`PRAGMA foreign_keys = ON` é por conexão, não por banco.** Sem ele o SQLite
  aceita `categoria_id` inexistente sem reclamar.
- **Query sempre parametrizada** (`?`), inclusive no filtro montado
  dinamicamente — o filtro opcional é justamente onde a concatenação tenta
  entrar.
- **O relatório é `GROUP BY` com `SUM`**, feito no banco. Trazer tudo e somar em
  JavaScript funciona com 50 linhas e derrete com 50 mil: é a comparação que a
  tarefa precisa registrar no README, em uma frase.
- **Índice em `despesas(mes)`** com o porquê: o filtro mais usado é o mensal, e
  sem índice cada consulta varre a tabela inteira.
- **A camada repositório é o ponto da separação**: só ela escreve SQL. Serviço e
  rota não sabem que existe SQLite.

---

## 5. Como despachar

As três tarefas são independentes — nenhuma importa arquivo da outra. Despache
**em paralelo**, um agente por tarefa, depois do Passo 0.

Prompt de cada agente (trocando o que está entre colchetes):

```
Leia /workspaces/Backend-express/CLAUDE.md e
/workspaces/Backend-express/minis-apis/ORQUESTRACAO.md (seções 1, 3 e a
tarefa [NN]).

Construa a mini API da Tarefa [NN] em minis-apis/[NN-nome]/, respeitando o
teto de módulos e o teto de linhas.

Isto é material de estudo, então as duas entregas ensinam:
- Comentário: explique o que é fundamental para entender o trecho, com o
  porquê e a consequência. Não comente por aparecer, e não repita o que já
  foi explicado antes no código ou nos docs/ (seção 1).
- README: segue a seção 3. Comece por "Como funciona" — explique o
  mecanismo da coisa (o que acontece de ponta a ponta, quem faz cada parte)
  sem citar Express nem biblioteca, cobrindo os pontos listados na tarefa.
  Só depois "Como ela foi construída", com a ordem em que as peças entraram
  e o problema que cada uma resolveu.

Antes de dizer que terminou:
1. npx tsc --noEmit -p tsconfig.minis.json  → tem que passar limpo
2. suba o servidor na porta [600N] e exercite TODOS os endpoints com curl,
   incluindo os casos de erro da tabela
3. npx prettier --check minis-apis/[NN-nome]  → limpo
4. derrube o servidor

Relate o que rodou e a saída real. Não invente resultado de curl, e não
altere nada fora de minis-apis/[NN-nome]/.
```

### Critérios de aceite (valem para as três)

- [ ] `npx tsc --noEmit -p tsconfig.minis.json` passa
- [ ] `npx prettier --check minis-apis/` limpo
- [ ] Servidor sobe na porta certa e todos os endpoints da tabela foram
      exercitados com `curl` — caminho feliz e erro
- [ ] Nenhuma dependência nova no `package.json`
- [ ] Nenhum arquivo tocado fora da pasta da própria mini API
- [ ] Nenhum recurso acima do teto de módulo da tarefa
- [ ] O que é fundamental para entender está explicado de verdade; o óbvio e o já
      explicado não voltam — nenhum comentário descreve sintaxe ou se repete
- [ ] `README.md` no formato da seção 3 — com **Como funciona** (o mecanismo,
      antes do código, cobrindo os pontos listados na tarefa), **Como ela foi
      construída**, as decisões com a alternativa descartada, e os `curl` que
      foram de fato rodados, com a resposta real

### Fechamento, pelo orquestrador

Depois que as três voltarem:

1. Rodar `npm run typecheck`, `npm run typecheck:minis`, `npm run format:check` e
   `npm test` — a suíte existente não pode ter sido afetada.
2. Escrever `minis-apis/README.md`: a porta de entrada da pasta. Explica **por
   que ela existe** (ver o conteúdo dos módulos fora do domínio da biblioteca),
   em que ordem ler as três — a 1 cria a dor que a 2 resolve, a 2 cria a que a
   3 resolve — e a tabela com domínio, faixa de módulos, porta e a frase de "o
   que esta aqui ensina".
3. Registrar a leva em `.projeto/ULTIMO.md`.

---

## 6. Próximas levas

Esta é a **leva 1**, toda abaixo do módulo 09 por pedido do usuário. As
seguintes podem subir o teto — autenticação de verdade (11), suíte de testes
(12), upload (19) — e é onde entram ideias como API de cadastro com login,
webhook com assinatura, ou catálogo com busca paginada. Nada disso entra aqui:
cada leva vira uma nova seção deste arquivo, com as tarefas numeradas na
sequência (`04-`, `05-`, ...).
