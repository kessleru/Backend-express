/**
 * Senha, crachá e os dois middlewares. Conceito principal: módulo 11.
 *
 * As duas perguntas do módulo aparecem aqui separadas de propósito:
 *   AUTENTICAÇÃO (401) — quem é você?             → `autenticar`
 *   AUTORIZAÇÃO  (403) — você pode, NESTA lista?  → `exigirDono`
 *
 * São dois middlewares porque são duas perguntas. Fundidos num só, a segunda
 * desaparece no dia em que alguém acrescentar uma rota e copiar a chamada pela
 * metade.
 */
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { AppError, naoAutenticado } from './erros.ts';
import { analisar, idSchema } from './schemas.ts';

/**
 * O segredo é o que separa "assinatura que só o servidor produz" de "qualquer um
 * emite crachá". O valor embutido existe para a mini rodar sem `.env`, e em
 * produção ele seria falha grave: o código é público, então qualquer pessoa
 * assinaria um token com o `sub` que quisesse e entraria como qualquer usuário.
 * Numa API de verdade a linha é `process.env.JWT_SECRET` sem `??` — o processo
 * recusa subir sem a variável, porque um fallback silencioso vira deploy com o
 * segredo de exemplo e ninguém percebe.
 */
const SEGREDO = process.env.JWT_SECRET ?? 'compras-dev-nunca-em-producao';

/**
 * 15 minutos, e o motivo é o que o crachá NÃO tem: não existe cancelar um token
 * assinado. Trocar a senha, sair de uma lista, apagar a conta — nada disso
 * alcança um token já emitido. A única defesa é ele morrer rápido, e 15 minutos
 * é o tamanho da janela de estrago que se aceita. O preço é ter que fazer login
 * de novo; quem não quer pagá-lo emite um segundo token, de vida longa, guardado
 * no banco para poder ser revogado — o `refresh` do módulo 11, que está fora do
 * escopo desta mini.
 */
const EXPIRACAO = '15m';

/**
 * Parâmetros do OWASP para o argon2id: 19 MiB de memória, 2 iterações,
 * paralelismo 1.
 *
 * A memória é o número que mais importa. Uma GPU tem milhares de núcleos e pouca
 * memória por núcleo, então exigir 19 MiB por cálculo é o que tira a vantagem
 * dela; aumentar só o tempo atrapalha bem menos. Custa ~200 ms por login aqui, e
 * bilhões de vezes isso do outro lado.
 */
const CUSTO_ARGON2 = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * A senha nunca é gravada: o que vai para o banco é o resultado desta conta, do
 * qual não se volta.
 *
 * Nenhum sal é passado porque o argon2 gera um por senha e o embute no resultado
 * — a string devolvida traz algoritmo, versão, parâmetros, sal e hash separados
 * por `$`. É por isso que a verificação também não pede sal: ela lê o que está
 * gravado e refaz a conta com a mesma receita.
 */
export const gerarHash = (senha: string): Promise<string> =>
  argon2.hash(senha, CUSTO_ARGON2);

/**
 * Conferir é refazer a conta e comparar — nunca `hashGravado === outroHash`.
 * Dois hashes da mesma senha são diferentes, porque os sais são diferentes;
 * o `===` daria falso sempre e ninguém entraria. É por isso que a verificação
 * tem função própria em vez de ser uma comparação.
 */
export const conferirSenha = (senhaHash: string, senha: string): Promise<boolean> =>
  argon2.verify(senhaHash, senha);

/**
 * O payload do crachá: só o `sub`, que é o id do usuário (nome padronizado pela
 * RFC 7519).
 *
 * O papel NÃO cabe aqui, e a razão é específica desta mini: papel é por lista,
 * não por pessoa. A mesma conta é dona da lista do mercado e convidada na da
 * praia — não existe "o papel dela". Guardar papel no token só funciona quando
 * ele descreve a pessoa inteira (`admin`, `leitor`); aqui a autorização precisa
 * consultar a lista em questão, e é o que `exigirDono` faz.
 *
 * O e-mail também fica de fora: o payload é base64, não criptografia, e quem tem
 * o token lê o conteúdo. Só entra ali o que já poderia ser público.
 */
export type UsuarioAutenticado = { id: number };

// Isto acrescenta `usuario` ao tipo `Request` do Express. A alternativa seria
// `(req as any).usuario`, e um `any` no campo que decide autorização apaga a
// checagem justamente onde ela mais importa — `req.usuario.di` compilaria.
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export const gerarToken = (usuarioId: number): string =>
  jwt.sign({ sub: String(usuarioId) }, SEGREDO, { expiresIn: EXPIRACAO });

/**
 * `jwt.verify`, e NUNCA `jwt.decode`. Este é o erro mais caro do módulo 11.
 *
 * Um JWT tem três partes separadas por ponto: cabeçalho, payload e assinatura.
 * As duas primeiras são base64 — texto que qualquer pessoa lê sem segredo
 * nenhum. Quem garante que ninguém trocou o conteúdo é a terceira parte, e
 * conferi-la exige o segredo do servidor.
 *
 * `decode` faz só o base64 reverso: devolve o payload sem olhar para a
 * assinatura. Um `autenticar` escrito com `decode` aceita um token montado à mão
 * em dez segundos — basta escrever `{"sub":"1"}`, codificar em base64 e pendurar
 * qualquer coisa no lugar da assinatura. O servidor responderia com as listas do
 * usuário 1, e nada apareceria no log: para ele, a requisição foi legítima.
 * `verify` confere a assinatura E a expiração, e lança quando qualquer uma
 * falha.
 *
 * O que torna a troca perigosa é que as duas funções devolvem o mesmo objeto no
 * caminho feliz. Trocar uma pela outra não quebra teste nenhum, e a API continua
 * funcionando para todo mundo — inclusive para quem não devia.
 */
export function verificarToken(token: string): UsuarioAutenticado {
  try {
    const payload = jwt.verify(token, SEGREDO);

    // `verify` devolve `string | JwtPayload`. Estreitar é obrigatório: sem o if,
    // um token cujo payload é texto puro chegaria ao serviço como `id: NaN`.
    if (typeof payload === 'string' || payload.sub === undefined) {
      throw naoAutenticado('Token com formato inesperado');
    }

    return { id: Number(payload.sub) };
  } catch (erro) {
    if (erro instanceof AppError) throw erro;

    // Mensagem específica para a expiração — o cliente precisa saber que deve
    // fazer login de novo, e não que mandou o token errado. Nos outros casos
    // (assinatura inválida, formato quebrado), mensagem genérica: dizer
    // "assinatura inválida" confirma a quem tenta forjar que ele acertou o resto.
    if (erro instanceof jwt.TokenExpiredError) throw naoAutenticado('Token expirado');
    throw naoAutenticado('Token inválido');
  }
}

/** Lê `Authorization: Bearer <token>`, resolve quem é e segue. */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.header('Authorization');
  if (!cabecalho) throw naoAutenticado('Header Authorization ausente');

  // O esquema "Bearer" ("portador") é o padrão para token: quem apresenta, usa.
  const [esquema, token] = cabecalho.split(' ');
  if (esquema !== 'Bearer' || !token) {
    throw naoAutenticado('Formato esperado: Authorization: Bearer <token>');
  }

  req.usuario = verificarToken(token);
  next();
}

/** Atalho tipado: depois de `autenticar`, `req.usuario` existe. */
export function usuarioDe(req: Request): UsuarioAutenticado {
  // Se cair aqui, faltou o `autenticar` antes desta rota. É bug de programação,
  // não do cliente — mas responder 401 é o comportamento seguro: uma checagem
  // que deixa passar quando dá errado é pior do que não existir.
  if (!req.usuario) throw naoAutenticado('Rota protegida sem autenticação');
  return req.usuario;
}

/**
 * O middleware de AUTORIZAÇÃO, para a rota que só o dono pode usar.
 *
 * Ele não consulta nada: quem sabe se você é dono, e quem escolhe entre 404 e
 * 403, é o serviço. O middleware existe para que a regra apareça na linha da
 * rota, ao lado do `autenticar`, em vez de virar a primeira linha de um handler
 * — de onde ela some quando alguém escreve a rota seguinte por cópia.
 *
 * O parâmetro é descrito pelo formato do que se usa dele, e não pelo tipo
 * `Servico` inteiro: assim este arquivo continua sem saber o que a API faz.
 */
export function exigirDono(servico: {
  exigirDono(listaId: number, usuarioId: number): Promise<void>;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { id } = analisar(idSchema, req.params);
    await servico.exigirDono(id, usuarioDe(req).id);
    next();
  };
}
