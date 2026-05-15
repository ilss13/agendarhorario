# Deploy — Agendar Horário

Guia operacional para colocar a plataforma em produção no GCP (Cloud Run + Cloud SQL + Firebase Hosting).

---

## 1. Pré-requisitos manuais (uma única vez)

### 1.1 Projeto GCP

```bash
gcloud projects create agendarhorario-prod --name="Agendar Horário"
gcloud config set project agendarhorario-prod
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  vpcaccess.googleapis.com
```

### 1.2 Artifact Registry

```bash
gcloud artifacts repositories create agendarhorario \
  --repository-format=docker \
  --location=southamerica-east1
```

### 1.3 Cloud SQL (MySQL 8)

```bash
gcloud sql instances create agendarhorario-db \
  --database-version=MYSQL_8_0 \
  --tier=db-g1-small \
  --region=southamerica-east1 \
  --root-password="$(openssl rand -base64 24)"
gcloud sql databases create agendarhorario --instance=agendarhorario-db
gcloud sql users create app --instance=agendarhorario-db --password="$(openssl rand -base64 24)"
```

### 1.4 Memorystore Redis (para BullMQ)

```bash
gcloud redis instances create agendarhorario-redis \
  --size=1 --region=southamerica-east1 --redis-version=redis_7_0
```

### 1.5 Secret Manager

```bash
gcloud secrets create DB_PASSWORD --data-file=- <<< "<senha-do-usuario-app>"
gcloud secrets create FIREBASE_SERVICE_ACCOUNT --data-file=secrets/firebase-service-account.json
gcloud secrets create STRIPE_SECRET_KEY --data-file=- <<< "sk_live_..."
gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=- <<< "whsec_..."
gcloud secrets create VERIFICATION_JWT_SECRET --data-file=- <<< "$(openssl rand -hex 32)"
gcloud secrets create SENDGRID_API_KEY --data-file=- <<< "SG...."
gcloud secrets create TWILIO_AUTH_TOKEN --data-file=- <<< "..."
```

### 1.6 Firebase Hosting

```bash
firebase login
firebase use agendarhorario-prod
# Garanta que o site default está habilitado
```

### 1.7 Workload Identity Federation (GitHub Actions sem chave estática)

Crie um pool + provider OIDC para o GitHub e um service account `agendarhorario-deployer` com:

- `roles/run.admin`
- `roles/artifactregistry.writer`
- `roles/iam.serviceAccountUser`
- `roles/secretmanager.secretAccessor`
- `roles/firebasehosting.admin`

Coloque os secrets no repositório GitHub:

- `GCP_PROJECT_ID`
- `GCP_WIP` (recurso `projects/.../workloadIdentityPools/.../providers/...`)
- `GCP_DEPLOYER_SA`
- `FIREBASE_SERVICE_ACCOUNT_DEPLOY` (JSON do service account com role `firebasehosting.admin`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` (do Cloud SQL)

### 1.8 Stripe

1. Crie 1 product + 4 prices recorrentes mensais em **BRL** (Básico R$39,90 · Médio R$79,90 · Grande R$149,90 · Super R$249,90)
2. Salve cada `price_...` em `STRIPE_PRICE_BASICO|MEDIO|GRANDE|SUPER` (env do Cloud Run)
3. Em **Webhooks**, adicione endpoint `https://api.agendarhorario.com/api/webhooks/stripe` com eventos:
   - `customer.subscription.created|updated|deleted`
   - `invoice.created|finalized|paid|payment_failed|voided|marked_uncollectible`
4. Salve o `whsec_...` em `STRIPE_WEBHOOK_SECRET`

---

## 2. Deploy contínuo (GitHub Actions)

`.github/workflows/deploy.yml` é disparado em push para `main`:

1. Builda imagem multi-stage (`apps/api/Dockerfile`) e empurra para Artifact Registry com tags `latest` e `${{ github.sha }}`
2. Executa Cloud Run Job `migrations` (TypeORM migration:run) com secrets do DB
3. Faz `gcloud run deploy` da nova revisão (min-instances=1)
4. Executa smoke test `GET /api/health`
5. Roda `nx build web --configuration=production` e publica em Firebase Hosting com `FirebaseExtended/action-hosting-deploy@v0`

Disparo manual: aba **Actions → Deploy → Run workflow**.

---

## 3. Primeira execução pós-deploy

```bash
# Popular planos (lê env STRIPE_PRICE_*)
npm run seed:plans

# Smoke test manual
curl https://api.agendarhorario.com/api/health
curl https://api.agendarhorario.com/api/billing/plans
```

---

## 4. Rollback

```bash
# Listar revisões
gcloud run revisions list --service=agendarhorario-api --region=southamerica-east1

# Direcionar 100% para revisão anterior
gcloud run services update-traffic agendarhorario-api \
  --region=southamerica-east1 \
  --to-revisions=<REVISAO_ANTERIOR>=100

# Hosting: rollback de release
firebase hosting:rollback
```

Migrations: se for necessário reverter o schema, use `npm run migration:revert` localmente apontando para o Cloud SQL via proxy.

---

## 5. Checklist pré-go-live

- [ ] Migrations rodadas em produção (`audit_logs`, `billing_*`, `notification_logs`, etc.)
- [ ] Planos populados (`npm run seed:plans` com `STRIPE_PRICE_*` corretos)
- [ ] Stripe webhook ativo, signature válida (testar com `stripe trigger`)
- [ ] Variáveis de ambiente conferidas no Cloud Run (`NODE_ENV=production`, secrets via Secret Manager)
- [ ] Firebase Authentication: Email/Password habilitado, domínio autorizado para Hosting
- [ ] CORS apontando para o domínio de produção (`WEB_ORIGIN`)
- [ ] HTTPS ativo (Cloud Run + Firebase Hosting já provisionam)
- [ ] Smoke tests Playwright passando contra staging
- [ ] DNS apontando: `agendarhorario.com` → Firebase Hosting; `api.agendarhorario.com` → Cloud Run
- [ ] Backups Cloud SQL ativos (automático, 7 dias mínimo)
- [ ] Monitoring: Cloud Logging com retention adequado; alarmes em error rate e latência p95

---

## 6. Observações

- **Cloud Run** roda a API atrás do proxy do Google, então `trust proxy` está habilitado para que o `@nestjs/throttler` use o IP real.
- **CSP** em produção é estrita (`script-src 'self'`). Stripe Checkout e Customer Portal são páginas externas — não precisam de inline scripts no nosso domínio.
- **Webhook Stripe** está isento de CSRF (configurado em `app.module.ts:91`).
- **Cookies** são `Secure` + `SameSite=Lax` em produção. `WEB_ORIGIN` precisa estar correto para CORS funcionar com `credentials: true`.
