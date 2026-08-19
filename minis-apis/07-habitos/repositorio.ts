/**
 * O ÚNICO arquivo que escreve SQL. Conceitos principais: módulos 08, 09 e 11.
 *
 * Além de esconder o banco (mini 3), este arquivo carrega a proteção de
 * privacidade da API: **toda** consulta de hábito filtra por `usuario_id`. A
 * alternativa seria buscar pelo id e conferir o dono no serviço — um `if` que
 * funciona igual, até o dia em que alguém acrescenta uma rota e esquece de
 * escrevê-lo. Uma cláusula que está dentro da consulta não dá para esquecer:
 * não existe caminho que leia a tabela sem passar por ela.
 *
 * Consultas parametrizadas com `?`, sempre — inclusive os limites do mês, que
 * são montados em JavaScript logo abaixo (o porquê está na mini 3).
 */
import type { DatabaseSync } from 'node:sqlite';
import type {
  Habito,
  HabitoComTotal,
  Repositorio,
  Usuario,
  UsuarioComSenha,
} from './dominio.ts';

/** SQLITE_CONSTRAINT_UNIQUE — a violação de um índice único (mini 4). */
const ERRO_UNIQUE = 2067;

const ehViolacaoDeUnicidade = (erro: unknown): boolean =>
  (erro as { errcode?: number }).errcode === ERRO_UNIQUE;

type LinhaUsuario = { id: number; email: string; senha_hash: string; criado_em: string };
type LinhaHabito = { id: number; nome: string; criado_em: string };

export function criarRepositorioSqlite(db: DatabaseSync): Repositorio {
  const stmtInserirUsuario = db.prepare(
    'INSERT INTO usuarios (email, senha_hash) VALUES (?, ?)',
  );
  const stmtUsuarioPorId = db.prepare('SELECT * FROM usuarios WHERE id = ?');
  const stmtUsuarioPorEmail = db.prepare(
    'SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE',
  );

  const stmtListarHabitos = db.prepare(
    // LEFT JOIN e não JOIN: com o JOIN interno, um hábito recém-criado — sem
    // nenhuma marcação — sumiria da própria lista de quem acabou de criá-lo.
    // O GROUP BY faz a contagem acontecer no banco, que devolve um número por
    // hábito em vez de todas as marcações de todos eles para contar aqui.
    `SELECT h.id, h.nome, h.criado_em, COUNT(m.id) AS total_marcacoes
       FROM habitos h
       LEFT JOIN marcacoes m ON m.habito_id = h.id
      WHERE h.usuario_id = ?
      GROUP BY h.id
      ORDER BY h.criado_em, h.id`,
  );
  const stmtInserirHabito = db.prepare(
    'INSERT INTO habitos (usuario_id, nome) VALUES (?, ?)',
  );
  const stmtHabitoPorId = db.prepare(
    'SELECT id, nome, criado_em FROM habitos WHERE id = ? AND usuario_id = ?',
  );
  const stmtRemoverHabito = db.prepare(
    'DELETE FROM habitos WHERE id = ? AND usuario_id = ?',
  );

  const stmtMarcar = db.prepare(
    // `INSERT ... SELECT` em vez de `VALUES`: a linha só nasce se o SELECT
    // encontrar um hábito com aquele id E daquele dono. Com isso a checagem de
    // propriedade e a gravação viram uma operação só — não há intervalo entre
    // "conferi que é seu" e "gravei" para o hábito ser apagado no meio. Quando
    // o hábito não é seu, o SELECT não devolve linha, o INSERT grava zero, e
    // `changes` conta essa história sem nenhuma consulta extra.
    `INSERT INTO marcacoes (habito_id, dia)
     SELECT id, ? FROM habitos WHERE id = ? AND usuario_id = ?`,
  );
  const stmtDesmarcar = db.prepare(
    `DELETE FROM marcacoes
      WHERE dia = ?
        AND habito_id IN (SELECT id FROM habitos WHERE id = ? AND usuario_id = ?)`,
  );
  const stmtDiasDoMes = db.prepare(
    `SELECT m.dia
       FROM marcacoes m
       JOIN habitos h ON h.id = m.habito_id
      WHERE h.usuario_id = ? AND m.habito_id = ? AND m.dia >= ? AND m.dia <= ?
      ORDER BY m.dia`,
  );

  const paraUsuario = (linha: LinhaUsuario): Usuario => ({
    id: linha.id,
    email: linha.email,
    criadoEm: linha.criado_em,
  });

  const paraHabito = (linha: LinhaHabito): Habito => ({
    id: linha.id,
    nome: linha.nome,
    criadoEm: linha.criado_em,
  });

  return {
    async criarUsuario(email, senhaHash) {
      try {
        const { lastInsertRowid } = stmtInserirUsuario.run(email, senhaHash);
        return paraUsuario(stmtUsuarioPorId.get(Number(lastInsertRowid)) as LinhaUsuario);
      } catch (erro) {
        // Mesmo erro do banco, decisão oposta à de `marcarDia`: aqui o e-mail
        // repetido é um conflito de verdade, porque a segunda pessoa NÃO fica
        // com a conta da primeira. Devolver `null` deixa o serviço escolher o
        // status; devolver 409 daqui misturaria HTTP com SQL.
        if (ehViolacaoDeUnicidade(erro)) return null;
        throw erro;
      }
    },

    async buscarUsuarioPorEmail(email) {
      const linha = stmtUsuarioPorEmail.get(email) as LinhaUsuario | undefined;
      if (!linha) return null;
      return { ...paraUsuario(linha), senhaHash: linha.senha_hash };
    },

    async listarHabitos(usuarioId) {
      const linhas = stmtListarHabitos.all(usuarioId) as (LinhaHabito & {
        total_marcacoes: number;
      })[];
      return linhas.map((linha): HabitoComTotal => ({
        ...paraHabito(linha),
        totalMarcacoes: linha.total_marcacoes,
      }));
    },

    async criarHabito(usuarioId, nome) {
      try {
        const { lastInsertRowid } = stmtInserirHabito.run(usuarioId, nome);
        return paraHabito(
          stmtHabitoPorId.get(Number(lastInsertRowid), usuarioId) as LinhaHabito,
        );
      } catch (erro) {
        if (ehViolacaoDeUnicidade(erro)) return null;
        throw erro;
      }
    },

    async buscarHabito(usuarioId, habitoId) {
      const linha = stmtHabitoPorId.get(habitoId, usuarioId) as LinhaHabito | undefined;
      return linha ? paraHabito(linha) : null;
    },

    async removerHabito(usuarioId, habitoId) {
      // As marcações somem junto por `ON DELETE CASCADE`, não por um segundo
      // DELETE aqui: elas não existem fora do hábito, e apagá-las em dois
      // comandos abriria a janela em que o hábito já foi embora e as marcações
      // ainda não.
      return stmtRemoverHabito.run(habitoId, usuarioId).changes > 0;
    },

    async marcarDia(usuarioId, habitoId, dia) {
      try {
        return stmtMarcar.run(dia, habitoId, usuarioId).changes > 0;
      } catch (erro) {
        // O TRECHO EM QUE IDEMPOTÊNCIA DEIXA DE SER PALAVRA.
        //
        // Cair aqui significa que o par (habito_id, dia) já estava gravado — e
        // isso só acontece se o hábito for mesmo desta pessoa, porque o SELECT
        // do INSERT não chegaria à inserção de outra forma. Ou seja: o estado
        // que o cliente pediu já é o estado atual do servidor.
        //
        // Traduzir essa violação para 409 seria descrever o banco em vez de
        // responder a pergunta. O cliente pediu "que este dia esteja marcado";
        // ele está. O segundo toque no botão, o retry depois de uma conexão
        // caída e a sincronização do app offline terminam no mesmo lugar do
        // primeiro pedido — que é exatamente o que `PUT` promete.
        if (ehViolacaoDeUnicidade(erro)) return true;
        throw erro;
      }
    },

    async desmarcarDia(usuarioId, habitoId, dia) {
      stmtDesmarcar.run(dia, habitoId, usuarioId);
    },

    async diasDoMes(usuarioId, habitoId, mes) {
      // `dia` é texto `YYYY-MM-DD`, então comparar com `>=` e `<=` é comparação
      // alfabética — e ela coincide com a cronológica justamente por o formato
      // ter tamanho fixo e ordem do maior para o menor. `-31` como limite
      // superior serve a todo mês: nenhum dia real passa disso.
      const linhas = stmtDiasDoMes.all(usuarioId, habitoId, `${mes}-01`, `${mes}-31`) as {
        dia: string;
      }[];
      return linhas.map((linha) => linha.dia);
    },
  };
}
