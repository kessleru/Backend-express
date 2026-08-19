/**
 * Erro esperado e o tratador central. Conceito principal: módulo 06.
 *
 * A divisão — erro que nós criamos vira resposta, qualquer outra coisa vira 500
 * genérico — é a mesma da mini 3. O que este arquivo tem de próprio está na
 * lista de fábricas abaixo, e principalmente no que **não** está nela.
 */
import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  readonly status: number;
  readonly detalhes?: unknown;

  constructor(mensagem: string, status = 400, detalhes?: unknown) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    if (detalhes !== undefined) this.detalhes = detalhes;
  }
}

/**
 * O 404 desta API é mais do que "não achei": é a resposta para **tudo** que não
 * é seu. Hábito de outra pessoa não recebe 403, recebe este 404 — para quem
 * perguntou, ele não existe mesmo.
 *
 * Não há fábrica de 403 neste arquivo, e a ausência é a decisão. A mini 6
 * (`minis-apis/06-compras/`) tem as duas porque lá as listas são
 * compartilhadas: quem já enxerga uma lista sabe que ela existe, e negar só a
 * permissão não conta nada de novo. Aqui nada é compartilhado, então qualquer
 * status diferente de 404 responderia uma pergunta que ninguém tinha direito de
 * fazer — "o hábito 7 existe?".
 */
export const naoEncontrado = (recurso: string, id: number | string) =>
  new AppError(`${recurso} ${id} não existe`, 404);

/** 409: o corpo está perfeito; o estado atual dos dados é que não aceita. */
export const conflito = (mensagem: string) => new AppError(mensagem, 409);

/** 422: o servidor entendeu a requisição e recusa pelo conteúdo dos campos. */
export const dadosInvalidos = (detalhes: unknown) =>
  new AppError('Dados inválidos', 422, detalhes);

/**
 * 401 — "não sei quem você é". Token ausente, adulterado ou vencido caem todos
 * aqui, e nunca em 403: 403 diria "sei quem você é e mesmo assim não pode", o
 * que faria o cliente tentar consertar a permissão quando o que ele precisa é
 * fazer login de novo.
 */
export const naoAutenticado = (mensagem: string) => new AppError(mensagem, 401);

export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.path}`, 404));
}

export function tratarErro(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (erro instanceof AppError) {
    const corpo: Record<string, unknown> = { erro: erro.message, status: erro.status };
    if (erro.detalhes !== undefined) corpo.detalhes = erro.detalhes;
    return res.status(erro.status).json(corpo);
  }

  if (erro instanceof SyntaxError && 'body' in erro) {
    return res.status(400).json({ erro: 'JSON inválido no corpo', status: 400 });
  }

  console.error('ERRO NÃO TRATADO:', erro);
  res.status(500).json({ erro: 'Erro interno do servidor', status: 500 });
}
