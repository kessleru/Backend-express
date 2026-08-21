/**
 * cabecalhosDeSeguranca — `helmet` configurado para uma API que só devolve JSON.
 * Conceito principal: módulo 13.
 *
 * O ponto desta pasta não é ligar o helmet: é saber o que cada cabeçalho compra
 * quando **não existe página**. A maior parte deles instrui um navegador sobre
 * como renderizar HTML, e um cliente que faz `fetch` e lê JSON ignora quase
 * todos. Os que valem estão marcados abaixo; os outros ficam ligados porque
 * custam bytes e não custam risco.
 */
import helmet from 'helmet';

export const cabecalhosDeSeguranca = helmet({
  /**
   * VALE, e muito: `X-Content-Type-Options: nosniff`.
   *
   * Sem ele, o navegador pode ignorar o `Content-Type` que você mandou e
   * adivinhar o tipo pelo conteúdo. Uma resposta JSON que comece com `<` — um
   * campo `nome` guardado como `<script>...` e devolvido no primeiro atributo —
   * pode ser tratada como HTML e executada **na sua origem**, com os cookies
   * dela. É o único cabeçalho desta lista que fecha um buraco que existe mesmo
   * numa API que nunca serve página.
   *
   * Fica no padrão do helmet (`nosniff`); a opção está aqui só para o comentário
   * ter onde morar.
   */
  noSniff: true,

  /**
   * VALE quando a API está atrás de HTTPS: `Strict-Transport-Security`.
   *
   * Ele diz ao navegador "nos próximos 365 dias, nunca fale comigo em HTTP" — o
   * que mata o downgrade, em que o atacante na rede intercepta a primeira
   * requisição HTTP e lê o `Authorization` em texto puro. Um token Bearer é ao
   * portador (módulo 11): quem o lê, é você.
   *
   * O custo de `preload` (que não está ligado aqui): entrar na lista embutida
   * nos navegadores é fácil e sair leva meses. Se algum subdomínio ainda vive em
   * HTTP, `includeSubDomains` o derruba para todo mundo — de propósito, e é bom
   * decidir isso antes e não pelo padrão.
   *
   * Em `http://localhost` o cabeçalho é enviado e o navegador o ignora, porque
   * HSTS só é aceito sobre HTTPS. Não atrapalha o desenvolvimento.
   */
  hsts: { maxAge: 31_536_000, includeSubDomains: true },

  /**
   * VALE pouco, mas é barato: `Referrer-Policy: no-referrer`.
   *
   * Ele evita que a URL da requisição atual vaze no `Referer` da próxima. Numa
   * API isso importa quando alguém põe dado sensível na query — `?token=` ou
   * `?email=` —, que é justamente o que não se deve fazer. Segunda linha de
   * defesa para um erro que acontece.
   */
  referrerPolicy: { policy: 'no-referrer' },

  /**
   * ---------------------------------------------------------------------
   * A PARTE QUE QUASE NENHUM TUTORIAL DIZ
   * ---------------------------------------------------------------------
   * A CSP padrão do helmet (`default-src 'self'; script-src 'self'; ...`) é uma
   * política de página: ela diz de onde o navegador **pode carregar script,
   * estilo e imagem ao renderizar este documento**. Uma resposta
   * `application/json` não renderiza nada e não carrega sub-recurso nenhum, então
   * a política inteira governa um comportamento que não vai acontecer. Ela não é
   * errada; é inaplicável. Mandá-la em cada resposta são ~180 bytes por
   * requisição em troca de zero — e, pior, dá a sensação de que a API está
   * protegida contra XSS, quando quem defende contra XSS é a validação da
   * entrada e o escape de quem renderiza (módulo 13).
   *
   * A decisão aqui não é desligar (`contentSecurityPolicy: false`), que perderia
   * o único caso em que ela ainda serve, nem manter a padrão. É trocá-la pela
   * política de duas linhas que descreve a verdade desta API:
   *
   *   default-src 'none'    → esta resposta não carrega nada. Se um dia ela
   *                           virar HTML sem querer — uma página de erro do
   *                           Express, um stack trace, um arquivo servido por
   *                           engano —, nenhum script dentro dela roda.
   *   frame-ancestors 'none' → ninguém põe esta resposta dentro de um iframe.
   *                           É a versão moderna do `X-Frame-Options` e é o que
   *                           a OWASP recomenda para API.
   *
   * `useDefaults: false` é o que faz valer só o que está escrito. Com ele
   * ligado, as diretivas padrão continuam presentes e a política volta a ter o
   * tamanho de antes.
   */
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
});

/**
 * ---------------------------------------------------------------------
 * O QUE O HELMET LIGA E QUASE NÃO FAZ NADA AQUI
 * ---------------------------------------------------------------------
 * `X-Frame-Options`, `X-DNS-Prefetch-Control`, `X-Download-Options`,
 * `X-Permitted-Cross-Domain-Policies`, `Origin-Agent-Cluster`,
 * `Cross-Origin-Opener-Policy` e `Cross-Origin-Embedder-Policy` são todos
 * instruções para o navegador **enquanto ele monta uma página**: iframe, janela,
 * prefetch de DNS, download, política de Flash. Um `curl`, um app móvel ou um
 * `fetch` que lê JSON não faz nada disso.
 *
 * Eles ficam ligados mesmo assim, e o motivo é honesto: custam alguns bytes por
 * resposta e cobrem o dia em que a mesma aplicação passar a servir um HTML —
 * uma página de documentação, um `/health` bonitinho, uma tela de callback de
 * OAuth. Desligar um por um economiza pouco e cria a chance de esquecer de
 * religar.
 *
 * Duas exceções que merecem decisão em vez de padrão:
 *
 * `Cross-Origin-Resource-Policy: same-origin` (padrão do helmet) instrui o
 * navegador a recusar a resposta quando ela é embutida por outra origem sem
 * CORS — um `<img src>` ou `<script src>` apontando para a sua API. Ele não
 * substitui o CORS nem interfere num `fetch` que negocia CORS direito. Se a API
 * serve arquivo público consumido por outro domínio (avatar, capa), este é o
 * cabeçalho que quebra isso, e o conserto é `crossOriginResourcePolicy:
 * { policy: 'cross-origin' }` naquela rota.
 *
 * `X-XSS-Protection: 0` — o helmet **desliga** o filtro de XSS antigo do
 * navegador, e isso é proposital. O filtro tinha bugs que criavam brecha onde
 * não havia. "Corrigir" para `1; mode=block` piora a segurança: é o falso amigo
 * clássico deste conjunto.
 *
 * E o que o helmet **remove**: `X-Powered-By: Express`. Não fecha porta nenhuma
 * — só para de entregar de graça qual stack responder no scanner do atacante.
 */
