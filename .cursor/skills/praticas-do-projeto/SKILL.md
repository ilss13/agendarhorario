---
name: praticas-do-projeto
description: >-
  Aplica as convenções deste monorepo Nx (NestJS + Angular + contracts Zod).
  Use em qualquer implementação, correção ou refatoração de código em apps/
  ou libs/.
---

# Práticas do projeto

Espelhe o código vizinho. Não introduza Clean Architecture em pastas `domain/`/`application/` — os módulos reais são planos: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.entity.ts`.

## Monorepo

| Onde                    | Responsabilidade                               |
| ----------------------- | ---------------------------------------------- |
| `apps/api`              | NestJS, TypeORM, Firebase Admin, Stripe, filas |
| `apps/web`              | Angular standalone, Tailwind, Material         |
| `libs/shared/contracts` | Zod + tipos compartilhados                     |
| `libs/shared/utils`     | helpers puros                                  |
| `libs/web/data-access`  | HTTP Angular (`inject`, tipos do contrato)     |
| `libs/web/ui`           | componentes reutilizáveis                      |

Imports: respeite fronteiras Nx. Front e API compartilham tipos só via `@agendarhorario/contracts`.

## API (NestJS)

- Feature module em `apps/api/src/modules/<feature>/`.
- Infra compartilhada em `apps/api/src/shared/` (não duplicar Firebase, TypeORM, pipes, guards).
- Validação de input: schema Zod + `ZodValidationPipe`, nunca `class-validator` novo.
- Tenant: `CompanyScoped()` / papéis existentes; não passe `companyId` na mão se o interceptor já preenche o contexto.
- Entidades: estender `BaseEntity` (UUID, timestamps, soft delete, version).
- Erros HTTP: `BadRequestException` / `NotFoundException` / `ConflictException` com mensagem em pt-BR.
- Datas: Luxon, timezone `America/Sao_Paulo`.
- Side effects (e-mail, SMS, Stripe, jobs): no service, não no controller.
- Endpoints públicos: `@Public()`; rate limit (`@Throttle`) em auth/OTP/login.
- Mudança de schema TypeORM: gerar migration; não editar migrations já aplicadas.

## Contratos

- Novo campo/rota: schema Zod + `export type` inferido + testes do schema (sucesso e rejeição).
- Front usa os tipos do contrato; não redeclarar interfaces locais.

## Web (Angular)

- Componentes standalone, `inject()`, signals para estado local/serviços de auth.
- Chamadas HTTP em `libs/web/data-access` (ou `core/` só se o padrão do arquivo vizinho já for esse).
- `withCredentials` / CSRF: siga o `HttpClient` e interceptors já configurados.
- Copy da UI em pt-BR.

## Qualidade

- TypeScript estrito: sem `any` novo; sem `eslint-disable` sem motivo pontual.
- Funções de domínio testáveis: extraia lógica pura (como `computeSlotsForDate`) em vez de inflar o service.
- Não expandir o escopo da tarefa (sem docs markdown extras, sem refactors laterais).
