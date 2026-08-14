// Sem este import, `Request`/`Response` resolvem para os tipos GLOBAIS do
// fetch (lib.dom), que não têm `params` nem `.status()`. O erro engana porque
// os nomes existem — só são de outra API. `type` deixa claro que só o tipo vem.
import express, { type Request, type Response } from 'express';

const app = express();

app.use(express.json());

type Livro = {
  id: number;
  titulo: string;
  autor: string;
  ano: number;
  disponivel: boolean;
};

const livros: Livro[] = [
  {
    id: 1,
    titulo: 'Dom Casmurro',
    autor: 'Machado de Assis',
    ano: 1899,
    disponivel: true,
  },
  {
    id: 2,
    titulo: 'Grande Sertão Veredas',
    autor: 'João Guimarães Rosa',
    ano: 1956,
    disponivel: false,
  },
  {
    id: 3,
    titulo: 'Vidas Secas',
    autor: 'Graciliano Ramos',
    ano: 1938,
    disponivel: true,
  },
];

const ANO_MIN = 1450;
const ANO_MAX = new Date().getFullYear();

// --- Funções auxiliares ---

const ORDENACOES_VALIDAS = ['ano', 'titulo'] as const;

function ordenarLivros(lista: Livro[], ordenar: unknown): Livro[] {
  if (ordenar === 'ano') {
    return [...lista].sort((a, b) => a.ano - b.ano);
  }
  if (ordenar === 'titulo') {
    return [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }
  return lista;
}

// Campos que o cliente controla — `disponivel` e `id` ficam de fora de propósito.
type DadosLivro = { titulo: string; autor: string; ano: number };

// O modo de validação muda o tipo do resultado, não só a mensagem de erro:
// no POST os três campos estão garantidos, no PATCH qualquer um pode faltar.
// Um único tipo com tudo opcional obrigaria o POST a checar de novo o que o
// validador já garantiu — o tipo genérico devolve a certeza pra quem chamou.
type ValidacaoLivro<T> = { valido: true; dados: T } | { valido: false; erro: string };

// `parcial: true` = modo PATCH: campo ausente é omissão legítima, não erro.
// Campo *presente* segue as mesmas regras nos dois modos — PATCH não é
// desculpa para gravar lixo, só para gravar menos.
function validarLivro(body: any, parcial: false): ValidacaoLivro<DadosLivro>;
function validarLivro(body: any, parcial: true): ValidacaoLivro<Partial<DadosLivro>>;
function validarLivro(
  body: any,
  parcial = false,
): ValidacaoLivro<DadosLivro> | ValidacaoLivro<Partial<DadosLivro>> {
  if (!body || typeof body !== 'object') {
    return { valido: false, erro: 'Corpo da requisição ausente' };
  }

  const { titulo, autor, ano } = body;
  // Partial enquanto monta: no modo POST os três ramos abaixo rodam sempre, e
  // a sobrecarga é que promete ao chamador que nada ficou faltando.
  const dados: Partial<DadosLivro> = {};

  // `in` distingue "não mandou" de "mandou undefined/null" — só o primeiro
  // pode ser ignorado no PATCH. `titulo !== undefined` confundiria os dois.
  if (!parcial || 'titulo' in body) {
    if (typeof titulo !== 'string' || titulo.trim() === '') {
      return {
        valido: false,
        erro: 'Campo "titulo" é obrigatório e deve ser uma string não vazia',
      };
    }
    // normaliza aqui, uma vez só: quem chama recebe o dado pronto pra gravar
    dados.titulo = titulo.trim().replace(/\s+/g, ' ');
  }

  if (!parcial || 'autor' in body) {
    if (typeof autor !== 'string' || autor.trim() === '') {
      return {
        valido: false,
        erro: 'Campo "autor" é obrigatório e deve ser uma string não vazia',
      };
    }
    dados.autor = autor.trim().replace(/\s+/g, ' ');
  }

  if (!parcial || 'ano' in body) {
    // Number.isInteger já rejeita NaN, Infinity e 1899.5 — typeof sozinho não
    if (typeof ano !== 'number' || !Number.isInteger(ano)) {
      return {
        valido: false,
        erro: 'Campo "ano" é obrigatório e deve ser um número inteiro',
      };
    }

    if (ano < ANO_MIN || ano > ANO_MAX) {
      return {
        valido: false,
        erro: `Campo "ano" deve estar entre ${ANO_MIN} e ${ANO_MAX}`,
      };
    }
    dados.ano = ano;
  }

  // PATCH com body `{}` passaria em todas as checagens acima sem alterar nada.
  // 400 aqui evita a resposta 200 mentirosa que diz ter atualizado o recurso.
  if (parcial && Object.keys(dados).length === 0) {
    return {
      valido: false,
      erro: 'Envie ao menos um campo: "titulo", "autor" ou "ano"',
    };
  }

  return { valido: true, dados };
}

// Number('') e Number(' ') são 0, não NaN — validar só com isNaN deixaria
// GET /livros/%20 virar uma busca pelo id 0. O regex barra antes da conversão.
function idValido(bruto: string): number | null {
  if (!/^\d+$/.test(bruto)) return null;
  return Number(bruto);
}

// livros.length + 1 reusa id depois de um DELETE (3 livros, apaga o 2, o
// próximo POST nasce com id 3 — colisão). O maior id já usado nunca colide.
function proximoId(): number {
  return livros.reduce((maior, l) => Math.max(maior, l.id), 0) + 1;
}

function acharIndice(req: Request<{ id: string }>, res: Response): number | null {
  const id = idValido(req.params.id);
  if (id === null) {
    res.status(400).json({ erro: 'O id deve ser um número inteiro positivo' });
    return null;
  }

  const indice = livros.findIndex((l) => l.id === id);
  if (indice === -1) {
    res.status(404).json({ erro: `Livro ${req.params.id} não existe` });
    return null;
  }

  return indice;
}

// --- Rotas ---

// GET /livros — lista. Aceita, combináveis:
// ?autor=texto — autor contém o texto (sem diferenciar maiúscula)
// ?disponivel=true / ?disponivel=false
// ?ordenar=ano ou ?ordenar=titulo (crescente)
// GET /livros/:id — um livro. Não existe → 404 { erro }.
// POST /livros — cria. Body: titulo, autor, ano. disponivel é true e não pode vir do cliente. Devolve 201 + Location: /livros/<id>.
// PATCH /livros/:id — altera só os campos enviados.
// DELETE /livros/:id — 204 sem corpo.
// POST /livros/:id/emprestar — marca disponivel: false. Já emprestado → 409 Conflict.
// POST /livros/:id/devolver — marca disponivel: true.

// titulo e autor: string não vazia.
// ano: número inteiro entre 1450 e o ano atual.
// Body ausente ou campo faltando → 400 { erro: "mensagem clara" }.

app.get('/livros', (req, res) => {
  let resultado = livros;

  if (req.query.titulo && req.query.autor) {
    return res.status(400).json({
      erro: `Você só pode buscar usando o título ou o autor, não os dois ao mesmo tempo`,
    });
  }

  if (req.query.ordenar && !ORDENACOES_VALIDAS.includes(req.query.ordenar as any)) {
    return res.status(400).json({
      erro: `Valor de "ordenar" inválido. Use: ${ORDENACOES_VALIDAS.join(' ou ')}`,
    });
  }

  const titulo = typeof req.query.titulo === 'string' ? req.query.titulo : undefined;
  if (titulo != undefined) {
    const busca = titulo.toLocaleLowerCase().trim();
    resultado = resultado.filter((l) => l.titulo.toLocaleLowerCase().includes(busca));
  }

  const autor = typeof req.query.autor === 'string' ? req.query.autor : undefined;
  if (autor != undefined) {
    const busca = autor.toLocaleLowerCase().trim();
    resultado = resultado.filter((a) =>
      a.autor.toLocaleLowerCase().trim().includes(busca),
    );
  }

  resultado = ordenarLivros(resultado, req.query.ordenar);

  res.json(resultado);
});

app.get('/livros/:id', (req, res) => {
  // Arrow com chaves NÃO tem return implícito: `(l) => { l.id === id }` avalia
  // a comparação, descarta e devolve undefined — a busca nunca achava nada e a
  // rota respondia 404 pra todo id. Hoje a comparação vive em acharIndice().
  const indice = acharIndice(req, res);
  if (indice === null) return;

  res.json(livros[indice]);
});

app.post('/livros', (req, res) => {
  const validacao = validarLivro(req.body, false);
  if (!validacao.valido) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const novoLivro: Livro = {
    id: proximoId(),
    ...validacao.dados,
    disponivel: true,
  };

  livros.push(novoLivro);
  res.status(201).location(`/livros/${novoLivro.id}`).json(novoLivro);
});

app.patch('/livros/:id', (req, res) => {
  const indice = acharIndice(req, res);
  if (indice === null) return;

  const livro = livros[indice]!;

  // `true` = validação parcial. Com o mesmo validarLivro do POST, um PATCH
  // que só manda { ano } tomava 400 dizendo que "titulo" é obrigatório —
  // PATCH é alteração parcial, e exigir o recurso inteiro é o contrato do PUT.
  const validacao = validarLivro(req.body, true);
  if (!validacao.valido) {
    return res.status(400).json({ erro: validacao.erro });
  }

  // Object.assign copia só as chaves presentes em `dados`, e o validador só
  // põe ali o que veio no body — os campos omitidos ficam intactos.
  // `disponivel` não está em DadosLivro, então o PATCH não consegue alterá-lo:
  // esse estado só muda por /emprestar e /devolver.
  Object.assign(livro, validacao.dados);

  res.json(livro);
});

app.delete('/livros/:id', (req, res) => {
  const indice = acharIndice(req, res);
  if (indice === null) return;

  livros.splice(indice, 1);

  res.status(204).end();
});


app.post('/livros/:id/emprestar', (req, res) => {
  const indice = acharIndice(req, res);
  if (indice === null) return;

  const livro = livros[indice]!;

  if (!livro.disponivel) {
    return res.status(409).json({ erro: `Livro ${livro.id} já está emprestado` });
  }

  livro.disponivel = false;
  res.json(livro);
});

app.post('/livros/:id/devolver', (req, res) => {
  const indice = acharIndice(req, res);
  if (indice === null) return;

  const livro = livros[indice]!;

  livro.disponivel = true;
  res.json(livro);
});

const PORT = 4030;
app.listen(PORT, () => {
  console.log(`API de biblioteca em http://localhost:${PORT}
- Busca:    http://localhost:${PORT}/livros?autor=Machado de Assis
- Um livro: http://localhost:${PORT}/livros/1
- Estado:   POST /livros/1/emprestar e POST /livros/1/devolver`);
});
