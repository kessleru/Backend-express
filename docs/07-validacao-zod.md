# 07 — Validação e contratos de entrada

**Em uma frase:** um schema Zod descreve o que a entrada pode ser — e o
TypeScript deriva o tipo daquele mesmo schema, sem você escrever duas vezes.

## Por que importa

- **Nunca confie no cliente.** `req.body` é `any`: um objeto que chegou pela rede.
- Validação manual e `type` são duas verdades que divergem no primeiro campo novo.
- Erro de validação bem formatado é a diferença entre o front marcar o campo certo
  e mostrar "algo deu errado".

## Conceitos

### A regra de ouro

Todo dado que vem de fora é suspeito: body, query, params, headers, arquivo,
resposta de API de terceiro. Não porque o usuário é malicioso — mas porque ele é
**um cliente que você não controla**, e um dia vai mandar `horas: "8"`.

Valide quatro coisas: **tipo**, **formato**, **obrigatoriedade** e **limites**.

### A dor sem Zod

```ts
// Módulo 03: 15 linhas por rota, e o tipo é uma segunda verdade
if (typeof titulo !== 'string' || titulo.trim() === '') return res.status(400)...
if (typeof horas !== 'number' || horas <= 0) return res.status(400)...
type Curso = { titulo: string; horas: number }; // ← precisa acompanhar na mão
```

### O ganho: uma fonte de verdade

```ts
export const criarCursoSchema = z
  .object({
    titulo: z.string().trim().min(3, '`titulo` precisa de 3+ caracteres').max(120),
    horas: z.number().int().positive().max(500),
    publicado: z.boolean().default(false),
    nivel: z.enum(['iniciante', 'intermediario', 'avancado']).default('iniciante'),
    contato: z.email().optional(), // no Zod 4; `z.string().email()` está deprecado
  })
  .strict(); // ← rejeita campo desconhecido

export type CriarCurso = z.infer<typeof criarCursoSchema>; // o tipo vem do schema
```

Mudar a regra muda o tipo, e o TypeScript aponta todo lugar que precisa
acompanhar. É o oposto de manter `type` e `validar()` sincronizados na mão.

### `z.input` vs `z.output`

Um schema com `.default()` gera **dois** tipos:

```ts
type Entrada = z.input<typeof criarCursoSchema>; // publicado?: boolean
type Saida = z.output<typeof criarCursoSchema>; // publicado: boolean (garantido)
```

`z.infer` é apelido de `z.output` — é o que você quer 90% das vezes.

### `.strict()` — rejeite o que você não conhece

Sem ele, o Zod **descarta em silêncio** campo desconhecido. O cliente que digitou
`hora` em vez de `horas` recebe "campo obrigatório" sem entender por quê. Com
`.strict()`, ele recebe `Unrecognized key: "hora"`.

Segurança também: sem `.strict()`, `{ ...req.body }` num `Object.assign` pode
escrever campos que você nunca quis expor (`admin: true`).

### Query param: tudo é string

```ts
maxHoras: z.coerce.number().int().positive().optional(), // "5" → 5
```

**Nunca `z.coerce.boolean()` em query:** `Boolean("false") === true`, então
`?publicado=false` filtraria os publicados. Mapeie explicitamente:

```ts
publicado: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
```

### A armadilha do `.partial()` para PATCH

```ts
const atualizar = criarCursoSchema.partial(); // ❌ parece certo, não é
```

`.partial()` torna o campo opcional, **mas o `.default()` continua valendo**. Um
`PATCH { "horas": 6 }` sai da validação com `publicado: false` e
`nivel: 'iniciante'` — e sobrescreve o que estava salvo. PATCH que apaga campo em
silêncio é dos bugs mais difíceis de perceber.

Correto: monte o schema de atualização a partir dos campos **sem** default.

```ts
const campos = { titulo: z.string()..., publicado: z.boolean() }; // sem default
export const criarSchema = z.object({ ...campos, publicado: campos.publicado.default(false) });
export const atualizarSchema = z.object(campos).partial().strict();
```

### O middleware `validar(schema, fonte)`

```ts
export function validar(schema: ZodType, fonte: 'body' | 'query' | 'params' = 'body') {
  return (req, res, next) => {
    const resultado = schema.safeParse(req[fonte]);
    if (!resultado.success) {
      throw new AppError('Dados inválidos', 400, formatarErros(resultado.error));
    }
    res.locals.validados = { ...res.locals.validados, [fonte]: resultado.data };
    next();
  };
}
```

Dois detalhes fáceis de errar:

**`req.body ?? {}`.** Sem `Content-Type: application/json`, o Express 5 deixa
`req.body` como `undefined` ([módulo 03](./03-express-basico.md)). Passar
`undefined` a um `z.object()` produz `expected object, received undefined` — e o
cliente não descobre qual campo falta. Com `{}`, ele recebe a lista de campos
obrigatórios.

**Não faça `req[fonte] = resultado.data`** — e é o que quase todo tutorial faz.
No Express 5 isso explode para query:

```
TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
```

O Express 5 transformou `req.query` em getter com parse lazy. `req.body` ainda é
gravável, `req.query` não. Guardar em `res.locals` funciona para as três fontes e
preserva o dado original (útil em log de auditoria).

Para ler com tipo, sem `as`:

```ts
export function validados<T>(res: Response, _schema: ZodType<T>, fonte = 'body'): T {
  // o schema é passado de novo só para o TS inferir o retorno
}

const { id } = validados(res, idSchema, 'params'); // id: number
```

### `parse` vs `safeParse`

|                | Comportamento                               | Quando usar                                   |
| -------------- | ------------------------------------------- | --------------------------------------------- |
| `parse(x)`     | Lança `ZodError`                            | Script, seed, código que já está em try/catch |
| `safeParse(x)` | `{ success, data }` \| `{ success, error }` | Middleware — você quer traduzir o erro        |

### Formato do erro

```json
{
  "erro": "Dados inválidos",
  "status": 400,
  "detalhes": [
    {
      "campo": "titulo",
      "mensagem": "`titulo` precisa de 3+ caracteres",
      "codigo": "too_small"
    },
    { "campo": "horas", "mensagem": "`horas` deve ser positivo", "codigo": "too_small" }
  ]
}
```

O Zod devolve **todos** os problemas de uma vez, não só o primeiro — o usuário
corrige o formulário inteiro numa passada. E `campo` é o que permite ao front
marcar o input certo.

### Validação vs regra de negócio

|                    | Validação             | Regra de negócio                       |
| ------------------ | --------------------- | -------------------------------------- |
| Pergunta           | "Está bem formado?"   | "É permitido agora?"                   |
| Precisa dos dados? | Não                   | Sim                                    |
| Exemplo            | `titulo` tem 3+ chars | Não existe outro curso com esse título |
| Onde               | Schema, no middleware | Service / handler                      |
| Status             | `400`                 | `409`, `403`, `422`                    |

O Zod não tem como saber que o título já existe. Não tente forçá-lo com
`.refine()` assíncrono acessando o banco: isso mistura camadas e torna o schema
impossível de reusar em teste.

`.refine()` serve para regra entre **campos da mesma entrada**:

```ts
z.object({ inicio: z.coerce.date(), fim: z.coerce.date() }).refine(
  (d) => d.fim > d.inicio,
  { message: '`fim` deve ser depois', path: ['fim'] },
);
```

O `path` é o que faz o erro apontar para um campo — sem ele o front não sabe onde
marcar.

## Na prática

```bash
node src/exemplos/07-validacao/servidor.ts
```

```bash
B=localhost:5055
curl "$B/cursos?maxHoras=5"          # coerce: "5" → 5
curl "$B/cursos?publicado=false"     # o boolean feito à mão
curl "$B/cursos?maxHoras=abc"        # 400 com campo e código
curl $B/cursos/abc                   # 400: id não é número

curl -X POST $B/cursos -H 'Content-Type: application/json' \
  -d '{"titulo":"  Zod na prática  ","horas":3,"ano":2026}'   # trim + defaults

curl -X POST $B/cursos -H 'Content-Type: application/json' \
  -d '{"titulo":"ab","horas":-1,"ano":1200}'    # TRÊS erros de uma vez

curl -X POST $B/cursos -H 'Content-Type: application/json' \
  -d '{"titulo":"Teste ok","hora":3,"ano":2026}' # strict: Unrecognized key "hora"

curl -X PATCH $B/cursos/1 -H 'Content-Type: application/json' -d '{"horas":6}'
# ↑ confirme que `publicado` NÃO virou false

curl -X POST $B/periodos -H 'Content-Type: application/json' \
  -d '{"inicio":"2026-03-01","fim":"2026-01-01"}'  # refine
```

## Erros comuns

| Erro                                | O que acontece                        | Correção                    |
| ----------------------------------- | ------------------------------------- | --------------------------- |
| Confiar em `req.body`               | É `any`; qualquer coisa passa         | Sempre um schema            |
| Sem `.strict()`                     | Campo com typo é descartado calado    | `.strict()`                 |
| `criarSchema.partial()` no PATCH    | Defaults sobrescrevem o salvo         | Campos sem default          |
| `req.query = data` no Express 5     | `TypeError`: só tem getter            | `res.locals`                |
| `safeParse(req.body)` sem `?? {}`   | "expected object, received undefined" | `req.body ?? {}`            |
| `z.coerce.boolean()` em query       | `"false"` vira `true`                 | `enum + transform`          |
| `z.number()` em query               | Sempre falha: chega string            | `z.coerce.number()`         |
| Só o primeiro erro na resposta      | Usuário corrige um por vez            | Devolva `issues` inteiro    |
| Erro sem nome de campo              | Front não sabe onde marcar            | `path` no `.refine()`       |
| `.refine()` batendo no banco        | Schema deixa de ser testável          | Regra de negócio no service |
| Validar só na entrada, tipar na mão | Duas verdades divergem                | `z.infer`                   |

## Cheatsheet

```ts
z.string().trim().min(3).max(120).email().url().uuid().regex(/x/)
z.number().int().positive().min(0).max(100)
z.boolean()  z.date()  z.literal('x')
z.enum(['a', 'b'])                       // sem `enum` do TypeScript
z.array(z.string()).min(1).max(5)
z.object({}).strict()                    // rejeita chave extra
z.coerce.number()                        // "5" → 5   (para query/params)

.optional()   // pode faltar → undefined
.nullable()   // aceita null
.default(x)   // pode faltar → x na saída
.transform(fn) .refine(fn, { message, path })
schema.partial()  .pick({a:true})  .omit({b:true})  .extend({c:...})

schema.parse(x)      // lança ZodError
schema.safeParse(x)  // { success, data | error }
z.infer<typeof s>    // = z.output; o tipo derivado
z.input<typeof s>    // antes dos defaults
```

```
FLUXO
  requisição → validar(schema) → res.locals.validados → handler → service
                     ↓ falhou
                AppError 400 + detalhes[] → tratador (módulo 06)
```

## Pratique

👉 [`exercicios/07-validacao/`](../exercicios/07-validacao/)
