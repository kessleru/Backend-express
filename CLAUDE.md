# CLAUDE.md

Repositório de **estudo de backend**: Node.js + Express + TypeScript, do básico
ao avançado. O objetivo é ensinar, não entregar produto.

**Antes de qualquer coisa, leia `GUIA-IMPLEMENTACAO.md`.** Ele tem o currículo
completo (20 módulos), o catálogo de ferramentas e a tabela de progresso
(seção 9) que diz onde o trabalho parou.

## Regras invioláveis

1. **Nunca crie, edite ou apague nada em `src/playground/`.** É o espaço pessoal
   do usuário. Só mexa se ele pedir explicitamente naquele arquivo.
2. **Tudo em português** — documentação, comentários, mensagens de commit.
3. **Todo exemplo tem que rodar.** Antes de dar um módulo como pronto: execute o
   código e rode `npm run typecheck`.

## Estilo de escrita (detalhes na seção 7 do guia)

Completo em cobertura, enxuto em texto. Sem explicação massiva.

- **Módulo de `docs/`: não tem limite de tamanho.** O módulo termina quando o
  assunto acabou. O corte é por redundância — linha que não muda uma decisão sai,
  esteja o arquivo com 80 ou 300 linhas.
- Parágrafo: até 4 linhas.
- Se dá pra mostrar em código comentado, mostre em código — não em prosa.
- Tabela e lista no lugar de texto corrido.
- Só a teoria que muda uma decisão. História e curiosidade ficam de fora.
- Conceito já explicado vira link para o módulo, não é reexplicado.

Todo módulo segue o template de `docs/` e tem um exercício correspondente em
`exercicios/NN-*/` (formato na seção 7 do guia).

## Markdown: recursos do Markdown Preview Enhanced

Os `.md` são escritos para o preview do **MPE** (extensão recomendada em
`.vscode/extensions.json`), sem quebrar no GitHub.

| Recurso                                       | Quando usar                                     |
| --------------------------------------------- | ----------------------------------------------- |
| `<!-- @import "[TOC]" {cmd="toc" ...} -->`    | Topo de todo doc e enunciado                    |
| ` ```mermaid `                                | Fluxo, sequência, camadas, ER, estado           |
| `> [!NOTE]` `[!TIP]` `[!IMPORTANT]`           | Contexto e atalho                               |
| `> [!WARNING]` `[!CAUTION]`                   | Armadilha e erro que custa caro                 |
| ` ```bash {cmd=true} `                        | Só em bloco `curl`/script que **termina** sozinho |
| `- [ ]`                                       | Critérios de aceite dos exercícios              |

Regras:

- **Diagrama substitui prosa, não soma.** Ao inserir um mermaid, corte o
  parágrafo que ele tornou redundante — o problema é a repetição, não o tamanho.
- **Nunca `{cmd=true}` em algo que sobe servidor** ou fica rodando. O comando
  `node ...servidor.ts` fica em bloco normal.
- `enableScriptExecution` fica **desligado** em `.vscode/settings.json`. É
  decisão de segurança: não ligue no repo.
- ASCII art só sobrevive onde é mais claro que um diagrama (árvore de pastas,
  anatomia de string, cheatsheet).

## Comentários no código

- Comentário existe para o que **muda uma decisão**: o ponto-chave do trecho, a
  armadilha, o porquê. Descrição óbvia (`// monta o objeto`) não entra.
- `// TODO` marca o que um módulo mais à frente resolve.
- Todo achado de comportamento (Express 5, Zod 4, Prisma 7) vira comentário no
  código e uma linha na tabela "Erros comuns" do doc.
- Código errado só aparece de propósito se vier acompanhado da versão correta
  logo abaixo.

## Convenções técnicas

- **ESM**, não CommonJS. `import`, nunca `require`.
- **Imports relativos com extensão `.ts`** — o Node exige ao rodar direto, e o
  `rewriteRelativeImportExtensions` converte para `.js` no build.
- **Sem `enum`, `namespace` ou `import =`** — `erasableSyntaxOnly` está ligado
  porque o Node só apaga tipos, não transforma código.
- **Nada de `ts-node`, `nodemon` ou `dotenv`** — Node 24 resolve os três
  nativamente (`node arquivo.ts`, `--watch`, `--env-file`).
- **Banco: SQLite.** `node:sqlite` (SQL na mão) no módulo 09, Prisma no 10.
- **Dependência nova só entra no módulo que a justifica** (catálogo na seção 6
  do guia), e a doc precisa dizer que problema ela resolve.

## Estrutura

| Pasta             | O que é                          | Pode editar? |
| ----------------- | -------------------------------- | ------------ |
| `docs/`           | Teoria, um arquivo por módulo    | Sim          |
| `src/exemplos/`   | Código de referência dos módulos | Sim          |
| `exercicios/`     | Enunciados + soluções            | Sim          |
| `src/playground/` | Espaço do usuário                | **Não**      |
| `src/server.ts`   | Servidor principal               | Sim          |

## Comandos

```bash
npm run dev             # servidor com reload (node --watch)
npm run typecheck       # checa tipos do projeto
npm run typecheck:play  # checa tipos do playground
npm run build           # gera dist/
npm run format          # Prettier
```

## Pendência conhecida

ESLint ainda não foi instalado: o `typescript-eslint` exige TypeScript `<6.1.0`
e o projeto usa TS 7. Reavaliar quando houver suporte.
