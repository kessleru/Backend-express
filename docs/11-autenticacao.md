# 11 — Autenticação e autorização

**Em uma frase:** autenticação responde **quem você é** (401); autorização
responde **o que você pode** (403). São duas perguntas e dois middlewares.

## Por que importa

- É o ponto onde um erro custa caro — vazamento de senha não tem rollback.
- 401 e 403 trocados fazem o cliente tentar consertar a coisa errada.
- Quase todo tutorial ensina JWT em localStorage, que é exatamente o que XSS rouba.

## Conceitos

### As duas palavras

|            | Autenticação        | Autorização            |
| ---------- | ------------------- | ---------------------- |
| Pergunta   | Quem é você?        | Você pode isso?        |
| Falha      | `401 Unauthorized`  | `403 Forbidden`        |
| Como       | Senha, token, OAuth | Papel, dono do recurso |
| Middleware | `autenticar`        | `exigirPapel('admin')` |

```mermaid
flowchart TD
    R([requisição]) --> A{"tem token válido?"}
    A -- não --> E401["401 Unauthorized<br/><i>não sei quem você é</i>"]
    A -- sim --> B{"o papel permite?"}
    B -- não --> E403["403 Forbidden<br/><i>sei quem você é, e você não pode</i>"]
    B -- sim --> OK([handler])
    style E401 fill:#fed7aa,stroke:#ea580c,color:#000
    style E403 fill:#fecaca,stroke:#dc2626,color:#000
    style OK fill:#bbf7d0,stroke:#16a34a,color:#000
```

> **Nota:**
> O nome `401 Unauthorized` no padrão HTTP é infeliz: ele é sobre
> **autenticação**.

### Hash de senha: por que não SHA-256

SHA-256 foi feito para ser **rápido** — o que se quer de um hash de arquivo. Para
senha, rapidez é o defeito: uma GPU calcula bilhões por segundo, e testar um
vazamento inteiro leva horas.

Argon2 e bcrypt foram feitos para ser **lentos e consumir memória**, de propósito.
Medido neste repo:

```
SHA-256: 0.650ms
Argon2:  199.6ms   (307× mais lento — de propósito)
```

|                 | Use                                                           |
| --------------- | ------------------------------------------------------------- |
| **argon2id**    | Recomendação atual (OWASP). Resiste a GPU e a canal lateral.  |
| **bcrypt**      | Padrão anterior, ainda onipresente. Você vai achar em legado. |
| **SHA-\*, MD5** | **Nunca** para senha.                                         |

> **Cuidado:**
> `SHA-256`, `MD5` e qualquer hash rápido para senha significam que um vazamento
> do seu banco é quebrado em horas numa GPU alugada por hora.

### Salt

```
$argon2id$v=19$m=19456,p=1,t=2$iVBNhaju9pEdn24M43b2kg$XvXUN5wpG2xbUsJ...
 algoritmo  versão   parâmetros        salt                  hash
```

O salt é gerado por senha e **embutido no resultado** — daí `verify` não pedir
salt. É por isso que dois usuários com a mesma senha têm hashes diferentes, e é o
que impede uma rainbow table de servir para todos de uma vez.

```ts
await argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });
await argon2.verify(hash, senha); // recalcula com o salt embutido
```

`memoryCost` é o parâmetro que mais importa: GPU tem muitos cores e pouca RAM por
core, então exigir memória é o que a atrapalha.

### Comparação em tempo constante

Para segredos que **não** são senha (API key, assinatura de webhook), não se usa
hash lento — mas `===` vaza informação pelo **tempo**: ele para no primeiro byte
diferente. Com medições suficientes, dá para descobrir a chave caractere por
caractere.

```ts
import { timingSafeEqual, createHash } from 'node:crypto';
timingSafeEqual(Buffer.from(a), Buffer.from(b)); // exige mesmo tamanho
```

Como o próprio tamanho vaza, compare o hash de cada um — hashes têm tamanho fixo.

### Sessão com cookie vs JWT

|                     | Sessão no servidor              | JWT                        |
| ------------------- | ------------------------------- | -------------------------- |
| Estado              | No servidor (banco/Redis)       | No token                   |
| Verificar           | Consulta o estado               | Só a assinatura            |
| Revogar             | Imediato: apaga a sessão        | **Impossível** até expirar |
| Escala horizontal   | Precisa de estado compartilhado | Nenhuma coordenação        |
| Tamanho por request | Um id                           | O payload inteiro          |

> **Importante:**
> **A escolha honesta:** para um monolito com um banco, **sessão é mais simples e
> mais segura**. JWT ganha quando há vários serviços que precisam validar sem
> consultar um autenticador central. "É stateless" é a vantagem real; "é moderno"
> não é argumento.

**O princípio: você troca revogação por escala, e não dá para ter as duas.**

A tabela acima é uma escolha só, vista de vários ângulos. Se a prova de identidade
está **no token**, qualquer instância a verifica sozinha (escala) — e ninguém
consegue cancelá-la (revogação). Se está **no servidor**, cancelar é apagar uma
linha — e toda requisição paga uma consulta.

O access + refresh deste módulo não é um terceiro caminho: é escolher os dois em
momentos diferentes.

| Token   | Onde está a verdade | Verificação   | Revogável? | Frequência de uso |
| ------- | ------------------- | ------------- | ---------- | ----------------- |
| Access  | no token            | só assinatura | não        | toda requisição   |
| Refresh | no servidor         | consulta      | **sim**    | a cada 15 min     |

O custo do estado é pago 1× a cada 15 minutos em vez de a cada requisição, e a
janela de estrago de um token roubado fica limitada a 15 minutos. É engenharia,
não mágica — e continua sendo verdade que **revogação instantânea exige estado
consultado sempre**.

> **Cuidado:**
> O erro de julgamento mais comum aqui: adotar JWT para "escalar" um sistema que
> tem um banco só e 200 usuários, e depois adicionar uma lista de revogação
> consultada em toda requisição para conseguir deslogar alguém. Nesse ponto você
> tem o custo da sessão **e** a complexidade do JWT. Se esse é o requisito,
> sessão era a resposta desde o começo.

### Anatomia de um JWT

```
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiI0MiIsInBhcGVsIjoiYWRtaW4ifQ . -5YlZAEc-wLwLhNJ
      header                        payload                        signature
```

> **Cuidado:**
> **O payload não é criptografado — é base64.** Qualquer um com o token lê tudo
> (cole em jwt.io). A assinatura garante que não foi **alterado**, não que seja
> **secreto**.

O que **não** colocar: senha, CPF, e-mail, endereço, saldo. O que colocar: `sub`
(id), `papel`, e o mínimo para autorizar sem bater no banco.

`verify` confere assinatura **e** expiração.

> **Cuidado:**
> **`decode` não verifica nada** — usar `decode` no lugar de `verify` é a falha
> mais grave que se comete com JWT: aceita qualquer token que qualquer um montou.

### Access + refresh

| Token       | Vida   | Vai onde              | Guardado no banco?          |
| ----------- | ------ | --------------------- | --------------------------- |
| **ACCESS**  | 15 min | Toda requisição       | Não — só a assinatura       |
| **REFRESH** | 7 dias | Só na rota de refresh | **Sim**, indexado por `jti` |

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant A as API
    participant D as Banco
    C->>A: POST /auth/login
    A->>D: guarda o refresh (jti)
    A-->>C: access (memória) + refresh (cookie httpOnly)
    C->>A: GET /eu — Bearer access
    Note over A: verify local, sem tocar no banco
    C->>A: POST /auth/refresh (expirou o access)
    A->>D: o jti ainda vale?
    A->>D: invalida o antigo, grava o novo
    A-->>C: access novo + refresh novo (rotação)
    C->>A: POST /auth/logout
    A->>D: apaga o jti
    Note over C,D: 🔒 agora o refresh copiado não vale mais
```

> **Importante:**
> O refresh estar no banco é o que **torna o logout possível**. Sem essa tabela,
> "logout" é só o front esquecer o token — e quem tivesse copiado continuaria
> dentro.

**Rotação:** cada refresh usado é invalidado e um novo emitido. Detecta roubo: se
o atacante copiou o refresh e o usuário legítimo o usa, o do atacante morre (e
vice-versa).

### Onde guardar o token no cliente

| Onde                  | XSS rouba?         | CSRF?            | Veredicto                  |
| --------------------- | ------------------ | ---------------- | -------------------------- |
| `localStorage`        | **Sim**            | Não              | ❌ o mais ensinado, o pior |
| Cookie normal         | Sim                | Sim              | ❌                         |
| Cookie `httpOnly`     | **Não**            | Sim → `SameSite` | ✅ para o refresh          |
| Memória (variável JS) | Só enquanto aberta | Não              | ✅ para o access           |

```ts
res.cookie('refreshToken', refresh, {
  httpOnly: true, // JS da página NÃO lê — a defesa contra XSS
  secure: process.env.NODE_ENV === 'production', // só HTTPS
  sameSite: 'strict', // defesa contra CSRF
  path: '/auth', // só vai nas rotas que precisam
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

> **Atenção:**
> `secure: true` em `http://localhost` faz o cookie **não ser enviado** e você
> perde uma tarde. Daí o condicional.

`sameSite`: `strict` (nunca de outro site), `lax` (só GET de navegação — padrão
razoável), `none` (sempre; exige `secure`, para front em outro domínio).

> **Dica:**
> Para limpar, repita o `path` — sem ele o navegador não acha o cookie e ele fica
> lá.

### Mensagem de erro no login

```ts
if (!usuario || !(await conferirSenha(usuario.senhaHash, senha))) {
  throw naoAutenticado('E-mail ou senha inválidos'); // ← genérica, de propósito
}
```

"E-mail não encontrado" vs "senha incorreta" entrega quais e-mails existem, e o
atacante passa a mirar só nas contas reais.

> **Nota:**
> **Nota honesta:** como o `verify` do Argon2 leva ~200 ms e o "usuário não
> existe" responde na hora, o **tempo** ainda vaza. A defesa completa é rodar um
> hash falso quando o usuário não existe.

O mesmo dilema no registro: `409 E-mail já cadastrado` confirma que a conta
existe. A alternativa segura (responder 201 e mandar um e-mail para o dono) é mais
complexa. Escolha consciente, não por acidente.

### RBAC

```ts
export function exigirPapel(...papeis: Papel[]) {
  return (_req, res, next) => {
    const usuario = res.locals.usuario;
    if (!usuario) throw naoAutenticado('Rota protegida sem autenticar');
    if (!papeis.includes(usuario.papel))
      throw semPermissao(`Exige: ${papeis.join(', ')}`);
    next();
  };
}

app.get('/admin/usuarios', autenticar, exigirPapel('admin'), handler); // ORDEM importa
```

O papel vindo do token dispensa consultar o banco a cada requisição. A
contrapartida: rebaixar alguém só tem efeito quando o access dele expirar (15 min).
Se isso é inaceitável, o papel vem do banco — e você troca latência por revogação
imediata. Decisão de produto.

> **Importante:**
> Além de papel, existe autorização **por dono do recurso** ("só o autor edita
> seu post"), que precisa buscar o recurso — e portanto mora no service
> ([módulo 08](./08-arquitetura-em-camadas.md)), não num middleware.

### OAuth2 em visão geral

Serve para **entrar com Google/GitHub** sem a senha passar por você.

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuário
    participant A as Sua API
    participant G as Google
    U->>A: "entrar com Google"
    A-->>U: redireciona (client_id + PKCE)
    U->>G: autoriza
    G-->>A: volta com um `code`
    A->>G: troca o code por token (server-to-server, client_secret)
    G-->>A: token + e-mail
    A->>A: cria ou acha o usuário
    A-->>U: emite o SEU JWT
```

> **Atenção:**
> O fluxo é o **Authorization Code + PKCE**. Nunca use o "implicit flow", que
> está depreciado. A troca do code acontece no servidor porque envolve o
> `client_secret`.

O ponto que costuma passar batido: o token do Google serve para provar identidade
**uma vez**; a sessão da sua API continua sendo sua.

## Na prática

```bash
node src/exemplos/11-auth/senhas.ts   # SHA vs Argon2 medido, salt, timing-safe
node src/exemplos/11-auth/tokens.ts   # anatomia do JWT, forjar, expirar
```

```bash
node src/exemplos/11-auth/servidor.ts
```

```bash
B=localhost:5059
CT='Content-Type: application/json'

curl -X POST $B/auth/registrar -H "$CT" -d '{"email":"admin@x.com","senha":"senha12345"}'
curl -X POST $B/auth/login -H "$CT" -d '{"email":"admin@x.com","senha":"errada123"}'  # 401 genérico

# guarda o cookie httpOnly em cookies.txt e mostra o access token
curl -c cookies.txt -X POST $B/auth/login -H "$CT" \
  -d '{"email":"admin@x.com","senha":"senha12345"}'

TK='<cole o accessToken>'
curl -H "Authorization: Bearer $TK" $B/eu
curl -H "Authorization: Bearer $TK" $B/admin/usuarios

curl -b cookies.txt -c cookies.txt -X POST $B/auth/refresh   # rotaciona
curl -b cookies.txt -X POST $B/auth/logout                   # 204
curl -b cookies.txt -X POST $B/auth/refresh                  # 401 revogado
```

> **Dica:**
> Repare em `tokens.ts`: o payload é decodificado **sem o segredo**, e o token
> forjado é recusado pela assinatura. As duas coisas juntas explicam o que um JWT
> garante e o que não garante.

## Erros comuns

| Erro                           | O que acontece                  | Correção                        |
| ------------------------------ | ------------------------------- | ------------------------------- |
| SHA-256 para senha             | Vazamento quebrado em horas     | Argon2 / bcrypt                 |
| Salt fixo ou nenhum            | Rainbow table serve para todos  | O argon2 já gera por senha      |
| `decode` no lugar de `verify`  | Aceita token forjado            | Sempre `verify`                 |
| Dado sensível no payload       | É base64: qualquer um lê        | Só `sub` e `papel`              |
| Token em `localStorage`        | XSS rouba                       | Cookie `httpOnly` (refresh)     |
| JWT sem expiração              | Token vazado vale para sempre   | `expiresIn` curto               |
| Refresh não guardado           | Logout não existe               | Tabela de `jti`                 |
| "E-mail não encontrado"        | Enumeração de usuários          | Mensagem genérica               |
| 403 em token expirado          | Cliente conserta a coisa errada | 401                             |
| `exigirPapel` sem `autenticar` | Passa por omissão               | Checar `res.locals` e 401       |
| `secure: true` em localhost    | Cookie nunca é enviado          | Condicional por ambiente        |
| `clearCookie` sem o `path`     | O cookie continua lá            | Mesmas opções do original       |
| Senha em log                   | Vaza no arquivo de log          | Nunca logue o corpo do login    |
| `senhaHash` na resposta        | Vazamento direto                | Montar o objeto campo por campo |
| `JWT_SECRET` com fallback      | Deploy com o segredo de exemplo | Falhar ao subir                 |
| Segredo curto                  | Força bruta na assinatura       | 32+ bytes aleatórios            |

## Cheatsheet

```ts
// senha
await argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19456 });
await argon2.verify(hash, senha);

// token
jwt.sign(payload, SEGREDO, { expiresIn: '15m', issuer, audience });
jwt.verify(token, SEGREDO, { issuer, audience }); // NUNCA jwt.decode

// cookie
res.cookie(nome, valor, { httpOnly, secure, sameSite, path, maxAge });
res.clearCookie(nome, { path }); // repita o path!
app.use(cookieParser()); // sem isto req.cookies é undefined

// middlewares, nesta ordem
app.get('/x', autenticar, exigirPapel('admin'), handler);
```

```bash
# gerar um segredo de verdade
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Situação                              | Status                       |
| ------------------------------------- | ---------------------------- |
| Sem token / token inválido / expirado | `401`                        |
| Token ok, papel insuficiente          | `403`                        |
| Login com senha errada                | `401` (mensagem genérica)    |
| E-mail já cadastrado                  | `409` (com a ressalva acima) |

## Os princípios deste módulo

| Princípio                                                                                     | Onde reaparece |
| --------------------------------------------------------------------------------------------- | -------------- |
| **A senha nunca é armazenada** — nem criptografada. Guarda-se um hash de via única.           | 13             |
| **Defesa por custo assimétrico:** você paga uma vez, o atacante paga bilhões.                 | 13             |
| **Um canal lateral vaza tanto quanto a mensagem** — tempo, tamanho e status contam história.  | 13, 14         |
| **Nada que identifica o autor da ação vem do cliente.**                                       | 12, 13         |
| **Autorização por papel cabe no middleware; por dono, não** — ela depende dos dados.          | 08, 12         |
| **Na dúvida, feche a porta** (fail closed). Checagem que libera ao falhar é pior que nenhuma. | 13             |
| **Operação que muda credencial pede a credencial de novo.**                                   | —              |
| **Falhe ao subir sem segredo** em vez de usar um de exemplo.                                  | 06, 16         |

## Pratique

👉 [`exercicios/11-auth/`](../exercicios/11-auth/)
