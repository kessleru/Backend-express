/**
 * Os tipos do domínio e o contrato do repositório. Conceito principal: módulo 08.
 *
 * Este arquivo não importa nada — nem Express, nem Zod, nem o client do Prisma.
 * É o que permite trocar Prisma por SQL na mão (a mini 07 faz exatamente isso)
 * sem que o serviço mude uma linha.
 */

/**
 * Dois papéis, e só dois.
 *
 * `dono` convida e faz tudo que o convidado faz; `convidado` mexe nos itens. Um
 * terceiro papel (um "leitor", que só enxerga) obrigaria toda rota de escrita a
 * consultar o papel antes de agir, e a autorização deixaria de caber em um
 * middleware — passaria a ser um `if` espalhado por nove handlers. Com dois
 * papéis, a única pergunta de permissão é "é o dono?", feita num lugar só.
 */
export type Papel = 'dono' | 'convidado';

export type Usuario = { id: number; email: string };

/** Só o repositório e o login enxergam o hash; ele nunca entra numa resposta. */
export type UsuarioComSenha = Usuario & { senhaHash: string };

export type Lista = { id: number; nome: string };

export type Item = {
  id: number;
  nome: string;
  quantidade: number;
  comprado: boolean;
  listaId: number;
};

export type MembroDaLista = { usuarioId: number; email: string; papel: Papel };

/** O que `GET /listas/:id` devolve: a lista, quem participa e o que falta comprar. */
export type ListaComTudo = Lista & { membros: MembroDaLista[]; itens: Item[] };

/** O que `GET /listas` devolve: sem os itens, com a contagem deles. */
export type ListaResumida = Lista & { papel: Papel; totalItens: number };

/**
 * Campos que o `PATCH` pode mexer. Ausente significa "não mexe neste campo".
 *
 * O `| undefined` explícito em cada um é exigência do `exactOptionalPropertyTypes`
 * ligado neste repositório: sem ele, um objeto com a chave presente valendo
 * `undefined` — que é exatamente o que o Zod devolve para um campo opcional não
 * enviado — não é aceito como `AlteracaoItem`.
 */
export type AlteracaoItem = {
  nome?: string | undefined;
  quantidade?: number | undefined;
  comprado?: boolean | undefined;
};

/**
 * O contrato. O serviço depende DESTE tipo, não do arquivo que fala Prisma.
 *
 * Todo método que lê ou grava dentro de uma lista recebe `listaId` — nunca só o
 * `itemId`. Assim o filtro por lista vive na consulta, e não num `if` no serviço
 * que uma rota nova pode esquecer de copiar.
 */
export type Repositorio = {
  criarUsuario(email: string, senhaHash: string): Promise<Usuario>;
  buscarUsuarioPorEmail(email: string): Promise<UsuarioComSenha | null>;

  listarListasDoUsuario(usuarioId: number): Promise<ListaResumida[]>;
  criarListaComDono(nome: string, donoId: number): Promise<Lista>;
  buscarListaComTudo(listaId: number): Promise<ListaComTudo | null>;
  buscarPapel(listaId: number, usuarioId: number): Promise<Papel | null>;
  adicionarMembro(
    listaId: number,
    usuarioId: number,
    papel: Papel,
  ): Promise<MembroDaLista>;

  criarItem(listaId: number, nome: string, quantidade: number): Promise<Item>;
  buscarItem(listaId: number, itemId: number): Promise<Item | null>;
  atualizarItem(itemId: number, campos: AlteracaoItem): Promise<Item>;
  removerItem(itemId: number): Promise<void>;
};
