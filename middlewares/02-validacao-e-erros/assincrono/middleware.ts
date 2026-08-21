/**
 * O wrapper `asyncHandler` que está em todo tutorial — e que no Express 5 deste
 * repositório NÃO é mais necessário. Conceito principal: módulo 06.
 *
 * A pasta existe para você reconhecer o padrão quando o encontrar e saber que
 * pode apagá-lo, e para marcar o que continua não sendo automático. Leia o
 * README antes de copiar qualquer coisa daqui.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envolve um handler `async` e manda a rejeição para o `next`.
 *
 * `Promise.resolve(...)` e não `handler(...).catch(...)`: o handler pode ser
 * síncrono e devolver `undefined`, e `undefined.catch` é um TypeError dentro do
 * middleware — o wrapper que existe para não deixar erro escapar seria o autor
 * do erro. O `Promise.resolve` normaliza os dois casos.
 *
 * No Express 5 este `.catch(next)` é redundante: o próprio framework já faz
 * isso. Ele está aqui como referência de leitura, não de uso.
 */
export function assincrono(
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Isto sim continua sendo necessário: a ponte de volta para a requisição quando
 * o código roda FORA da pilha dela — dentro de `setTimeout`, de um
 * `emissor.on('error')`, de um callback de biblioteca antiga.
 *
 * O Express só encaminha o que ele consegue ver: o retorno do handler. Quando o
 * `setTimeout` dispara, o handler já retornou e a pilha em que o Express estava
 * esperando não existe mais — o `throw` de lá não tem para onde subir e vira
 * `uncaughtException`, que derruba o processo inteiro (não a requisição: o
 * processo). Guardar o `next` e chamá-lo no `catch` é o que costura os dois
 * lados de novo.
 */
export function encaminharErro(next: NextFunction, tarefa: () => void) {
  try {
    tarefa();
  } catch (erro) {
    next(erro);
  }
}
