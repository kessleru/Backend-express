# 🏋️ Exercícios

Um exercício por módulo. É a parte que fixa o conteúdo.

## Como funciona

```mermaid
flowchart LR
    D["1 · docs/NN-*.md"] --> E["2 · enunciado"] --> P["3 · resolva em<br/><b>src/playground/</b>"]
    P --> C["4 · critérios de aceite"] --> S["5 · só agora:<br/>solucao/"]
    style P fill:#fde68a,stroke:#d97706,color:#000
    style S fill:#e5e7eb,stroke:#9ca3af,color:#000
```

> **Dica:**
> Travou? Cada enunciado tem dicas progressivas escondidas em blocos `<details>`
> — abra **uma de cada vez**. Elas estão ordenadas do empurrãozinho ao quase
> código pronto.

## Regras

| Regra                          | Por quê                                          |
| ------------------------------ | ------------------------------------------------ |
| Tente antes de olhar a solução | Ler a resposta pronta não ensina. Erre primeiro. |
| Resolva no `playground/`       | A pasta do exercício é material de referência.   |
| Não pule exercícios            | Cada um usa o que o anterior construiu.          |
| Não existe uma resposta certa  | A solução é _uma_ forma. Diferente ≠ errado.     |

## O projeto contínuo

A partir do módulo 03, os exercícios param de ser soltos e viram **uma API de
biblioteca** que cresce a cada módulo:

```mermaid
flowchart LR
    A["03–04<br/>CRUD em memória"] --> B["05–07<br/>middlewares<br/>erros · validação"]
    B --> C["08<br/>camadas"] --> D["09–10<br/>SQLite → Prisma"]
    D --> E["11<br/>login e empréstimos"] --> F["12<br/>testes"]
    F --> G["13–16<br/>produção"] --> H["17–20<br/>filas · tempo real<br/>upload · docs"]
    style A fill:#dbeafe,stroke:#2563eb,color:#000
    style H fill:#bbf7d0,stroke:#16a34a,color:#000
```

| Módulos | O que você constrói                               |
| ------- | ------------------------------------------------- |
| 03–04   | CRUD de livros com dados em memória               |
| 05–07   | Middlewares, tratamento de erros e validação      |
| 08      | Refatoração em camadas                            |
| 09–10   | Persistência em SQLite, depois Prisma             |
| 11      | Usuários, login e empréstimos protegidos          |
| 12      | Suíte de testes                                   |
| 13–16   | Segurança, logs, cache e deploy                   |
| 17–20   | Filas, tempo real, upload de capas e documentação |

No fim você não tem 20 exercícios avulsos — tem uma API completa, feita por você.

> **Importante:**
> Mantenha tudo em `src/playground/biblioteca/`. Cada exercício continua o
> anterior — se você espalhar em pastas soltas, o módulo seguinte não encaixa.
