# 🔒 Playground — seu espaço

Esta pasta é **sua**. É onde você escreve código enquanto estuda.

## Regras

- **Ninguém mexe aqui além de você.** O material do curso (`docs/`,
  `src/exemplos/`, `exercicios/`) nunca vai criar, editar ou apagar arquivos
  desta pasta. Isso vale também para o Claude Code — está escrito no `CLAUDE.md`
  na raiz do projeto. Se você quiser ajuda com um arquivo daqui, é só pedir.
- **Bagunça é permitida.** Teste, quebre, deixe pela metade. Não precisa estar
  bonito nem organizado.
- **Aqui você resolve os exercícios** de `exercicios/`.

## Como rodar um arquivo daqui

```bash
node src/playground/meu-teste.ts            # roda uma vez
node --watch src/playground/meu-teste.ts    # reinicia ao salvar
```

O Node 24 executa TypeScript direto, sem build. Ele apenas **apaga** os tipos —
não os verifica. Para checar tipos de verdade:

```bash
npm run typecheck
```

## Sugestão de organização

```
playground/
├── 01-http/
├── 03-express/
└── biblioteca/     # o projeto contínuo dos exercícios (a partir do módulo 03)
```

Mas organize como preferir — é seu espaço.
