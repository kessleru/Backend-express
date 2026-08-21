/**
 * exigirPapel — a fábrica que autoriza. Ela responde "e você pode isto?", que é
 * uma pergunta diferente de "quem é você?". Conceito principal: módulo 11.
 *
 * Copiável, com uma condição: ela lê `req.usuario`, que quem escreve é o
 * `autenticar`. O bloco `declare module` abaixo é o mesmo de lá, repetido de
 * propósito para esta pasta compilar sozinha ao ser copiada — augmentação
 * repetida com o **tipo idêntico** é união de declarações, não conflito. Mudar
 * um campo aqui e não lá é que quebra a compilação, e é bom que quebre.
 */
import type { NextFunction, Request, Response } from 'express';

export type Papel = 'leitor' | 'editor' | 'admin';

export type UsuarioAutenticado = {
  id: string;
  papel: Papel;
};

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}

/**
 * Variádica (`...papeis`) porque "admin OU editor" é o caso comum, e a
 * alternativa — `exigirPapel('admin')` empilhado com `exigirPapel('editor')` na
 * mesma rota — significaria **E**, não **OU**: o primeiro já negaria o editor.
 *
 * A lista é de quem **pode**. A negativa (`bloquearPapel('visitante')`) parece
 * equivalente e não é: o papel criado no mês que vem entra liberado por
 * omissão, e ninguém abriu esta linha para decidir isso. Lista positiva erra
 * para o lado de negar acesso a quem deveria ter — chamado de suporte. Lista
 * negativa erra para o lado de dar acesso a quem não deveria — incidente.
 */
export function exigirPapel(...papeisPermitidos: Papel[]) {
  if (papeisPermitidos.length === 0) {
    // `exigirPapel()` sem argumento negaria tudo, ou — pior, se a checagem fosse
    // `includes` numa lista vazia com o sinal trocado — liberaria tudo. Lançar
    // aqui estoura quando as rotas são montadas, na subida do servidor, e não na
    // primeira requisição em produção.
    throw new Error('exigirPapel() precisa de ao menos um papel');
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;

    // Chegar aqui sem `req.usuario` significa que a rota esqueceu o
    // `autenticar` antes — é bug de quem montou a pilha, não do cliente. A
    // resposta segura mesmo assim é negar: **na dúvida, feche a porta**. Uma
    // checagem de permissão que libera quando dá errado é pior do que não ter
    // checagem nenhuma, porque dá confiança.
    //
    // 401 e não 403, porque neste ponto o servidor de fato não sabe quem é.
    if (!usuario) {
      res.status(401).json({
        erro: 'nao_autenticado',
        mensagem: 'Rota protegida sem o middleware de autenticação',
      });
      return;
    }

    if (!papeisPermitidos.includes(usuario.papel)) {
      // Aqui a mensagem PODE ser específica, ao contrário do 401: o usuário já
      // se identificou, não há nada a esconder dele que ele não possa descobrir
      // tentando. Dizer qual papel falta economiza um chamado de suporte.
      res.status(403).json({
        erro: 'sem_permissao',
        mensagem: `Esta operação exige um destes papéis: ${papeisPermitidos.join(', ')}`,
      });
      return;
    }

    next();
  };
}
