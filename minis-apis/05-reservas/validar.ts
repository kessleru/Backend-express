/**
 * O middleware de validação — um só, parametrizado pelo alvo. Conceito do
 * módulo 07. Por que é um só em vez de `validarBody`/`validarParams`/
 * `validarQuery`: a mini 02 explica; o resumo é que três cópias significam três
 * lugares para aplicar a próxima correção, e a esquecida vira bug de uma rota.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { dadosInvalidos } from './erros.ts';

/** Onde, dentro da requisição, mora o dado a validar. */
type Alvo = 'body' | 'params' | 'query';

export function validar(schema: ZodType, alvo: Alvo = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    // `?? {}` no body: sem `Content-Type: application/json` o Express 5 deixa
    // `req.body` como `undefined`, e um `z.object()` recebendo `undefined`
    // responde "expected object, received undefined" — sem dizer qual campo
    // falta. Com `{}` o cliente recebe a lista dos obrigatórios.
    const entrada = alvo === 'body' ? (req.body ?? {}) : req[alvo];
    const resultado = schema.safeParse(entrada);

    if (!resultado.success) throw dadosInvalidos(formatarErros(resultado.error));

    // O dado validado vai para `res.locals`, nunca de volta para `req[alvo]`:
    // `req.query = ...` no Express 5 lança "Cannot set property query of
    // #<IncomingMessage> which has only a getter".
    const validados = (res.locals.validados ?? {}) as Record<string, unknown>;
    validados[alvo] = resultado.data;
    res.locals.validados = validados;

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
    throw new Error(`validados(): faltou validar('${alvo}') nesta rota`);
  }

  return dado as T;
}

/**
 * Traduz o erro do Zod para a lista `{ campo, mensagem, codigo }` — com o campo
 * marcado, o formulário aponta o input errado em vez de mostrar um alerta
 * genérico, e o Zod devolve todos os problemas de uma vez.
 */
function formatarErros(erro: ZodError) {
  return erro.issues.map((problema) => {
    // Campo desconhecido é o único problema sem campo: ele não está no schema,
    // então o `path` vem vazio e a resposta diria apenas "(raiz)".
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
