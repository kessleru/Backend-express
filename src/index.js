const express = require('express');

const app = express();

// Para o express entender o formato JSON
app.use(express.json());

/**
 * GET - Buscar uma informação dentro do servidor
 * POST - Inserir uma informação no servidor
 * PUT - Alterar uma informação no servidor
 * PATCH - Alterar uma informação específica
 * DELETE - Deletar uma informação no servidor
 */

/**
 * Tipos de parametros
 * 
 * Route Params => Identificar um recurso editar/deletar/buscar | Obrigatório
 * Query Params => Paginação / Filtro | Opcional
 * Request Body => Conteúdo na hora de criar ou editar um recurso (JSON) | Obrigatório
 */

app.get('/', (request, response) => {
  // Exemplo: http://localhost:5050/?name=Ignite&idade=2026
  const query = request.query;
  console.log(query);
  return response.json({ message: 'Hello World Ignite!' });
});

app.get('/courses', (request, response) => {
  return response.json(['curso 1', 'curso 2', 'curso 3']);
});

app.post('/courses', (request, response) => {
  const body = request.body;
  console.log(body);
  return response.json(['curso 1', 'curso 2', 'curso 3', 'curso 4']);
});

app.put('/courses/:id', (request, response) => {
  // const { id } = request.params
  // console.log(id)
  const params = request.params;
  console.log(params);
  return response.json(['curso 6', 'curso 2', 'curso 3', 'curso 4']);
});

app.patch('/courses/:id', (request, response) => {
  return response.json(['curso 6', 'curso 7', 'curso 3', 'curso 4']);
});

app.delete('/courses/:id', (request, response) => {
  return response.json(['curso 6', 'curso 7', 'curso 4']);
});

app.listen(5050);
