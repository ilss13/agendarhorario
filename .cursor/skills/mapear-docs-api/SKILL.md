---
name: mapear-docs-api
description: >-
  Atualiza a documentação interna quando a lógica ou a estrutura da API muda.
  Use ao criar/renomear/remover endpoints, módulos Nest, guards, webhooks,
  fluxos de agendamento/auth/billing/verificação, ou ao alterar comportamento
  de rotas existentes.
---

# Mapear documentação interna da API

Fonte de verdade da superfície e dos fluxos: `plan.md`. Complementos: `README.md` (URLs e scripts) e `DEPLOY.md` (impacto de infra).

## Quando aplicar

Qualquer mudança em:

- controllers, rotas, prefixos, status HTTP
- contratos em `libs/shared/contracts`
- módulos em `apps/api/src/modules/`
- tenancy, auth, cookies, CSRF, webhooks
- invariantes de negócio (cota, slot, OTP, status de agendamento)

Não aplique só por refatoração interna sem mudança de comportamento observável.

## O que atualizar

1. **`plan.md`**
   - Lista de endpoints (seção de API / billing): método, path, autenticação, papel, efeito.
   - Fluxos críticos (§4 e correlatos) se o passo a passo mudou.
   - Estrutura de módulos (§2) se criou/moveu feature.
   - Decisões já tomadas: só altere se a decisão de produto realmente mudou.
2. **`README.md`** — URLs públicas, Swagger, scripts, pré-requisitos.
3. **`DEPLOY.md`** — env vars, webhooks, health, Cloud Run, se o deploy/ops mudou.

Não crie um segundo catálogo de rotas. Não reescreva o `plan.md` inteiro: edite só as seções afetadas.

## Formato no `plan.md`

Para endpoint novo ou alterado, mantenha o padrão já usado (tabela ou lista):

```
- `MÉTODO /path` — o que faz; auth (`Public` | cookie sessão + papéis); efeito colateral relevante
```

Se a lógica mudou sem path novo, atualize a frase do endpoint e o fluxo correspondente (ex.: verificação obrigatória, cota Stripe, lock de horário).

## Fechamento

Confirme no resumo da tarefa quais seções de docs foram atualizadas (ou por que nenhuma mudança observável de API ocorreu).
