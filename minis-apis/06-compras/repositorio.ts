/**
 * O único arquivo que conhece o Prisma. Conceitos principais: módulos 08 e 10.
 *
 * Nenhuma decisão de negócio mora aqui — nem 404, nem 403, nem "é dono?". O
 * trabalho é traduzir o contrato de `dominio.ts` em consultas e devolver dados
 * simples. É essa fronteira que a mini 07 troca por SQL na mão sem tocar no
 * serviço.
 */
import type { PrismaClient } from './prisma/gerado/client.ts';
import type {
  AlteracaoItem,
  Item,
  Lista,
  ListaComTudo,
  ListaResumida,
  MembroDaLista,
  Papel,
  Repositorio,
  Usuario,
  UsuarioComSenha,
} from './dominio.ts';

export function criarRepositorioPrisma(prisma: PrismaClient): Repositorio {
  return {
    async criarUsuario(email, senhaHash): Promise<Usuario> {
      // `select` explícito, e não o objeto inteiro: o tipo do retorno passa a ter
      // só estes campos, então nem por acidente o `senhaHash` chega perto de uma
      // resposta HTTP. Um `findMany` sem `select` num modelo de usuário é como o
      // hash costuma vazar.
      return prisma.usuario.create({
        data: { email, senhaHash },
        select: { id: true, email: true },
      });
    },

    async buscarUsuarioPorEmail(email): Promise<UsuarioComSenha | null> {
      // `findUnique` só aceita campo `@unique` — é o índice de e-mail do schema
      // que permite esta chamada. Com `findFirst` a busca compilaria igual e
      // varreria a tabela.
      return prisma.usuario.findUnique({
        where: { email },
        select: { id: true, email: true, senhaHash: true },
      });
    },

    async listarListasDoUsuario(usuarioId): Promise<ListaResumida[]> {
      // A consulta parte do MEMBRO, não da lista: "minhas listas" é a pergunta
      // "de quais listas eu sou membro?", e formulá-la assim faz o filtro por
      // usuário ser a chave da busca em vez de um recorte feito depois.
      //
      // O `include` aninhado é o que evita o N+1: sem ele seriam uma consulta
      // para os membros e mais uma por lista para pegar o nome e a contagem —
      // imperceptível com três listas, segundos de espera com quinhentas.
      // `_count` conta no banco: a contagem chega como número, sem trazer os
      // itens pela rede só para medir o tamanho do array.
      const membros = await prisma.membro.findMany({
        where: { usuarioId },
        include: { lista: { include: { _count: { select: { itens: true } } } } },
        orderBy: { listaId: 'asc' },
      });

      return membros.map((membro) => ({
        id: membro.lista.id,
        nome: membro.lista.nome,
        papel: membro.papel as Papel,
        totalItens: membro.lista._count.itens,
      }));
    },

    async criarListaComDono(nome, donoId): Promise<Lista> {
      // Escrita aninhada: grava nas duas tabelas numa transação implícita. Fazer
      // os dois `create` separados abriria a janela em que a lista existe sem
      // dono — e uma lista sem dono é uma lista que ninguém enxerga e ninguém
      // apaga, porque toda consulta desta API passa pela tabela de membros.
      return prisma.lista.create({
        data: { nome, membros: { create: { usuarioId: donoId, papel: 'dono' } } },
        select: { id: true, nome: true },
      });
    },

    async buscarListaComTudo(listaId): Promise<ListaComTudo | null> {
      const lista = await prisma.lista.findUnique({
        where: { id: listaId },
        include: {
          membros: {
            include: { usuario: { select: { email: true } } },
            orderBy: { usuarioId: 'asc' },
          },
          itens: { orderBy: { id: 'asc' } },
        },
      });
      if (!lista) return null;

      return {
        id: lista.id,
        nome: lista.nome,
        membros: lista.membros.map((membro) => ({
          usuarioId: membro.usuarioId,
          email: membro.usuario.email,
          papel: membro.papel as Papel,
        })),
        itens: lista.itens.map((item) => ({
          id: item.id,
          nome: item.nome,
          quantidade: item.quantidade,
          comprado: item.comprado,
          listaId: item.listaId,
        })),
      };
    },

    async buscarPapel(listaId, usuarioId): Promise<Papel | null> {
      // A chave primária composta do schema vira este `listaId_usuarioId`: o par
      // é o identificador da linha, então esta é uma busca por chave, não uma
      // varredura com dois filtros.
      const membro = await prisma.membro.findUnique({
        where: { listaId_usuarioId: { listaId, usuarioId } },
        select: { papel: true },
      });
      return membro ? (membro.papel as Papel) : null;
    },

    async adicionarMembro(listaId, usuarioId, papel): Promise<MembroDaLista> {
      const membro = await prisma.membro.create({
        data: { listaId, usuarioId, papel },
        include: { usuario: { select: { email: true } } },
      });
      return { usuarioId: membro.usuarioId, email: membro.usuario.email, papel };
    },

    async criarItem(listaId, nome, quantidade): Promise<Item> {
      return prisma.item.create({
        data: { listaId, nome, quantidade },
        select: {
          id: true,
          nome: true,
          quantidade: true,
          comprado: true,
          listaId: true,
        },
      });
    },

    async buscarItem(listaId, itemId): Promise<Item | null> {
      // O `listaId` entra no `where` mesmo com o `id` já sendo único, e é o que
      // impede `PATCH /listas/3/itens/99` de mexer no item 99 da lista alheia
      // quando você é membro da lista 3. A alternativa — buscar por id e comparar
      // `item.listaId` no serviço — dá o mesmo resultado e é esquecível: quem
      // escrever a próxima rota copia a busca, não o `if`.
      return prisma.item.findFirst({
        where: { id: itemId, listaId },
        select: {
          id: true,
          nome: true,
          quantidade: true,
          comprado: true,
          listaId: true,
        },
      });
    },

    async atualizarItem(itemId, campos: AlteracaoItem): Promise<Item> {
      // O spread condicional em vez de `data: { nome: campos.nome }`: os tipos
      // gerados declaram `nome?: string` sem `| undefined`, e o
      // `exactOptionalPropertyTypes` deste repositório recusa uma chave presente
      // valendo `undefined` — que é justamente o idioma do Prisma para "não mexe
      // neste campo".
      return prisma.item.update({
        where: { id: itemId },
        data: {
          ...(campos.nome !== undefined ? { nome: campos.nome } : {}),
          ...(campos.quantidade !== undefined ? { quantidade: campos.quantidade } : {}),
          ...(campos.comprado !== undefined ? { comprado: campos.comprado } : {}),
        },
        select: {
          id: true,
          nome: true,
          quantidade: true,
          comprado: true,
          listaId: true,
        },
      });
    },

    async removerItem(itemId): Promise<void> {
      await prisma.item.delete({ where: { id: itemId } });
    },
  };
}
