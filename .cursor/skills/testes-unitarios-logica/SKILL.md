---
name: testes-unitarios-logica
description: >-
  Cria ou atualiza testes unitários Jest com casos de sucesso e falha para
  lógica alterada. Use ao mudar services Nest, funções puras, schemas Zod,
  guards, billing, availability, appointments ou APIs em data-access.
---

# Testes unitários (sucesso e falha)

Coloque o spec ao lado do código: `foo.ts` → `foo.spec.ts`. Rode o projeto Nx afetado (`npx nx test api`, `contracts`, `web-data-access`, …).

## O que testar

Prioridade: **regras de negócio e contratos**, não controllers HTTP nem templates.

| Camada                       | Como                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Função pura / regra extraída | Chamar direto (padrão `availability.service.spec.ts`, `business-hours.service.spec.ts`) |
| Service Nest com I/O         | Mock de repositórios/`DataSource`/deps; exercitar ramos                                 |
| Zod em contracts             | `safeParse`: payload válido e inválido (`auth.spec.ts`)                                 |
| HTTP Angular em data-access  | `HttpTestingController` (`services.api.spec.ts`)                                        |

Não escreva e2e Playwright no lugar de unitário da lógica. Não teste só o caminho feliz.

## Casos mínimos por mudança de lógica

Para cada regra nova ou alterada, cubra **os dois lados**:

1. **Sucesso** — input válido produz o resultado esperado (valor, status de domínio, não-lançamento).
2. **Falha** — input/estado inválido: `toThrow` da exception Nest correta, `safeParse.success === false`, lista vazia, `Conflict`/`NotFound`, etc.

Inclua bordas que o código já trata: overlap, passado, cota, token expirado, tenant errado, campo obrigatório ausente.

## Estilo

- `describe` no nome da unidade; `it` descreve comportamento observável em inglês (como os specs atuais) ou pt-BR se o arquivo vizinho já for pt-BR — **não misture no mesmo arquivo**.
- Sem tempo real: freeze com Luxon/`now` injetado quando a função aceitar.
- Assertar a **exception class** (`toThrow(BadRequestException)`), não só “throw”.
- Um assert principal por caso; evite specs que só espelham a implementação.

## Extração

Se a lógica está presa a repositórios e fica difícil de testar, extraia o núcleo puro (como `validateNoOverlap` / `computeSlotsForDate`) e teste esse núcleo. Não reestruture o módulo inteiro só para testar.

## Fechamento

Execute os testes do alvo alterado. Se falharem, corrija código ou spec antes de encerrar.
