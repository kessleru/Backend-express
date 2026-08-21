/**
 * Valida `body`, `params` ou `query` contra um schema Zod e responde 422 com a
 * lista de campos que falharam. Conceito principal: módulo 07.
 *
 * É um middleware só, parametrizado pelo alvo — a fábrica do módulo 05 aplicada.
 * Copiável: não importa nada de outra pasta do catálogo. O `ErroDeValidacao`
 * está definido aqui; se o seu projeto já tem um `AppError`, troque a classe
 * por ele e mantenha `status`, `esperado` e `detalhes`.
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodType } from 'zod';

/** Onde, dentro da requisição, mora o dado a validar. */
type Alvo = 'body' | 'params' | 'query';

/** Um problema por campo: com `campo` preenchido, a tela pinta o input certo. */
export type ProblemaDeCampo = {
  campo: string;
  mensagem: string;
  codigo: string;
};

/**
 * 422 e não 400: o 400 diz "não entendi o que você mandou" (JSON quebrado, por
 * exemplo) e o 422 diz "entendi, está bem formado, e não passa nas regras". Um
 * cliente que só vê 400 não sabe se deve corrigir o campo ou o serializador.
 */
export class ErroDeValidacao extends Error {
  readonly status = 422;
  /**
   * A marca que separa erro que você criou de propósito de bug de programação.
   * O tratador central usa esta flag, e não `instanceof`, porque cada pasta
   * deste catálogo define a própria classe — `instanceof` entre duas cópias da
   * mesma classe é `false`, e o 422 viraria 500 sem ninguém notar.
   */
  readonly esperado = true;
  readonly detalhes: ProblemaDeCampo[];

  constructor(detalhes: ProblemaDeCampo[]) {
    super('Dados inválidos');
    this.name = 'ErroDeValidacao';
    this.detalhes = detalhes;
  }
}

export function validar(schema: ZodType, alvo: Alvo = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    // `?? {}` só no body: sem `Content-Type: application/json` o Express 5 deixa
    // `req.body` como `undefined`, e um `z.object()` recebendo `undefined`
    // responde "expected object, received undefined" — sem dizer qual campo
    // falta. Com `{}` o cliente recebe a lista dos obrigatórios.
    const entrada = alvo === 'body' ? (req.body ?? {}) : req[alvo];

    // `safeParse` e não `parse`: o `parse` lança `ZodError` cru, e o `ZodError`
    // que chega ao tratador central sem tradução vira 500 ou uma resposta em
    // inglês com o formato interno do Zod dentro.
    const resultado = schema.safeParse(entrada);

    if (!resultado.success) {
      next(new ErroDeValidacao(traduzir(resultado.error)));
      return;
    }

    // O dado validado vai para `res.locals`, nunca de volta para `req[alvo]`:
    // no Express 5 `req.query` é getter, e `req.query = ...` lança "Cannot set
    // property query of #<IncomingMessage> which has only a getter". Guardar
    // aqui funciona para os três alvos e preserva o original para auditoria.
    const guardados = (res.locals.validados ?? {}) as Record<string, unknown>;
    guardados[alvo] = resultado.data;
    res.locals.validados = guardados;

    next();
  };
}

/**
 * Lê o dado já validado com o tipo certo, sem `as`. O schema volta como
 * parâmetro só para o TypeScript inferir o retorno; em tempo de execução ele
 * não é usado, porque a validação já aconteceu no middleware.
 */
export function validados<T>(res: Response, _schema: ZodType<T>, alvo: Alvo = 'body'): T {
  const guardados = res.locals.validados as Record<string, unknown> | undefined;
  const dado = guardados?.[alvo];

  // Cair aqui significa que a rota esqueceu o `validar(schema, alvo)`. Falhar
  // alto é melhor que devolver `undefined` e virar um bug duas camadas adiante.
  if (dado === undefined) {
    throw new Error(`validados(): faltou validar(schema, '${alvo}') nesta rota`);
  }

  return dado as T;
}

/** Traduz o erro do Zod para a lista `{ campo, mensagem, codigo }`. */
function traduzir(erro: ZodError): ProblemaDeCampo[] {
  return erro.issues.map((problema) => {
    // O falso amigo do `.strict()`: a chave desconhecida é reprovada no OBJETO,
    // não num campo dele. O `path` do problema vem VAZIO — `[]` — e o
    // `path.join('.') || '(raiz)'` que funciona para todo o resto responderia
    // `campo: "(raiz)"`, escondendo justamente o nome que o cliente precisa
    // corrigir. As chaves recusadas estão em `problema.keys`.
    if (problema.code === 'unrecognized_keys') {
      return {
        campo: problema.keys.join(', '),
        mensagem: 'campo desconhecido: esta rota não aceita este campo',
        codigo: problema.code,
      };
    }

    return {
      campo: problema.path.join('.') || '(raiz)',
      mensagem: problema.message,
      codigo: problema.code,
    };
  });
}
