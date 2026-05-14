# Plano — Sistema de Agendamento de Horários

## Contexto

Projeto greenfield (apenas `.git` e `prompt.txt` vazio em `/Users/igorsousa/Projects/agendarhorario`). O objetivo é construir uma plataforma SaaS multi-tenant onde **empresas** se cadastram, configuram serviços/horários e expõem uma **página pública** de agendamento. Clientes podem agendar **com ou sem login**; quando sem login, devem validar e-mail (link) ou telefone (SMS OTP) antes de confirmar. Empresas e clientes têm dashboards distintos. Sistema envia avisos por e-mail/SMS/WhatsApp com link de **confirmação ou cancelamento** de presença.

### Decisões já tomadas (confirmadas com o usuário)

- **Monorepo Nx** com `apps/api` (NestJS) e `apps/web` (Angular) + libs compartilhadas
- **Multi-tenancy**: single DB MySQL, isolamento por `company_id` (TypeORM)
- **Auth**: Firebase Authentication — frontend nunca chama Firebase direto, sempre via nosso backend (Firebase Admin SDK)
- **Notificações**: SendGrid (email) + Twilio (SMS) + Twilio WhatsApp
- **Deploy**: GCP — Cloud Run (API) + Cloud SQL MySQL + Firebase Hosting (Angular)
- **Sem pagamentos online** no MVP
- **Sem sync de calendário externo** no MVP
- **pt-BR**, timezone `America/Sao_Paulo`
- **Escopo único**: todo o brief em uma release (com fases internas de execução)

---

## 1. Estrutura do Monorepo (Nx)

```
agendarhorario/
├── apps/
│   ├── api/                        # NestJS
│   └── web/                        # Angular
├── libs/
│   ├── shared/
│   │   ├── contracts/              # DTOs/tipos compartilhados (zod schemas)
│   │   └── utils/                  # helpers puros (formato data BR, etc.)
│   └── web/
│       ├── ui/                     # design system / componentes Angular reutilizáveis
│       └── data-access/            # serviços HTTP/state do front
├── tools/                          # scripts de migração, seed, etc.
├── docker-compose.yml              # MySQL local + mailhog para dev
├── nx.json / package.json / tsconfig.base.json
└── .github/workflows/              # CI: lint, test, build, deploy
```

**Por que Nx**: gera os dois apps com presets, cache de build, libs com fronteiras de imports (`nx-enforce-module-boundaries`), e gera schematics consistentes.

---

## 2. Backend (`apps/api`) — NestJS + Clean Architecture

### 2.1 Camadas (por módulo de domínio)

Seguir **arquitetura em camadas com DDD-leve**, organizada por _feature module_:

```
apps/api/src/
├── modules/
│   ├── auth/                       # Firebase ID-token verification + sessões
│   ├── companies/                  # cadastro/config da empresa (tenant)
│   ├── services/                   # serviços oferecidos (corte, manicure, etc.)
│   ├── business-hours/             # horários de atendimento + bloqueios/feriados
│   ├── availability/               # cálculo de slots disponíveis (read model)
│   ├── appointments/               # criação, remarcação, cancelamento, confirmação
│   ├── customers/                  # clientes (logados ou não)
│   ├── verification/               # OTP (email link + SMS token)
│   ├── notifications/              # email/SMS/WhatsApp + jobs agendados
│   └── webhooks/                   # callbacks Twilio (delivery), Firebase, etc.
├── shared/
│   ├── domain/                     # base classes (Entity, ValueObject, DomainError)
│   ├── infra/
│   │   ├── firebase/               # FirebaseAdminService (init + auth)
│   │   ├── typeorm/                # DataSource, BaseEntity (soft delete)
│   │   ├── http/                   # interceptors, filters globais
│   │   └── queue/                  # BullMQ + Redis (jobs notificação/lembrete)
│   └── config/                     # @nestjs/config + Joi validation
└── main.ts
```

Cada _feature module_ contém:

- `domain/` — entidades + value objects + interfaces de repositório
- `application/` — use cases (services com lógica de aplicação) + DTOs
- `infrastructure/` — implementação TypeORM dos repositórios, integrações externas
- `presentation/` — controllers REST + DTOs de entrada/saída (class-validator)

### 2.2 Stack do backend

| Concern          | Lib                                                                           |
| ---------------- | ----------------------------------------------------------------------------- |
| Framework        | `@nestjs/*`                                                                   |
| ORM              | `typeorm` + `@nestjs/typeorm` (driver `mysql2`)                               |
| Auth             | `firebase-admin` (verifyIdToken) + Guards Nest                                |
| Validation       | `class-validator` + `class-transformer` (também `zod` em DTOs compartilhados) |
| Configuração     | `@nestjs/config` + `joi`                                                      |
| Logs             | `nestjs-pino` (JSON estruturado, request-id)                                  |
| Rate limit       | `@nestjs/throttler`                                                           |
| Security headers | `helmet`, `compression`                                                       |
| Filas/Jobs       | `bullmq` + Redis (Memorystore em prod)                                        |
| Email            | `@sendgrid/mail`                                                              |
| SMS/WhatsApp     | `twilio`                                                                      |
| Date/timezone    | `luxon` (todos os cálculos em `America/Sao_Paulo`)                            |
| Testes           | `jest` (unit) + `supertest` (e2e) + `testcontainers` (MySQL real)             |
| Docs API         | `@nestjs/swagger` em `/api/docs`                                              |
| Migrations       | `typeorm-extension` (CLI Nx custom target)                                    |

### 2.3 Soft delete

- `BaseEntity` abstrata com `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn deletedAt`
- Todos os repositórios usam `softRemove()`/`softDelete()`; queries filtram `deletedAt IS NULL` por padrão (TypeORM já faz com `@DeleteDateColumn`)
- Opção de listar incluindo deletados apenas em endpoints administrativos

### 2.4 Autenticação — Firebase via backend

Fluxo padrão:

1. Frontend chama `POST /auth/login` com `{email, password}` (ou provider OAuth)
2. **Backend** chama Firebase Identity Toolkit REST (`signInWithPassword`) — frontend nunca toca Firebase diretamente
3. Backend devolve um **cookie HttpOnly Secure SameSite=Lax** contendo um **Firebase Session Cookie** (`createSessionCookie`, válido 5 dias por padrão)
4. Em requisições subsequentes, `AuthGuard` lê o cookie, chama `auth.verifySessionCookie(cookie, /*checkRevoked*/ true)` e popula `req.user`
5. CSRF protection: token CSRF em header `X-CSRF-Token` validado em mutations (`csurf` ou implementação dupla-submit cookie)

**Cadastro de empresa**: cria usuário no Firebase Auth + registro `Company` + `User` (papel `OWNER`) na nossa DB.
**Custom claims** no Firebase: `companyId`, `role` (`OWNER`/`STAFF`/`CUSTOMER`) — definidos via Admin SDK, lidos no `verifySessionCookie`.

Segurança adicional:

- Rate limit em endpoints de auth (5 tentativas / 15min)
- Senha forte exigida (Firebase já valida ≥6 mas reforçar com regex)
- **App Check** do Firebase para proteger endpoints públicos (página da empresa) contra bots
- 2FA opcional (Firebase MFA) — pelo menos preparar o flow

### 2.5 Multi-tenancy

- Toda entidade _tenant-scoped_ (Service, BusinessHour, Appointment, Customer, etc.) tem coluna `companyId` (UUID, FK, indexada)
- `TenantContextInterceptor` injeta `companyId` do usuário autenticado (claim) no request scope (`AsyncLocalStorage`)
- `TenantRepository<T>` wrapper sobre `Repository<T>` que adiciona `WHERE companyId = :ctxCompanyId` automaticamente — impede vazamento entre tenants
- Endpoints públicos (página da empresa) usam **slug** (`/p/:companySlug`) e o `companyId` vem do slug, não do usuário

### 2.6 Cálculo de disponibilidade

Módulo `availability` (puro, sem side effects):

- Recebe: `companyId`, `serviceId`, `date` (ou range)
- Combina: `BusinessHour` (horários semanais), `BusinessException` (feriados/bloqueios), `Service.durationMinutes`, `Service.bufferMinutes`, agendamentos existentes não-cancelados
- Retorna lista de slots `{ start, end, available }`
- Todos cálculos em Luxon com timezone fixo `America/Sao_Paulo`; persistência em UTC
- Locking otimista no `Appointment` (`@VersionColumn`) + transação ao criar para evitar double-booking. Em paralelo, índice único parcial `(companyId, serviceId, startsAt)` _quando_ `status NOT IN ('CANCELLED')` — se MySQL não suportar índice condicional, usar tabela `appointment_slot_lock` com unique `(companyId, startsAt)` removida no cancelamento.

### 2.7 Modelo de dados (resumo)

Entidades principais (todas com `id` UUID, `createdAt`, `updatedAt`, `deletedAt`):

| Entidade                 | Campos-chave                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Company`                | name, slug (unique), phone, email, timezone, logoUrl, notificationToggles {email,sms,whatsapp}                                                             |
| `User`                   | firebaseUid (unique), companyId (nullable p/ CUSTOMER), role, name, email, phone, emailVerified, phoneVerified                                             |
| `Service`                | companyId, name, description, durationMinutes, bufferMinutes, price (decimal), active                                                                      |
| `BusinessHour`           | companyId, dayOfWeek (0–6), startTime, endTime                                                                                                             |
| `BusinessException`      | companyId, date, fullDay (bool), startTime, endTime, reason                                                                                                |
| `Customer`               | companyId, name, email, phone, userId (nullable se logado), notes                                                                                          |
| `Appointment`            | companyId, serviceId, customerId, startsAt, endsAt, status (PENDING/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW), notificationsSent jsonb, cancelReason, version |
| `Verification`           | type (EMAIL/SMS), target (email/phone), tokenHash, expiresAt, consumedAt, attempts                                                                         |
| `NotificationLog`        | appointmentId, channel, providerMessageId, status, attemptedAt, errorMessage                                                                               |
| `AppointmentActionToken` | appointmentId, kind (CONFIRM/CANCEL/RESCHEDULE), tokenHash, expiresAt, consumedAt                                                                          |

### 2.8 Endpoints REST (resumo, todos sob `/api`)

**Públicos** (sem auth):

- `GET /public/companies/:slug` — perfil público (serviços, info)
- `GET /public/companies/:slug/services` — lista serviços
- `GET /public/companies/:slug/availability?serviceId&from&to` — slots
- `POST /public/companies/:slug/appointments` — cria agendamento _pendente_ (exige `verificationToken` se cliente não logado)
- `POST /public/verification/request` — solicita OTP email/SMS
- `POST /public/verification/confirm` — confirma OTP → retorna `verificationToken` (JWT curto, 15min)
- `GET /public/appointments/action/:token` — confirma ou cancela via link (one-shot)

**Auth & cliente logado** (`/auth`, `/me`):

- `POST /auth/register-customer`, `POST /auth/register-company`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`
- `GET /me`, `GET /me/appointments`, `PATCH /me/appointments/:id/cancel`, `PATCH /me/appointments/:id/reschedule`

**Empresa logada** (`/company`, role OWNER/STAFF, tenant-scoped):

- `GET/PATCH /company` — dados da empresa + toggles de notificação
- CRUD `/company/services`
- CRUD `/company/business-hours`, `/company/business-exceptions`
- `GET /company/appointments?range=day|week|month&date=...`
- `GET /company/customers`, `GET /company/customers/:id`
- `PATCH /company/appointments/:id/status` (confirma, conclui, no-show, cancela)

Documentação Swagger gerada automaticamente em `/api/docs` (protegida por basic-auth em prod).

---

## 3. Frontend (`apps/web`) — Angular

### 3.1 Estrutura (Standalone + feature modules lazy)

```
apps/web/src/app/
├── core/
│   ├── auth/                       # AuthService, AuthGuard, http interceptor
│   ├── http/                       # HttpInterceptor (CSRF, error, loading)
│   ├── config/                     # env tokens
│   └── layout/                     # AppShell, Header, Sidebar
├── shared/
│   ├── ui/                         # botões, inputs, dialogs
│   └── pipes/
├── features/
│   ├── public-booking/             # /p/:slug (página pública da empresa)
│   ├── auth/                       # /login, /register, /verify
│   ├── customer-dashboard/         # /me/* (cliente logado)
│   ├── company-dashboard/          # /admin/* (empresa logada)
│   │   ├── overview/               # agenda dia/semana/mês
│   │   ├── services/
│   │   ├── hours/
│   │   ├── appointments/
│   │   ├── customers/
│   │   └── settings/
│   └── confirm-action/             # /a/:token (confirmação via link)
├── app.config.ts                   # providers (HttpClient, Router, etc.)
└── app.routes.ts                   # rotas com loadChildren
```

### 3.2 Stack do frontend

| Concern     | Escolha                                                                               |
| ----------- | ------------------------------------------------------------------------------------- |
| Angular     | 17+ standalone components, signals, control flow `@if/@for`                           |
| State       | Angular Signals + `@ngrx/signals` (SignalStore) para stores complexas                 |
| UI          | Angular Material + Tailwind CSS (utility para layouts responsivos)                    |
| Forms       | Reactive Forms tipadas + `ngx-mask` para telefone/data                                |
| Calendário  | `FullCalendar` Angular plugin para visão dia/semana/mês                               |
| Datas       | `luxon` + `@jsverse/transloco-locale`                                                 |
| HTTP        | `HttpClient` + interceptors (CSRF, withCredentials, retry idempotente, error toaster) |
| i18n        | preparar com `@angular/localize` ainda que só pt-BR no MVP                            |
| A11y        | foco em ARIA, navegação por teclado, contraste AA                                     |
| Testes      | Vitest (unit) + Playwright (e2e)                                                      |
| Lint/format | ESLint + Prettier + `lint-staged` + husky                                             |

### 3.3 Responsividade

- **Mobile-first** com Tailwind breakpoints (`sm`, `md`, `lg`, `xl`)
- AppShell colapsa sidebar em drawer em telas <`md`
- Página pública otimizada para celular (maior fluxo de uso)
- Componentes de calendário trocam visão automática (mobile = agenda lista; desktop = grid semanal)
- Testes visuais com Playwright em três viewports (375, 768, 1280)

### 3.4 Comunicação com backend

- `ApiClient` central com base URL via `environment.ts`
- **`withCredentials: true`** para enviar cookie de sessão
- Interceptor adiciona `X-CSRF-Token` (lido de cookie `XSRF-TOKEN` exposto pelo backend)
- DTOs e tipos importados de `libs/shared/contracts` (verdade única)

### 3.5 UX, Validações e Estados de Interface (obrigatório em todas as telas)

Toda tela do frontend **DEVE** seguir esta checklist antes de ser considerada pronta. Garantida via revisão e testes Playwright cobrindo cada item.

#### 3.5.1 Validação completa no frontend

Validação no front é **espelho da validação do backend** (single source of truth via `libs/shared/contracts` com zod) — nunca substitui a do servidor, mas evita round-trips e dá feedback imediato.

- **Reactive Forms tipadas** (`FormGroup<T>`) com `Validators` nativos + customizados; nunca usar `ngModel` em formulário transacional
- Cada campo exibe erro **inline, abaixo do input**, com mensagem em pt-BR específica do erro (não "Campo inválido" genérico)
- Erro aparece **após o primeiro blur** (`updateOn: 'blur'`) ou após primeiro submit — nunca enquanto o usuário ainda digita
- Botão de submit **desabilitado** quando `form.invalid || form.pending || isSubmitting`
- Após submit com erro de servidor, mapear erros 422 do backend para `form.setErrors()` no campo correspondente
- Diretiva compartilhada `[appFieldError]` em `libs/web/ui` padroniza render do erro (ícone + texto + `aria-describedby` + `aria-invalid`)
- Validadores assíncronos (ex.: slug de empresa único) usam `debounceTime(400)` + indicador de loading dentro do input
- Senha: força mínima visualizada com barra (fraca/média/forte) e regras explícitas listadas (✓ 8+ caracteres, ✓ 1 maiúscula, etc.)
- Campos mascarados: telefone BR (`(99) 99999-9999`), CEP, CPF/CNPJ via `ngx-mask`

#### 3.5.2 Validações de data e horário (críticas neste domínio)

Centralizar em `libs/shared/utils/date-validators.ts` com funções puras + `ValidatorFn` Angular equivalentes.

- **Sempre via Luxon** com timezone `America/Sao_Paulo`; nunca usar `new Date()` direto para parsing
- **Não permitir datas passadas** em agendamentos (`minDate = DateTime.now().setZone('America/Sao_Paulo').startOf('day')`)
- **Range mínimo de antecedência** configurável por empresa (ex.: agendar com ≥ 1h de antecedência) — validar no front + back
- **Range máximo** (ex.: máximo 90 dias à frente) — evita poluir a agenda
- Horário de início **< horário de fim** em formulários de business-hour, exceção e bloqueio
- Validar que horário escolhido **cai dentro de `BusinessHour`** da empresa e **não conflita com `BusinessException`**
- Validar que slot escolhido **ainda está disponível** no momento do submit (rechecar via `GET /availability` se passou >30s desde a seleção)
- Datas exibidas sempre formatadas em pt-BR (`dd/MM/yyyy HH:mm`) via pipe `appDate` em `libs/web/ui`
- Inputs de data usam `MatDatepicker` com locale `pt-BR` e `min`/`max` aplicados
- Inputs de hora usam componente próprio com step de minutos configurável (default 15min) — não confiar em `<input type="time">` puro por inconsistências mobile
- **Fuso e DST**: testes cobrindo virada de horário de verão (caso o BR readotar) e datas próximas à meia-noite
- Mensagens humanizadas: "Você só pode agendar com pelo menos 1 hora de antecedência", "Esta empresa não atende neste dia"

#### 3.5.3 Empty states (sem exceção)

Todo componente que renderiza lista, tabela, grade, calendário ou resultado de busca **DEVE** ter empty state — proibido renderizar tela em branco ou só o cabeçalho.

- Componente compartilhado `<app-empty-state>` em `libs/web/ui` com props: `icon`, `title`, `description`, `actionLabel`, `(action)`
- Variantes contextuais:
  - **Lista vazia inicial**: "Você ainda não tem nenhum serviço cadastrado" + CTA "Cadastrar primeiro serviço"
  - **Busca/filtro sem resultado**: "Nenhum resultado para _<termo>_" + CTA "Limpar filtros"
  - **Erro de carga**: "Não conseguimos carregar os dados" + CTA "Tentar novamente"
  - **Sem permissão**: "Você não tem acesso a esta seção" (em vez de 403 cru)
  - **Agenda do dia sem agendamentos**: ilustração + texto positivo ("Nenhum agendamento para hoje — aproveite!")
- Diferenciar visualmente **vazio inicial** (positivo, com CTA) de **vazio por filtro** (neutro, com "limpar")
- Sempre acompanhado de ilustração leve (SVG inline em `libs/web/ui/illustrations/`), não usar emoji

#### 3.5.4 Campos de busca onde necessário

Toda lista com **> 10 itens potenciais** deve ter busca; toda lista paginada deve ter busca + filtros.

- Componente `<app-search-input>` em `libs/web/ui`:
  - Ícone de lupa à esquerda, botão "limpar" (X) à direita quando há texto
  - `debounceTime(300)` + `distinctUntilChanged()` antes de disparar request
  - Mínimo 2 caracteres para disparar busca remota
  - Estado de loading dentro do input (spinner pequeno) durante request
  - Suporta atalho `/` para focar (desktop) e `Esc` para limpar
- Telas com busca obrigatória:
  - **Empresa**: lista de clientes, lista de agendamentos, lista de serviços (quando > 10)
  - **Cliente**: histórico de agendamentos (busca por empresa/serviço/data)
- Busca server-side via query param `?q=` (search em `name`, `email`, `phone` com `LIKE %term%` no backend, sanitizado e indexado quando possível)
- URL reflete a busca (`?q=joao`) para deep-link e refresh-safe
- Combinar com **filtros estruturados** (chips clicáveis: status, período, serviço) — chips ativos visíveis e removíveis individualmente
- Empty state diferenciado conforme 3.5.3 quando busca não retorna nada

#### 3.5.5 Estados de carregamento e erro (complementares)

- **Skeleton screens** em vez de spinners centralizados quando o layout final já é conhecido (lista, card, tabela)
- **Loading bloqueante** (overlay + spinner) só em submits críticos (criar agendamento)
- **Erros recuperáveis**: snackbar + botão "Tentar novamente"; **erros fatais**: tela cheia com instrução clara
- **Otimistic UI** em ações reversíveis (cancelar agendamento mostra estado cancelado imediatamente, reverte se backend falhar)
- Confirmação obrigatória (`MatDialog`) em ações destrutivas: cancelar agendamento, excluir serviço, remover horário

#### 3.5.6 Garantia em testes

- Playwright tem suíte `ux-checklist.spec.ts` rodando em cada tela: verifica presença de empty state simulando lista vazia (mock de API com `[]`), presença de search onde aplicável, e validações de form bloqueando submit
- Storybook (ou Angular CDK stories simples) com cenários **vazio / carregando / com dados / erro** para cada componente de lista

---

## 4. Fluxos Críticos

### 4.1 Agendamento por cliente **não logado**

1. Cliente abre `/p/:slug` → escolhe serviço → escolhe slot
2. Preenche `{nome, email, telefone}` → escolhe canal de verificação (email ou SMS)
3. Front chama `POST /public/verification/request {channel, target}`; backend gera OTP de 6 dígitos (SMS) **ou** envia email com link contendo token assinado
4. Cliente recebe e envia OTP em `POST /public/verification/confirm` → backend valida, devolve `verificationToken` (JWT 15min com `email`/`phone` validado)
5. Front chama `POST /public/companies/:slug/appointments` com `verificationToken` + dados do slot → backend cria `Appointment` em `PENDING`, dispara notificação de confirmação

### 4.2 Agendamento por cliente **logado**

- Skip etapas 3–4; identidade já verificada (Firebase + `emailVerified`)
- `Customer` é vinculado ao `User` automaticamente; appointment vai direto a `PENDING` (ou `CONFIRMED` se a empresa optou por auto-confirmar)

### 4.3 Confirmação/cancelamento via link

- Cada notificação inclui URLs `/a/:token?action=confirm|cancel`
- `AppointmentActionToken` armazena hash do token, expira em 24h após envio
- Endpoint `GET /public/appointments/action/:token` valida e mostra tela de confirmação (cliente clica botão → `POST`)
- Token é one-shot: marca `consumedAt`

### 4.4 Remarcação pelo cliente logado

- Busca slots disponíveis no mesmo serviço/empresa
- Transação: cria novo Appointment + cancela o antigo (mantém histórico com `cancelReason='RESCHEDULED'`)

### 4.5 Notificações da empresa

- Empresa configura toggles `{email, sms, whatsapp}` em `Company.notificationToggles`
- Eventos que disparam notificação: **criação**, **confirmação**, **cancelamento**, **lembrete 24h antes**, **lembrete 1h antes**
- Job `BullMQ` agendado (`delay`) para lembretes; idempotente por `(appointmentId, kind)`
- Falha em um canal não impede outro; tudo logado em `NotificationLog`

---

## 5. Segurança

- **HTTPS only** + HSTS (`helmet`)
- Cookies sessão: `HttpOnly`, `Secure`, `SameSite=Lax`, domínio próprio
- **CSRF**: double-submit cookie pattern (`XSRF-TOKEN` + `X-CSRF-Token` header)
- Rate limit por IP + por usuário em endpoints sensíveis (auth, OTP request)
- OTP: hash SHA-256 com salt; máx 5 tentativas; expira em 10min
- Tokens de ação (confirm/cancel): JWT assinado HS256 com secret rotacionável; armazenamos só hash
- Logs estruturados com `request-id`; nunca logar PII em produção
- Auditoria: tabela `audit_log` (changes em Appointment/Company por usuário)
- LGPD: endpoint de exportação e deleção de dados de cliente (soft delete + redação de PII após retenção)
- Secrets em **Secret Manager** (GCP); nada em `.env` versionado

---

## 6. Infra & Deploy (GCP)

| Componente       | Serviço                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| API Nest         | Cloud Run (containerizada, `--min-instances=1` em prod)                                     |
| Frontend Angular | Firebase Hosting (build estático + rewrites para SPA)                                       |
| Banco            | Cloud SQL MySQL 8 (privado via VPC connector)                                               |
| Cache/Filas      | Memorystore Redis (BullMQ)                                                                  |
| Secrets          | Secret Manager (montado como env via Cloud Run)                                             |
| Auth             | Firebase Authentication (mesmo projeto GCP)                                                 |
| Storage          | Firebase Storage (logos da empresa, futuros uploads)                                        |
| CDN              | Firebase Hosting global por padrão                                                          |
| CI/CD            | GitHub Actions: lint → test → build → push imagem (Artifact Registry) → `gcloud run deploy` |
| Observabilidade  | Cloud Logging + Cloud Monitoring + Sentry (front e back)                                    |
| Migrações        | Job Cloud Run separado executando `typeorm migration:run` antes do deploy                   |

Ambiente local: `docker-compose` com MySQL 8, Redis, MailHog (SMTP de teste), e `firebase emulators` (Auth + Functions se vier a usar).

---

## 7. Fases de Execução (sprints sugeridas, dentro de uma única release)

> Embora você queira tudo numa única release, sugiro **fases internas de execução** para reduzir risco. Nada vai para produção até a Fase 6.

1. **F1 — Fundação (1–2 semanas)**
   - Setup Nx, Docker Compose, CI básico, lint/format/husky
   - Skeleton NestJS + Angular standalone + libs `contracts`
   - Conexão TypeORM + primeira migration (User, Company)
   - Firebase Admin setup + endpoints `/auth/register-company`, `/auth/login`, `/auth/logout`, `/me`
   - Frontend: tela de login/registro, AuthGuard

2. **F2 — Configuração da empresa (1–2 semanas)**
   - Entidades Service, BusinessHour, BusinessException + CRUD `/company/*`
   - Dashboard empresa: settings, serviços, horários
   - Tenant scoping (interceptor + repositório base)
   - Testes unitários cobrindo regras de horário

3. **F3 — Página pública + agendamento (2 semanas)**
   - Módulo `availability` (com testes pesados de borda)
   - Página `/p/:slug` (mobile-first)
   - Módulo `verification` (email link + SMS OTP, SendGrid + Twilio)
   - Endpoint criação de agendamento + integração com verification

4. **F4 — Notificações + ações por link (1–2 semanas)**
   - Redis + BullMQ, jobs de envio e lembrete
   - Templates email/SMS/WhatsApp parametrizados
   - Tokens de ação (`/a/:token`) + UI de confirmação
   - Toggles na empresa

5. **F5 — Dashboard do cliente + remarcação/cancelamento (1–2 semanas)**
   - `/me/appointments` (lista, detalhe, ações)
   - Remarcação com revalidação de disponibilidade
   - Histórico

6. **F6 — Hardening + deploy (1 semana)**
   - Rate limits, helmet, CSRF E2E
   - App Check, auditoria, LGPD endpoints
   - Cloud Run + Cloud SQL + Firebase Hosting; rollback plan
   - Smoke tests Playwright em staging

---

## 8. Verificação (como validar a entrega)

1. **Local dev**:
   - `pnpm install && docker compose up -d`
   - `nx run-many --target=serve --projects=api,web`
   - `nx run-many --target=test` — unit tests verdes
   - `nx e2e web-e2e` — Playwright cobre: login, criar serviço, agendar sem login (com OTP via MailHog), confirmar via link, cancelar
2. **Multi-tenant**:
   - Criar duas empresas, criar agendamento em uma; logar na outra e garantir que NÃO aparece (testar via API direto + UI)
3. **Concorrência**:
   - Script disparando 50 requisições concorrentes no mesmo slot — apenas 1 deve criar appointment
4. **Notificações**:
   - Toggles desativados não enviam; logs em `NotificationLog`
5. **Responsividade**:
   - Playwright em 375/768/1280; review manual em iPhone real (Safari) e Chrome Android
6. **Segurança**:
   - Cookies HttpOnly/Secure presentes; tentar CSRF sem token retorna 403; rate limit ativa após 5 tentativas
   - Verificação de scopes: cliente logado não consegue acessar `/company/*`; empresa A não acessa dados de B
7. **Staging em GCP** antes de promover para prod; smoke tests automatizados pós-deploy

---

## 9. Arquivos críticos a serem criados (referência rápida)

- `nx.json`, `package.json`, `tsconfig.base.json`
- `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- `apps/api/src/shared/infra/firebase/firebase-admin.service.ts`
- `apps/api/src/shared/infra/typeorm/base.entity.ts` (soft delete + UUID)
- `apps/api/src/modules/auth/` (controller, guards, service, session-cookie strategy)
- `apps/api/src/modules/availability/availability.service.ts` (cálculo puro de slots)
- `apps/api/src/modules/appointments/` (use cases de criação/remarcação com locking)
- `apps/api/src/modules/notifications/providers/` (SendGridProvider, TwilioSmsProvider, TwilioWhatsappProvider implementando interface `NotificationProvider`)
- `apps/web/src/app/features/public-booking/` (fluxo de agendamento + verificação)
- `apps/web/src/app/features/company-dashboard/overview/` (calendário FullCalendar)
- `libs/shared/contracts/src/` (zod schemas + tipos derivados)
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `Dockerfile` (API), `apps/web/firebase.json`

---

## 10. Observações finais

- **Nenhum SDK Firebase no frontend**, conforme requisito — toda interação passa pelo backend
- Toda data persistida em UTC; UI/lógica usa `America/Sao_Paulo` via Luxon
- Soft delete em todas as entidades de domínio; queries respeitam `deletedAt`
- Clean architecture pragmática: camadas por feature module em vez de divisão global rígida — equilíbrio entre clareza e produtividade
- Padronizar com Conventional Commits + Changesets para versionamento das libs internas
