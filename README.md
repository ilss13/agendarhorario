# Agendar Horário

Plataforma SaaS multi-tenant de agendamento de horários.

- **Backend**: NestJS + TypeORM + MySQL + Firebase Admin
- **Frontend**: Angular standalone (`.ts` + `.html` + `.scss`) + Tailwind + Angular Material
- **Monorepo**: Nx
- **Deploy**: GCP (Cloud Run + Cloud SQL + Firebase Hosting)

Veja o plano completo em [`plan.md`](./plan.md).

## Requisitos

- Node.js 20+
- npm 10+
- (Opcional, recomendado) Docker para subir MySQL/Redis/MailHog localmente

## Setup local

```bash
npm install
cp .env.example .env      # ajuste credenciais Firebase, DB, etc.
docker compose up -d      # MySQL, Redis, MailHog
npm run migration:run     # cria tabelas no MySQL
npm run start             # sobe api e web em paralelo
```

### Configuração mínima do Firebase

1. Crie um projeto em https://console.firebase.google.com.
2. Habilite **Authentication → Email/Password**.
3. Em **Project settings → Service accounts**, gere uma chave (JSON) e salve em `secrets/firebase-service-account.json` (já está no `.gitignore`).
4. Em **Project settings → General**, pegue o **Web API key** e copie para `.env` como `FIREBASE_WEB_API_KEY` e `FIREBASE_PROJECT_ID`.

### Sentry (opcional em local)

Deixe `SENTRY_DSN` vazio no `.env` para não enviar eventos. Para testar, use o DSN do projeto da API. O frontend só envia se `sentryDsn` estiver preenchido em `apps/web/src/environments/environment.ts`.

### URLs

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs (apenas em dev)
- Frontend: http://localhost:4200
- MailHog UI: http://localhost:8025
- Health check: http://localhost:3000/api/health
- Teste Sentry: http://localhost:3000/api/debug-sentry (sempre 500)

### Scripts úteis

```bash
npx nx serve api          # API
npx nx serve web          # Frontend
npx nx test               # todos os testes
npx nx lint               # lint completo
npx nx format:write       # formatar tudo
```

### Migrations TypeORM

```bash
# rodar migrations pendentes
npx typeorm migration:run -d apps/api/src/shared/infra/typeorm/data-source.ts

# gerar nova migration a partir de mudanças nas entities
npx typeorm migration:generate apps/api/src/shared/infra/typeorm/migrations/<NomeDaMigration> \
  -d apps/api/src/shared/infra/typeorm/data-source.ts
```

## Estrutura

```
apps/
  api/          # NestJS
  web/          # Angular — componente = .ts + .html + .scss
libs/
  shared/
    contracts/  # zod + DTOs compartilhados front/back
    utils/      # helpers puros
  web/
    ui/         # design system Angular
    data-access/# serviços HTTP/state
```

No frontend, a lógica fica no `.ts`, o template no `.html` e os estilos no `.scss`. O que se repete entre telas vai para os mixins de `apps/web/src/styles/_ui.scss`.
