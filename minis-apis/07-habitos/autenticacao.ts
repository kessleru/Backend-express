/**
 * Senha, token e o middleware que resolve "quem está pedindo". Conceito
 * principal: módulo 11.
 *
 * O porquê do argon2 (hash lento, sal por senha embutido no resultado) e o do
 * JWT (payload legível, assinatura que só o servidor produz) estão no módulo 11
 * e na mini 6. Aqui só comentamos o que **esta** mini decide diferente.
 */
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { naoAutenticado } from './erros.ts';

/**
 * O segredo vem do ambiente; o valor embutido existe para a mini rodar sem
 * setup nenhum. Em produção ele é falha grave, e não por ser fraco: ele está
 * **publicado neste repositório**. Quem o lê assina um token com qualquer
 * `sub`, e o servidor aceita — sem senha, sem cadastro, sem nada a quebrar. Um
 * serviço de verdade lê `JWT_SECRET` e se recusa a subir sem ele.
 */
const SEGREDO =
  process.env.JWT_SECRET ?? 'segredo-de-desenvolvimento-nao-use-em-producao';

/**
 * 2 horas, e não os 15 minutos do módulo 11: lá o access token curto é seguro
 * porque existe um refresh token para renová-lo em silêncio. Esta mini não tem
 * refresh, então 15 minutos significariam login de novo no meio da tarde. O
 * preço declarado: um token roubado vale por até 2 horas e **não há como
 * cancelá-lo** — a assinatura é conferida sozinha, sem consultar lugar nenhum
 * onde riscar o nome dele.
 */
const VALIDADE = '2h';

export const gerarHash = (senha: string): Promise<string> =>
  argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

export const conferirSenha = (hash: string, senha: string): Promise<boolean> =>
  argon2.verify(hash, senha);

export function emitirToken(usuarioId: number): string {
  // Só o id entra na carga. O e-mail ficaria legível para qualquer um que
  // recebesse o token (módulo 11), e ele não é necessário para autorizar nada.
  return jwt.sign({}, SEGREDO, { subject: String(usuarioId), expiresIn: VALIDADE });
}

/** Chave usada em `res.locals` — uma constante para o nome não divergir. */
const CHAVE_USUARIO = 'usuarioId';

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const [esquema, token] = (req.header('Authorization') ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    throw naoAutenticado('Envie o token em `Authorization: Bearer <token>`');
  }

  let sub: string | undefined;
  try {
    // `verify`, nunca `decode`: o `decode` lê a carga sem conferir a assinatura,
    // e aí qualquer um monta um token com o `sub` que quiser e vira dono dos
    // hábitos alheios. Os dois devolvem o mesmo objeto quando o token é
    // legítimo, e é por isso que a troca passa despercebida em teste manual.
    const payload = jwt.verify(token, SEGREDO);
    sub = typeof payload === 'string' ? undefined : payload.sub;
  } catch {
    // Assinatura inválida e token vencido caem no mesmo 401 com a mesma frase:
    // detalhar qual dos dois foi só ajuda quem está tentando forjar.
    throw naoAutenticado('Token inválido ou expirado');
  }

  const usuarioId = Number(sub);
  if (!Number.isInteger(usuarioId)) throw naoAutenticado('Token sem usuário');

  res.locals[CHAVE_USUARIO] = usuarioId;
  next();
}

/**
 * Lê o id que o `autenticar` guardou. Existe para o resto do código nunca tocar
 * em `res.locals` direto: ali dentro tudo é `any`, e um `res.locals.usuarioID`
 * escrito com a caixa errada viraria `undefined` silencioso — que numa consulta
 * `WHERE usuario_id = ?` não dá erro, dá lista vazia.
 */
export function usuarioAutenticado(res: Response): number {
  const usuarioId: unknown = res.locals[CHAVE_USUARIO];
  if (typeof usuarioId !== 'number') {
    throw naoAutenticado('Rota protegida sem o middleware de autenticação');
  }
  return usuarioId;
}
