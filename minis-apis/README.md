# minis-apis

Um repertório de **APIs pequenas e reais**, cada uma resolvendo um problema que
existe no mundo: encurtar um link, inscrever gente num evento, saber para onde
foi o dinheiro do mês.

## Por que esta pasta existe

Os `docs/` e os `exercicios/` usam um domínio fixo — uma biblioteca, com livros,
autores e empréstimos. Isso é proposital: um domínio só, repetido do módulo 01 ao
20, deixa o assunto de cada módulo aparecer sem competir com um contexto novo.

O preço é conhecido. Quem estuda vinte módulos no mesmo domínio corre o risco de
aprender **a biblioteca**, não o conceito — de saber que `409` é o status do
livro já emprestado sem saber que `409` é o status de qualquer conflito de
estado. O conceito parece colado no exemplo.

Esta pasta é o contraveneno. Mesmos módulos, domínios completamente diferentes.
Quando o `409` reaparece em "esse e-mail já se inscreveu" e em "já existe uma
categoria com esse nome", fica claro o que era do conceito e o que era do
empréstimo de livro.

Cada mini API é **lida sozinha**, sem o `docs/` do lado. Por isso o `README.md`
de cada uma começa explicando **o mecanismo da coisa** — o que é um encurtador,
como um formulário chega ao servidor, como dinheiro é guardado — antes de
qualquer linha de código.

## As três

| #   | Mini API                          | Domínio                               | Módulos | Porta | Persistência    |
| --- | --------------------------------- | ------------------------------------- | ------- | ----- | --------------- |
| 1   | [`01-encurtador`](01-encurtador/) | Encurtador de links                   | 03–05   | 6001  | memória (`Map`) |
| 2   | [`02-inscricoes`](02-inscricoes/) | Inscrição em evento com vaga limitada | 03–07   | 6002  | memória         |
| 3   | [`03-despesas`](03-despesas/)     | Controle de gastos pessoais           | 03–09   | 6003  | SQLite          |

O que cada uma ensina:

| #   | O que esta aqui ensina                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Que a **ordem de registro das rotas decide o comportamento**, e que um status HTTP é uma decisão com custo: `302` mantém o contador de cliques vivo, `301` o congela                   |
| 2   | Que **formato e estado são recusas diferentes** — `422` para o dado malformado, `409` para o dado perfeito que o mundo não aceita — e que validar é trabalho do servidor, não da tela  |
| 3   | Que **a pergunta é respondida pelo banco**: dinheiro em centavos inteiros, relação 1-N com chave estrangeira, e o total do mês saindo de um `GROUP BY` em vez de um laço em JavaScript |

## Leia nesta ordem

Não é ordem de dificuldade, é **ordem de dor**. Cada uma termina com um problema
que a seguinte resolve.

A **1** valida com `if` na mão. São quatro condições para dois campos, o
`req.body` chega como `any`, e a mensagem de erro é escrita à mão em cada ramo.
Funciona — e cresce mal. Essa é a dor.

A **2** resolve exatamente essa dor: um schema declara a forma esperada, um único
middleware aplica o schema a `body`, `params` ou `query`, e a mensagem de erro
sai pronta com a lista de campos que falharam. Em troca, aparece uma dor nova: os
dados vivem num array em memória e somem quando o processo reinicia. Uma lista de
inscritos que desaparece não é uma lista de inscritos.

A **3** resolve essa: o dado vai para um banco em disco, criado por uma migration
versionada, e o relatório mensal passa a ser uma pergunta feita ao banco. É onde
a leva termina.

Ler fora de ordem funciona — cada README se sustenta sozinho. Mas quem lê a 2
antes da 1 vê o Zod como "o jeito de validar" em vez de como **a resposta a um
problema concreto**, e é o problema que ensina a escolher.

## Rodar qualquer uma

```bash
node minis-apis/01-encurtador/servidor.ts   # porta 6001
node minis-apis/02-inscricoes/servidor.ts   # porta 6002
node minis-apis/03-despesas/servidor.ts     # porta 6003
```

Sem passo de instalação, sem build, sem variável de ambiente. A terceira cria e
popula o banco sozinha na primeira execução, em `data/minis-03-despesas.sqlite`.

> **Atenção:** `curl -d '{"json":1}'` com aspas simples não funciona no
> PowerShell nem no `cmd.exe`. Use o Git Bash com `curl.exe`, ou troque as aspas
> conforme o aviso do módulo 01.

## Checar os tipos

```bash
npm run typecheck:minis
```

Esta pasta fica fora de `src/`, então o `npm run typecheck` não a enxerga. A
configuração está em `tsconfig.minis.json`, na raiz.

## O teto desta leva

As três param no **módulo 09**. Não há autenticação, teste automatizado, upload,
log estruturado nem ORM em nenhuma delas — não porque esses assuntos não
importem, mas porque uma mini API que usa tudo não mostra nada. Cada `README.md`
tem uma seção `## O que ficou de fora` dizendo o que falta e **qual módulo
resolve**.

Levas seguintes sobem o teto. O briefing de quem constrói as próximas está em
[`ORQUESTRACAO.md`](ORQUESTRACAO.md).
