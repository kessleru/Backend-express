/**
 * Mini API de despesas — o único arquivo que conhece todas as camadas e o
 * único que chama `listen()`. Conceito principal: módulo 08 (composition root).
 *
 * Aqui as peças são montadas de dentro para fora:
 *   banco → repositório → serviço → rotas → app
 *
 * É também o único lugar onde a decisão "qual banco?" aparece. Nenhuma camada
 * de dentro precisa saber a resposta.
 *
 * Rodar:  node minis-apis/03-despesas/servidor.ts
 * Porta:  6003 — http://localhost:6003
 * Banco:  data/minis-03-despesas.sqlite (criado e populado na primeira execução)
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
const db = abrirBanco('data/minis-03-despesas.sqlite');

const app = express();
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use(criarRotas(criarServico(criarRepositorioSqlite(db))));

// Os dois últimos, nesta ordem: o 404 genérico só roda se nenhuma rota casou, e
// o tratador de erro precisa vir depois de tudo que pode falhar.
app.use(rotaNaoEncontrada);
app.use(tratarErro);

const PORTA = 6003;
const servidor = app.listen(PORTA, () => {
  console.log(`Despesas em http://localhost:${PORTA}`);
  console.log('Rotas: /categorias  /despesas  /relatorios/mensal?mes=YYYY-MM');
});

// Fechar o banco no encerramento faz o SQLite consolidar o arquivo. Não fechar
// não corrompe nada — ele é resiliente —, mas deixa arquivos auxiliares para
// trás. Desligamento gracioso de verdade (esperar as requisições em andamento)
// é assunto de um módulo mais à frente.
for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    servidor.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
