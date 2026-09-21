---
name: alterar-codigo
description: >-
  Orquestra o checklist obrigatório após qualquer alteração de código neste
  monorepo. Use sempre que a IA criar, editar ou refatorar arquivos em apps/,
  libs/ ou tools/; ao mexer em API NestJS, contratos Zod, Angular, serviços,
  entidades, testes, Swagger ou documentação.
---

# Alterar código

Antes de declarar a tarefa concluída, execute este checklist. Leia e siga cada skill aplicável.

## Checklist

1. **Práticas do projeto** — siga [praticas-do-projeto](../praticas-do-projeto/SKILL.md).
2. **Testes** — se houve lógica nova ou alterada, siga [testes-unitarios-logica](../testes-unitarios-logica/SKILL.md).
3. **Contrato da API** — se rotas, status HTTP, body, query, params ou tipos em `libs/shared/contracts` mudaram, siga [atualizar-swagger](../atualizar-swagger/SKILL.md).
4. **Lógica ou estrutura da API** — se módulos, endpoints, fluxos, tenancy, billing ou invariantes mudaram, siga [mapear-docs-api](../mapear-docs-api/SKILL.md).

Não pule um item porque a mudança “parece pequena”. CSS/copy isolados no front não exigem Swagger nem docs de API; ainda exigem práticas do projeto.

Não invente camadas, libs ou padrões que o repositório ainda não usa.
