/**
 * Demo do grupo 03 — acesso e segurança. Não é aplicação: é o mínimo de rota
 * para cada middleware do grupo aparecer num `curl`.
 *
 * Rodar:  node middlewares/03-acesso-e-seguranca/servidor.ts   (porta 6103)
 *
 * A pilha, de fora para dentro:
 *   cabecalhosDeSeguranca → toda resposta, inclusive a de erro
 *   limitarNaMao / limitarComLib → só nas rotas que demonstram o limite
 *   autenticar → só nas rotas privadas
 *   exigirPapel → depois do autenticar, nunca antes
 */
import express from 'express';
import { autenticar, emitirToken, type Papel } from './autenticar/middleware.ts';
import { exigirPapel } from './exigir-papel/middleware.ts';
import { limitarComLib, limitarNaMao } from './limitar/middleware.ts';
import { cabecalhosDeSeguranca } from './cabecalhos-de-seguranca/middleware.ts';

const app = express();
const PORTA = 6103;

// Primeiro de todos: um middleware que só põe cabeçalho precisa rodar antes de
// qualquer coisa que possa responder. Posto depois do `limitarNaMao`, o 429
// sairia sem os cabeçalhos de segurança — e a resposta de erro é justamente a
// que mais tende a vazar informação.
app.use(cabecalhosDeSeguranca);

/** Estreita o que vem da query: `req.query.papel` pode ser array ou objeto. */
function ehPapel(valor: unknown): valor is Papel {
  return valor === 'leitor' || valor === 'editor' || valor === 'admin';
}

/**
 * A rota que existe para o `curl` ter um token. Ela NÃO é um login: não há
 * senha, não há usuário, e qualquer um pede o papel que quiser. Um login de
 * verdade confere a senha com argon2 e mora no módulo 11 — aqui ele só
 * atrapalharia o assunto do grupo.
 *
 * Os dados vêm da query e não do corpo para o `curl` da demo caber numa linha,
 * sem `-H content-type` e sem JSON entre aspas (que o PowerShell estraga).
 */
app.post('/sessoes', (req, res) => {
  const papel = req.query.papel;
  if (!ehPapel(papel)) {
    res.status(422).json({
      erro: 'papel_invalido',
      mensagem: 'Use ?papel=leitor, ?papel=editor ou ?papel=admin',
    });
    return;
  }

  const id = typeof req.query.usuario === 'string' ? req.query.usuario : 'ana';
  res.json({ token: emitirToken({ id, papel }) });
});

/** Sem middleware nenhum: serve para ver os cabeçalhos do helmet com `curl -i`. */
app.get('/publico', (_req, res) => {
  res.json({ acervo: 'Biblioteca da praça', aberto: true });
});

/** Só `autenticar`: responde quem o token diz que você é. */
app.get('/eu', autenticar, (req, res) => {
  // `req.usuario` continua opcional para o compilador: ele não sabe que o
  // `autenticar` rodou antes nesta rota. O `??` aqui é a alternativa honesta ao
  // `!` — que compila igual e mente quando alguém remover o middleware da linha.
  res.json({ usuario: req.usuario ?? null });
});

/** Os dois, na ordem: quem é (401) e depois o que pode (403). */
app.delete('/acervo/:id', autenticar, exigirPapel('admin'), (req, res) => {
  res.json({ removido: req.params.id, por: req.usuario?.id });
});

// Janela curta de propósito: 10 segundos deixa o `curl` da virada de janela
// caber num teste manual. Em produção a janela é de minutos.
app.get('/catalogo', limitarNaMao({ janelaMs: 10_000, limite: 3 }), (_req, res) => {
  res.json({ livros: ['Duna', 'O Hobbit'] });
});

app.get('/busca', limitarComLib({ janelaMs: 10_000, limite: 3 }), (req, res) => {
  res.json({ termo: req.query.q ?? null, resultados: [] });
});

app.listen(PORTA, () => {
  console.log(`Demo do grupo 03 em http://localhost:${PORTA}`);
});
