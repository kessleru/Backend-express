/**
 * Os tipos e o contrato do repositório. Conceito principal: módulo 08.
 *
 * Este arquivo não importa nada — nem Express, nem Zod, nem `node:sqlite`.
 */

export type Usuario = { id: number; email: string; criadoEm: string };

/** Só o repositório e o login enxergam o hash; ele nunca sai numa resposta. */
export type UsuarioComSenha = Usuario & { senhaHash: string };

export type Habito = { id: number; nome: string; criadoEm: string };

/** O que a listagem devolve: o hábito mais quantos dias ele já acumulou. */
export type HabitoComTotal = Habito & { totalMarcacoes: number };

/**
 * O contrato. Repare que **todo método de hábito recebe `usuarioId`** — não é
 * conveniência, é o que torna impossível escrever uma consulta sem dono. Uma
 * assinatura `buscarHabito(id)` deixaria a proteção depender de alguém lembrar
 * de conferir o dono depois; esta obriga a decisão na hora de chamar, e o
 * compilador cobra.
 *
 * Os métodos são `async` mesmo com o `node:sqlite` sendo síncrono: a assinatura
 * precisa servir a um banco de rede sem que o serviço mude de forma.
 */
export type Repositorio = {
  /** `null` quando o e-mail já existe. */
  criarUsuario(email: string, senhaHash: string): Promise<Usuario | null>;
  buscarUsuarioPorEmail(email: string): Promise<UsuarioComSenha | null>;

  listarHabitos(usuarioId: number): Promise<HabitoComTotal[]>;
  /** `null` quando o usuário já tem um hábito com esse nome. */
  criarHabito(usuarioId: number, nome: string): Promise<Habito | null>;
  buscarHabito(usuarioId: number, habitoId: number): Promise<Habito | null>;
  removerHabito(usuarioId: number, habitoId: number): Promise<boolean>;

  /** `false` quando o hábito não é do usuário (ou não existe). */
  marcarDia(usuarioId: number, habitoId: number, dia: string): Promise<boolean>;
  desmarcarDia(usuarioId: number, habitoId: number, dia: string): Promise<void>;
  /** Os dias marcados de um mês `YYYY-MM`, em ordem crescente. */
  diasDoMes(usuarioId: number, habitoId: number, mes: string): Promise<string[]>;
};
