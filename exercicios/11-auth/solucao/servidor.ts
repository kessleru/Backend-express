/**
 * Solução do exercício 11 — COMPOSITION ROOT com autenticação.
 *
 * Rodar:
 *   node --env-file=.env exercicios/11-auth/solucao/servidor.ts
 *
 * O `--env-file` é obrigatório: sem `JWT_SECRET` no ambiente, o processo NÃO
 * SOBE (é critério de aceite, e a explicação está em `auth/tokens.ts`).
 *
 * ---------------------------------------------------------------------
 * O QUE MUDOU DO MÓDULO 08 PARA CÁ
 * ---------------------------------------------------------------------
 * Comparar este arquivo com `exercicios/08-camadas/solucao/servidor.ts` mostra o
 * módulo inteiro num diff:
 *
 *   - `exigirChaveEmEscritas` (X-Api-Key) SAIU. Chave fixa compartilhada não
 *     identifica pessoa: não dá para saber quem pegou um livro, revogar o acesso
 *     de alguém, nem dar papéis diferentes.
 *   - Entraram três repositórios (usuários, empréstimos, refresh) e dois services
 *     (autenticação, empréstimos).
 *   - `cookieParser()` entrou na pilha, porque o refresh vive num cookie.
 *   - A autorização deixou de ser global e passou para cada rota.
 *
 * O que NÃO mudou: nenhum service de livro ou autor foi tocado. Autenticação é
 * uma camada de BORDA — ela não deveria vazar para dentro do domínio, e não vazou.
 */
import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { Autor } from './dominio/autor.ts';
import type { Livro } from './dominio/livro.ts';
import { rotaNaoEncontrada, tratarErro } from './erros/tratador.ts';
import { limitar } from './middlewares/limitar.ts';
import { identificar, registrar } from './middlewares/log.ts';
import { criarRepositorioAutores } from './repositorios/autores-memoria.ts';
import { criarRepositorioEmprestimos } from './repositorios/emprestimos-memoria.ts';
import { criarRepositorioLivros } from './repositorios/livros-memoria.ts';
import { criarRepositorioRefresh } from './repositorios/refresh-memoria.ts';
import { criarRepositorioUsuarios } from './repositorios/usuarios-memoria.ts';
import { criarRotasAutores } from './rotas/autores.ts';
import { criarRotasAuth } from './rotas/auth.ts';
import { criarRotasEmprestimos } from './rotas/emprestimos.ts';
import { criarRotasLivros } from './rotas/livros.ts';
import { criarServicoAutenticacao } from './servicos/autenticacao.ts';
import { criarServicoAutores } from './servicos/autores.ts';
import { criarServicoEmprestimos } from './servicos/emprestimos.ts';
import { criarServicoLivros } from './servicos/livros.ts';

// ---------------------------------------------------------------------
// Dados iniciais
// ---------------------------------------------------------------------
// Não há usuário no seed, de propósito: o PRIMEIRO a se registrar vira admin
// (regra em `servicos/autenticacao.ts`). Assim o exercício começa como uma
// instalação nova — e você sente na prática por que essa regra é aceitável num
// estudo e perigosa em produção.

const autoresIniciais: Autor[] = [
  { id: 1, nome: 'J.R.R. Tolkien', nacionalidade: 'britânica' },
  { id: 2, nome: 'Frank Herbert', nacionalidade: 'estadunidense' },
];

const livrosIniciais: Livro[] = [
  {
    id: 1,
    titulo: 'O Hobbit',
    autorId: 1,
    ano: 1937,
    isbn: '9788595084742',
    generos: ['fantasia'],
    disponivel: true,
  },
  { id: 2, titulo: 'Duna', autorId: 2, ano: 1965, generos: ['ficcao'], disponivel: true },
  {
    id: 3,
    titulo: 'O Senhor dos Anéis',
    autorId: 1,
    ano: 1954,
    generos: ['fantasia', 'ficcao'],
    disponivel: true,
  },
];

// ---------------------------------------------------------------------
// 1. REPOSITÓRIOS
// ---------------------------------------------------------------------

const repoAutores = criarRepositorioAutores(autoresIniciais);
const repoLivros = criarRepositorioLivros(livrosIniciais);
const repoUsuarios = criarRepositorioUsuarios();
const repoEmprestimos = criarRepositorioEmprestimos();
const repoRefresh = criarRepositorioRefresh();

// ---------------------------------------------------------------------
// 2. SERVICES
// ---------------------------------------------------------------------

const servicoLivros = criarServicoLivros(repoLivros, repoAutores);
const servicoAutores = criarServicoAutores(repoAutores, repoLivros);
const servicoAuth = criarServicoAutenticacao(repoUsuarios, repoRefresh);
const servicoEmprestimos = criarServicoEmprestimos(repoEmprestimos, repoLivros);

// ---------------------------------------------------------------------
// 3. ROTAS
// ---------------------------------------------------------------------

const rotasLivros = criarRotasLivros(servicoLivros, servicoEmprestimos);
const rotasAutores = criarRotasAutores(servicoAutores, servicoLivros);
const rotasAuth = criarRotasAuth(servicoAuth);
const rotasEmprestimos = criarRotasEmprestimos(servicoEmprestimos);

// ---------------------------------------------------------------------
// 4. APP
// ---------------------------------------------------------------------

const app = express();

app.use(identificar);
app.use(registrar);
app.use(cors());
app.use(express.json());

// `cookie-parser` popula `req.cookies`. Sem ele, `req.cookies` é `undefined` e o
// refresh nunca é encontrado — um bug que se manifesta como "o logout não
// funciona", bem longe da causa.
app.use(cookieParser());

/**
 * As rotas de auth ficam FORA de `/api/v1`, montadas em `/auth`.
 *
 * Não é estilo: o cookie de refresh tem `path: '/auth'` (ver
 * `controllers/auth.ts`), e o navegador só envia o cookie para caminhos que
 * casam com esse prefixo. **URL e escopo de cookie têm que combinar** — se as
 * rotas fossem `/api/v1/auth/*`, o `path` teria que acompanhar, senão o refresh
 * simplesmente não chega.
 */
app.use('/auth', rotasAuth);

app.use('/api', limitar(200, 60_000));

app.get('/api/v1', (_req, res) => {
  res.json({
    versao: 'v1',
    recursos: {
      livros: '/api/v1/livros',
      autores: '/api/v1/autores',
      emprestimos: '/api/v1/emprestimos',
      auth: '/auth',
    },
  });
});

const v1 = Router();
v1.use('/livros', rotasLivros);
v1.use('/autores', rotasAutores);
v1.use('/emprestimos', rotasEmprestimos);
app.use('/api/v1', v1);

app.use(rotaNaoEncontrada);
app.use(tratarErro);

process.on('unhandledRejection', (motivo) => {
  console.error('UNHANDLED REJECTION — encerrando:', motivo);
  process.exit(1);
});
process.on('uncaughtException', (erro) => {
  console.error('UNCAUGHT EXCEPTION — encerrando:', erro);
  process.exit(1);
});

const PORT = 4110;
app.listen(PORT, () => {
  console.log(`Biblioteca com auth em http://localhost:${PORT}/api/v1`);
  console.log('  POST /auth/registrar  ← o PRIMEIRO usuário vira admin');
  console.log('  POST /auth/login /auth/refresh /auth/logout /auth/trocar-senha');
  console.log('  GET  /auth/eu | /auth/usuarios (admin)');
  console.log('  POST /api/v1/livros/:id/emprestar | /devolver');
  console.log('  GET  /api/v1/emprestimos/meus | /api/v1/emprestimos (admin)\n');
});
