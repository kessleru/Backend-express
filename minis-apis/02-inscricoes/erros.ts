/**
 * O erro esperado (`AppError`) e o tratador central que dá formato único a toda
 * resposta de erro desta API. Conceito do módulo 06.
 */
import type { NextFunction, Request, Response } from 'express';

/**
 * Erro que NÓS criamos de propósito — logo, a mensagem pode ir para o cliente.
 * Qualquer outra coisa que chegue no tratador é bug, e a mensagem de bug fica no
 * servidor: ela costuma descrever infraestrutura ou estrutura de dado interna.
 */
export class AppError extends Error {
  readonly status: number;
  /** Lista de campos que falharam, quando o erro é de formato. */
  readonly detalhes?: unknown;

  constructor(mensagem: string, status = 400, detalhes?: unknown) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;

    // `exactOptionalPropertyTypes` está ligado no `tsconfig.json`: atribuir
    // `undefined` a uma propriedade opcional é erro de tipo. Daí o `if`.
    if (detalhes !== undefined) this.detalhes = detalhes;

    // Sem isto a stack trace começa dentro deste construtor em vez de na linha
    // que lançou o erro — e é a linha que lançou que você quer ver no log.
    Error.captureStackTrace?.(this, AppError);
  }
}

// As duas famílias de recusa desta API moram nestas duas fábricas, e a escolha
// entre elas é o conceito central da mini API:
//
//   422 é FORMATO. "carlos@" não é e-mail, o nome veio com uma letra só. O dado
//   chegou malformado e nada no servidor muda isso — reenviar igual dá o mesmo
//   erro. A resposta leva a lista dos campos que falharam, porque quem preencheu
//   precisa saber onde corrigir, e não "algo deu errado".
//
//   409 é ESTADO. O dado está perfeito; o mundo é que não aceita agora. As vagas
//   acabaram, aquele e-mail já está inscrito. A MESMA requisição passaria se
//   alguém cancelasse uma inscrição um segundo depois — por isso não é 422, e
//   por isso essa checagem nunca cabe num schema: ela depende do que já está
//   gravado, não do que chegou.

export const dadosInvalidos = (detalhes: unknown) =>
  new AppError('Dados inválidos', 422, detalhes);

export const conflito = (mensagem: string) => new AppError(mensagem, 409);

// "não existe" em vez de "não encontrado/a": a mesma fábrica atende `Evento` e
// `Inscrição`, e concordância de gênero em mensagem montada com template vira
// texto errado em metade dos casos.
export const naoEncontrado = (recurso: string, id: number | string) =>
  new AppError(`${recurso} ${id} não existe`, 404);

/** Formato único de erro. Documentado no README e igual para os cinco status. */
type RespostaErro = {
  erro: string;
  status: number;
  detalhes?: unknown;
};

/**
 * O 404 de rota inexistente. Registrado DEPOIS de todas as rotas e ANTES do
 * tratador: em vez de responder por conta própria, ele lança um `AppError` para
 * o tratador, e assim esse 404 sai no mesmo formato de todos os outros erros.
 */
export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.path}`, 404));
}

/**
 * O tratador central. São os QUATRO parâmetros que fazem o Express reconhecer a
 * função como tratador de erro; apagar o `_next` não usado a transforma num
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

  // O `express.json()` lança `SyntaxError` quando o corpo não é JSON válido —
  // uma vírgula sobrando, por exemplo. Sem este bloco o cliente levaria 500 por
  // um erro que é dele, e você iria caçar um bug que não existe.
  if (erro instanceof SyntaxError && 'body' in erro) {
    return res.status(400).json({ erro: 'JSON inválido no corpo', status: 400 });
  }

  // Qualquer outra coisa é bug: o detalhe fica no log do servidor e o cliente
  // recebe só o genérico.
  console.error('ERRO NÃO TRATADO:', erro);
  res.status(500).json({ erro: 'Erro interno do servidor', status: 500 });
}
