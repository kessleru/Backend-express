/**
 * Mini API de listas de compras compartilhadas — o único arquivo que conhece
 * todas as camadas e o único que chama `listen()`. Conceito principal: módulo 08.
 *
 * As peças são montadas de dentro para fora:
 *   banco → repositório → serviço → rotas → app
 *
 * Rodar (a partir da raiz do repositório, e só depois do setup do README):
 *   node minis-apis/06-compras/servidor.ts
 * Porta: 6006 — http://localhost:6006
 * Banco: data/minis-06-compras.sqlite
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { prisma } from './db.ts';
import { criarRepositorioPrisma } from './repositorio.ts';
import { criarServico } from './servico.ts';
import { criarRotas } from './rotas/index.ts';
import { rotaNaoEncontrada, tratarErro } from './erros.ts';

const app = express();

// `morgan` antes de tudo para que a linha de log saia mesmo nas requisições que
// morrem na validação ou no 401.
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use(criarRotas(criarServico(criarRepositorioPrisma(prisma))));

// Os dois últimos, nesta ordem: o 404 genérico só roda se nenhuma rota casou, e
// o tratador de erro precisa vir depois de tudo que pode falhar.
app.use(rotaNaoEncontrada);
app.use(tratarErro);

const PORTA = 6006;
const servidor = app.listen(PORTA, () => {
  console.log(`Compras em http://localhost:${PORTA}`);
  console.log('Comece por: POST /usuarios  →  POST /sessoes  →  POST /listas');
});

// O client do Prisma mantém a conexão aberta; `$disconnect` a devolve. Não
// chamar não corrompe nada aqui, mas com um banco de rede deixaria conexões
// penduradas até o servidor do outro lado expirá-las.
for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    servidor.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
