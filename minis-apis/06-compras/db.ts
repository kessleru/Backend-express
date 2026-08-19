/**
 * A instância do Prisma Client desta mini API. Conceito principal: módulo 10.
 *
 * No Prisma 7 o client recebe um **adapter** no construtor — a ponte entre ele e
 * o driver real, aqui o `better-sqlite3`. Antes a conexão vinha do `url` no
 * schema; agora é explícita, e o mesmo client serve a drivers diferentes sem
 * mudar uma linha das queries.
 */
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './prisma/gerado/client.ts';

/**
 * O mesmo banco de `prisma.config.ts`, escrito de outro jeito — e a diferença é
 * a parte que custa uma tarde.
 *
 * Lá o caminho é resolvido a partir do arquivo de configuração
 * (`../../data/...`); aqui, a partir do diretório de onde o processo foi
 * iniciado, que é a raiz do repositório (`./data/...`). Repetir a string do
 * config neste arquivo cria dois arquivos `.sqlite` diferentes: um migrado e
 * vazio, outro sem tabela nenhuma. E o erro só aparece na primeira query, com o
 * servidor já tendo subido sem reclamar de nada.
 */
const url = process.env.DATABASE_URL_COMPRAS ?? 'file:./data/minis-06-compras.sqlite';

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),

  // Ligue com `PRISMA_LOG=1` enquanto estuda: é a única forma de ver quantas
  // queries um `include` dispara, e é assim que se enxerga um N+1 antes de a
  // produção enxergar por você.
  log: process.env.PRISMA_LOG ? ['query'] : [],
});
