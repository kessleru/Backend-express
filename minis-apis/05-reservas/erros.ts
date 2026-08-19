/**
 * O erro esperado (`AppError`) e o tratador central que dá formato único a toda
 * resposta de erro. Conceito do módulo 06 — a versão comentada linha a linha
 * está na mini 02; aqui fica só o que esta API decide diferente.
 */
import type { NextFunction, Request, Response } from 'express';

/** Erro criado de propósito: a mensagem pode ir para o cliente. */
export class AppError extends Error {
  readonly status: number;
  /** Lista de campos que falharam, quando o erro é de formato. */
  readonly detalhes?: unknown;

  constructor(mensagem: string, status = 400, detalhes?: unknown) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;

    // `exactOptionalPropertyTypes` no `tsconfig.json`: atribuir `undefined` a
    // propriedade opcional é erro de tipo. Daí o `if`.
    if (detalhes !== undefined) this.detalhes = detalhes;

    Error.captureStackTrace?.(this, AppError);
  }
}

// A escolha entre as duas recusas desta API cabe numa pergunta, e é ela — não a
// lista de casos — que serve em qualquer outro domínio:
//
//     dá para recusar olhando só o pedido e as regras fixas da casa, sem
//     consultar nada do que já está gravado?
//
//   SIM → 422. "das 14h às 13h", "cinco horas seguidas", "23h30 com o prédio
//   fechado". Nenhuma dessas depende de quem já reservou o quê: a resposta é a
//   mesma hoje, amanhã e em qualquer sala, e reenviar igual dá o mesmo erro. A
//   resposta leva a lista dos campos, porque quem preencheu precisa saber onde
//   corrigir.
//
//   NÃO → 409. A sobreposição é o caso: o pedido está impecável, e o que nega é
//   o estado da agenda. A MESMA requisição passa se alguém cancelar a reserva
//   que estava no caminho — por isso ela nunca cabe num schema, que só enxerga
//   o que chegou, e nunca o que já existe.

export const dadosInvalidos = (detalhes: unknown) =>
  new AppError('Dados inválidos', 422, detalhes);

export const conflito = (mensagem: string) => new AppError(mensagem, 409);

// "não existe" em vez de "não encontrada": a mesma fábrica atende `Sala` e
// `Reserva`, e concordância de gênero em texto montado sai errada em metade dos
// casos.
export const naoEncontrado = (recurso: string, id: number | string) =>
  new AppError(`${recurso} ${id} não existe`, 404);

/** Formato único de erro, igual para os cinco status. */
type RespostaErro = {
  erro: string;
  status: number;
  detalhes?: unknown;
};

/**
 * O 404 de rota inexistente. Em vez de responder por conta própria, lança para
 * o tratador — assim este 404 sai no mesmo formato de todos os outros erros.
 */
export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.path}`, 404));
}

/**
 * O tratador central. São os QUATRO parâmetros que fazem o Express reconhecer a
 * função como tratador de erro: apagar o `_next` não usado a transforma num
 * middleware comum, que nunca recebe erro nenhum — e aí quem responde é o
 * tratador padrão do Express, que devolve HTML com a stack trace inteira.
 */
export function tratarErro(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (erro instanceof AppError) {
    const corpo: RespostaErro = { erro: erro.message, status: erro.status };
    if (erro.detalhes !== undefined) corpo.detalhes = erro.detalhes;
    return res.status(erro.status).json(corpo);
  }

  // `express.json()` lança `SyntaxError` quando o corpo não é JSON válido. Sem
  // este bloco o cliente levaria 500 por um erro que é dele.
  if (erro instanceof SyntaxError && 'body' in erro) {
    return res.status(400).json({ erro: 'JSON inválido no corpo', status: 400 });
  }

  // Qualquer outra coisa é bug: o detalhe fica no log e o cliente recebe o
  // genérico — mensagem de bug costuma descrever estrutura interna.
  console.error('ERRO NÃO TRATADO:', erro);
  res.status(500).json({ erro: 'Erro interno do servidor', status: 500 });
}
