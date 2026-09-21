---
name: atualizar-swagger
description: >-
  Mantém o OpenAPI/Swagger alinhado ao contrato da API. Use ao alterar
  controllers Nest, DTOs/Zod em libs/shared/contracts, status HTTP, query/body
  params, ou ao adicionar rotas. Swagger em /api/docs.
---

# Atualizar Swagger

Contrato canônico: Zod + tipos em `libs/shared/contracts`. Validação HTTP: `ZodValidationPipe`. Swagger: `@nestjs/swagger` em `apps/api/src/main.ts` (`/api/docs`, só fora de produção).

Hoje os controllers quase não têm decorators OpenAPI. Toda mudança de contrato **deve** documentar (ou atualizar) o endpoint no Swagger.

## Obrigatório por rota afetada

No controller, use `@nestjs/swagger`:

- `@ApiTags('<domínio>')` no controller (`auth`, `public`, `company`, `billing`, `me`, …)
- `@ApiOperation({ summary })` em cada handler mudado
- `@ApiResponse` para **sucesso** e **falhas reais** da rota (`400`, `401`, `403`, `404`, `409`, `429` quando existirem)
- `@ApiBody` / `@ApiQuery` / `@ApiParam` alinhados ao schema Zod
- Rotas autenticadas: descreva cookie de sessão (não invente Bearer se o código usa cookie)

Não documente status que o handler nunca devolve.

## Alinhar com o Zod

1. Altere primeiro o schema em `libs/shared/contracts`.
2. Espelhe campos, `required`, enums e formatos no `schema` do decorator (mesmos nomes).
3. Se o front consome a rota, atualize `libs/web/data-access` com os **mesmos** tipos do contrato.

Não crie DTO `class-validator` paralelo ao Zod. Não adicione libs de Zod→OpenAPI sem pedido explícito.

## `main.ts`

Só mude `DocumentBuilder` (título, descrição, tags globais) se um módulo novo precisar de tag ou se a versão pública da API mudar. Não habilite Swagger em produção.

## Checagem

- Path e método no Swagger = `@Controller` + método HTTP
- Body/query = schema Zod da pipe da rota
- Códigos HTTP = `@HttpCode` + exceções do service (`BadRequest`, `NotFound`, `Conflict`, …)
