/**
 * Mini API de enquetes — o único arquivo que conhece todas as camadas e o único
 * que chama `listen()`. Conceito principal: módulo 08 (composition root).
 *
 * As peças são montadas de dentro para fora:
 *   banco → repositório → serviço → rotas → app
 *
 * É também o único lugar onde a decisão "qual banco?" aparece. Nenhuma camada
 * de dentro precisa saber a resposta.
 *
 * Rodar:  node minis-apis/04-enquetes/servidor.ts
 * Porta:  6004 — http://localhost:6004
 * Banco:  data/minis-04-enquetes.sqlite (criado e populado na primeira execução)
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
const db = abrirBanco('data/minis-04-enquetes.sqlite');

const app = express();
app.use(morgan('dev'));
// `X-Eleitor` é um cabeçalho fora da lista que o CORS libera sozinho: sem
// declará-lo aqui, o navegador barra a requisição de voto vinda de outra
// origem antes de ela sair da máquina — e o servidor nem fica sabendo. Com
// `curl` funciona nos dois casos, que é o que faz esse bug demorar a aparecer.
app.use(cors({ allowedHeaders: ['Content-Type', 'X-Eleitor'] }));
app.use(express.json());

app.use(criarRotas(criarServico(criarRepositorioSqlite(db))));

// Os dois últimos, nesta ordem: o 404 genérico só roda se nenhuma rota casou, e
// o tratador de erro precisa vir depois de tudo que pode falhar.
app.use(rotaNaoEncontrada);
app.use(tratarErro);

const PORTA = 6004;
const servidor = app.listen(PORTA, () => {
  console.log(`Enquetes em http://localhost:${PORTA}`);
  console.log('Rotas: /enquetes  /enquetes/:id/votos  /enquetes/:id/resultado');
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
