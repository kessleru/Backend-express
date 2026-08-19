/**
 * Mini API 02 — inscrição em evento com vaga limitada. Módulos 03 a 07.
 *
 * Rodar:  node minis-apis/02-inscricoes/servidor.ts
 * Porta:  6002
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rotaNaoEncontrada, tratarErro } from './erros.ts';
import { rotas } from './rotas.ts';

const app = express();

app.use(cors());
app.use(morgan('dev'));

// Sem `express.json()` o corpo do POST nem chega a existir: `req.body` fica
// `undefined` e a inscrição falha dizendo que o nome está faltando, mesmo com o
// nome no `curl`. O limite de 10kb é o teto do que um formulário destes precisa;
// o padrão de 100kb aceita corpo grande à toa, e corpo grande é trabalho de
// parse que o servidor faz antes de descobrir que vai recusar.
app.use(express.json({ limit: '10kb' }));

app.use(rotas);

// A ordem destes dois é requisito, não estilo: `rotaNaoEncontrada` só pode rodar
// depois de todas as rotas (senão responde 404 para tudo), e o tratador central
// tem que ser o último — ele é o fim da cadeia para onde todo erro converge.
app.use(rotaNaoEncontrada);
app.use(tratarErro);

const PORTA = 6002;
app.listen(PORTA, () => {
  console.log(`Inscrições em http://localhost:${PORTA}/eventos`);
});
