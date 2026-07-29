● Update(exercicios/01-fundamentos-http/solucao/agenda.ts)
  ⎿  Added 1 line, removed 1 line
      44  }
      45  
      46  /** Junta os pedaços (chunks) do body e devolve como texto. */
      47 -async function lerBody(req: import('node:http').IncomingMessage): Promise<string> {                    
      47 +async function lerBody(req: IncomingMessage): Promise<string> {                                        
      48    const pedacos: Buffer[] = [];
      49    for await (const pedaco of req) {
      50      pedacos.push(pedaco as Buffer);

● Write(tsconfig.exercicios.json)
  ⎿  Wrote 11 lines to tsconfig.exercicios.json
       1 // Config para checar os tipos das soluções dos exercícios, que ficam fora
       2 // de src/. Uso: npm run typecheck:ex
       3 {
       4   "extends": "./tsconfig.json",
       5   "compilerOptions": {
       6     "rootDir": "./exercicios",
       7     "noEmit": true
       8   },
       9   "include": ["exercicios/**/*.ts"],
      10   "exclude": []
● Testando a solução contra cada critério de aceite:

● Bash(npm run typecheck:ex 2>&1|tail -6 && echo "TYPECHECK EX OK" && (node
      exercicios/01-fundamentos-http/solucao/agenda.ts &) && sleep 1.3 && B=localhost:4010 && \
      e…)
  ⎿  Error: Exit code 144

     > backend-express@1.0.0 typecheck:ex
     > tsc --noEmit -p tsconfig.exercicios.json

     TYPECHECK EX OK
     Agenda rodando em http://localhost:4010
     1 lista:      200 [{"id":1,"nome":"Ana Souza","email":"ana@exemplo.com"},{"id"
     2 filtro:     [{"id":1,"nome":"Ana Souza","email":"ana@exemplo.com"}]
     3 404:        404
     … +10 lines (ctrl+o to expand)

● Módulo 01 completo — 12/12 critérios passando. Agora o módulo 02:

● Write(src/exemplos/02-node-async/event-loop.ts)
  ⎿  Wrote 66 lines to src/exemplos/02-node-async/event-loop.ts
       1 /**
       2  * Por que "Node é não-bloqueante" — e onde essa promessa quebra.
       3  *
       4  * Rodar:  node src/exemplos/02-node-async/event-loop.ts
       5  */
       6 import { setTimeout as esperar } from 'node:timers/promises';
       7
       8 function agora() {
       9   return new Date().toISOString().slice(11, 23); // só HH:MM:SS.mmm
      10 }
     … +56 lines (ctrl+o to expand)

● Write(src/exemplos/02-node-async/promises.ts)
  ⎿  Wrote 87 lines to src/exemplos/02-node-async/promises.ts
       1 /**
       2  * Callbacks → Promises → async/await, e as armadilhas de erro no caminho.
       3  *
       4  * Rodar:  node src/exemplos/02-node-async/promises.ts
       5  */
       6 import { setTimeout as esperar } from 'node:timers/promises';
       7
       8 type Usuario = { id: number; nome: string };
       9
      10 /** Simula ir ao banco: demora um pouco e às vezes falha. */
     … +77 lines (ctrl+o to expand)

● Bash(npm run typecheck 2>&1|tail -6 && echo "=== event-loop ===" && node src/exemplos/02-node-async/event-loop.ts &&
      echo "=== promises ===" && node src/exemplos/02-…)
  ⎿  > backend-express@1.0.0 typecheck
     > tsc --noEmit
     … +23 lines (ctrl+o to expand)
  ⎿  (timeout 2m)
  ⎿  Allowed by auto mode classifier
  ⎿  You've hit your session limit · resets 9:50pm (UTC)
     /upgrade to increase your usage limit.
