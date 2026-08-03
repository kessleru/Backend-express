/**
 * Setup dos testes — roda uma vez por arquivo de teste, antes dele.
 *
 * Existe para resolver dois problemas concretos:
 *
 * 1. `npm test` precisa funcionar sem `--env-file` na linha de comando. O módulo
 *    11 fez o processo MORRER sem `JWT_SECRET`, o que é a decisão certa — e sem
 *    isto aqui a suíte inteira falharia no import.
 *
 * 2. `NODE_ENV=test` desliga o log de requisição e liga o modo de cookie sem
 *    `secure` (o teste não fala HTTPS).
 */

/**
 * `process.loadEnvFile()` é nativo do Node (22+). É a versão programática do
 * `--env-file`, e é o motivo de este repo não ter `dotenv`.
 *
 * O `try/catch` cobre a máquina que ainda não copiou o `.env.example` — e o
 * fallback abaixo garante que a suíte roda mesmo assim.
 */
try {
  process.loadEnvFile();
} catch {
  // Sem .env: os defaults abaixo assumem.
}

/**
 * Segredo de TESTE, fixo e visível.
 *
 * Escrever um segredo no código normalmente é erro grave. Aqui não é, e a
 * distinção vale entender: este valor nunca assina token que alguém aceite fora
 * da suíte — os tokens vivem em memória e morrem com o processo.
 *
 * O que TORNARIA isto errado: usar o mesmo valor como fallback em produção. É
 * exatamente o `?? 'segredo-de-dev'` que o módulo 11 recusa. A diferença é o
 * escopo: aqui o fallback só existe dentro do runner de teste.
 */
process.env.JWT_SECRET ??= 'segredo-exclusivo-de-teste-com-mais-de-32-caracteres';

// `NODE_ENV=test` é imposto, não sugerido: rodar a suíte com o `.env` de
// desenvolvimento carregado deixaria `NODE_ENV=development` e o log ligado.
process.env.NODE_ENV = 'test';
