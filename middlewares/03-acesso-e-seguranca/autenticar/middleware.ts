/**
 * autenticar — lê `Authorization: Bearer <token>`, confere a assinatura e deixa
 * em `req.usuario` quem está falando. Conceito principal: módulo 11.
 *
 * Copiável: este arquivo não importa nada de outra pasta do catálogo. Ele
 * responde o 401 direto com `res.status().json()`; num projeto que já tem
 * tratador central (módulo 06), troque cada `recusar(...)` por
 * `next(new AppError(mensagem, 401))` e o formato do erro passa a ser um só.
 */
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

/** Os papéis do domínio da demo. Trocar por `string` reabre o erro de digitação. */
export type Papel = 'leitor' | 'editor' | 'admin';

export type UsuarioAutenticado = {
  /** `sub` do JWT. String por definição da RFC 7519, mesmo quando o id é numérico. */
  id: string;
  papel: Papel;
};

/**
 * ---------------------------------------------------------------------
 * O PEDAÇO QUE TODO MUNDO COPIA ERRADO
 * ---------------------------------------------------------------------
 * `req.usuario` não existe no Express: é campo nosso, pendurado num objeto que
 * não é nosso. Para o TypeScript aceitá-lo sem `any`, o tipo `Request` precisa
 * ser estendido — e é aqui que os tutoriais erram de duas formas.
 *
 * A primeira é `(req as any).usuario`. Compila, e desliga a checagem justamente
 * na linha em que ela protegeria: `req.usuario.paple` passa batido e vira
 * `undefined` em produção, sem erro de compilação e sem erro em tempo de
 * execução — só uma comparação que dá falso e uma rota que nega todo mundo.
 *
 * A segunda é o bloco mais colado da internet:
 *
 *   declare global { namespace Express { interface Request { user: any } } }  // ❌
 *
 * Ele está barrado aqui por dois motivos independentes: `namespace` é proibido
 * pelo `erasableSyntaxOnly` (o Node apaga tipos, não transforma código) e o
 * `any` lá dentro anula o trabalho todo.
 *
 * O que funciona é **augmentação de módulo**: reabrir a interface `Request` no
 * pacote onde ela de fato mora. O `@types/express` declara `Request` em
 * `express-serve-static-core` e apenas a reexporta — augmentar `'express'`
 * compila em alguns projetos e não pega em outros, conforme o pacote foi
 * resolvido. Augmentar a origem sempre pega.
 *
 * Duas condições que fazem isto falhar em silêncio ao ser copiado para outro
 * projeto: o arquivo precisa ser um módulo (ter `import`/`export` — sem isso o
 * `declare module` vira declaração de um módulo novo, não augmentação) e
 * precisa entrar no programa do `tsc`, o que aqui acontece porque o
 * `tsconfig.middlewares.json` inclui a pasta inteira.
 *
 * O campo é **opcional** de propósito: numa rota pública o `autenticar` não
 * rodou, e `req.usuario` é mesmo `undefined`. Declarar obrigatório mentiria para
 * o compilador e devolveria o `undefined` sem checagem que o `any` já dava.
 */
declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}

/**
 * O segredo vem do ambiente. O valor embutido existe para a demo subir com um
 * `node servidor.ts` e nada mais — e em produção ele é falha grave, não por ser
 * curto, mas por estar **publicado**: quem lê este arquivo assina um token com
 * `papel: admin` e o servidor aceita, sem senha e sem conta. Um serviço de
 * verdade lê `JWT_SECRET` e se recusa a subir sem ele:
 *
 *   const SEGREDO = process.env.JWT_SECRET;
 *   if (!SEGREDO) throw new Error('JWT_SECRET ausente');
 */
const SEGREDO =
  process.env.JWT_SECRET ?? 'segredo-de-desenvolvimento-nao-use-em-producao';

/**
 * 15 minutos é o número do módulo 11, e ele só é aceitável junto de um refresh
 * token que renove em silêncio. Sem refresh, isto significa login de novo no
 * meio da tarde — e aí o número sobe, com o custo declarado: token roubado vale
 * pelo prazo inteiro e não há onde riscar o nome dele, porque a assinatura é
 * conferida sozinha, sem consultar lugar nenhum.
 */
const VALIDADE = '15m';

/**
 * Existe para a demo ter o que colocar no `curl`. Só o mínimo para autorizar
 * entra na carga: o payload de um JWT é base64, não é segredo (módulo 11), e
 * e-mail ou CPF ali ficam legíveis para quem interceptar o token.
 */
export function emitirToken(usuario: UsuarioAutenticado): string {
  return jwt.sign({ papel: usuario.papel }, SEGREDO, {
    subject: usuario.id,
    expiresIn: VALIDADE,
  });
}

/** O 401 sai igual nos três casos — o porquê está dentro de `autenticar`. */
function recusar(res: Response, mensagem: string) {
  res.status(401).json({ erro: 'nao_autenticado', mensagem });
}

/** Estreita `unknown` sem `as`: a lista de papéis fica num lugar só. */
function ehPapel(valor: unknown): valor is Papel {
  return valor === 'leitor' || valor === 'editor' || valor === 'admin';
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.header('Authorization');
  if (!cabecalho) return recusar(res, 'Envie Authorization: Bearer <token>');

  // O formato é exigido com rigor de propósito. Aceitar o token solto, sem o
  // prefixo, parece gentileza com o cliente e cria duas formas de mandar a mesma
  // coisa: no dia em que alguém mandar `Basic <usuario:senha em base64>`, o
  // parsing frouxo trata a senha como token. `sobra` fecha o outro lado — sem
  // ela, `Bearer a b` passaria com o token `a`.
  const [esquema, token, ...sobra] = cabecalho.split(' ');
  if (esquema !== 'Bearer' || !token || sobra.length > 0) {
    return recusar(res, 'Formato esperado: Authorization: Bearer <token>');
  }

  let carga: JwtPayload | string;
  try {
    // ---------------------------------------------------------------------
    // `verify`, NUNCA `decode`
    // ---------------------------------------------------------------------
    // `jwt.decode(token)` desfaz o base64 da carga e devolve o objeto. Só isso:
    // ele **não confere a assinatura** e não olha o `exp`. Com um token
    // legítimo, `decode` e `verify` devolvem exatamente o mesmo objeto — mesmo
    // `sub`, mesmo `papel` —, e é por isso que a troca passa no teste manual, no
    // cliente HTTP e na revisão: tudo continua funcionando.
    //
    // O que muda é só o que ninguém testa. Com `decode`, qualquer um monta a
    // carga que quiser, põe qualquer coisa no lugar da assinatura, manda, e vira
    // admin — sem senha, sem conta, sem precisar do segredo. É a falha mais
    // grave que se comete com JWT, e ela não dá sintoma até virar incidente.
    carga = jwt.verify(token, SEGREDO);
  } catch {
    // Assinatura inválida, token expirado e token truncado caem no mesmo 401 com
    // a mesma frase: dizer qual dos três falhou só orienta quem está forjando.
    return recusar(res, 'Token inválido ou expirado');
  }

  // `verify` devolve `string` quando a carga não é JSON — token antigo ou de
  // outro emissor. Sem esta checagem, `carga.sub` seria `undefined` num caminho
  // que o compilador nem aponta.
  const sub = typeof carga === 'string' ? undefined : carga.sub;
  const papel = typeof carga === 'string' ? undefined : carga.papel;

  // Assinatura válida não garante conteúdo válido: o token pode ter sido emitido
  // por uma versão antiga do sistema, sem `papel`. Sem esta checagem o
  // `exigirPapel` receberia `undefined`, a comparação daria falso e a resposta
  // seria 403 — negação certa com a mensagem errada, e uma hora procurando no
  // lugar errado.
  if (typeof sub !== 'string' || !ehPapel(papel)) {
    return recusar(res, 'Token sem os dados de identificação');
  }

  req.usuario = { id: sub, papel };
  next();
}
