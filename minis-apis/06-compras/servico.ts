/**
 * As regras. Conceitos principais: módulos 08 e 11.
 *
 * Este arquivo não conhece `req`, `res` nem Prisma. Ele conhece status HTTP — e
 * isso é proposital: qual erro cada recusa produz é decisão de negócio nesta
 * API, não detalhe de transporte. "Lista de outra pessoa some" e "lista que você
 * enxerga mas não comanda" são duas respostas diferentes para a mesma
 * requisição, e escolher entre elas na borda HTTP espalharia a regra por nove
 * handlers.
 */
import type { AlteracaoItem, Papel, Repositorio } from './dominio.ts';
import { conferirSenha, gerarHash, gerarToken } from './auth.ts';
import { conflito, naoAutenticado, naoEncontrado, semPermissao } from './erros.ts';

export function criarServico(repositorio: Repositorio) {
  /**
   * A pergunta "você participa desta lista?", e a resposta quando não.
   *
   * **404, e não 403 — é a decisão mais transferível desta mini.** Responder
   * "403: proibido" confirmaria que a lista 47 existe. Quem estiver sondando
   * pede `/listas/1`, `/listas/2`, `/listas/3`... anota quais deram 403 e sai
   * com o mapa das listas de todo mundo: quantas são, quando foram criadas, onde
   * há atividade. O 404 não distingue "não existe" de "não é sua", e é por isso
   * que ele é a resposta certa: as duas situações têm que ser indistinguíveis de
   * fora.
   *
   * O preço é uma mensagem de erro pior para quem tinha o link legítimo e perdeu
   * o convite: ele vê "não existe" quando o problema é permissão. Aceita-se,
   * porque o outro lado da troca é entregar a estrutura dos dados alheios a
   * qualquer um com um `for`.
   */
  async function exigirMembro(listaId: number, usuarioId: number): Promise<Papel> {
    const papel = await repositorio.buscarPapel(listaId, usuarioId);
    if (!papel) throw naoEncontrado(`Lista ${listaId} não existe`);
    return papel;
  }

  return {
    async cadastrar(email: string, senha: string) {
      // A checagem existe para dar a mensagem; quem de fato impede a segunda
      // conta é o índice único do banco, porque entre este SELECT e o INSERT
      // cabe uma requisição concorrente com o mesmo e-mail.
      if (await repositorio.buscarUsuarioPorEmail(email)) {
        // O 409 aqui admite ao curioso que este e-mail tem conta. A alternativa
        // segura — responder 201 e avisar o dono por e-mail — precisa de envio de
        // e-mail, que esta mini não tem. Escolha consciente, e o módulo 11
        // registra a mesma ressalva.
        throw conflito('E-mail já cadastrado');
      }
      return repositorio.criarUsuario(email, await gerarHash(senha));
    },

    async entrar(email: string, senha: string) {
      const usuario = await repositorio.buscarUsuarioPorEmail(email);

      // Uma mensagem só para os dois casos, e a mesma ordem de avaliação de
      // sempre. "Esse e-mail não existe" entregaria a lista de quem tem conta:
      // bastaria tentar entrar com mil e-mails e anotar quais responderam
      // "senha incorreta" para saber exatamente em quem mirar.
      if (!usuario || !(await conferirSenha(usuario.senhaHash, senha))) {
        throw naoAutenticado('E-mail ou senha inválidos');
      }

      return { token: gerarToken(usuario.id), usuario: { id: usuario.id, email } };
    },

    async listarMinhasListas(usuarioId: number) {
      return repositorio.listarListasDoUsuario(usuarioId);
    },

    async criarLista(nome: string, donoId: number) {
      return repositorio.criarListaComDono(nome, donoId);
    },

    async verLista(listaId: number, usuarioId: number) {
      await exigirMembro(listaId, usuarioId);
      const lista = await repositorio.buscarListaComTudo(listaId);
      // Só chega aqui quem é membro, então a lista existe. O `if` cobre a corrida
      // com uma remoção acontecendo entre as duas consultas — e a mesma mensagem
      // do `exigirMembro`, porque o cliente não precisa saber qual dos dois foi.
      if (!lista) throw naoEncontrado(`Lista ${listaId} não existe`);
      return lista;
    },

    /**
     * **Aqui o 403 é o certo, e a diferença é o que o cliente já sabe.**
     *
     * Quem chega nesta rota é membro da lista: ele a vê no `GET /listas`, conhece
     * o nome, os itens e quem participa. Esconder a existência dela com um 404
     * não protegeria nada — a informação já está com quem pergunta — e ainda
     * mentiria sobre o que está acontecendo, mandando o cliente procurar um id
     * errado quando o que falta é permissão.
     *
     * A régua que decide entre os dois: **negar revela algo que quem pergunta
     * ainda não tinha?** Se revela, 404. Se não, 403.
     */
    async exigirDono(listaId: number, usuarioId: number): Promise<void> {
      const papel = await exigirMembro(listaId, usuarioId);
      if (papel !== 'dono') throw semPermissao('Só o dono da lista pode convidar');
    },

    /** O `exigirDono` já rodou como middleware; aqui sobra a regra do convite. */
    async convidar(listaId: number, email: string) {
      const convidado = await repositorio.buscarUsuarioPorEmail(email);
      // Convidar quem não tem conta exigiria criar um convite pendente e mandar
      // e-mail — duas peças que esta mini não tem. Note que a resposta admite se
      // aquele e-mail tem conta; é o mesmo vazamento do cadastro, e pelo mesmo
      // motivo.
      if (!convidado) throw naoEncontrado(`Ninguém com o e-mail ${email} tem conta`);

      if (await repositorio.buscarPapel(listaId, convidado.id)) {
        throw conflito(`${email} já participa desta lista`);
      }

      return repositorio.adicionarMembro(listaId, convidado.id, 'convidado');
    },

    async acrescentarItem(
      listaId: number,
      usuarioId: number,
      dados: { nome: string; quantidade: number },
    ) {
      // Convidado acrescenta item: é o ponto da lista compartilhada. Se só o dono
      // pudesse, o convite não serviria para nada.
      await exigirMembro(listaId, usuarioId);
      return repositorio.criarItem(listaId, dados.nome, dados.quantidade);
    },

    async alterarItem(
      listaId: number,
      usuarioId: number,
      itemId: number,
      campos: AlteracaoItem,
    ) {
      await exigirMembro(listaId, usuarioId);
      const item = await repositorio.buscarItem(listaId, itemId);
      if (!item) throw naoEncontrado(`Item ${itemId} não existe na lista ${listaId}`);
      return repositorio.atualizarItem(itemId, campos);
    },

    async removerItem(listaId: number, usuarioId: number, itemId: number) {
      await exigirMembro(listaId, usuarioId);
      const item = await repositorio.buscarItem(listaId, itemId);
      if (!item) throw naoEncontrado(`Item ${itemId} não existe na lista ${listaId}`);
      await repositorio.removerItem(itemId);
    },
  };
}

export type Servico = ReturnType<typeof criarServico>;
