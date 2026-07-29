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

- Módulo de `docs/`: ~150 linhas no máximo.
- Parágrafo: até 4 linhas.
- Se dá pra mostrar em código comentado, mostre em código — não em prosa.
- Tabela e lista no lugar de texto corrido.
- Só a teoria que muda uma decisão. História e curiosidade ficam de fora.
- Conceito já explicado vira link para o módulo, não é reexplicado.

Todo módulo segue o template de `docs/` e tem um exercício correspondente em
`exercicios/NN-*/` (formato na seção 7 do guia).

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
