# syntax=docker/dockerfile:1.7
# Multi-stage build para a API NestJS, otimizada para Cloud Run.

# ---- Stage 1: deps + build ----
FROM node:20-alpine AS builder
WORKDIR /workspace

# Manifests e configs necessários para resolver dependências reproducíveis
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY .prettierrc .prettierignore .editorconfig ./
COPY apps ./apps
COPY libs ./libs
COPY tools ./tools

# Instalar com cache de lockfile; sem rodar scripts de prepare (husky)
ENV HUSKY=0
RUN npm ci --no-audit --no-fund

# Build da API e das libs das quais ela depende
RUN npx nx build api --skip-nx-cache --configuration=production

# ---- Stage 2: produção (apenas runtime) ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Apenas o output do build e o package.json para resolução de deps de produção
COPY --from=builder /workspace/dist/apps/api ./
COPY package.json package-lock.json ./

# Reinstala somente dependências de produção
ENV HUSKY=0
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "main.js"]
