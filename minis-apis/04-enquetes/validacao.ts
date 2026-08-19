/**
 * O contrato HTTP escrito à mão. Substitui o Zod (módulo 07) de propósito.
 *
 * Uma biblioteca de schema faz três coisas: percorre o valor conferindo tipo e
 * regra, JUNTA todos os problemas num relatório só, e ainda deduz o tipo
 * TypeScript do resultado. Este arquivo faz as duas primeiras — a terceira não
 * dá para ter sem a biblioteca, e é por isso que cada função aqui declara na
 * assinatura o tipo que devolve. Escrever isto uma vez é o que faz entender o
 * que a biblioteca resolve; manter isto num sistema de verdade é o que faz
 * querer a biblioteca de volta.
 *
 * Nada aqui é regra de negócio: o validador decide se o dado tem FORMATO
 * válido. Se a enquete existe, se ela ainda aceita voto e se o eleitor já votou
 * dependem do que está gravado, e isso é trabalho do serviço.
 */
import { dadosInvalidos } from './erros.ts';
import type { EstadoEnquete, FiltroEnquetes, NovaEnquete } from './dominio.ts';

type Problema = { campo: string; mensagem: string };

/**
 * O coletor é o que separa validar de conferir.
 *
 * Um `if` que devolve na primeira falha entrega um erro por requisição: quem
 * mandou o formulário com três campos errados descobre um, corrige, e leva a
 * mesma recusa de novo — três viagens para um problema só. Por isso os métodos
 * abaixo ANOTAM e seguem em frente, e só `fechar()` interrompe.
 *
 * O preço disso é o valor de descarte: um campo inválido precisa devolver
 * alguma coisa para o código continuar até o fim da conferência. Esse `''` ou
 * `0` nunca escapa, porque `fechar()` lança antes de qualquer uso — mas é o
 * tipo de acordo que só se sustenta enquanto todo leitor terminar com
 * `fechar()`. A biblioteca de schema não tem esse acordo para quebrar.
 */
export class Coletor {
  private readonly problemas: Problema[] = [];

  anotar(campo: string, mensagem: string): void {
    this.problemas.push({ campo, mensagem });
  }

  /**
   * O formato dos detalhes importa mais do que parece: com `campo` e
   * `mensagem`, a tela sabe qual input pintar de vermelho. Uma string única
   * obrigaria a mostrar um alerta genérico e o usuário a caçar o próprio erro.
   */
  fechar(): void {
    if (this.problemas.length > 0) throw dadosInvalidos(this.problemas);
  }

  /** Texto de corpo JSON: precisa ser string de verdade, e vem sem espaço nas pontas. */
  texto(valor: unknown, campo: string, regras: { min: number; max: number }): string {
    if (typeof valor !== 'string') {
      this.anotar(campo, `\`${campo}\` é obrigatório e precisa ser texto`);
      return '';
    }
    const limpo = valor.trim();
    if (limpo.length < regras.min) {
      this.anotar(campo, `\`${campo}\` precisa de ${regras.min}+ caracteres`);
      return '';
    }
    if (limpo.length > regras.max) {
      this.anotar(campo, `\`${campo}\` passa de ${regras.max} caracteres`);
      return '';
    }
    return limpo;
  }

  /**
   * Inteiro vindo de corpo JSON — onde número é número de verdade.
   *
   * Recusar `"3"` aqui é de propósito: JSON tem tipo numérico, então mandar
   * texto no lugar denuncia um cliente montando o corpo por concatenação. Na
   * query string a história é outra, e é o método logo abaixo.
   */
  inteiro(valor: unknown, campo: string): number {
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
      this.anotar(campo, `\`${campo}\` precisa ser um inteiro positivo`);
      return 0;
    }
    return valor;
  }

  /**
   * Inteiro vindo da query string ou da URL, onde **tudo é texto**. `?limite=20`
   * chega como `"20"`, e é por isso que a conversão tem que acontecer em algum
   * lugar.
   *
   * As duas armadilhas estão nas duas primeiras checagens:
   *
   * - `?pagina=1&pagina=2` não chega como texto, chega como `['1','2']` — o
   *   Express junta as repetições num array. Um `Number()` direto nisso dá
   *   `NaN` e o erro sairia como "não é inteiro", que não ajuda ninguém.
   * - `Number('')` é **`0`**, não `NaN`. Sem a linha da string vazia, um
   *   `?limite=` esquecido no fim da URL viraria limite zero e a listagem
   *   responderia sempre vazia, sem erro nenhum. É o falso amigo desta camada,
   *   e ele existe igual com `z.coerce.number()`.
   */
  inteiroDeTexto(
    valor: unknown,
    campo: string,
    regras: { min: number; max: number; padrao?: number },
  ): number {
    const descarte = regras.padrao ?? 0;

    if (valor === undefined) {
      if (regras.padrao !== undefined) return regras.padrao;
      this.anotar(campo, `\`${campo}\` é obrigatório`);
      return descarte;
    }
    if (typeof valor !== 'string') {
      this.anotar(campo, `\`${campo}\` foi enviado mais de uma vez`);
      return descarte;
    }
    if (valor.trim() === '') {
      this.anotar(campo, `\`${campo}\` veio vazio`);
      return descarte;
    }

    const numero = Number(valor);
    if (!Number.isInteger(numero)) {
      this.anotar(campo, `\`${campo}\` precisa ser um número inteiro`);
      return descarte;
    }
    if (numero < regras.min || numero > regras.max) {
      this.anotar(
        campo,
        `\`${campo}\` precisa estar entre ${regras.min} e ${regras.max}`,
      );
      return descarte;
    }
    return numero;
  }

  /** Um valor de uma lista fechada — o `?estado=` desta API. */
  palavra<T extends string>(
    valor: unknown,
    campo: string,
    permitidos: readonly T[],
    padrao: T,
  ): T {
    if (valor === undefined) return padrao;
    if (typeof valor !== 'string' || !permitidos.includes(valor as T)) {
      this.anotar(campo, `\`${campo}\` aceita: ${permitidos.join(', ')}`);
      return padrao;
    }
    return valor as T;
  }

  /** Lista de textos: a checagem é do array e de cada item, com o índice na mensagem. */
  listaDeTextos(
    valor: unknown,
    campo: string,
    regras: { min: number; max: number; itemMax: number },
  ): string[] {
    if (!Array.isArray(valor)) {
      this.anotar(campo, `\`${campo}\` precisa ser uma lista`);
      return [];
    }
    if (valor.length < regras.min || valor.length > regras.max) {
      this.anotar(
        campo,
        `\`${campo}\` precisa ter de ${regras.min} a ${regras.max} itens`,
      );
      return [];
    }

    const itens: string[] = [];
    valor.forEach((item, indice) => {
      // O índice entra no nome do campo (`opcoes[2]`) porque a tela precisa
      // saber QUAL linha da lista pintar de vermelho. "opcoes é inválido" faz o
      // usuário reler as oito.
      const texto = this.texto(item, `${campo}[${indice}]`, {
        min: 1,
        max: regras.itemMax,
      });
      if (texto !== '') itens.push(texto);
    });
    return itens;
  }
}

/**
 * Falha na hora, sem coletar: se o corpo não é um objeto, todo campo seguinte
 * seria anotado como ausente e o cliente receberia uma lista de sintomas no
 * lugar da causa. Array entra na recusa porque `typeof [] === 'object'` — em
 * JavaScript, array é objeto, e sem a checagem `["a"]` passaria como corpo
 * válido de campo nenhum.
 */
function comoObjeto(valor: unknown): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw dadosInvalidos([
      { campo: '(corpo)', mensagem: 'o corpo precisa ser um objeto JSON' },
    ]);
  }
  return valor as Record<string, unknown>;
}

/**
 * Recusa campo desconhecido em vez de descartá-lo em silêncio. Quem escreveu
 * `pergunta` como `perguntas` recebe o nome errado de volta, em vez de "campo
 * obrigatório ausente" sem entender por quê — e quem mandou `encerradaEm` de
 * propósito descobre que a API não aceita, em vez de achar que aceitou.
 */
function apenasCampos(
  coletor: Coletor,
  objeto: Record<string, unknown>,
  permitidos: readonly string[],
): void {
  for (const chave of Object.keys(objeto)) {
    if (!permitidos.includes(chave)) {
      coletor.anotar(chave, `campo desconhecido \`${chave}\``);
    }
  }
}

export function lerNovaEnquete(corpo: unknown): NovaEnquete {
  const objeto = comoObjeto(corpo);
  const coletor = new Coletor();
  apenasCampos(coletor, objeto, ['pergunta', 'opcoes']);

  const pergunta = coletor.texto(objeto.pergunta, 'pergunta', { min: 5, max: 200 });
  // De 2 a 8: uma opção só não é escolha, é anúncio; acima de oito a cédula
  // deixa de caber numa tela e o eleitor decide pelas três primeiras.
  const opcoes = coletor.listaDeTextos(objeto.opcoes, 'opcoes', {
    min: 2,
    max: 8,
    itemMax: 80,
  });

  // Opção repetida é problema de FORMATO, não de estado: dá para ver olhando só
  // o corpo, sem consultar nada. Por isso a checagem mora aqui e sai como 422 —
  // e não no serviço, junto das regras que precisam do banco.
  const vistas = new Set<string>();
  opcoes.forEach((texto, indice) => {
    const chave = texto.toLowerCase();
    if (vistas.has(chave)) {
      coletor.anotar(`opcoes[${indice}]`, `a opção "${texto}" está repetida`);
    }
    vistas.add(chave);
  });

  coletor.fechar();
  return { pergunta, opcoes };
}

export function lerVoto(corpo: unknown): { opcaoId: number } {
  const objeto = comoObjeto(corpo);
  const coletor = new Coletor();
  apenasCampos(coletor, objeto, ['opcaoId']);

  const opcaoId = coletor.inteiro(objeto.opcaoId, 'opcaoId');
  coletor.fechar();
  return { opcaoId };
}

export function lerId(valor: unknown, campo = 'id'): number {
  const coletor = new Coletor();
  const id = coletor.inteiroDeTexto(valor, campo, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  coletor.fechar();
  return id;
}

const ESTADOS: readonly EstadoEnquete[] = ['todas', 'abertas', 'encerradas'];

export function lerFiltroEnquetes(query: Record<string, unknown>): FiltroEnquetes {
  const coletor = new Coletor();

  const estado = coletor.palavra(query.estado, 'estado', ESTADOS, 'todas');
  const pagina = coletor.inteiroDeTexto(query.pagina, 'pagina', {
    min: 1,
    max: 1_000_000,
    padrao: 1,
  });
  // 20 por página cabe numa tela sem rolagem infinita. O teto de 100 impede
  // `?limite=999999`, que devolveria a tabela inteira e anularia a paginação.
  const limite = coletor.inteiroDeTexto(query.limite, 'limite', {
    min: 1,
    max: 100,
    padrao: 20,
  });

  coletor.fechar();
  return { estado, pagina, limite };
}

/**
 * A identidade do eleitor, normalizada.
 *
 * O `toLowerCase()` não é estética: o índice único do banco compara texto byte
 * a byte, então `Ana@exemplo.com` e `ana@exemplo.com` seriam dois eleitores
 * diferentes e a mesma pessoa votaria duas vezes trocando uma letra de caixa. A
 * garantia de "um voto por pessoa" só vale sobre um identificador normalizado
 * no mesmo lugar em toda escrita e toda leitura — por isso esta função é a
 * única porta de entrada do campo.
 */
export function lerEleitor(cabecalho: string | undefined): string {
  const coletor = new Coletor();
  const eleitor = coletor.texto(cabecalho, 'X-Eleitor', { min: 3, max: 80 });
  coletor.fechar();
  return eleitor.toLowerCase();
}
