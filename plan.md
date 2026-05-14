# Plano — Sistema de Agendamento de Horários

## Contexto

Projeto greenfield (`/Users/igorsousa/Projects/agendarhorario`). O objetivo é construir uma plataforma SaaS multi-tenant onde **empresas** se cadastram (modelo **B2B com assinatura mensal**), configuram serviços/horários e expõem uma **página pública** de agendamento. Clientes finais podem agendar **com ou sem login**; quando sem login, devem validar e-mail (link) ou telefone (SMS OTP) antes de confirmar. Empresas e clientes têm dashboards distintos. Sistema envia avisos por e-mail/SMS/WhatsApp com link de **confirmação ou cancelamento** de presença. A plataforma é monetizada via **planos mensais cobrados pelo Stripe**, com limites por número de agendamentos e bloqueio automático da página pública quando a empresa estoura a cota ou está com fatura vencida.

### Decisões já tomadas (confirmadas com o usuário)

- **Monorepo Nx** com `apps/api` (NestJS) e `apps/web` (Angular) + libs compartilhadas
- **Multi-tenancy**: single DB MySQL, isolamento por `company_id` (TypeORM)
- **Auth**: Firebase Authentication — frontend nunca chama Firebase direto, sempre via nosso backend (Firebase Admin SDK)
- **Notificações**: SendGrid (email, **sempre incluído**) + Twilio (SMS **ou** WhatsApp, escolha exclusiva por empresa)
- **Billing**: Stripe Billing (Subscriptions + Customer Portal + Webhooks) — todos os 4 planos cobrados em BRL, recorrência mensal, cartão de crédito + PIX/boleto via Stripe quando disponíveis
- **Modelo de negócio**: assinatura por empresa, com **cota mensal de agendamentos** (ver §11). Ao estourar, a página pública mostra "indisponível" até o próximo ciclo ou upgrade
- **Aquisição**: landing page de conversão em `/` (raiz), copy + UX otimizados para CTA "Comece grátis" / "Ver planos" (ver §12)
- **Deploy**: GCP — Cloud Run (API) + Cloud SQL MySQL + Firebase Hosting (Angular)
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
| Billing          | `stripe` (Subscriptions + Customer Portal + Webhooks)                         |
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

- `GET/PATCH /company` — dados da empresa + preferências de notificação (`email` toggles + `secondaryChannel: SMS|WHATSAPP|NONE`)
- CRUD `/company/services`
- CRUD `/company/business-hours`, `/company/business-exceptions`
- `GET /company/appointments?range=day|week|month&date=...`
- `GET /company/customers`, `GET /company/customers/:id`
- `PATCH /company/appointments/:id/status` (confirma, conclui, no-show, cancela)
- `GET /company/billing/subscription` — plano, status, uso ({used, limit, resetAt})
- `GET /company/billing/invoices?status=...` — faturas (paga, em aberto, vencida)
- `POST /company/billing/checkout-session` — cria Stripe Checkout p/ assinatura ou troca
- `POST /company/billing/portal-session` — cria Stripe Customer Portal session
- `POST /company/billing/change-plan` — troca de plano (upgrade imediato / downgrade ao fim do ciclo)
- `POST /company/billing/cancel` — cancela ao fim do ciclo

**Catálogo público de planos** e webhooks:

- `GET /api/billing/plans` (público) — usado pela landing e pelo checkout
- `POST /api/webhooks/stripe` (público, valida `stripe-signature`, idempotente)

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
│   ├── landing/                    # / (landing de conversão, §12)
│   ├── public-booking/             # /p/:slug (página pública da empresa)
│   ├── auth/                       # /login, /register, /verify
│   ├── customer-dashboard/         # /me/* (cliente logado)
│   ├── company-dashboard/          # /admin/* (empresa logada)
│   │   ├── overview/               # agenda dia/semana/mês
│   │   ├── services/
│   │   ├── hours/
│   │   ├── appointments/
│   │   ├── customers/
│   │   ├── subscription/           # /admin/assinatura (plano, faturas, upgrade)
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

- Empresa configura preferências em `Company.notificationPrefs`:
  - **E-mail**: sempre ativo (toggle on/off por evento)
  - **Canal secundário**: enum `'SMS' | 'WHATSAPP' | 'NONE'` — **escolha exclusiva** entre SMS ou WhatsApp (não cumulativo). UI usa radio group, não checkboxes paralelos
- Eventos que disparam notificação: **criação**, **confirmação**, **cancelamento**, **lembrete 24h antes**, **lembrete 1h antes**
- Job `BullMQ` agendado (`delay`) para lembretes; idempotente por `(appointmentId, kind)`
- Falha em um canal não impede outro; tudo logado em `NotificationLog`

### 4.6 Bloqueio por limite/inadimplência

- Antes de aceitar `POST /public/companies/:slug/appointments`, backend consulta `BillingService.canBook(companyId)` que retorna `{ allowed, reason, used, limit, resetAt }`
- Bloqueio quando:
  - `subscription.status` ∈ `past_due | unpaid | canceled | incomplete_expired`, ou
  - contagem de agendamentos `status NOT IN ('CANCELLED')` no ciclo corrente ≥ `plan.monthlyAppointmentLimit`
- Página pública `/p/:slug` lê `GET /public/companies/:slug` que devolve `status: 'AVAILABLE' | 'OVER_LIMIT' | 'SUSPENDED'`
  - `OVER_LIMIT`: card destacado "Esta empresa atingiu o limite de agendamentos deste mês. Tente novamente após `{resetAt}`."
  - `SUSPENDED`: card neutro "Esta página de agendamentos está temporariamente indisponível."
- Contagem é por **ciclo de cobrança** (não calendário): janela `[current_period_start, current_period_end)` retornada pelo Stripe
- Quando a empresa **faz upgrade no meio do ciclo**, o novo limite passa a valer imediatamente; quando faz **downgrade**, é aplicado no próximo ciclo (escolha conservadora — evita reembolso parcial)

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
   - Preferências `email + (sms|whatsapp|none)` na empresa

5. **F5 — Dashboard do cliente + remarcação/cancelamento (1–2 semanas)**
   - `/me/appointments` (lista, detalhe, ações)
   - Remarcação com revalidação de disponibilidade
   - Histórico

6. **F6 — Billing (Stripe) e bloqueio por limite (2 semanas)**
   - Cadastro de produtos/preços no Stripe (Basico, Médio, Grande, Super)
   - Entidades `Plan`, `Subscription`, `Invoice`, `BillingEvent` + migrations
   - Endpoints `/company/billing/*` (checkout, portal, status, faturas)
   - Webhook `/api/webhooks/stripe` (idempotente, valida signature)
   - `BillingService.canBook` + integração no fluxo público
   - UI: `/admin/assinatura` (plano atual, uso, faturas, upgrade/downgrade)
   - Página pública mostra "OVER_LIMIT" / "SUSPENDED" conforme §4.6

7. **F7 — Landing page de conversão (1 semana)**
   - Rota `/` com landing pública (hero + benefícios + planos + FAQ + footer)
   - CTA principal "Comece agora" → cadastro empresa
   - Tabela de planos com destaque do mais vendido + comparativo
   - Integração com analytics (GA4 + eventos de scroll/CTA)
   - SEO básico (meta tags, OpenGraph, JSON-LD Product)

8. **F8 — Hardening + deploy (1 semana)**
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
- `apps/api/src/modules/billing/` (planos, subscription, invoice, billing.service, billing.controller, stripe.client, BillingService.canBook)
- `apps/api/src/modules/webhooks/stripe.webhook.controller.ts` (raw body, signature validation, idempotência via `BillingEvent`)
- `apps/web/src/app/features/public-booking/` (fluxo de agendamento + verificação)
- `apps/web/src/app/features/company-dashboard/overview/` (calendário FullCalendar)
- `apps/web/src/app/features/admin/subscription/` (assinatura: plano, uso, faturas, change-plan)
- `apps/web/src/app/features/landing/` (landing page de conversão — hero, pricing, FAQ, etc.)
- `libs/shared/contracts/src/lib/billing.ts` (zod schemas Plan/Subscription/Invoice + change-plan request)
- `libs/web/data-access/src/lib/billing.api.ts` (BillingApi: plans, subscription, invoices, checkout, portal, change-plan, cancel)
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `Dockerfile` (API), `apps/web/firebase.json`
- `tools/seed-plans.ts` (lê IDs do Stripe via env e popula a tabela `plans`)

---

## 10. Observações finais

- **Nenhum SDK Firebase no frontend**, conforme requisito — toda interação passa pelo backend
- Toda data persistida em UTC; UI/lógica usa `America/Sao_Paulo` via Luxon
- Soft delete em todas as entidades de domínio; queries respeitam `deletedAt`
- Clean architecture pragmática: camadas por feature module em vez de divisão global rígida — equilíbrio entre clareza e produtividade
- Padronizar com Conventional Commits + Changesets para versionamento das libs internas

---

## 11. Planos e Billing (Stripe)

### 11.1 Catálogo de planos

| Plano      | Limite mensal | Preço (BRL/mês) | Notificações                              |
| ---------- | ------------- | --------------- | ----------------------------------------- |
| **Básico** | 25            | R$ 39,90        | E-mail + (SMS **ou** WhatsApp, à escolha) |
| **Médio**  | 50            | R$ 79,90        | E-mail + (SMS **ou** WhatsApp, à escolha) |
| **Grande** | 100           | R$ 149,90       | E-mail + (SMS **ou** WhatsApp, à escolha) |
| **Super**  | 250           | R$ 249,90       | E-mail + (SMS **ou** WhatsApp, à escolha) |

- "Limite mensal" = quantidade de **agendamentos criados** no ciclo de cobrança (sem contar `CANCELLED`). Remarcação **não consome** cota adicional (cria + cancela na mesma transação)
- Canal secundário é **exclusivo**: SMS **xor** WhatsApp (radio na UI). Pode também ser `NONE` para empresas que só querem e-mail
- Sem limites por usuário/serviço/cliente — apenas pela contagem de agendamentos
- Não há "free tier" no MVP; usuário entra direto no checkout do plano escolhido (free trial de 14 dias via Stripe pode ser ativado por feature flag — preparar mas não ligar)

### 11.2 Modelo Stripe

- 1 produto Stripe `agendarhorario_plan` com 4 **prices** recorrentes (`basico`, `medio`, `grande`, `super`) em **BRL/mês**
- Métodos de pagamento habilitados: cartão (`card`), PIX (`pix` quando suportado), boleto (`boleto`) — Stripe gerencia
- IDs do Stripe vão para `.env`/Secret Manager (`STRIPE_PRICE_BASICO`, etc.); evitamos hardcode em código
- **Stripe Customer** = `Company` (1:1). Persistido em `Company.stripeCustomerId`
- **Stripe Subscription** ativa por empresa em `Company.stripeSubscriptionId` + tabela `Subscription` espelhada localmente
- **Stripe Customer Portal** ativado: usado para atualizar método de pagamento e cancelar — não reimplementamos esse fluxo

### 11.3 Entidades & migrations

| Entidade       | Campos-chave                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Plan`         | `id`, `code` ('basico'\|'medio'\|'grande'\|'super'), `name`, `priceBrl` (decimal), `monthlyAppointmentLimit`, `stripePriceId`, `active`, `sortOrder`                            |
| `Subscription` | `companyId`, `planId`, `stripeSubscriptionId`, `status` (enum Stripe), `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `canceledAt`                              |
| `Invoice`      | `subscriptionId`, `stripeInvoiceId`, `number`, `amountTotal`, `currency`, `status` ('open'\|'paid'\|'void'\|'uncollectible'), `dueDate`, `paidAt`, `hostedInvoiceUrl`, `pdfUrl` |
| `BillingEvent` | `provider` ('stripe'), `eventId` (unique), `type`, `payload` jsonb, `receivedAt`, `processedAt`, `error` — para idempotência de webhook                                         |
| `Company`      | adicionar `stripeCustomerId`, `stripeSubscriptionId` (denormalizado para queries rápidas), `notificationPrefs.secondaryChannel` enum                                            |

Migration `BillingSchema` cria as 4 tabelas + colunas em `companies`. Seed `seed-plans.ts` insere os 4 planos lendo IDs do Stripe via `.env`.

### 11.4 Endpoints da API

Todos protegidos por `@CompanyScoped()` (role OWNER), salvo o webhook.

| Método | Rota                                       | Função                                                                                                   |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| GET    | `/api/billing/plans`                       | Catálogo público (usado pela landing + checkout)                                                         |
| GET    | `/api/company/billing/subscription`        | Plano atual + status + uso ({used, limit, resetAt})                                                      |
| GET    | `/api/company/billing/invoices?status=...` | Faturas (filtros: paga, em aberto, vencida)                                                              |
| POST   | `/api/company/billing/checkout-session`    | Cria `checkout.session` Stripe e devolve URL hospedada (modo `subscription`)                             |
| POST   | `/api/company/billing/portal-session`      | Cria sessão do **Customer Portal** Stripe e devolve URL                                                  |
| POST   | `/api/company/billing/change-plan`         | Body: `{ priceId }`. Upgrade imediato (proration) ou downgrade agendado (`period_end`)                   |
| POST   | `/api/company/billing/cancel`              | Cancela ao fim do ciclo (`cancel_at_period_end=true`)                                                    |
| POST   | `/api/webhooks/stripe`                     | **Público** (não passa por CSRF/Auth); valida `stripe-signature`; idempotente via `BillingEvent.eventId` |

### 11.5 Webhook Stripe (eventos críticos)

Processados na ordem em que chegam; cada um é gravado em `BillingEvent` antes de mexer no domínio:

- `customer.subscription.created` / `updated` / `deleted` → atualiza `Subscription` local + `Company.stripeSubscriptionId`
- `invoice.created` / `finalized` → upsert em `Invoice`
- `invoice.paid` → marca `status='paid'`, `paidAt`
- `invoice.payment_failed` → mantém `open`, dispara e-mail "pagamento não realizado" + grace period; depois de 2 falhas Stripe move sub para `past_due`
- `customer.subscription.paused` / `past_due` → bloqueia agendamento (ver §4.6)
- `checkout.session.completed` → liga `Company.stripeCustomerId` (caso first-time)

**Idempotência**: `INSERT IGNORE` em `BillingEvent (eventId)`; se já existe e `processedAt IS NOT NULL`, retorna 200 sem reprocessar.

**Segurança**: middleware deserializa `req.rawBody` antes de qualquer parser JSON; usa `stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)`. Rota isenta de CSRF e de `cookie-parser`.

### 11.6 Cálculo de uso e bloqueio

`BillingService.getUsage(companyId)`:

- Busca `Subscription` ativa; sem assinatura ativa → `{ allowed: false, reason: 'NO_SUBSCRIPTION' }`
- Se `status` ∈ `past_due | unpaid | canceled | incomplete_expired` → `{ allowed: false, reason: 'SUSPENDED' }`
- Conta `SELECT COUNT(*) FROM appointments WHERE companyId=? AND status NOT IN ('CANCELLED') AND createdAt >= currentPeriodStart AND createdAt < currentPeriodEnd AND deletedAt IS NULL`
- Compara com `plan.monthlyAppointmentLimit`; se ≥ → `{ allowed: false, reason: 'OVER_LIMIT', used, limit, resetAt }`
- Senão → `{ allowed: true, used, limit, resetAt }`

Resultado cacheado em Redis por 30s (chave `usage:{companyId}`); invalidado em webhook `customer.subscription.updated` e ao criar/cancelar agendamento.

### 11.7 UI — área de assinatura (`/admin/assinatura`)

- **Resumo do plano**: card com nome do plano, próxima cobrança, status (ativo/atrasado/cancelado)
- **Medidor de uso**: barra de progresso (used/limit) com cor por threshold (verde <70%, âmbar 70-90%, vermelho >90%). Alerta "Você atingiu 90% do limite — considere fazer upgrade" no card
- **Botões de ação**:
  - `Fazer upgrade` / `Trocar plano` → modal com tabela dos 4 planos, destacando o atual; submit chama `POST /company/billing/change-plan`
  - `Atualizar método de pagamento` → redireciona para Customer Portal Stripe
  - `Cancelar assinatura` → confirmação destacando "Acesso até `{currentPeriodEnd}`", chama `POST /company/billing/cancel`
- **Faturas** (tabela paginada, busca + filtros por status):
  - Colunas: número, data emissão, vencimento, valor, status (chip colorido), ações (download PDF, "Pagar agora" se em aberto)
  - Empty state quando primeira assinatura ainda não emitiu fatura
- **Histórico de eventos** opcional: lista das mudanças de plano e ciclos passados (lê de `BillingEvent` filtrado por tipos relevantes)
- **Onboarding sem assinatura**: se empresa logada não tem `stripeSubscriptionId` (ex.: cadastrou direto), CTA grande "Escolher plano" abre seleção dos 4 planos → `checkout-session`
- Validações no front: ao trocar de plano, mostrar "Você terá `{newLimit}` agendamentos/mês a partir de `{when}`" com `when = 'agora'` (upgrade) ou `currentPeriodEnd` (downgrade)
- Toggles de notificação (em `/admin/empresa`) usam **radio** SMS ↔ WhatsApp ↔ "Sem canal secundário", impossibilitando seleção dupla por construção

### 11.8 Cadastro de empresa × assinatura

Dois fluxos suportados na landing/CTA:

1. **"Comece agora — Plano X"** (preferencial)
   - Clica no plano na landing → vai para `/registrar-empresa?plan=basico`
   - Após criação da empresa e auto-login, **redireciona automaticamente para Stripe Checkout** com o `priceId` correspondente
   - Webhook `checkout.session.completed` registra `stripeCustomerId/stripeSubscriptionId` na empresa
   - Empresa volta para `/admin` com mensagem "Assinatura ativa — você já pode configurar serviços"
2. **"Quero ver o app primeiro"**
   - Cadastra empresa sem checkout; entra no `/admin` mas com card de bloqueio "Escolha um plano para ativar agendamentos"
   - Página pública `/p/:slug` fica `SUSPENDED` até primeira assinatura ativa

---

## 12. Landing Page de Conversão (`/`)

### 12.1 Objetivo

Converter visitante anônimo em empresa cadastrada com assinatura. **Foco em conversão**, não em explicação extensa. Otimizada para mobile (a maioria do tráfego virá por anúncio).

### 12.2 Estrutura (ordem importa — segue funil AIDA + frameworks PAS/4U)

1. **Hero / Acima da dobra** — em < 3s o visitante entende o que é, para quem é e o próximo passo
   - **Headline orientada a benefício** (não a feature): ex. "Sua agenda lotada sem WhatsApp travado." (testar 3 variantes em A/B)
   - **Sub-headline** (1 linha): "Receba agendamentos online com lembretes automáticos por e-mail, SMS ou WhatsApp."
   - **CTA primário** alto contraste: "Comece agora — R$ 39,90/mês" (linka para `/registrar-empresa?plan=basico`)
   - **CTA secundário** ghost: "Ver planos" (scroll para §12.2.4)
   - **Mockup** do app à direita (desktop) ou abaixo (mobile) — agenda + página pública em iPhone, leve, otimizado em WebP
   - **Indicadores de confiança** logo abaixo: "✓ Sem fidelidade · ✓ Cancele quando quiser · ✓ Suporte em português"
2. **Prova social** (banda fina)
   - "+200 empresas já agendam com a gente" (substituir por número real quando disponível; até lá, esconder)
   - 4–6 logos pequenos em escala de cinza (placeholders SVG genéricos no MVP)
3. **Problemas que resolvemos** (PAS — Problem / Agitate / Solve)
   - 3 cards com ícone + título + descrição curta. Exemplos:
     - "Cansado de perder horário com remarcação no WhatsApp?"
     - "Cliente esquece e dá no-show?"
     - "Sem visibilidade da semana?"
   - Cada card termina com micro-CTA "Veja como resolver →" (anchor para feature correspondente)
4. **Planos** (centro estratégico — a maior parte das conversões acontece aqui)
   - Tabela responsiva com 4 colunas (mobile vira carrossel horizontal)
   - **Plano destacado**: "Médio" como `Mais escolhido` (badge azul) — destaque para ancoragem
   - Cada coluna mostra: nome, preço grande, limite mensal, lista de features (✓ E-mail, ✓ SMS ou WhatsApp, ✓ Lembretes, ✓ Confirmação por link)
   - CTA em cada coluna: "Começar com {Plano}" → `/registrar-empresa?plan={code}`
   - Linha de comparação textual: "Pense em quantos agendamentos você faz por mês — é só multiplicar e escolher"
5. **Como funciona** (3 passos numerados, ícones)
   - 1. Crie a conta da sua empresa
   - 2. Cadastre seus serviços e horários
   - 3. Compartilhe seu link `agendar.com/p/sua-empresa`
6. **Recursos detalhados** (feature grid 2x3 ou 3x2)
   - Página pública mobile-first, agendamento sem login (com OTP), confirmação por link, dashboards, multi-usuário, exportação LGPD
7. **Depoimentos** — quotes curtos + foto + nome + cargo (placeholders no MVP, removidos até ter reais — **não inventar**)
8. **FAQ** — 6 a 8 perguntas (objeções principais):
   - "Posso cancelar quando quiser?" Sim, sem multa
   - "Como troco de plano?" No painel, instantaneamente
   - "O que acontece se eu estourar o limite?" A página pública fica indisponível até o próximo ciclo ou upgrade
   - "Vocês oferecem teste grátis?" Hoje não, mas garantimos reembolso nos primeiros 7 dias
   - "Aceitam PIX/boleto?" Sim, via Stripe
   - "Meus dados estão seguros?" Sim, LGPD-compliant, criptografia em trânsito e repouso
9. **CTA final** — repetição do CTA primário em banner full-width: "Comece em 5 minutos — sem cartão para testar o cadastro"
10. **Footer** — links curtos (Termos, Privacidade, Contato), e-mail de suporte, redes sociais

### 12.3 Boas práticas aplicadas

- **Velocidade**: landing é pré-renderizada (SSG) ou pré-buildada com Angular esbuild; hero LCP < 2.5s; sem fontes Google bloqueantes (usar `font-display: swap`)
- **Tipografia**: 2 famílias no máximo, escala modular; CTAs em weight 600+
- **Cores**: 1 cor primária (azul `#2563eb`) + 1 acent (verde/amarelo para "Mais escolhido"); contraste AA mínimo
- **Conteúdo escaneável**: parágrafos curtos, bullets, ícones; mobile-first
- **CTAs**: máximo 1 primário visível por seção; mesma cor sempre; verbo de ação no infinitivo
- **Microcopy de confiança** em cada CTA: "Sem cartão necessário para criar conta", "Cancele em 1 clique"
- **Form friction zero**: cadastro só pede o essencial (nome empresa, slug, e-mail, senha) — nada de telefone obrigatório
- **Sticky CTA** em mobile: barra fixa inferior com "Ver planos" quando o usuário rola além do hero
- **Analytics** (GA4): eventos `landing_view`, `cta_click {position, plan}`, `pricing_view`, `faq_open {question}`, `signup_start {plan}`. Marcar conversão final no Stripe checkout (`subscription_created`)
- **A/B testing**: feature flag (GrowthBook ou simples query param `?v=`) para alternar headline e cor do CTA. Mínimo 1 experimento ativo a partir do go-live
- **SEO técnico**:
  - `<title>` < 60 chars, descrição < 160 chars, Open Graph + Twitter Card, JSON-LD `Product` para cada plano, sitemap, robots.txt
  - URLs limpas (`/`, `/precos`, `/sobre`); landing usa rota raiz
  - Pre-render via `@nguniversal` ou export estático do Angular para indexação
- **Acessibilidade**: navegação por teclado, foco visível, headings sequenciais, alt em imagens, contraste AA, prefers-reduced-motion respeitado

### 12.4 Estrutura no código

- App separado **dentro do mesmo monorepo**: `apps/landing` (Angular standalone, sem auth, somente público) ou módulo dentro de `apps/web` em `features/landing/`. Decisão padrão: **módulo dentro de `apps/web`** com SSG pelo `@angular/ssr` para reduzir overhead operacional.
- Componentes em `apps/web/src/app/features/landing/`:
  - `landing.page.ts` — orquestra seções
  - `sections/hero.component.ts`
  - `sections/pricing.component.ts` (lê `GET /api/billing/plans`)
  - `sections/faq.component.ts`
  - `sections/testimonials.component.ts` (se presente)
- Conteúdo textual em arquivo de copy isolado (`landing.copy.ts`) para facilitar A/B e revisão de marketing
- Rota `/` aponta para `landing.page.ts`; usuário autenticado é redirecionado para `/admin` automaticamente
