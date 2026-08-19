/**
 * O middleware de validação — um só, parametrizado pelo alvo. Conceito do
 * módulo 07.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { dadosInvalidos } from './erros.ts';

/** Onde, dentro da requisição, mora o dado a validar. */
type Alvo = 'body' | 'params' | 'query';

/**
 * Um middleware, três alvos.
 *
 * A alternativa óbvia é `validarBody`, `validarParams` e `validarQuery` — três
 * funções com o mesmo corpo e uma linha diferente. O custo não é digitar três
 * vezes: é que a próxima correção (formato do erro, tratamento de body vazio)
 * precisa ser aplicada nas três, e a que ficar para trás vira o bug que só
 * aparece numa rota. O alvo é dado, não código: então ele é parâmetro.
 */
export function validar(schema: ZodType, alvo: Alvo = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    // `?? {}` no body: sem `Content-Type: application/json` o Express 5 deixa
    // `req.body` como `undefined`, e um `z.object()` recebendo `undefined`
    // responde "expected object, received undefined" — mensagem que não diz ao
    // cliente qual campo falta. Com `{}` ele recebe a lista de obrigatórios.
    const entrada = alvo === 'body' ? (req.body ?? {}) : req[alvo];
    const resultado = schema.safeParse(entrada);

    if (!resultado.success) throw dadosInvalidos(formatarErros(resultado.error));

    // O dado validado vai para `res.locals`, e não de volta para `req[alvo]`.
    //
    // `req.query = resultado.data` é o que quase todo tutorial faz e o que
    // explode no Express 5:
    //   TypeError: Cannot set property query of #<IncomingMessage> which has
    //              only a getter
    // O `req.query` virou getter com parse preguiçoso. `res.locals` funciona
    // para os três alvos e ainda deixa o dado original intacto.
    const validados = (res.locals.validados ?? {}) as Record<string, unknown>;
    validados[alvo] = resultado.data;
    res.locals.validados = validados;

    next();
  };
}

/**
 * Lê o dado já validado com o tipo certo, sem `as`. O schema é passado de novo
 * só para o TypeScript inferir o retorno — em tempo de execução ele não é usado,
 * a validação já aconteceu no middleware.
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
 * Traduz o erro do Zod para a lista `{ campo, mensagem, codigo }`.
 *
 * O formato importa mais do que parece: uma string única ("dados inválidos")
 * obriga a tela a mostrar um alerta genérico e a pessoa a caçar o próprio erro.
 * Com o campo, o formulário marca o input errado. E o Zod devolve TODOS os
 * problemas de uma vez, não só o primeiro — quem preencheu corrige tudo numa
 * passada em vez de descobrir um erro novo a cada envio.
 */
function formatarErros(erro: ZodError) {
  return erro.issues.map((problema) => {
    // Campo desconhecido é o único problema que não tem campo: ele não está no
    // schema, então o `path` do Zod vem vazio. Sem este caso especial, a
    // resposta diria apenas "(raiz)" e o cliente não saberia o que sobrou.
    if (problema.code === 'unrecognized_keys') {
      return {
        campo: problema.keys.join(', '),
        mensagem: 'campo desconhecido: esta rota não aceita este campo',
        codigo: problema.code,
      };
    }

    return {
      // `path` é array porque o erro pode ser aninhado: ['contato','email'].
      campo: problema.path.join('.') || '(raiz)',
      mensagem: problema.message,
      codigo: problema.code,
    };
  });
}
