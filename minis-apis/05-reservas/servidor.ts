/**
 * Mini API 05 — reserva de sala por intervalo de tempo. Módulos 03 a 07.
 *
 * Rodar:  node minis-apis/05-reservas/servidor.ts
 * Porta:  6005
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
// `undefined` e a reserva falha dizendo que o título está faltando, com o
// título no `curl`. O limite de 10kb é o teto do que uma reserva precisa.
app.use(express.json({ limit: '10kb' }));

app.use(rotas);

// A ordem destes dois é requisito: `rotaNaoEncontrada` só pode rodar depois de
// todas as rotas, e o tratador central tem que ser o último — ele é o fim da
// cadeia para onde todo erro converge.
app.use(rotaNaoEncontrada);
app.use(tratarErro);

const PORTA = 6005;
app.listen(PORTA, () => {
  console.log(`Reservas em http://localhost:${PORTA}/salas`);
});
