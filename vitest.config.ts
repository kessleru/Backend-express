/**
 * Configuração do Vitest.
 *
 * O Vitest é o runner escolhido porque ele já entende TypeScript e ESM sem
 * configuração — o que casa com a premissa do repositório (Node 24 rodando `.ts`
 * direto, sem build). Alternativas: Jest (o padrão histórico, precisa de
 * transformador para ESM/TS) e o `node:test` embutido, que é ótimo e minimalista
 * mas não traz `expect` rico nem cobertura pronta.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Onde estão os testes. O padrão `*.test.ts` ao lado do código (em vez de uma
     * pasta `__tests__` espelhada na raiz) mantém teste e implementação juntos:
     * quem move o arquivo move o teste, e quem abre a pasta vê que existe teste.
     */
    include: ['src/**/*.test.ts', 'exercicios/**/*.test.ts'],

    // Roda antes de cada arquivo de teste: carrega o `.env` e fixa `NODE_ENV`.
    // Ver `vitest.setup.ts` — sem ele, `npm test` exigiria `--env-file` na mão.
    setupFiles: ['./vitest.setup.ts'],

    // `globals: false` (o padrão) é de propósito: `describe`/`it`/`expect` são
    // importados explicitamente em cada arquivo. Custa uma linha e ganha
    // autocompletar sem `types` extra no tsconfig — além de deixar claro de onde
    // vêm, o que importa num repositório de estudo.
    globals: false,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],

      /**
       * O que fica de FORA da conta.
       *
       * Medir cobertura de código gerado, de arquivos de configuração e do
       * próprio `servidor.ts` (que só chama `listen`) infla ou afunda o número
       * sem dizer nada sobre a qualidade da suíte.
       */
      exclude: [
        '**/gerado/**',
        '**/dist/**',
        '**/*.config.ts',
        '**/servidor.ts',
        'prisma/**',
        'src/playground/**',
      ],

      // SEM `thresholds` de propósito — ver a seção "Cobertura" do módulo 12.
      // Uma meta de 80% obrigatória produz testes escritos para a métrica
      // (`expect(fn()).toBeDefined()`), que sobem o número sem verificar nada.
    },
  },
});
