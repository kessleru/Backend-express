/**
 * CRUD de cursos em memória — o "hello world" honesto do Express.
 *
 * É o mesmo servidor do módulo 01 (`node:http` puro), agora com Express.
 * Compare os dois arquivos: a lógica é a mesma, o trabalho manual sumiu.
 *
 * Rodar:  node src/exemplos/03-express-basico/crud-cursos.ts
 */
import express from 'express';

const app = express();

// Sem isto, `req.body` é `undefined` em qualquer rota. Este middleware lê o
// corpo da requisição em pedaços, faz `JSON.parse` e guarda em `req.body`.
// Só age quando o `Content-Type` é `application/json` — ver o POST abaixo.
app.use(express.json());

type Curso = { id: number; titulo: string; horas: number };

const cursos: Curso[] = [
  { id: 1, titulo: 'Fundamentos de HTTP', horas: 4 },
  { id: 2, titulo: 'Node e assincronia', horas: 6 },
  { id: 3, titulo: 'Express do zero', horas: 8 },
];

let proximoId = 4; // contador que só cresce: id de curso deletado não volta

// ---------------------------------------------------------------------
// GET — os três tipos de parâmetro
// ---------------------------------------------------------------------

/**
 * QUERY PARAMS (`req.query`) — filtro e paginação. Sempre opcionais.
 *
 *   GET /cursos
 *   GET /cursos?titulo=http&maxHoras=5
 *
 * Tudo que vem da URL é string. `?maxHoras=5` chega como `"5"`, não `5`.
 */
app.get('/cursos', (req, res) => {
  // `req.query` é `string | string[] | ...` — daí a checagem de tipo.
  const titulo = typeof req.query.titulo === 'string' ? req.query.titulo : undefined;
  const maxHoras = Number(req.query.maxHoras); // string inválida → NaN

  let resultado = cursos;

  if (titulo) {
    const busca = titulo.toLowerCase();
    resultado = resultado.filter((c) => c.titulo.toLowerCase().includes(busca));
  }

  // `NaN` em qualquer comparação é false, então checamos antes de usar.
  if (!Number.isNaN(maxHoras)) {
    resultado = resultado.filter((c) => c.horas <= maxHoras);
  }

  // `res.json()` faz três coisas: serializa, põe o Content-Type e encerra.
  res.json(resultado);
});

/**
 * ROUTE PARAMS (`req.params`) — identificam UM recurso. Sempre obrigatórios.
 *
 *   GET /cursos/2
 *
 * O `:id` no caminho é o que cria `req.params.id` — também como string.
 */
app.get('/cursos/:id', (req, res) => {
  const id = Number(req.params.id);
  const curso = cursos.find((c) => c.id === id);

  if (!curso) {
    // `res.status(404).json(...)` encadeia: status primeiro, corpo depois.
    // O `return` evita continuar e responder duas vezes.
    return res.status(404).json({ erro: `Curso ${req.params.id} não existe` });
  }

  res.json(curso);
});

// ---------------------------------------------------------------------
// POST — cria. REQUEST BODY (`req.body`)
// ---------------------------------------------------------------------

/**
 * BODY — os dados de criação/edição. Vem em JSON, não na URL.
 *
 *   curl -X POST localhost:5051/cursos \
 *     -H 'Content-Type: application/json' \
 *     -d '{"titulo":"Prisma","horas":5}'
 *
 * Sem o header `Content-Type: application/json`, o `express.json()` não toca no
 * corpo e no Express 5 `req.body` fica **`undefined`** (no Express 4 era `{}`).
 * É a causa nº 1 de "meu POST chega vazio" — e desestruturar `undefined` joga
 * um TypeError, virando 500 num erro que era do cliente. Daí o `?? {}`.
 */
app.post('/cursos', (req, res) => {
  // `req.body` é `any`: o Express não sabe o que o cliente mandou, e o cliente
  // pode mandar qualquer coisa. Validar aqui é obrigatório — no módulo 07 isso
  // sai da rota e vira um schema Zod.
  const { titulo, horas } = (req.body ?? {}) as Partial<Curso>;

  if (typeof titulo !== 'string' || titulo.trim() === '') {
    return res.status(400).json({ erro: '`titulo` é obrigatório' });
  }
  if (typeof horas !== 'number' || horas <= 0) {
    return res.status(400).json({ erro: '`horas` deve ser um número positivo' });
  }

  const curso: Curso = { id: proximoId++, titulo: titulo.trim(), horas };
  cursos.push(curso);

  // 201 Created + Location apontando para o recurso novo. É o combinado do HTTP.
  res.status(201).location(`/cursos/${curso.id}`).json(curso);
});

// ---------------------------------------------------------------------
// PUT vs PATCH — substituir vs alterar um pedaço
// ---------------------------------------------------------------------

/** PUT substitui o recurso INTEIRO. Campo que não vier é campo perdido. */
app.put('/cursos/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = cursos.findIndex((c) => c.id === id);

  if (indice === -1) return res.status(404).json({ erro: 'Curso não existe' });

  const { titulo, horas } = (req.body ?? {}) as Partial<Curso>;
  if (typeof titulo !== 'string' || typeof horas !== 'number') {
    return res.status(400).json({ erro: 'PUT exige `titulo` e `horas`' });
  }

  const atualizado: Curso = { id, titulo, horas };
  cursos[indice] = atualizado;
  res.json(atualizado);
});

/** PATCH altera só o que veio. O resto fica como estava. */
app.patch('/cursos/:id', (req, res) => {
  const id = Number(req.params.id);
  const curso = cursos.find((c) => c.id === id);

  if (!curso) return res.status(404).json({ erro: 'Curso não existe' });

  const { titulo, horas } = (req.body ?? {}) as Partial<Curso>;

  // Só toca no campo que veio de verdade. `undefined` é "não mandou".
  if (titulo !== undefined) {
    if (typeof titulo !== 'string' || titulo.trim() === '') {
      return res.status(400).json({ erro: '`titulo` inválido' });
    }
    curso.titulo = titulo.trim();
  }
  if (horas !== undefined) {
    if (typeof horas !== 'number' || horas <= 0) {
      return res.status(400).json({ erro: '`horas` inválido' });
    }
    curso.horas = horas;
  }

  res.json(curso);
});

// ---------------------------------------------------------------------
// DELETE — 204, sem corpo
// ---------------------------------------------------------------------

app.delete('/cursos/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = cursos.findIndex((c) => c.id === id);

  if (indice === -1) return res.status(404).json({ erro: 'Curso não existe' });

  cursos.splice(indice, 1);

  // 204 No Content: deu certo e não há nada para devolver.
  // `.send()` sem argumento — um `.json({})` aqui contraria o próprio status.
  res.status(204).send();
});

// ---------------------------------------------------------------------

const PORT = 5051;
app.listen(PORT, () => {
  console.log(`CRUD de cursos em http://localhost:${PORT}/cursos`);
});
