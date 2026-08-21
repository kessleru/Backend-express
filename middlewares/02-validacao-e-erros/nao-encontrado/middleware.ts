/**
 * O 404 que fecha a pilha: entra depois de todas as rotas, antes do tratador de
 * erro. Conceito principal: módulo 06.
 *
 * Copiável: a classe está aqui. Se o seu projeto já tem `AppError`, troque por
 * `next(new AppError(mensagem, 404))` e apague a classe.
 */
import type { NextFunction, Request, Response } from 'express';

export class ErroDeRotaInexistente extends Error {
  readonly status = 404;
  /** Mesma marca do resto do grupo: erro de propósito, não bug. */
  readonly esperado = true;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeRotaInexistente';
  }
}

export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction) {
  // `req.path` e não `req.originalUrl`: o `originalUrl` carrega a query string
  // junto, e a query string carrega o que o cliente puser nela — inclusive
  // `?token=...`. Devolver isso no corpo e escrevê-lo no log é como um segredo
  // acaba dentro do agregador de logs, onde meio time tem acesso.
  const mensagem = `Rota ${req.method} ${req.path} não existe`;

  // `next(erro)` e não `res.status(404).json(...)`: respondendo aqui, o 404 de
  // rota inexistente sairia num formato só dele, diferente dos outros erros da
  // API. Empurrando para o tratador central, ele sai com o mesmo `{ erro,
  // status }` de todo o resto — um formato só para o cliente tratar.
  next(new ErroDeRotaInexistente(mensagem));
}
