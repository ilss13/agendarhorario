# Agendar Horário — plano de implementação e melhorias

> Elaborado em **02/10/2026**, com base em [FUNCIONALIDADES.md](./FUNCIONALIDADES.md) e conferência pontual do código.
> Status inicial: **planejado**. Este arquivo não indica que as mudanças já foram executadas.

## 1. Diagnóstico

**Sim: há funcionalidades incompletas e comportamentos que precisam ser melhorados.** A base entrega as principais jornadas de reserva, autenticação e assinatura, mas o painel ainda não permite operar o ciclo completo de atendimento. Há também diferenças entre canais de ação e fragilidades que devem ser corrigidas antes de ampliar o produto.

As prioridades são: comprovar autorização sobre reservas/dados pessoais, tornar reservas e cotas consistentes sob concorrência, unificar mudanças de status, recuperar falhas financeiras e de comunicação, corrigir fusos e tornar o deploy verificável. Depois, completar clientes, ações administrativas, marca e área de conta.

A ausência de um recurso não significa que ele seja obrigatório. Pagamento do atendimento, CRM, calendários externos e relatórios avançados são expansões opcionais, condicionadas ao uso real do produto.

Este plano propõe alterações e decisões de produto. O comportamento atual continua documentado em `FUNCIONALIDADES.md`; só deve ser atualizado após implementação e validação de cada entrega.

## 2. Prioridades e sequência

| Prioridade | Objetivo                                                                     | Itens           |
| ---------- | ---------------------------------------------------------------------------- | --------------- |
| P0         | Evitar acesso indevido, perda de consistência e falhas operacionais críticas | IMP-01 a IMP-07 |
| P1         | Completar a operação cotidiana e recursos já expostos                        | IMP-08 a IMP-13 |
| P2         | Melhorar gestão, rastreabilidade e experiência                               | IMP-14 a IMP-18 |
| P3         | Expandir o produto conforme demanda                                          | EXP-01 a EXP-07 |

Cada item começa pendente. O esforço relativo é **S** (localizado), **M** (várias camadas) ou **L** (mudança estrutural ou integração). Não representa prazo; estimativas de calendário dependem da equipe e das decisões abaixo.

### Ordem de execução recomendada

1. Criar uma linha de base de testes e validação de deploy (IMP-07); iniciar correção de autorização (IMP-01).
2. Centralizar transições (IMP-03), endurecer prova de contato (IMP-02) e aplicar concorrência/cotas (IMP-04).
3. Corrigir sincronização financeira (IMP-05) e entrega de eventos/notificações (IMP-06).
4. Padronizar fusos (IMP-08) e permissões empresariais (IMP-11).
5. Entregar clientes (IMP-09), ações na agenda (IMP-10), marca (IMP-12) e área de conta (IMP-13).
6. Entregar melhorias P2 e selecionar expansões P3 com evidência de demanda.

Implementar em entregas pequenas, com migrations compatíveis e revisão por critérios de aceite. Os testes de regressão acompanham as correções desde o início; não ficam para o fim do plano.

## 3. P0 — correções prioritárias

### IMP-01 — Propriedade das reservas e dados pessoais

**Tipo:** correção de autorização. **Esforço:** L. **Origem:** seções 12 e 16 da fonte da verdade.

Hoje, a área do cliente, exportação e exclusão associam registros por `userId` **ou e-mail ou telefone**, sem exigir prova de posse desses contatos. Essa associação pode dar acesso a dados de outra pessoa e tornar uma exclusão capaz de anonimizar clientes indevidos.

**Implementação:**

- Centralizar a resolução de propriedade usada por consulta, ações, exportação e exclusão.
- Autorizar por vínculo `userId` criado mediante prova de posse; usar contato como candidato à vinculação, nunca como autorização suficiente.
- Criar fluxo para reivindicar reservas feitas sem conta com OTP/contato comprovado. Tratar conflitos de vínculo sem sobrescrever outro titular.
- Registrar o canal/contato comprovado e sua relação com a reserva. Evitar tratar o segundo contato informado como também verificado.
- Migrar registros legados gradualmente, preservando reservas; não vincular em massa por mera coincidência de contato.

**Aceite:** alterar o telefone de uma conta ou cadastrar e-mail não comprovado não concede acesso a reservas alheias; exportação/exclusão seguem a mesma regra; cliente comprova contato e recupera suas reservas legadas; acessos entre empresas mantêm os vínculos corretos.

**Áreas:** `modules/me/`, `customers/`, `auth/`, `verification/`, entidades/contratos e área web do cliente. **Dependências:** contrato de prova de contato definido junto com IMP-02.

### IMP-02 — Verificação e criação idempotente de reservas

**Tipo:** correção e robustez. **Esforço:** L. **Origem:** seção 10.

O token de verificação atual pode ser reutilizado e a espera de reenvio está na interface. Repetir uma requisição após falha de rede pode causar efeitos duplicados. A confirmação concorrente do mesmo código também precisa de validação explícita.

**Implementação:**

- Introduzir uma intenção de reserva identificável, vinculando prova ao contato e ao contexto autorizado da reserva.
- Consumir a prova atomicamente na gravação bem-sucedida, sem perder a possibilidade de repetir a mesma requisição idempotente.
- Aceitar chave de idempotência por intenção: mesmo conteúdo retorna a mesma reserva; conteúdo diferente com a mesma chave é rejeitado.
- Invalidar códigos anteriores ao reenviar e proteger confirmação por transação/atualização condicional de consumo e tentativas.
- Aplicar limites de reenvio por destino e IP no backend; manter o contador visual como orientação.
- Expirar intenções, provas e registros de idempotência conforme política documentada.

**Aceite:** duas submissões simultâneas da mesma intenção criam uma reserva; timeout seguido de retry retorna o mesmo ID; token não autoriza outra intenção; código consumido não pode ser confirmado novamente; reenvio é limitado mesmo sem interface.

**Áreas:** `verification/`, `appointments/`, Redis, contratos e `booking-flow.page.ts`. **Dependências:** IMP-01 e IMP-04 para a gravação final.

### IMP-03 — Máquina de estados e ações consistentes

**Tipo:** correção de negócio. **Esforço:** L. **Origem:** seções 11 e 12.

Ações por link e ações autenticadas têm regras diferentes. Um link pode alterar reserva passada e o service não protege todos os estados finais; confirmação/cancelamento por link não produzem os mesmos efeitos de comunicação.

**Implementação:**

- Criar serviço de domínio para confirmar, cancelar, remarcar, concluir e marcar falta, com política por ator.
- Definir transições explícitas: `PENDING → CONFIRMED/CANCELLED`; `CONFIRMED → CANCELLED/COMPLETED/NO_SHOW`; conclusão/falta de pendente exige regra explícita, sem conversão implícita.
- Tratar estados finais como fechados. Eventual correção administrativa futura deve ser operação separada e auditada.
- Bloquear ações do cliente após início e aplicar regras temporais também aos links. Definir janela administrativa de conclusão/falta.
- Bloquear a reserva durante a transição, além do token, para serializar ações concorrentes por links diferentes.
- Invalidar links incompatíveis após transição/remarcação e publicar eventos de domínio apenas quando o estado realmente muda.

**Aceite:** corrida entre confirmar/cancelar resulta em estado válido; nenhum link reabre concluída/falta/cancelada; cancelamento por link remove lembretes e gera o mesmo evento do cancelamento autenticado; replay não duplica efeitos.

**Áreas:** `appointments/`, `me/`, `notifications/`, contratos e páginas de ação/detalhe. **Dependências:** coordenação com IMP-06 para efeitos assíncronos.

### IMP-04 — Concorrência, disponibilidade e cota transacional

**Tipo:** correção de consistência. **Esforço:** L. **Origem:** seções 9, 10, 12 e 14.

O bloqueio atual consulta reservas existentes, podendo não haver registro para bloquear; a checagem de cota fica antes da transação. Disponibilidade e gravação usam buffers de forma diferente. A remarcação não verifica a situação financeira e sua tela consulta slots incluindo a reserva original.

**Implementação:**

- Reproduzir as corridas com MySQL real, incluindo intervalo sem reservas; medir antes de declarar garantia ou falha absoluta.
- Serializar gravações usando registro de bloqueio estável, inicialmente da empresa, com ordem de locks documentada. Refinar granularidade só se necessário.
- Revalidar assinatura, cota e ocupação na mesma transação de criação/remarcação, usando a mesma política de buffer na consulta e gravação.
- Aplicar a regra de cota à substituição: uma remarcação válida não deve consumir duas vagas, mas deve respeitar o período e a política financeira escolhida.
- Oferecer disponibilidade autenticada para remarcação que exclua somente a reserva comprovadamente própria; não expor exclusão arbitrária por ID na API pública.
- Limitar o intervalo antes da consulta ao banco, além da geração, e escolher rejeição explícita de intervalos excessivos.
- Tratar reservas que atravessam limites de consulta por sobreposição, não apenas por data de início.

**Aceite:** requisições paralelas nunca excedem a cota definida nem reservam duas vezes a mesma capacidade; slots oferecidos respeitam o buffer dos dois atendimentos; remarcação opera no limite conforme política; nenhum ID alheio libera ocupação; testes usam transações reais.

**Áreas:** `availability/`, `appointments/`, `me/`, `billing/` e índices/migrations. **Dependências:** IMP-02, IMP-03 e decisão DEC-01.

### IMP-05 — Assinaturas, checkout e recuperação de webhooks

**Tipo:** correção financeira técnica. **Esforço:** L. **Origem:** seção 14.

Eventos com falha podem ficar marcados como processados; mudanças retornam estado local desatualizado; `incomplete`/`paused` não bloqueiam reservas. A confirmação de checkout deve exigir comprovação inequívoca de empresa e conclusão da sessão.

**Implementação:**

- Persistir estados de evento `RECEIVED/PROCESSING/SUCCEEDED/FAILED`, tentativas e erro; marcar sucesso somente após aplicação completa.
- Permitir retry seguro de falhas e serializar processamento por assinatura/empresa. Reconciliar com estado atual do provedor para eventos fora de ordem.
- Exigir vínculo empresa + cliente Stripe e sessão concluída antes de aplicar o retorno de checkout; rejeitar metadata ausente/ambígua quando não houver vínculo confiável alternativo.
- Impedir assinaturas duplicadas por dupla contratação, com proteção local e idempotência no provedor onde suportada.
- Definir matriz financeira explícita; proposta inicial: novas reservas apenas em `active`/`trialing`, com eventual tolerância documentada para sincronização atrasada.
- Sincronizar ou informar operação pendente após troca/cancelamento; executar reconciliação periódica e sob demanda, sem introduzir dependência obrigatória de cron na API.
- Alinhar downgrade, trial, renovação e mensagens comerciais ao comportamento escolhido.
- Incluir `checkout.session.completed` no guia de configuração do webhook.

**Aceite:** evento que falhou é recuperável; duplicados não repetem efeitos; eventos antigos não desfazem estado novo; sessão de outra empresa/incompleta é rejeitada; clique repetido não cria duas assinaturas; interface informa estado real ou pendente.

**Áreas:** `billing/`, contratos, página de assinatura, `DEPLOY.md`. **Dependências:** DEC-01/DEC-02 e IMP-07. Antes de codificar chamadas novas ao Stripe, conferir sua documentação oficial e a versão do SDK utilizada.

### IMP-06 — Comunicação durável e resultado verdadeiro de envio

**Tipo:** correção de confiabilidade. **Esforço:** L. **Origem:** seções 10, 11 e 15.

Uma reserva pode ser salva sem seu evento chegar à fila. Falhas por canal são capturadas, impedindo retry útil; fallback em log pode aparecer como envio bem-sucedido. Restrição única de log não impede envio duplicado.

**Implementação:**

- Gravar eventos em outbox na mesma transação da alteração da reserva; um publicador recuperável envia à BullMQ.
- Usar chave estável por evento/canal, estado de envio e tentativas. Retentar apenas canais pendentes/falhos, evitando repetir o canal já aceito.
- Separar falha transitória, permanente e transporte ausente; configurar backoff e limite de tentativas.
- Retornar resultado do provider com identificador quando disponível. Diferenciar simulado, aceito pelo provedor, falhou e entregue; entrega só existe com evidência de callback.
- Manter fallback de desenvolvimento explicitamente simulado; em produção, não declarar sucesso sem transporte.
- Restringir emissão de links de ação aos eventos/status em que fazem sentido e reconferir estado antes de lembretes.
- Adicionar reprocessamento operacional e reconciliação de outbox sem jobs. Callbacks autenticados de entrega podem ser etapa posterior.

**Aceite:** indisponibilidade do Redis não perde o evento gravado; reinício recupera pendências; falha de SMS não repete e-mail aceito; cancelamento impede lembrete; provider ausente nunca registra entrega; falha após envio é tratada como resultado incerto quando não houver idempotência externa.

**Limite:** não prometer envio exatamente uma vez se o provedor não oferece deduplicação. Documentar as janelas de resultado incerto.

**Áreas:** `notifications/`, transações de reservas, outbox/migrations, configuração e testes de falha. **Dependências:** IMP-03/IMP-04.

### IMP-07 — Baseline de testes, readiness e deploy confiável

**Tipo:** correção operacional. **Esforço:** M. **Origem:** seções 21 e 22.

**Implementação:**

- Atualizar o E2E legado que espera `Hello API`; registrar resultados reais de testes/lint/build antes de mudanças estruturais.
- Adicionar regressões de autorização, concorrência, status, webhook e indisponibilidade de dependências junto aos respectivos itens.
- Manter `/health` como liveness simples; criar readiness com banco/Redis, timeouts e ausência de detalhes sensíveis na resposta pública.
- Restringir `/debug-sentry` a desenvolvimento ou acesso operacional protegido.
- Remover `|| true` da execução de migrations; falha deve impedir publicação da nova revisão.
- Fazer `environment` selecionar efetivamente serviços, secrets e destino de hosting; impedir staging de publicar no canal live.
- Executar E2E crítico em ambiente de teste/staging, usando dados isolados e provedores de teste; condicionar promoção ao resultado.
- Documentar worker BullMQ no Cloud Run: CPU necessária fora das requisições, ciclo de vida e estratégia para executar atrasos/publicadores com confiabilidade.
- Conferir configuração Firebase/Google login, cookies e CSRF no domínio final, não apenas em localhost.

**Aceite:** migration quebrada interrompe deploy; staging não altera produção; readiness acusa banco/Redis indisponíveis; diagnóstico não é público em produção; reserva e lembrete funcionam sem tráfego web contínuo; CI/E2E validam os fluxos alterados.

**Áreas:** `.github/workflows/`, `apps/api-e2e/`, `apps/web-e2e/`, `app.controller.ts`, configuração e `DEPLOY.md`. **Dependências:** nenhuma para iniciar; amplia os cenários conforme os demais itens.

## 4. P1 — completar funcionalidades existentes

### IMP-08 — Fuso único por empresa em todas as jornadas

**Esforço:** M. **Origem:** seções 6, 9 e 13.

Validar fuso IANA, carregar o fuso empresarial na consulta administrativa e retirar o fuso global fixo dos helpers de agenda. Calcular “hoje”, período e agrupamentos no fuso adequado, inclusive no frontend de reserva/remarcação. Preservar instantes em UTC no banco; alterar fuso não muda instantes já reservados.

**Aceite:** mesma reserva aparece no mesmo dia/hora no público, cliente e dashboard; testes com São Paulo e outro fuso cobrem virada de dia/mês e mudança de horário local. Validar datas reais e combinações de filtros, não apenas regex.

**Áreas:** contratos de empresa/data, `company-appointments.range.ts`, `availability/`, helpers de agenda e páginas públicas. **Dependências:** IMP-07.

### IMP-09 — Clientes no dashboard

**Esforço:** M. **Origem:** seções 3 e 13.

Criar API empresarial paginada com pesquisa e detalhe; substituir placeholder por lista de nome/contatos, contagem de reservas e histórico. Entregar primeiro consulta e edição controlada; depois cadastro manual com política de duplicidade. Nunca transformar contato cadastrado pela empresa em prova de posse ou vínculo de usuário. Arquivar cliente sem apagar histórico; anonimização fica em fluxo separado.

**Aceite:** pesquisa/paginação funcionam; empresa não consulta/edita clientes alheios; contatos repetidos têm tratamento explícito; alteração empresarial não transfere reservas entre contas; histórico sobrevive ao arquivamento.

**Áreas:** novo módulo de clientes, contratos, data-access e `admin/customers/`. **Dependências:** IMP-01 e IMP-11.

### IMP-10 — Operação de atendimentos pela empresa

**Esforço:** L. **Origem:** seções 11 e 13.

Adicionar endpoints e interface para confirmar, cancelar, concluir e marcar falta, usando IMP-03. Entregar criação manual e remarcação em uma segunda etapa, com serviço/cliente, disponibilidade, cota, motivo e notificações. Cadastro manual exige sessão/permissão empresarial, não simulação de OTP do cliente.

**Aceite:** funcionário autorizado opera somente sua empresa; conclusão/falta seguem janela definida; ações concorrentes são consistentes; criação manual respeita cota/capacidade; histórico recebe atendimentos finalizados; alterações têm ator/motivo/evento auditável.

**Áreas:** `company-appointments.controller.ts`, domínio de reservas, contratos e `admin/agenda/`. **Dependências:** IMP-03/IMP-04/IMP-08/IMP-09/IMP-11.

### IMP-11 — Permissões empresariais explícitas

**Esforço:** M. **Origem:** seção 2.

Proposta inicial: cobrança, identidade empresarial e futura titularidade somente para `OWNER`; `STAFF` consulta/opera agenda e clientes conforme capacidades explícitas. Definir permissão para serviços/expediente antes de expor controles. Aplicar a matriz no backend e refletir na interface; ocultar botão sozinho não autoriza.

**Aceite:** requisição direta de `STAFF` à cobrança é negada; proprietário mantém operações; acesso cruzado entre empresas é bloqueado. Não depende de já existir tela de convites.

**Áreas:** guards/decorators, controllers empresariais, navegação e contratos. **Dependências:** matriz DEC-03.

### IMP-12 — Persistência de logo, cores e preferências

**Esforço:** M. **Origem:** seção 6.

Adicionar campos de marca/contratos/migration e armazenamento de imagem integrado ao ambiente existente. Validar tamanho e conteúdo/tipo permitido, controlar acesso e substituir/remover arquivo de forma recuperável. Persistir cores validadas e aplicá-las ao público com contraste mínimo. Exibir sucesso só para valores efetivamente salvos.

Resolver a divergência de e-mail: proposta é mantê-lo obrigatório, alinhando contrato/API/tela e mensagem; se produto optar por permitir desligar, remover coerção silenciosa e aceitar a preferência em todas as camadas.

**Aceite:** após recarregar e abrir outro navegador, logo/cores permanecem; remover logo é persistido; upload rejeita arquivo inválido; erro parcial não comunica salvamento completo; preferências refletidas na tela correspondem às usadas no envio.

**Áreas:** entidade/migration empresarial, upload/storage, contratos, `settings/` e páginas públicas. **Dependências:** IMP-11 e DEC-04.

### IMP-13 — Área de conta e remoção recuperável

**Esforço:** L. **Origem:** seção 16.

Antes da tela, corrigir propriedade (IMP-01) e validar em MySQL real o predicado atual de remoção de verificações. Substituir o cast de `Brackets` passado ao `softDelete` por query suportada e testada, sem atingir registros de terceiros.

Criar área de conta para download JSON e solicitação de exclusão, com reautenticação recente, explicação dos efeitos e fluxo específico para proprietário. Definir retenção por tipo de dado; anonimizar campos locais selecionados em vez de apenas soft delete. Minimizar contatos em auditoria/logs/payloads conforme essa política.

Registrar remoção externa Firebase como tarefa recuperável, com status e retry. Definir o destino de reservas futuras antes de anonimizar e impedir notificações para contatos removidos. O nome do endpoint não deve sugerir garantia jurídica automática.

**Aceite:** usuário não afeta terceiros; exportação representa vínculos comprovados; campos previstos são anonimizados; falha Firebase permanece rastreável e recuperável; sessões locais deixam de acessar a conta; proprietário recebe caminho claro; reservas futuras seguem política documentada.

**Áreas:** `me-account.service.ts`, auditoria, jobs de recuperação, data-access e nova tela de conta. **Dependências:** IMP-01/IMP-06 e DEC-05.

## 5. P2 — melhorias de gestão e experiência

| ID     | Entrega                                       | Implementação e aceite                                                                                                                                                                                                                                                                                                                                                         | Esforço / dependências |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| IMP-14 | Navegação, paginação e recuperação de erro    | Navegar semanas anteriores/seguintes e voltar a hoje; paginar serviços além dos primeiros 50; permitir avançar a janela pública de slots com limite explícito; em `409`, recarregar disponibilidade e manter dados de contato seguros. Aceite: nenhum registro fica inacessível pela paginação e horário ocupado não obriga reiniciar tudo.                                    | M; IMP-04/08           |
| IMP-15 | Edição de exceções e política de bloqueio     | Implementar PATCH empresarial; validar datas/intervalos e filtros unilaterais ou exigir ambos explicitamente; avisar sobre reservas existentes na data. Aceite: bloquear não cancela silenciosamente; editar mantém rastreabilidade; conflitos são apresentados.                                                                                                               | M; IMP-08/10           |
| IMP-16 | Auditoria e diagnóstico empresarial           | Registrar alterações de serviços, horas, empresa, reservas e cobrança com ator/empresa e mudanças mínimas; oferecer consulta paginada para proprietário. Expor histórico de comunicação com status real e reenvio autorizado. Aceite: ações críticas são rastreáveis sem armazenar senha, token bruto ou payload pessoal completo; reenvio não muda estado da reserva.         | L; IMP-03/05/06/11     |
| IMP-17 | Onboarding e prontidão para receber reservas  | Checklist de serviço ativo, expediente, plano e canal de contato; explicar por que a página está indisponível e encaminhar à correção. Aceite: empresa recém-criada sabe o próximo passo; ausência de plano/horário/serviço tem mensagem específica.                                                                                                                           | M; IMP-05/12           |
| IMP-18 | Histórico, regras e informação do atendimento | Separar filtros por data e status para localizar passadas pendentes/confirmadas; não finalizar automaticamente só por passagem do tempo. Avaliar snapshot de nome/preço/duração e observações da reserva, preservando histórico quando serviço/cliente muda. Aceite: alteração de catálogo não reescreve informação histórica escolhida; migração não inventa valores antigos. | M; IMP-03/10 e DEC-06  |

## 6. P3 — expansões opcionais

| ID     | Recurso                                                  | Quando faz sentido                                               | Escopo inicial / dependências                                                                                                                                                                              |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXP-01 | Equipe e convites                                        | Empresa precisa de contas operacionais individuais               | Convite expirável, aceite, desativação, revogação de sessão e capacidades; nenhuma promoção a proprietário por convite comum. Depende de IMP-11.                                                           |
| EXP-02 | Profissionais, recursos e capacidade                     | Serviços compartilham profissional/sala ou permitem várias vagas | Modelar recursos e associação serviço–recurso; migrar para recurso padrão preservando ocupação; incluir recurso nos slots, locks e reservas. Depende de IMP-04/08/10 e decisão sobre agenda compartilhada. |
| EXP-03 | Transferência de titularidade e encerramento empresarial | Proprietário precisa sair ou encerrar empresa sem suporte manual | Transferência com aceite/reautenticação, pelo menos um proprietário responsável, tratamento de assinatura e reservas; encerramento separado da exclusão da conta pessoal. Depende de IMP-11/13 e EXP-01.   |
| EXP-04 | Relatórios e exportação CSV                              | Gestão precisa de indicadores operacionais                       | Métricas por período/status/serviço, exportação com escopo empresarial; valor do serviço não deve ser chamado de receita recebida sem registro de pagamento. Depende de IMP-08/10/18.                      |
| EXP-05 | Calendários externos                                     | Download ICS é insuficiente                                      | Começar com integração unidirecional, OAuth e desconexão; definir autoridade e resolução de conflito antes de sincronização bidirecional. Depende de eventos duráveis e fusos.                             |
| EXP-06 | Sinal/pagamento de atendimento                           | Negócio deseja reduzir faltas ou cobrar online                   | Fluxo separado da assinatura SaaS, pagamento pendente, expiração de hold, conciliação, estorno e cancelamento. Exige definição comercial e modelo de recebedor; depende de IMP-04/05/06.                   |
| EXP-07 | Leads, CRM e automações                                  | Há objetivo mensurável de aquisição/relacionamento               | Persistência de leads somente com finalidade e consentimento definidos; começar com captura e acompanhamento simples. Não bloquear cadastro existente nem presumir envio de marketing autorizado.          |

Essas expansões não são requisitos para considerar as correções P0 e a conclusão P1 entregues.

## 7. Decisões de produto para fechar antes da implementação dependente

As opções abaixo são propostas, não mudanças já aprovadas ou presentes no código. Trabalho independente pode avançar enquanto se fecha a decisão correspondente.

| ID     | Decisão                                   | Proposta inicial                                                                                                                                                         | Itens afetados |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| DEC-01 | Cota e remarcação com assinatura suspensa | Manter cota por criação no período; substituição não duplica uso. Permitir cancelar sempre; decidir se remarcação de reserva existente continua disponível na suspensão. | IMP-04/05/10   |
| DEC-02 | Trial, tolerância financeira e downgrade  | Liberar novas reservas em active/trialing; tolerância limitada só para reconciliação demonstrável; deixar explícito se downgrade é imediato ou próximo ciclo.            | IMP-05         |
| DEC-03 | Capacidades de equipe                     | Cobrança/titularidade para OWNER; operação para STAFF; gestão de catálogo/horários configurada explicitamente.                                                           | IMP-11, EXP-01 |
| DEC-04 | Marca e notificações por e-mail           | Persistir marca; e-mail obrigatório com contrato coerente, secundário opcional.                                                                                          | IMP-12         |
| DEC-05 | Remoção de conta e reservas futuras       | Mostrar consequências antes da operação; definir cancelamento/continuidade e retenção, sem anonimizar dados de terceiros.                                                | IMP-13, EXP-03 |
| DEC-06 | Histórico e observações                   | Snapshot para novos atendimentos; separar observação da reserva de nota permanente do cliente; não deduzir preço histórico na migração.                                  | IMP-18         |
| DEC-07 | Capacidade entre serviços                 | Preservar modelo por serviço até confirmar demanda; adotar recursos explícitos quando houver agenda compartilhada.                                                       | EXP-02         |

## 8. Plano de validação

| Camada                             | Cenários necessários                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contratos e domínio                | Contatos comprovados, transições, datas/fusos, cota, buffer, idempotência e retenção definida.                                                                           |
| Integração MySQL/Redis             | Reservas simultâneas em intervalo vazio, última vaga da quota, consumo concorrente de OTP, remarcação transacional, locks/deadlocks e recuperação de outbox.             |
| Integração com provedores em teste | Checkout/webhook duplicado e fora de ordem, falha seguida de recuperação, trial/troca/cancelamento, provider ausente e erro transitório de comunicação.                  |
| E2E web                            | Cadastro → configuração → contratação de teste → reserva → confirmação → cancelamento/remarcação → operação empresarial → histórico; conta/exportação conforme entregas. |
| Autorização                        | STAFF sem cobrança, empresa A sem dados da B, contato sem prova sem acesso pessoal, tokens expirados/consumidos e CSRF no domínio de staging.                            |
| Operação                           | Migration falha impede deploy; staging separado; readiness; worker sem tráfego; reinício durante envio e remoção externa incompleta.                                     |

Usar mocks para respostas externas específicas e ambientes de teste para validar a integração real. Não enviar mensagens a clientes reais nem executar cobranças reais como parte dos testes. Capturar evidências por entrega; não declarar aprovação apenas porque os testes existem.

## 9. Critérios de conclusão de cada entrega

- [ ] Regra de produto e dependências do item resolvidas.
- [ ] Backend, contratos e frontend coerentes para o fluxo entregue.
- [ ] Migration aplicada em banco de teste, quando necessária, com estratégia de compatibilidade/recuperação documentada.
- [ ] Testes relevantes passando, incluindo cenário de falha e autorização quando aplicáveis.
- [ ] Lint/build dos projetos afetados passando.
- [ ] Critérios de aceite do item demonstrados em ambiente adequado.
- [ ] Configuração operacional e observabilidade suficientes para detectar falhas da entrega.
- [ ] `FUNCIONALIDADES.md` atualizado com comportamento efetivamente implementado.
- [ ] `DEPLOY.md` atualizado quando houver mudança de infraestrutura/provedor.
- [ ] Item marcado como concluído somente após evidência, com referência à alteração e validação.

## 10. Primeiro pacote recomendado

Começar por **IMP-07 + IMP-01**, definindo a base de testes e fechando associação indevida por contato. Na sequência, entregar **IMP-03 + IMP-02 + IMP-04** para estabilizar o núcleo de reservas e **IMP-05 + IMP-06** para recuperar falhas externas.

Depois, priorizar **IMP-08/11/09/10**, que transformam o dashboard de consulta em ferramenta de operação. Logo/cores e área de conta completam os recursos já expostos. Expansões P3 entram quando houver demanda clara e a base estiver validada.

## 11. Segurança — requisitos transversais obrigatórios

**Prioridade:** P0 para controles de autenticação, autorização, transporte, secrets e endpoints sensíveis. Estes requisitos complementam IMP-01 a IMP-07 e IMP-11; não ficam condicionados às expansões P3. Cada entrega deve indicar quais controles se aplicam e apresentar evidência de validação.

### SEG-01 — JWT de curta duração, refresh seguro e senhas

A identidade atual é delegada ao Firebase. O backend usa cookie de sessão e recebe tokens Firebase; o plano não deve introduzir armazenamento paralelo de senhas ou presumir que já existe endpoint próprio de refresh.

- **JWT de curta duração:** inventariar separadamente ID token Firebase, sessão, token de verificação e link de ação. Usar proposta de até 15 minutos para JWT próprio de acesso/prova, com consumo único quando aplicável. Validar assinatura, algoritmo permitido, expiração, emissor, audiência e finalidade conforme o tipo de token. Tokens Firebase seguem duração e validação do provedor. Revisar a validade atual de links de ação de 72 horas; tratá-los como capacidade restrita a uma reserva, nunca como sessão de acesso geral.
- **Sessão:** documentar que o cookie atual de 1/5 dias não é um JWT de acesso curto. Definir redução, renovação e reautenticação para ações sensíveis; não declarar o requisito de acesso curto concluído sem resolver essa diferença. Evitar renovação ilimitada e revogar acesso em logout, exclusão, comprometimento e mudança de permissões.
- **Refresh token seguro:** manter o gerenciamento delegado ao Firebase quando possível, sem expor refresh token nas respostas da API, logs ou armazenamento web acessível a JavaScript. Se houver refresh próprio, usar cookie `HttpOnly`, `Secure`, `SameSite` adequado e proteção CSRF, prazo absoluto, rotação a cada uso, detecção de reutilização e revogação da família. Armazenar somente hash de token aleatório de alta entropia no servidor. Coordenar abas/requisições simultâneas para não confundir corrida legítima com ataque.
- **Hash forte de senha:** verificar e documentar a configuração de senha/hash do provedor usado; a aplicação não deve persistir senha nem hash local enquanto a autenticação continuar delegada. Se autenticação local for introduzida, usar Argon2id com salt individual, custo calibrado, versão de parâmetros e rehash progressivo; nunca criptografia reversível para senhas. SHA-256 simples não é hash adequado de senha.
- Reavaliar hash de OTP de seis dígitos separadamente de senha: usar proteção contra verificação offline, como HMAC com segredo dedicado, além de expiração, tentativas e consumo atômico.

**Aceite:** token expirado, de finalidade/audiência errada ou algoritmo indevido é rejeitado; prova e links não renovam sessão; refresh não aparece em resposta/log/localStorage; reutilização de refresh próprio revoga a família; ações sensíveis exigem autenticação recente; política de sessão e responsabilidade Firebase estão documentadas e testadas.

### SEG-02 — Rate limiting e bloqueio progressivo de login

- Aplicar limites distribuídos por IP, conta/destino e operação a login, recuperação, OTP, refresh, exportação, uploads e ações públicas; validar extração de IP somente de proxies confiáveis.
- Implementar atraso/bloqueio temporário progressivo após falhas de login, com limites máximos e recuperação controlada. Não usar bloqueio permanente que permita impedir a vítima de entrar.
- Evitar diferenças que revelem se a conta existe; usar identificador normalizado e protegido nos contadores, inclusive para contas inexistentes. Definir reset após autenticação válida e expiração dos contadores.
- Validar comportamento com múltiplas instâncias e indisponibilidade do Redis; registrar a política de falha por endpoint, sem liberar silenciosamente operações de alto risco.

**Aceite:** IPs diferentes não contornam o limite da conta; contas diferentes não contornam o limite do IP; falhas sucessivas aumentam a espera; sucesso/expiração recuperam acesso; respostas não revelam cadastro; testes incluem proxy e múltiplas instâncias.

### SEG-03 — DTOs, sanitização e enumeração de recursos

- **Validação de DTOs:** cobrir body, query, path, headers relevantes e uploads; limites de tamanho/profundidade, enums, datas reais, fuso, UUIDs e combinações de campos. Rejeitar ou descartar campos desconhecidos de forma definida; impedir mass assignment e alterações de `companyId`, perfil e vínculos por payload não autorizado.
- **Sanitização:** normalizar contatos e entradas conforme domínio; renderizar texto com escape contextual, sem HTML arbitrário em observações/nome. Validar URLs/esquemas e arquivos; parametrizar consultas e não concatenar entrada em SQL, comandos ou templates. Sanitização não substitui validação nem autorização e não deve destruir informação legítima.
- **Proteção contra enumeração:** padronizar respostas de recurso inexistente e recurso alheio nos endpoints pertinentes; não confiar em UUID imprevisível como controle de acesso. Mapear erros Firebase para mensagem externa genérica, sem devolver códigos que distingam usuário inexistente de senha incorreta. Avaliar também conteúdo/status e diferenças de tempo relevantes em login, recuperação e reivindicação de reservas.

**Aceite:** payloads XSS, campos extras, datas inválidas, IDs alheios e consultas manipuladas são rejeitados ou tratados com segurança; respostas não expõem detalhes internos nem existência de recurso alheio; edição não modifica tenant/perfil/vínculo indevidamente.

### SEG-04 — CORS, headers e TLS obrigatório

- **CORS restritivo:** allowlist explícita de origens por ambiente; sem wildcard ou reflexão livre com credenciais. Limitar métodos/headers ao necessário e manter staging separado. CORS não substitui autorização/CSRF.
- **Headers de segurança:** validar CSP, HSTS em produção HTTPS, proteção contra framing, `nosniff` e política de referrer no domínio da API **e no hosting do frontend**. Reduzir permissões CSP conforme recursos utilizados e evitar enviar tokens de links para terceiros por referrer/telemetria.
- **TLS obrigatório:** bloquear ou redirecionar HTTP no ingresso de produção, configurar cookies seguros e conexões TLS com serviços externos, banco e Redis quando suportadas pela implantação. Não desabilitar validação de certificado. Documentar terminação TLS e fronteiras da rede interna; ativar HSTS somente com HTTPS/domínios preparados.

**Aceite:** origem não autorizada não recebe permissão CORS; resposta real do hosting possui headers definidos; HTTP não permite operação autenticada; cookies são seguros em produção; testes verificam certificados e configurações de conexão, além do código local.

### SEG-05 — Secrets, criptografia e rotação

- **Secrets fora do código:** credenciais privadas, chaves de assinatura, tokens de provedores e service accounts ficam em Secret Manager ou mecanismo equivalente; `.env` local ignorado e exemplos sem valores reais. Inventariar segredos, responsáveis, acessos e ambientes; adicionar detecção de secrets no CI. Distinguir configuração pública Firebase/DSN público de segredo privado, restringindo seu uso conforme o provedor.
- **Criptografia de credenciais sensíveis:** quando precisarem ser persistidos, tokens OAuth/refresh de integração e credenciais recuperáveis devem usar criptografia autenticada com chaves separadas dos dados, preferencialmente KMS/envelope encryption, versão de chave e acesso mínimo. Para tokens só verificáveis, preferir hash/HMAC apropriado. Nunca guardar chave de decriptação ao lado do ciphertext nem considerar Base64 como criptografia.
- **Rotação de segredos:** definir periodicidade e procedimento por segredo, além de rotação imediata em incidente; separar chaves de sessão/verificação/ações/webhooks por finalidade. Usar versões/identificadores e janela limitada de validação de chaves anteriores quando apropriado. Não presumir controle sobre rotação interna do Firebase; documentar responsabilidade do provedor e revogação de sessões.
- Cobrir credenciais de banco/Redis, Stripe, Twilio, Resend, service accounts e futuras integrações; remover material antigo após a janela e validar recuperação sem colocar segredos em logs.

**Aceite:** varredura não encontra credenciais privadas versionadas; credencial persistida não é legível sem chave autorizada; permissões impedem leitura por identidade indevida; exercício de rotação mantém o serviço e rejeita segredo antigo após o prazo; comprometimento permite revogação imediata.

### SEG-06 — Auditoria, assinatura de webhook e replay

- **Logs de auditoria:** registrar ações sensíveis de autenticação, bloqueio/revogação, mudança de permissões, exportação/exclusão, operações administrativas, cobrança e rotação. Incluir ator, tenant, ação, alvo, resultado, instante e correlação; acesso restrito e proteção contra alteração, com retenção definida. Não registrar senhas, JWTs, OTPs, refresh tokens ou dados pessoais desnecessários.
- **Webhooks por assinatura:** validar corpo bruto, assinatura, segredo correto e tolerância temporal quando o provedor suportar. Aplicar a todos os provedores conectados, incluindo futuros callbacks de comunicação/pagamento; assinatura ausente/inválida nunca altera estado. Se o provedor não oferecer assinatura, documentar autenticação alternativa e limitações antes de habilitar.
- **Proteção contra replay:** registrar ID de evento e resultado para webhooks; controlar timestamp/nonce quando disponíveis. Usar consumo atômico de provas/links, idempotência vinculada a usuário/tenant/intenção para operações sensíveis e reautenticação para exclusão/titularidade. Diferenciar retry legítimo, que retorna o resultado anterior, de replay para produzir novo efeito. CSRF protege contra outra classe de ataque e continua necessário.

**Aceite:** webhook adulterado/antigo é rejeitado conforme protocolo; duplicado válido não repete efeito; evento falho permanece recuperável; replay entre tenants ou com payload diferente falha; logs registram resultado sem material secreto; ações administrativas têm trilha verificável.

## 12. LGPD — requisitos correspondentes ao item 28.2

**Prioridade:** P0 para controle de acesso e definição do uso de dados; P1 para completar interface e ciclo de dados. Esta seção especifica tarefas técnicas e decisões de governança; sua conclusão não equivale, isoladamente, a certificação de conformidade jurídica.

### PRIV-01 — Consentimentos separados e finalidade

- Mapear os dados e suas finalidades: conta, reserva, prova de contato, comunicação operacional, cobrança, suporte, auditoria e marketing. Registrar a base aplicável a cada finalidade com validação responsável antes da implementação dependente; não assumir que toda operação depende de consentimento.
- **Consentimentos separados:** marketing, quando baseado em consentimento, deve ser opcional, específico e desmarcado por padrão. Não condicionar reserva/cadastro ao aceite de publicidade. Separar preferências por finalidade e canal quando necessário; ciência do aviso e aceite de termos não equivalem a consentimento de marketing.
- **Operacional vs marketing:** confirmar/lembrar/cancelar reserva é comunicação operacional; campanhas promocionais têm regra própria. A preferência empresarial de canal não autoriza marketing ao cliente. Impedir disparos promocionais sem fundamento registrado e bloquear o canal após revogação aplicável.

**Aceite:** cliente reserva sem aceitar marketing; revogação de marketing não interrompe mensagens operacionais autorizadas; tela e backend distinguem finalidade/canal; nenhuma autorização é inferida de OTP, cadastro ou preferência da empresa.

### PRIV-02 — Registro de consentimento e revogação

Criar registro versionado de concessão/revogação com titular comprovado, finalidade, canais, versão do texto apresentado, data/hora, origem e evidência mínima necessária. Minimizar IP/user-agent se utilizados. Preservar histórico conforme retenção definida e disponibilizar preferências ao titular. Revogação deve alcançar listas, filas e integrações de marketing, sem apagar a trilha necessária para demonstrar o evento.

**Aceite:** é possível demonstrar qual texto foi aceito e quando; ausência de registro não é tratada como aceite; alteração de finalidade/texto não amplia consentimento antigo automaticamente; revogação impede novos envios promocionais e é auditada.

### PRIV-03 — Exportação, anonimização e exclusão

- **Exportação futura:** reconhecer que já há endpoint JSON; completar interface, autorização por posse comprovada e download/retrieval protegido. Definir quais dados do titular entram, incluindo preferências/consentimentos, sem expor dados de outras pessoas ou segredos de operação.
- **Anonimização/exclusão quando aplicável:** inventariar User, Customer, Verification, payloads Stripe, logs, outbox, arquivos e integrações. Para cada categoria, escolher eliminação, anonimização ou retenção justificada, sem presumir que soft delete ou retirar nome produz anonimização completa.
- Integrar IMP-13: tarefa recuperável para remoção externa, revogação de sessão, tratamento das reservas futuras e regras próprias para proprietário. Definir tratamento de backups e impedir reintrodução de dados eliminados após restauração.

**Aceite:** exportação contém somente dados autorizados do titular; exclusão percorre categorias previstas e informa exceções; falha externa é recuperável; dados preservados têm finalidade/prazo explícitos; restauração respeita registros de exclusão.

### PRIV-04 — Política de retenção e acesso

Criar matriz por categoria com finalidade, responsável, prazo, início da contagem, condição de eliminação/anonimização e exceções aprovadas. Incluir OTP/provas, reservas, contas, consentimentos, auditoria, faturamento, notificações, outbox e backups. Prazos devem ser definidos e validados, não inventados como exigência legal pelo código.

Implementar expurgo automático recuperável, métricas de execução e tratamento de retenção excepcional. Aplicar menor privilégio, isolamento por tenant, acesso de suporte justificado e rastreável e restrições a exportações em massa. Credenciais de produção não devem permitir acesso indiscriminado por funções operacionais comuns.

**Aceite:** job de expurgo respeita prazos/exceções e pode repetir sem dano; usuário/equipe de uma empresa não vê outra; suporte acessa somente o necessário com trilha; dados não permanecem indefinidamente por ausência de tarefa de limpeza.

### PRIV-05 — Logs de ações administrativas

Promover a **gravação de auditoria** de IMP-16 para requisito das entregas P0/P1; somente a tela avançada de consulta pode ficar em P2. Registrar quem consultou/exportou dados em operações sensíveis, alterou cliente/reserva, mudou permissões, tratou consentimento ou executou exclusão, com resultado e motivo quando aplicável.

Definir proteção, acesso e retenção desses logs; minimizar e-mail/contatos do ator e snapshots de dados pessoais. Evitar que o próprio mecanismo de auditoria perpetue informação que deveria ser eliminada.

**Aceite:** toda operação administrativa sensível tem registro recuperável e protegido; operador comum não altera/apaga a própria trilha; registros seguem a matriz de retenção e não contêm tokens ou payload pessoal completo.

## 13. Incorporação ao cronograma e conclusão

| Pacote          | Requisitos que acompanham a entrega                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| IMP-01/02/03/04 | SEG-01/02/03/06; PRIV-04/05; prova, autorização, replay e auditoria.                                           |
| IMP-05/06       | SEG-05/06; PRIV-01/04/05; assinatura, credenciais, eventos e finalidades de envio.                             |
| IMP-07          | SEG-02/04/05; validação de controles no ambiente real, CI e rotação.                                           |
| IMP-09/10/11/12 | SEG-03/06; PRIV-01/04/05; acesso administrativo, sanitização e trilha.                                         |
| IMP-13          | SEG-01/03/06; PRIV-02/03/04/05; conta, consentimento e ciclo dos dados.                                        |
| EXP-05/06/07    | Todos os controles aplicáveis, com foco em credenciais criptografadas, webhooks, finalidades e consentimentos. |

Antes de encerrar cada pacote:

- [ ] Classificar os requisitos SEG/PRIV aplicáveis e referenciar evidências; justificar qualquer não aplicável.
- [ ] Validar expiração/renovação/revogação de tokens e sessão, sem persistência de secrets no navegador ou logs.
- [ ] Testar rate limiting distribuído, bloqueio progressivo, enumeração, DTOs e sanitização.
- [ ] Verificar TLS, CORS e headers nas respostas reais da API e do hosting.
- [ ] Testar replay, assinatura de webhook e recuperação de eventos falhos.
- [ ] Validar segregação operacional/marketing, registro e revogação de consentimento.
- [ ] Validar exportação, anonimização/exclusão, retenção e trilha administrativa conforme o escopo.
- [ ] Documentar responsáveis por configuração Firebase, gestão/rotação de secrets, retenção e incidentes.

A sequência recomendada da seção 10 permanece, incorporando estes controles desde o primeiro pacote. Decisões adicionais a fechar: duração/renovação da sessão Firebase, responsabilidade pelo refresh, matriz de retenção, bases por finalidade, textos de consentimento e prazos de rotação. Nenhuma ausência de decisão autoriza habilitar marketing ou reduzir controle de acesso.
