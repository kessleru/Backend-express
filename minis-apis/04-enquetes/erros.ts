/**
 * Erro esperado e o tratador central. Conceito principal: módulo 06.
 *
 * A divisão é entre erro que NÓS criamos — e cuja mensagem pode ir ao cliente —
 * e qualquer outra coisa, que é bug e vira 500 genérico. Mensagem de bug
 * descreve o banco ou a infraestrutura, e entregá-la é dar um mapa a quem
 * estiver sondando.
 */
import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  readonly status: number;
  readonly detalhes?: unknown;

  constructor(mensagem: string, status = 400, detalhes?: unknown) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    // `exactOptionalPropertyTypes` está ligado: atribuir `undefined` a uma
    // propriedade opcional é erro de tipo, daí o if.
    if (detalhes !== undefined) this.detalhes = detalhes;
  }
}

export const naoEncontrado = (mensagem: string) => new AppError(mensagem, 404);

/** 409: o corpo está perfeito; o estado atual dos dados é que não aceita. */
export const conflito = (mensagem: string) => new AppError(mensagem, 409);

/**
 * 422 e não 400: 400 é "não consegui entender a requisição" — JSON quebrado,
 * corpo ilegível. Aqui o servidor entendeu tudo, sabe quais campos vieram, e
 * recusa pelo conteúdo deles. Separar os dois deixa o cliente distinguir "meu
 * JSON está torto" de "meu formulário tem campo inválido" pelo status, sem ler
 * a mensagem.
 */
export const dadosInvalidos = (detalhes: unknown) =>
  new AppError('Dados inválidos', 422, detalhes);

export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.path}`, 404));
}

/**
 * São os QUATRO parâmetros que fazem o Express reconhecer isto como tratador de
 * erro. Remover o `_next` não usado transforma a função num middleware comum,
 * que nunca recebe erro nenhum — e as exceções voltam a cair no handler padrão
 * do Express, que responde HTML com a stack trace inteira.
 */
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

  // `express.json()` lança SyntaxError quando o corpo não é JSON válido. Sem
  // este bloco o cliente levaria 500 por um erro que é dele, e você caçaria um
  // bug que não existe.
  if (erro instanceof SyntaxError && 'body' in erro) {
    return res.status(400).json({ erro: 'JSON inválido no corpo', status: 400 });
  }

  console.error('ERRO NÃO TRATADO:', erro);
  res.status(500).json({ erro: 'Erro interno do servidor', status: 500 });
}
