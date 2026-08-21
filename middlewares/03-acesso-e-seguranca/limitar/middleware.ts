/**
 * limitar — duas versões do mesmo middleware, lado a lado: a escrita à mão, que
 * mostra o mecanismo, e a `express-rate-limit`, que é a que vai para produção.
 * Conceito principal: módulo 13.
 *
 * As duas dividem o mesmo teto honesto, e ele está no fim do arquivo: contador
 * em memória não sobrevive a dois processos.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';

export type ConfiguracaoDeLimite = {
  /** Tamanho da janela em milissegundos. */
  janelaMs: number;
  /** Quantas requisições cabem na janela antes do 429. */
  limite: number;
};

/**
 * ---------------------------------------------------------------------
 * VERSÃO 1 — à mão, com `Map`. Escreva uma vez, use nenhuma.
 * ---------------------------------------------------------------------
 * Ela existe para o mecanismo ficar visível: uma chave por cliente, um contador,
 * um instante em que o contador zera. É isso, e é literalmente isso que a
 * biblioteca faz por baixo.
 *
 * O `Map` fica dentro da fábrica, não no topo do arquivo. Estado no topo do
 * módulo é compartilhado por todas as rotas que importarem daqui, e aí um
 * limitador de leitura passa a gastar a cota do de escrita — o mesmo bug que a
 * solução do módulo 13 descreve por ter sido pego rodando, não pensando.
 */
export function limitarNaMao({ janelaMs, limite }: ConfiguracaoDeLimite): RequestHandler {
  const contadores = new Map<string, { total: number; reiniciaEm: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    // `req.ip` é a aproximação mais grosseira possível de "quem é o cliente": um
    // escritório inteiro sai por um IP só e é bloqueado junto, enquanto quem tem
    // botnet tem milhares. É por isso que rate limit é uma camada, não a defesa.
    // Depois do `autenticar`, `req.usuario?.id` costuma ser uma chave melhor —
    // mas só existe depois dele, e a rota de login (a que mais precisa de
    // limite) roda antes.
    const chave = req.ip ?? 'desconhecido';
    const agora = Date.now();
    const atual = contadores.get(chave);

    if (!atual || agora >= atual.reiniciaEm) {
      contadores.set(chave, { total: 1, reiniciaEm: agora + janelaMs });
      return next();
    }

    atual.total += 1;

    if (atual.total > limite) {
      const segundos = Math.ceil((atual.reiniciaEm - agora) / 1000);
      // `Retry-After` em segundos é o que permite a um cliente educado esperar
      // em vez de martelar. Sem ele, a reação natural do cliente ao 429 é tentar
      // de novo na hora — e cada tentativa renova o motivo do bloqueio.
      res.setHeader('Retry-After', String(segundos));
      res.status(429).json({
        erro: 'limite_excedido',
        mensagem: `Limite de ${limite} requisições por janela. Tente em ${segundos}s.`,
      });
      return;
    }

    next();
  };
}

/**
 * ---------------------------------------------------------------------
 * O DEFEITO DA JANELA FIXA — o dobro passando na virada
 * ---------------------------------------------------------------------
 * A janela acima começa na primeira requisição e vale `janelaMs`. Ela não
 * desliza: quando o prazo vence, o contador zera inteiro.
 *
 * Com `limite: 3` e janela de 10s, é isto que acontece:
 *
 *   00,0s  ██ 1ª  → 200   (janela A começa, reinicia em 10,0s)
 *   09,7s  ██ 2ª  → 200
 *   09,8s  ██ 3ª  → 200   (cota da janela A esgotada)
 *   10,1s  ██ 4ª  → 200   (janela B: o contador zerou, começa do 1)
 *   10,2s  ██ 5ª  → 200
 *   10,3s  ██ 6ª  → 200
 *
 * Seis requisições em 600 milissegundos, com um limite de três por dez segundos.
 * Nenhuma delas violou a regra escrita; o pico real é **o dobro** do configurado
 * e acontece exatamente quando alguém está tentando descobrir onde é a borda.
 *
 * Para uma rota de login com Argon2 (~200ms de CPU por tentativa), o dobro na
 * virada é o dobro de tentativas de senha por minuto. A correção não é diminuir
 * o limite: é trocar a contagem por janela deslizante, que é o que os `store`
 * da biblioteca oferecem.
 */

/**
 * ---------------------------------------------------------------------
 * VERSÃO 2 — `express-rate-limit`, a que vai para produção
 * ---------------------------------------------------------------------
 * Mesma ideia, três coisas a mais que valem a dependência:
 *
 *   1. `store` trocável — o mesmo contador para várias instâncias (Redis, no
 *      módulo 15). É o que conserta o limite honesto do fim deste arquivo.
 *   2. Cabeçalhos `RateLimit` e `RateLimit-Policy` padronizados pela IETF, que
 *      um cliente educado lê para se auto-regular antes de tomar 429.
 *   3. O 429, o `Retry-After` e a contagem certos nas bordas, sem você manter
 *      isso.
 */
export function limitarComLib({
  janelaMs,
  limite,
}: ConfiguracaoDeLimite): RequestHandler {
  return rateLimit({
    windowMs: janelaMs,
    limit: limite,

    // `draft-8` liga os cabeçalhos padronizados: `RateLimit: limit=3,
    // remaining=1, reset=7` e `RateLimit-Policy`. `legacyHeaders: false` desliga
    // os `X-RateLimit-*`, que são anteriores ao padrão e nunca foram um —
    // mandar os dois formatos dobra o tamanho do cabeçalho em TODA resposta para
    // agradar clientes que ninguém identificou.
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    // O `handler` existe porque a resposta padrão da biblioteca é o texto
    // `Too many requests, please try again later.` — corpo em inglês, sem JSON,
    // diferente de todo o resto da API. O cliente precisaria de um tratamento só
    // para este status. Aqui ele sai igual ao 429 da versão à mão.
    handler: (_req: Request, res: Response) => {
      // A biblioteca já pôs o `Retry-After` antes do handler rodar; cabeçalho e
      // corpo são independentes até a resposta sair.
      const segundos = Number(res.getHeader('Retry-After') ?? 60);
      res.status(429).json({
        erro: 'limite_excedido',
        mensagem: `Limite de ${limite} requisições por janela. Tente em ${segundos}s.`,
      });
    },
  });
}

/**
 * ---------------------------------------------------------------------
 * O LIMITE DAS DUAS: o contador é do processo
 * ---------------------------------------------------------------------
 * O `Map` acima e o store padrão da biblioteca vivem na memória de UM processo.
 * Com dois processos atrás de um balanceador — que é o mínimo de qualquer
 * implantação séria, e é o que o `cluster` do Node faz numa máquina só —, cada
 * um conta o seu. O atacante alterna entre eles sem saber, e o teto real vira o
 * dobro do configurado; com quatro processos, o quádruplo.
 *
 * E um `restart` zera tudo: um `deploy` no meio de um ataque devolve a cota
 * cheia a quem estava bloqueado.
 *
 * A versão à mão tem ainda um defeito que a biblioteca não tem: o `Map` só
 * cresce. Cada IP novo vira uma entrada que nunca é removida, mesmo depois de a
 * janela dele vencer. Numa API pública isso é vazamento de memória em ritmo de
 * tráfego — consertá-lo pede uma varredura periódica, que é mais uma peça para
 * manter, e é um dos motivos de a versão à mão não ir para produção.
 *
 * A correção é o contador sair do processo e ir para um armazenamento
 * compartilhado — Redis, no módulo 15. Até lá, o número configurado aqui é um
 * teto por processo, e vale saber disso antes de prometê-lo a alguém.
 */
