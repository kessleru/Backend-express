/**
 * As regras de negócio. Conceito principal: módulo 08.
 *
 * Este arquivo não conhece `req`, `res` nem status HTTP — quem traduz é
 * `rotas.ts` — e não conhece SQL — quem guarda é `repositorio.ts`. Ele recebe o
 * repositório como argumento em vez de importá-lo: é injeção de dependência sem
 * framework nenhum, e é o que permite testar as regras sem subir banco.
 *
 * A regra que aparece em quase todo método é uma só: **enquete encerrada não
 * muda mais**. Um resultado que ainda pode ser alterado depois de anunciado não
 * é resultado.
 */
import type {
  Enquete,
  EnqueteListada,
  FiltroEnquetes,
  NovaEnquete,
  Opcao,
  OpcaoApurada,
  Repositorio,
  Voto,
} from './dominio.ts';
import { conflito, naoEncontrado } from './erros.ts';

/** Uma opção da apuração com a fatia que ela representa do total. */
export type OpcaoDoResultado = OpcaoApurada & { percentual: number };

export type Resultado = {
  enquete: Enquete;
  /** `true` enquanto a enquete aceita voto: o número ainda vai mudar. */
  parcial: boolean;
  totalVotos: number;
  opcoes: OpcaoDoResultado[];
  vencedora: OpcaoDoResultado | null;
  /** Preenchido só quando duas ou mais opções empatam na frente. */
  empate: OpcaoDoResultado[];
};

export type Cedula = { enquete: Enquete; opcoes: Opcao[] };

export function criarServico(repositorio: Repositorio) {
  /** Toda rota com `:id` começa por aqui: ou existe, ou é 404. */
  async function exigirEnquete(id: number): Promise<Enquete> {
    const enquete = await repositorio.buscarEnquete(id);
    // O serviço lança em vez de devolver `null` para o chamador decidir: assim
    // a decisão "enquete ausente é 404" fica num lugar só.
    if (!enquete) throw naoEncontrado(`Enquete ${id} não existe`);
    return enquete;
  }

  return {
    async listarEnquetes(
      filtro: FiltroEnquetes,
    ): Promise<{ itens: EnqueteListada[]; total: number }> {
      return repositorio.listarEnquetes(filtro);
    },

    async criarEnquete(dados: NovaEnquete): Promise<Cedula> {
      const enquete = await repositorio.criarEnquete(dados);
      return { enquete, opcoes: await repositorio.listarOpcoes(enquete.id) };
    },

    /** A cédula: a pergunta e o que dá para escolher — sem os números. */
    async buscarCedula(id: number): Promise<Cedula> {
      const enquete = await exigirEnquete(id);
      return { enquete, opcoes: await repositorio.listarOpcoes(id) };
    },

    async encerrarEnquete(id: number): Promise<Enquete> {
      await exigirEnquete(id);

      // O repositório devolve `null` quando o UPDATE não achou linha aberta.
      // Como a enquete existe (a linha acima garantiu), a única explicação é
      // que ela já estava encerrada — e isso é 409, não 404: o pedido está
      // perfeito, o estado atual é que recusa.
      const encerrada = await repositorio.encerrarEnquete(id);
      if (!encerrada) throw conflito(`A enquete ${id} já estava encerrada`);
      return encerrada;
    },

    async removerEnquete(id: number): Promise<void> {
      const removeu = await repositorio.removerEnquete(id);
      if (!removeu) throw naoEncontrado(`Enquete ${id} não existe`);
    },

    async votar(enqueteId: number, opcaoId: number, eleitor: string): Promise<Voto> {
      const enquete = await exigirEnquete(enqueteId);
      if (enquete.encerradaEm !== null) {
        throw conflito(`A enquete ${enqueteId} foi encerrada em ${enquete.encerradaEm}`);
      }

      // 404 e não 422: `opcaoId: 99` é um inteiro perfeitamente válido — o
      // formato está certo. O que não existe é o recurso apontado. E a busca é
      // pelo par (enquete, opção): uma opção que existe mas pertence a outra
      // enquete é, para esta URL, uma opção que não existe.
      const opcao = await repositorio.buscarOpcao(enqueteId, opcaoId);
      if (!opcao) {
        throw naoEncontrado(`A opção ${opcaoId} não existe na enquete ${enqueteId}`);
      }

      const voto = await repositorio.registrarVoto(enqueteId, opcaoId, eleitor);
      if (voto) return voto;

      // Chegou aqui, o índice único recusou. A garantia é dele; esta consulta
      // extra existe só para a mensagem dizer em que o eleitor já tinha votado
      // — e ela só roda no caminho de erro, que é raro.
      const anterior = await repositorio.votoDoEleitor(enqueteId, eleitor);
      throw conflito(
        `${eleitor} já votou nesta enquete${anterior ? ` (opção ${anterior.opcaoId})` : ''}`,
      );
    },

    async retirarVoto(enqueteId: number, eleitor: string): Promise<void> {
      const enquete = await exigirEnquete(enqueteId);
      // Trocar de ideia é permitido; mudar o resultado depois do fim não é. Sem
      // esta checagem, uma enquete encerrada continuaria mudando de vencedor
      // enquanto os eleitores retirassem votos.
      if (enquete.encerradaEm !== null) {
        throw conflito(`A enquete ${enqueteId} foi encerrada e não muda mais`);
      }

      const removeu = await repositorio.removerVoto(enqueteId, eleitor);
      if (!removeu)
        throw naoEncontrado(`${eleitor} não tem voto na enquete ${enqueteId}`);
    },

    async resultado(enqueteId: number): Promise<Resultado> {
      const enquete = await exigirEnquete(enqueteId);
      const apuracao = await repositorio.apurar(enqueteId);

      // Somar os grupos aqui não contradiz "a contagem é do banco": o que era
      // caro — percorrer os votos — já aconteceu lá. O que chegou são poucas
      // linhas, uma por opção, e somá-las custa nada.
      const totalVotos = apuracao.reduce((soma, linha) => soma + linha.votos, 0);

      const opcoes: OpcaoDoResultado[] = apuracao.map((linha) => ({
        ...linha,
        // Uma casa decimal, arredondada. As fatias podem somar 99,9% ou 100,1%
        // — com três opções e três votos, cada uma fica com 33,3%. Não é bug:
        // é o que acontece ao representar um terço em decimal, e forçar o
        // fechamento em 100 exigiria mentir em uma das linhas.
        percentual:
          totalVotos === 0 ? 0 : Math.round((linha.votos * 1000) / totalVotos) / 10,
      }));

      // Empate não é detalhe raro: com poucos votos ele é comum, e uma API que
      // devolvesse `vencedora` sempre — a primeira do array — anunciaria uma
      // vitória que não aconteceu. Por isso `vencedora` só é preenchida quando
      // há uma única líder, e as demais saem separadas em `empate`.
      const maisVotos = opcoes.reduce((maior, opcao) => Math.max(maior, opcao.votos), 0);
      const lideres = totalVotos === 0 ? [] : opcoes.filter((o) => o.votos === maisVotos);

      return {
        enquete,
        parcial: enquete.encerradaEm === null,
        totalVotos,
        opcoes,
        vencedora: lideres.length === 1 ? (lideres[0] ?? null) : null,
        empate: lideres.length > 1 ? lideres : [],
      };
    },
  };
}

export type Servico = ReturnType<typeof criarServico>;
