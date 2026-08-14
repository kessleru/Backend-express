import { setTimeout as esperar } from 'node:timers/promises';

async function buscarPreco(sku: string): Promise<number> {
  await esperar(250);
  if (sku.startsWith('X')) throw new Error(`SKU inexistente: ${sku}`);
  return Math.random() * 100;
}

async function buscarPrecosEmSerie(skus: string[]): Promise<[number[], number]> {
  const inicio = performance.now();
  const precos: number[] = [];
  for (const sku of skus) {
    precos.push(await buscarPreco(sku));
  }
  return [precos, performance.now() - inicio];
}

async function buscarPrecosEmParalelo(skus: string[]): Promise<[number[], number]> {
  const inicio = performance.now();
  const precos = await Promise.all(skus.map((sku) => buscarPreco(sku)));
  return [precos, performance.now() - inicio];
}

// `Promise.all` é tudo-ou-nada: um SKU que falha descarta os preços que já
// tinham voltado. O `allSettled` nunca rejeita — devolve o status de cada uma,
// e quem decide o que fazer com a falha é você, não a Promise.
async function buscarPrecosTolerante(
  skus: string[],
): Promise<{ ok: Record<string, number>; falhas: string[] }> {
  const resultados = await Promise.allSettled(skus.map((sku) => buscarPreco(sku)));

  const ok: Record<string, number> = {};
  const falhas: string[] = [];

  for (const [i, resultado] of resultados.entries()) {
    const sku = skus[i]!;
    if (resultado.status === 'fulfilled') ok[sku] = resultado.value;
    else falhas.push(sku);
  }

  return { ok, falhas };
}

const skusValidos = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
const skusComInvalido = ['A1', 'X9', 'A3'];

const formatar = (precos: number[]) => precos.map((p) => p.toFixed(2)).join(', ');

// As chamadas ficam num `main` sequencial porque medir tempo exige isolamento:
// rodando série e paralelo ao mesmo tempo, as duas disputam o mesmo event loop
// e os números deixam de significar o que a gente quer comparar.
async function main(): Promise<void> {
  const [precosSerie, msSerie] = await buscarPrecosEmSerie(skusValidos);
  console.log(`Preços em série    → ${formatar(precosSerie)} (${msSerie.toFixed(1)}ms)`);

  const [precosParalelo, msParalelo] = await buscarPrecosEmParalelo(skusValidos);
  console.log(
    `Preços em paralelo → ${formatar(precosParalelo)} (${msParalelo.toFixed(1)}ms)`,
  );

  console.log(`Ganho              → ${(msSerie / msParalelo).toFixed(1)}× mais rápido`);

  // o `await` tem que estar DENTRO do try: fora dele o catch não pega a
  // rejeição, porque a Promise só rejeita depois que o bloco já terminou.
  try {
    await buscarPrecosEmParalelo(skusComInvalido);
    console.log('esta linha não roda');
  } catch (erro: unknown) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    console.log(`Paralelo falhou    → ${msg} (e o preço de A1 foi junto)`);
  }

  const { ok, falhas } = await buscarPrecosTolerante(skusComInvalido);
  console.log(
    `Tolerante          → ok: ${JSON.stringify(ok)} · falhas: [${falhas.join(', ')}]`,
  );
}

// `main().catch()` em vez de await solto: garante que uma rejeição inesperada
// apareça como erro tratado, e não como unhandled rejection derrubando o processo.
main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exitCode = 1;
});

// Como executar: `node src/playground/02-async/precos.ts`
// O Node 24 roda .ts direto, apagando os tipos — sem tsx, ts-node ou build.
