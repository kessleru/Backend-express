/**
 * Encurtador de links: guarda a URL longa, devolve um código curto, redireciona
 * quem abre o código e conta cada passagem.
 *
 * Conceitos principais: roteamento e ordem de rotas (módulo 04) e pilha de
 * middlewares (módulo 05). Armazenamento em memória — reiniciar apaga tudo.
 *
 * Rodar:  node minis-apis/01-encurtador/servidor.ts
 * Porta:  6001
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { gerarCodigo, links, type Link } from './armazem.ts';

const PORTA = 6001;

// A URL curta é devolvida pronta para copiar, então o servidor precisa saber sob
// que endereço ele é visto. Em produção isto viria de variável de ambiente:
// atrás de um proxy, `localhost:6001` é o que o processo enxerga, não o que o
// usuário digitou.
const BASE = `http://localhost:${PORTA}`;

const app = express();

// ---------------------------------------------------------------------
// Os três middlewares globais
// ---------------------------------------------------------------------

// Sem `express.json()` o `req.body` do POST é `undefined` no Express 5 (no 4 era
// `{}`) — e desestruturar `undefined` estoura um TypeError, virando 500 num erro
// que era do cliente. Daí o `?? {}` lá embaixo.
app.use(express.json());

// `cors()` sem opção nenhuma libera qualquer origem. Aqui é o certo: um link
// curto existe para ser colado em qualquer lugar, e a página que consulta a
// estatística pode estar em qualquer domínio. Restringir origem faria sentido
// numa API interna — módulo 13.
app.use(cors());

// `morgan('dev')` imprime método, caminho, status e tempo. É o que deixa visível
// no terminal que o redirecionamento são duas requisições: aparece o `302` de
// `/abc123` e nada depois, porque a segunda requisição vai para o site de
// destino, que não é este servidor.
app.use(morgan('dev'));

/**
 * Carimba na resposta quanto tempo o servidor levou para produzi-la.
 *
 * O difícil é *quando* carimbar. Em `res.on('finish')` — o evento que o exemplo
 * do módulo 05 usa para logar — os cabeçalhos já foram enviados, e `setHeader`
 * ali estoura `ERR_HTTP_HEADERS_SENT`. `writeHead` é o último instante em que
 * ainda dá: o Node o chama uma única vez, logo antes de a primeira linha da
 * resposta ir para o socket. Trocar a função por uma que carimba e depois chama
 * a original é como todo middleware de tempo de resposta funciona por baixo.
 */
function cronometrar(_req: Request, res: Response, next: NextFunction) {
  const inicio = performance.now();
  const escreverCabecalhos = res.writeHead.bind(res);

  res.writeHead = function (...argumentos: Parameters<typeof escreverCabecalhos>) {
    res.setHeader('X-Tempo-ms', (performance.now() - inicio).toFixed(2));
    return escreverCabecalhos(...argumentos);
  } as typeof res.writeHead;

  next();
}
app.use(cronometrar);

function estatistica(link: Link) {
  return {
    codigo: link.codigo,
    curto: `${BASE}/${link.codigo}`,
    url: link.url,
    cliques: link.cliques,
    criadoEm: link.criadoEm,
  };
}

// ---------------------------------------------------------------------
// Rotas de gestão — todas sob /links
// ---------------------------------------------------------------------

app.post('/links', (req, res) => {
  const { url, codigo } = (req.body ?? {}) as { url?: unknown; codigo?: unknown };

  // Daqui até o `links.set` é validação escrita à mão, `if` por `if`. Repare no
  // que ela custa: cada campo precisa de uma checagem de tipo, uma de formato e
  // uma mensagem própria, e só depois do primeiro `if` o TypeScript aceita que
  // `url` é `string`. Dois campos a mais e este handler dobra de tamanho. É essa
  // dor que o módulo 07 troca por um schema.
  if (typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({ erro: 'O campo `url` é obrigatório e deve ser texto' });
  }

  const alvo = url.trim();

  // A checagem é do **esquema** da URL, não da existência do site: o encurtador
  // não tem como saber se o endereço responde. Sem `http://` ou `https://` o
  // navegador leria o destino como caminho relativo e voltaria para este mesmo
  // servidor — quem clicasse no link cairia num 404 do encurtador.
  if (!alvo.startsWith('http://') && !alvo.startsWith('https://')) {
    return res
      .status(400)
      .json({ erro: 'O campo `url` precisa começar com http:// ou https://' });
  }

  let escolhido: string;

  if (codigo === undefined) {
    escolhido = gerarCodigo();
  } else {
    if (typeof codigo !== 'string' || !/^[A-Za-z0-9_-]{3,20}$/.test(codigo)) {
      return res.status(400).json({
        erro: 'O campo `codigo` deve ter de 3 a 20 caracteres entre letras, números, `-` e `_`',
      });
    }
    // 409 e não 400: o pedido está impecável, quem briga com ele é o estado
    // atual do servidor. O mesmo POST passa depois que aquele link for apagado.
    // Um 400 aqui mandaria o cliente caçar um erro de digitação que não existe.
    if (links.has(codigo)) {
      return res.status(409).json({ erro: `O código "${codigo}" já está em uso` });
    }
    escolhido = codigo;
  }

  const link: Link = {
    codigo: escolhido,
    url: alvo,
    cliques: 0,
    criadoEm: new Date().toISOString(),
  };
  links.set(escolhido, link);

  const { curto } = estatistica(link);
  res
    .status(201)
    .location(`/links/${escolhido}`)
    .json({ codigo: escolhido, curto, url: alvo });
});

app.get('/links', (_req, res) => {
  res.json([...links.values()].map(estatistica));
});

app.get('/links/:codigo', (req, res) => {
  const link = links.get(req.params.codigo);
  if (!link) {
    return res
      .status(404)
      .json({ erro: `Nenhum link com o código "${req.params.codigo}"` });
  }
  res.json(estatistica(link));
});

app.delete('/links/:codigo', (req, res) => {
  // `Map.delete` devolve `false` quando não havia nada para apagar — a checagem
  // de existência e a remoção saem na mesma linha, sem um `has` antes.
  if (!links.delete(req.params.codigo)) {
    return res
      .status(404)
      .json({ erro: `Nenhum link com o código "${req.params.codigo}"` });
  }
  res.status(204).send();
});

// ---------------------------------------------------------------------
// O redirecionamento — sempre a ÚLTIMA rota registrada
// ---------------------------------------------------------------------
// `/:codigo` casa com um segmento qualquer, e `links` é um segmento qualquer. Se
// este bloco subisse para cima do `app.get('/links')`, todo `GET /links` viraria
// "procure o link de código `links`" e responderia 404 numa rota que existe. A
// posição aqui não é organização, é requisito (módulo 04).

app.get('/:codigo', (req, res) => {
  const link = links.get(req.params.codigo);
  if (!link) {
    return res
      .status(404)
      .json({ erro: `Nenhum link com o código "${req.params.codigo}"` });
  }

  // A contagem mora aqui porque este é o único ponto por onde toda visita passa.
  // O site de destino nunca fica sabendo que houve um clique.
  link.cliques += 1;

  // 302 (temporário) e não 301 (permanente): o navegador guarda o 301 em cache e,
  // da segunda visita em diante, vai direto ao destino sem chamar este servidor.
  // O contador congelaria em 1, e apagar o link deixaria de ter efeito sobre quem
  // já clicou. Nada disso aparece num teste rápido — na primeira visita os dois
  // se comportam igual. É o erro mais caro deste arquivo.
  res.redirect(302, link.url);
});

// 404 de rota: nada casou. Sem isto o Express responde 404 em HTML, e o cliente
// que faz `await res.json()` recebe um erro de parse no lugar do erro de verdade.
app.use((req, res) => {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não existe` });
});

app.listen(PORTA, () => {
  console.log(`Encurtador em ${BASE}  ·  POST ${BASE}/links para criar`);
});
