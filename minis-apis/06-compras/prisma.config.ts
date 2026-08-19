/**
 * O projeto Prisma DESTA mini API — separado do da raiz de propósito.
 *
 * A CLI só enxerga este arquivo quando você passa `--config`:
 *
 *   npx prisma migrate deploy --config minis-apis/06-compras/prisma.config.ts
 *
 * Sem o `--config` ela acha o `prisma.config.ts` da raiz e aplica as migrations
 * da biblioteca — no banco errado, sem erro nenhum.
 */
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Os caminhos abaixo são relativos a ESTE arquivo, não ao diretório de onde
  // você roda o comando. É o que permite chamar a CLI da raiz do repositório e
  // ainda assim mexer só no que é da mini.
  schema: 'prisma/schema.prisma',

  migrations: {
    // O SQL gerado vai para o git: é o histórico que faz um clone novo chegar ao
    // mesmo banco sem ninguém digitar SQL à mão.
    path: 'prisma/migrations',
  },

  datasource: {
    // `../../data/` sobe de `minis-apis/06-compras/` até a raiz e entra em
    // `data/`, junto dos bancos das outras minis — que o `.gitignore` já ignora.
    //
    // Este caminho é o que a CLI usa. O que o SERVIDOR usa é outro, e está em
    // `db.ts`: lá a base é o diretório de onde o processo foi iniciado. As duas
    // bases são diferentes e é fácil escrever a mesma string nos dois lugares e
    // acabar com dois arquivos de banco — um migrado e vazio, outro sem tabela
    // nenhuma, e o erro só aparecendo na primeira query.
    url: 'file:../../data/minis-06-compras.sqlite',
  },
});
