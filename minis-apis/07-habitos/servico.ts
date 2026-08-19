/**
 * As regras de negócio. Conceito principal: módulo 08.
 *
 * Não conhece `req`/`res` (quem traduz é `rotas.ts`) nem SQL (quem guarda é
 * `repositorio.ts`). Recebe o repositório como argumento em vez de importá-lo.
 */
import type { Habito, HabitoComTotal, Repositorio, Usuario } from './dominio.ts';
import { conferirSenha, emitirToken, gerarHash } from './autenticacao.ts';
import { conflito, naoAutenticado, naoEncontrado } from './erros.ts';

export type Resumo = {
  habito: Habito;
  mes: string;
  diasNoMes: number;
  diasCumpridos: number;
  percentual: number;
  dias: string[];
  maiorSequencia: number;
  sequenciaAtual: number;
  ultimoDia: string | null;
};

export function criarServico(repositorio: Repositorio) {
  /**
   * O único lugar que transforma "não é seu" em resposta. Todo caminho que
   * mexe num hábito passa por aqui ou pelo `changes` do próprio comando, e os
   * dois terminam no mesmo 404 — o porquê de nunca ser 403 está em `erros.ts`.
   */
  async function exigirHabito(usuarioId: number, habitoId: number): Promise<Habito> {
    const habito = await repositorio.buscarHabito(usuarioId, habitoId);
    if (!habito) throw naoEncontrado('Hábito', habitoId);
    return habito;
  }

  return {
    async cadastrar(email: string, senha: string): Promise<Usuario> {
      const usuario = await repositorio.criarUsuario(email, await gerarHash(senha));
      if (!usuario) throw conflito('Já existe uma conta com esse e-mail');
      return usuario;
    },

    async entrar(
      email: string,
      senha: string,
    ): Promise<{ token: string; usuario: Usuario }> {
      const encontrado = await repositorio.buscarUsuarioPorEmail(email);

      // Mensagem única para "não existe" e "senha errada" (módulo 11). O que
      // vale registrar aqui é o efeito de escrever isto de outro jeito: com
      // duas mensagens, um formulário de cadastro qualquer vira consultor de
      // "esta pessoa tem conta aqui?" — e a lista de hábitos de alguém já diz
      // muito sobre ela.
      if (!encontrado || !(await conferirSenha(encontrado.senhaHash, senha))) {
        throw naoAutenticado('E-mail ou senha inválidos');
      }

      const { senhaHash: _, ...usuario } = encontrado;
      return { token: emitirToken(usuario.id), usuario };
    },

    async listarHabitos(usuarioId: number): Promise<HabitoComTotal[]> {
      return repositorio.listarHabitos(usuarioId);
    },

    async criarHabito(usuarioId: number, nome: string): Promise<Habito> {
      const habito = await repositorio.criarHabito(usuarioId, nome);
      // 409 e não 422: "Correr" é um nome perfeitamente válido; o que recusa é
      // o estado da conta de quem pediu. E o conflito é só com os hábitos dela
      // — o nome que outra pessoa usou não interfere.
      //
      // A mensagem não repete o nome enviado de propósito: o índice é NOCASE,
      // então quem manda "correr" esbarra no "Correr" que já existe, e devolver
      // o texto do pedido faria a resposta parecer errada.
      if (!habito) throw conflito('Você já tem um hábito com esse nome');
      return habito;
    },

    async removerHabito(usuarioId: number, habitoId: number): Promise<void> {
      const removeu = await repositorio.removerHabito(usuarioId, habitoId);
      if (!removeu) throw naoEncontrado('Hábito', habitoId);
    },

    async marcarDia(usuarioId: number, habitoId: number, dia: string): Promise<void> {
      // Sem `exigirHabito` antes: o próprio comando de gravação já filtra pelo
      // dono, e ele responde `false` no mesmo caso que o 404 cobriria. Uma
      // consulta a menos e, principalmente, nenhuma janela entre conferir e
      // gravar.
      const marcou = await repositorio.marcarDia(usuarioId, habitoId, dia);
      if (!marcou) throw naoEncontrado('Hábito', habitoId);
    },

    async desmarcarDia(usuarioId: number, habitoId: number, dia: string): Promise<void> {
      // Aqui o `exigirHabito` é necessário, e a assimetria com o `marcarDia`
      // tem motivo: um DELETE que não apagou nada tem duas causas de
      // significados opostos — o hábito não é seu (404) ou o dia simplesmente
      // não estava marcado (204, porque desmarcar o que não está marcado
      // termina no estado pedido). O `changes` sozinho não distingue as duas.
      await exigirHabito(usuarioId, habitoId);
      await repositorio.desmarcarDia(usuarioId, habitoId, dia);
    },

    async resumo(usuarioId: number, habitoId: number, mes: string): Promise<Resumo> {
      const habito = await exigirHabito(usuarioId, habitoId);
      const dias = await repositorio.diasDoMes(usuarioId, habitoId, mes);

      const diasNoMes = contarDiasDoMes(mes);
      const { maior, atual } = calcularSequencias(dias);

      return {
        habito,
        mes,
        diasNoMes,
        diasCumpridos: dias.length,
        // Uma casa decimal: "38.7%" já diz o que "38.70967%" diria, e a conta
        // volta a ser exata porque `Math.round` trabalha sobre inteiro.
        percentual: Math.round((dias.length / diasNoMes) * 1000) / 10,
        dias,
        maiorSequencia: maior,
        sequenciaAtual: atual,
        ultimoDia: dias.at(-1) ?? null,
      };
    },
  };
}

/** Dia 0 do mês seguinte é o último dia deste — evita a tabela de 28/30/31. */
function contarDiasDoMes(mes: string): number {
  const ano = Number(mes.slice(0, 4));
  const numero = Number(mes.slice(5, 7));
  return new Date(Date.UTC(ano, numero, 0)).getUTCDate();
}

/**
 * A metade da conta que NÃO é do banco, e o porquê.
 *
 * "Quantos dias marquei" é agrupar e contar: o banco responde sozinho, e é o
 * que ele faz na listagem de hábitos. "Quantos dias SEGUIDOS" é diferente —
 * depende da relação entre uma linha e a linha anterior, e SQL só responde isso
 * com função de janela, que é bastante máquina para uma resposta que cabe em
 * três linhas de laço.
 *
 * A régua não é "conta no banco" contra "conta no JavaScript", e sim o **tamanho
 * do que se traz**: aqui são no máximo 31 datas, que é o custo de trazer um
 * mês. O relatório da mini 3 vai para o banco pelo mesmo critério, do outro
 * lado — lá seriam 50 mil lançamentos viajando para produzir cinco somas.
 *
 * `dias` chega ordenado do banco, então uma passada basta: a sequência corrente
 * ao fim do laço é a que termina no último dia marcado.
 */
function calcularSequencias(dias: string[]): { maior: number; atual: number } {
  let maior = 0;
  let corrente = 0;
  let anterior: number | null = null;

  for (const dia of dias) {
    const numero = Number(dia.slice(8, 10));
    corrente = anterior !== null && numero === anterior + 1 ? corrente + 1 : 1;
    if (corrente > maior) maior = corrente;
    anterior = numero;
  }

  return { maior, atual: corrente };
}

export type Servico = ReturnType<typeof criarServico>;
