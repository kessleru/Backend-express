/**
 * O dicionário `código → URL` que é o encurtador inteiro, e a geração do código.
 *
 * Conceito principal: nenhum — este arquivo é JavaScript comum. Ele existe
 * separado do `servidor.ts` para que fique óbvio o que é a regra do encurtador
 * e o que é HTTP.
 */
import { randomInt } from 'node:crypto';

export type Link = {
  codigo: string;
  url: string;
  cliques: number;
  criadoEm: string;
};

/**
 * `Map` e não objeto literal: a chave aqui é texto que veio do cliente, e um
 * objeto literal herda `constructor`, `toString` e companhia — `{}['toString']`
 * devolve uma função, então um `POST /links` com `codigo: "toString"` acharia
 * que o código já existe. O `Map` não tem chave nenhuma além das que você põe.
 */
export const links = new Map<string, Link>();

/**
 * Alfabeto sem os pares que se confundem quando alguém lê o link em voz alta ou
 * copia de um cartaz: `0`/`O` e `1`/`l`/`I` saíram, os dois lados do par. Sobram
 * 57 caracteres — o preço de perder 5 é uma reclamação a menos por link errado.
 */
const ALFABETO = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 6 caracteres dão 57^6 = 34.296.447.249 combinações. Com 5 dão 601 milhões, o
 * que já parece muito — mas colisão não depende de quantos códigos cabem, e sim
 * de quantos já existem quando você sorteia o próximo. 6 é o menor tamanho que
 * mantém a chance de colisão irrelevante num acervo de milhões de links.
 */
export const TAMANHO_CODIGO = 6;

/**
 * `randomInt` do `node:crypto`, e não `Math.random()`: o gerador do
 * `Math.random()` é previsível a partir de saídas anteriores, então quem criasse
 * alguns links conseguiria calcular os códigos sorteados para os outros — e
 * código sorteado é a única coisa que separa um link do resto do mundo.
 */
export function gerarCodigo(): string {
  // O sorteio pode cair num código já usado (é a **colisão**). Em vez de
  // confiar na sorte, sorteia de novo — e desiste depois de 5 tentativas para
  // não virar laço infinito no dia em que o acervo estiver cheio de verdade.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++) {
      codigo += ALFABETO.charAt(randomInt(ALFABETO.length));
    }
    if (!links.has(codigo)) return codigo;
  }
  throw new Error('Não foi possível gerar um código livre em 5 tentativas');
}
