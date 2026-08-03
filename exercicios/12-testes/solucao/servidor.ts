/**
 * Solução do exercício 12 — o servidor DEPOIS da extração do `criarApp()`.
 *
 * Rodar:
 *   node --env-file=.env exercicios/12-testes/solucao/servidor.ts
 *
 * Compare o tamanho deste arquivo com o do exercício 11. Tudo que era montagem
 * de app foi para `app.ts`; o que sobrou é exatamente o que NÃO se testa com
 * Supertest:
 *
 *   - escolher as implementações CONCRETAS de repositório;
 *   - os dados de partida;
 *   - a porta;
 *   - a rede de segurança do processo.
 *
 * Essa é a divisão certa: `app.ts` tem lógica e é testado; `servidor.ts` tem
 * decisões de ambiente e é verificado rodando.
 */
import { criarApp } from './app.ts';
import type { Autor } from './dominio/autor.ts';
import type { Livro } from './dominio/livro.ts';
import { criarRepositorioAutores } from './repositorios/autores-memoria.ts';
import { criarRepositorioEmprestimos } from './repositorios/emprestimos-memoria.ts';
import { criarRepositorioLivros } from './repositorios/livros-memoria.ts';
import { criarRepositorioRefresh } from './repositorios/refresh-memoria.ts';
import { criarRepositorioUsuarios } from './repositorios/usuarios-memoria.ts';

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
];

const app = criarApp({
  repoLivros: criarRepositorioLivros(livrosIniciais),
  repoAutores: criarRepositorioAutores(autoresIniciais),
  repoUsuarios: criarRepositorioUsuarios(),
  repoEmprestimos: criarRepositorioEmprestimos(),
  repoRefresh: criarRepositorioRefresh(),
});

process.on('unhandledRejection', (motivo) => {
  console.error('UNHANDLED REJECTION — encerrando:', motivo);
  process.exit(1);
});
process.on('uncaughtException', (erro) => {
  console.error('UNCAUGHT EXCEPTION — encerrando:', erro);
  process.exit(1);
});

const PORT = 4120;
app.listen(PORT, () => {
  console.log(`Biblioteca testada em http://localhost:${PORT}/api/v1`);
  console.log('A suíte deste app roda com:  npm test\n');
});
