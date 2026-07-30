/**
 * Exercício 01 — agenda de contatos com `node:http` puro.
 *
 * Rodar:  node --watch src/playground/01-http/agenda.ts
 *
 * As linhas marcadas com `CORRIGIDO` apontam o que mudou em relação à sua
 * primeira versão, e por quê. Depois de ler, pode apagar os marcadores.
 */
import { createServer } from 'node:http';

const PORTA = 4010;

// CORRIGIDO — era `type contato`. Tipo em PascalCase: assim não se confunde com
// a variável `contato` usada nos handlers.
type Contato = {
  id: number;
  nome: string;
  email: string;
};

// CORRIGIDO — era `let`. A lista nunca é reatribuída: `push` e `splice` mexem no
// conteúdo, não na referência.
const contatos: Contato[] = [
  { id: 1, nome: 'Ana Souza', email: 'ana@exemplo.com' },
  { id: 2, nome: 'Bruno Lima', email: 'bruno@exemplo.com' },
];

// CORRIGIDO — era `let idCounter = 0`, que colidia com os ids semeados: o
// segundo POST criava outro contato com id 1 e o DELETE apagaria um dos dois, na
// sorte. Começa acima do maior id existente e daí só cresce, então id de contato
// deletado nunca é reaproveitado.
let proximoId = Math.max(0, ...contatos.map((c) => c.id)) + 1;

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORTA}`);
  const metodo = req.method ?? 'GET';
  const rota = `${metodo} ${url.pathname}`;

  console.log(metodo, url.pathname, url.searchParams.toString());

  // CORRIGIDO — o `if (rota === 'GET /contatos/:id')` nunca casava: `rota` traz
  // o id de verdade ("GET /contatos/7") e `:id` é só texto literal. Não existe
  // `:id` no node:http, o caminho tem que ser quebrado na mão.
  // CORRIGIDO — e o id fica em partes[1], não em partes[2]: o filter(Boolean)
  // já descartou a string vazia da barra inicial. "/contatos/7" → ['contatos','7'],
  // logo partes[2] era `undefined` e `Number(undefined)` é `NaN`.
  const partes = url.pathname.split('/').filter(Boolean);
  const recurso = partes[0]; // string | undefined (noUncheckedIndexedAccess)
  const idTexto = partes[1];

  // Barrando aqui tudo que não é /contatos, cada rota abaixo só precisa olhar
  // método e id. O `length > 2` derruba caminhos como /contatos/1/qualquer.
  if (recurso !== 'contatos' || partes.length > 2) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: 'Rota não encontrada', rota }));
    return;
  }

  // ---- GET /contatos (lista, com filtro opcional) -----------------------
  if (metodo === 'GET' && idTexto === undefined) {
    const nome = url.searchParams.get('nome');

    // `includes('')` é sempre verdadeiro: sem `?nome` o filtro devolve tudo, e
    // não precisa de um caminho separado para "sem filtro". Boa sacada sua.
    // CORRIGIDO — `toLocaleLowerCase()` → `toLowerCase()`: comparação técnica de
    // texto não deve depender do locale da máquina.
    const resultado = contatos.filter((c) =>
      c.nome.toLowerCase().includes((nome ?? '').toLowerCase()),
    );

    // CORRIGIDO — filtro sem resultado devolvia 404. Coleção vazia não é recurso
    // ausente: é 200 com []. O 404 afirmaria que /contatos não existe — e existe.
    // CORRIGIDO — e o writeHead saiu da entrada da rota para cá. Chamá-lo antes
    // de decidir o status e de novo no caminho de erro estourava
    // ERR_HTTP_HEADERS_SENT: o `?nome=zzz` não devolvia resposta nenhuma.
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(resultado));
    return;
  }

  // ---- POST /contatos ---------------------------------------------------
  if (metodo === 'POST' && idTexto === undefined) {
    const pedacos: Buffer[] = [];
    for await (const pedaco of req) {
      pedacos.push(pedaco as Buffer);
    }
    const corpoTexto = Buffer.concat(pedacos).toString('utf-8');

    // CORRIGIDO — era `const corpo: contato = JSON.parse(...)`. `JSON.parse`
    // devolve `any`: anotar como `Contato` não garante nada, só desliga a
    // checagem. Recebe como `unknown` e prova o formato depois.
    let corpo: unknown;
    try {
      corpo = JSON.parse(corpoTexto);
    } catch {
      // JSON quebrado é erro do cliente → 400, nunca 500.
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'JSON inválido' }));
      return;
    }

    const dados = corpo as Partial<Contato>;
    // CORRIGIDO — era `!corpo.nome || !corpo.email`, que aceitava `nome: 123` e
    // recusava `nome: ""`. O typeof é o teste exato. No módulo 07 o Zod faz isto
    // sem escrever na mão.
    if (typeof dados.nome !== 'string' || typeof dados.email !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'Campos obrigatórios: nome, email' }));
      return;
    }

    // CORRIGIDO — antes o próprio body era mutado (`corpo.id = ...`) e empurrado
    // na lista, então o cliente gravava o que quisesse — inclusive um `id`
    // escolhido por ele. Aqui monta-se um objeto novo, campo por campo.
    const novo: Contato = { id: proximoId++, nome: dados.nome, email: dados.email };
    contatos.push(novo);

    // CORRIGIDO — o `Location` estava dentro do JSON. Ele é header: é assim que
    // o cliente descobre a URL do recurso recém-criado. E o body de um 201 é o
    // recurso criado, não uma mensagem de sucesso.
    res.writeHead(201, {
      'Content-Type': 'application/json; charset=utf-8',
      Location: `/contatos/${novo.id}`,
    });
    res.end(JSON.stringify(novo));
    // CORRIGIDO — faltava este `return`. Sem ele o fluxo seguia até o 404 do fim
    // do handler e estourava ERR_HTTP_HEADERS_SENT, que num handler `async` vira
    // rejeição não tratada e derruba o processo: o servidor morria a cada POST.
    return;
  }

  // Daqui pra baixo toda rota precisa de id: `DELETE /contatos` não existe.
  if (idTexto === undefined) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: 'Rota não encontrada', rota }));
    return;
  }

  const id = Number(idTexto);

  // ---- GET /contatos/:id ------------------------------------------------
  if (metodo === 'GET') {
    const contato = contatos.find((c) => c.id === id);

    if (!contato) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: `Contato com id ${idTexto} não encontrado` }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(contato));
    return;
  }

  // ---- DELETE /contatos/:id ---------------------------------------------
  if (metodo === 'DELETE') {
    const index = contatos.findIndex((c) => c.id === id);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: `Contato com id ${idTexto} não encontrado` }));
      return;
    }

    contatos.splice(index, 1);
    res.writeHead(204); // No Content: nada de body aqui, nem `{}`
    res.end();
    return;
  }

  // ---- PATCH /contatos/:id (desafio extra) ------------------------------
  if (metodo === 'PATCH') {
    const contato = contatos.find((c) => c.id === id);
    if (!contato) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: `Contato com id ${idTexto} não encontrado` }));
      return;
    }

    const pedacos: Buffer[] = [];
    for await (const pedaco of req) {
      pedacos.push(pedaco as Buffer);
    }
    const corpoTexto = Buffer.concat(pedacos).toString('utf-8');

    let corpo: unknown;
    try {
      corpo = JSON.parse(corpoTexto);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'JSON inválido' }));
      return;
    }

    const dados = corpo as Partial<Contato>;
    // A diferença entre PATCH e PUT mora aqui: só sobrescrevemos o que veio.
    // Um PUT substituiria o recurso inteiro, apagando o que não foi enviado.
    if (typeof dados.nome === 'string') contato.nome = dados.nome;
    if (typeof dados.email === 'string') contato.email = dados.email;

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(contato));
    return;
  }

  // Método que não tratamos em /contatos.
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ erro: 'Rota não encontrada', rota }));
});

servidor.listen(PORTA, () => {
  console.log(`Agenda rodando em http://localhost:${PORTA}`);
});
