/**
 * Mini API de hábitos — o único arquivo que conhece todas as camadas e o único
 * que chama `listen()`. Conceito principal: módulo 08 (composition root).
 *
 * Montagem, de dentro para fora:
 *   banco → repositório → serviço → rotas → app
 *
 * Rodar:  node minis-apis/07-habitos/servidor.ts
 * Porta:  6007 — http://localhost:6007
 * Banco:  data/minis-07-habitos.sqlite (criado na primeira execução)
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { abrirBanco } from './db.ts';
import { criarRepositorioSqlite } from './repositorio.ts';
import { criarServico } from './servico.ts';
import { criarRotas } from './rotas.ts';
import { rotaNaoEncontrada, tratarErro } from './erros.ts';

console.log('Abrindo banco...');
const db = abrirBanco('data/minis-07-habitos.sqlite');

const app = express();

// `morgan('dev')` registra método, rota e status — nunca o corpo. Numa API com
// login isso deixa de ser detalhe: um log de corpo gravaria as senhas de todo
// mundo em texto puro num arquivo que o time inteiro lê.
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use(criarRotas(criarServico(criarRepositorioSqlite(db))));

app.use(rotaNaoEncontrada);
app.use(tratarErro);

const PORTA = 6007;
const servidor = app.listen(PORTA, () => {
  console.log(`Hábitos em http://localhost:${PORTA}`);
  console.log('Rotas: POST /usuarios  POST /sessoes  /habitos (exige token)');
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    servidor.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
