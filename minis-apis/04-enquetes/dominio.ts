/**
 * Os tipos e o contrato do repositório. Conceito principal: módulo 08.
 *
 * Este arquivo não importa nada — nem Express, nem `node:sqlite`. É o que
 * permite trocar a implementação do repositório sem tocar no serviço.
 */

export type Enquete = {
  id: number;
  pergunta: string;
  criadaEm: string;
  /** `null` enquanto a enquete aceita voto. Preenchido, diz quando fechou. */
  encerradaEm: string | null;
};

export type Opcao = { id: number; enqueteId: number; texto: string; ordem: number };

export type Voto = {
  id: number;
  enqueteId: number;
  opcaoId: number;
  eleitor: string;
  votadoEm: string;
};

/** A lista traz os números agregados; a cédula (`GET /enquetes/:id`) não. */
export type EnqueteListada = Enquete & { totalVotos: number; totalOpcoes: number };

/** Uma linha da apuração: uma opção e quantos votos ela recebeu. */
export type OpcaoApurada = {
  opcaoId: number;
  texto: string;
  ordem: number;
  votos: number;
};

export type NovaEnquete = { pergunta: string; opcoes: string[] };

export type EstadoEnquete = 'todas' | 'abertas' | 'encerradas';

export type FiltroEnquetes = { estado: EstadoEnquete; pagina: number; limite: number };

/**
 * O contrato. O serviço depende DESTE tipo, não do arquivo que fala SQL.
 *
 * Os métodos são `async` mesmo com o `node:sqlite` sendo síncrono: a assinatura
 * precisa servir a um banco de rede (Postgres) sem que o serviço mude de forma.
 */
export type Repositorio = {
  listarEnquetes(
    filtro: FiltroEnquetes,
  ): Promise<{ itens: EnqueteListada[]; total: number }>;
  buscarEnquete(id: number): Promise<Enquete | null>;
  /** Cria a enquete e as opções numa transação: ou nascem as duas coisas, ou nenhuma. */
  criarEnquete(dados: NovaEnquete): Promise<Enquete>;
  /**
   * Encerra apenas se ainda estiver aberta.
   *
   * `null` significa "estava encerrada", não "não existe" — quem distingue os
   * dois é o serviço, que já buscou a enquete antes.
   */
  encerrarEnquete(id: number): Promise<Enquete | null>;
  removerEnquete(id: number): Promise<boolean>;

  listarOpcoes(enqueteId: number): Promise<Opcao[]>;
  buscarOpcao(enqueteId: number, opcaoId: number): Promise<Opcao | null>;
  apurar(enqueteId: number): Promise<OpcaoApurada[]>;

  /**
   * `null` significa que o índice único recusou: este eleitor já votou nesta
   * enquete. O repositório relata o fato; escolher o status é do serviço.
   */
  registrarVoto(
    enqueteId: number,
    opcaoId: number,
    eleitor: string,
  ): Promise<Voto | null>;
  votoDoEleitor(enqueteId: number, eleitor: string): Promise<Voto | null>;
  removerVoto(enqueteId: number, eleitor: string): Promise<boolean>;
};
