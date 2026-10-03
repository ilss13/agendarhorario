# Agendar Horário — fonte da verdade das funcionalidades

> Atualizado em **02/10/2026**, a partir do código presente neste repositório.
> Este documento descreve o comportamento implementado. A existência de código não comprova que integrações estejam configuradas ou que funcionalidades estejam disponíveis em produção.

## 1. Escopo e critérios

O Agendar Horário é uma plataforma SaaS de agendamento para empresas, com página pública de reservas, painel administrativo, área do cliente e cobrança recorrente da assinatura da empresa.

Esta é a referência consolidada para saber **o que o projeto oferece hoje**, como os fluxos funcionam, quais regras são aplicadas e quais recursos estão incompletos. Foram considerados rotas, componentes, controllers, services, contratos Zod, entidades, migrations, testes e configuração operacional. Documentos de planejamento e protótipos em `docs/layout/` não são evidência de entrega.

A implementação prevalece sobre textos comerciais, comentários e planos antigos. Ao mudar uma funcionalidade, este documento deve ser atualizado junto com o código. `README.md` e `DEPLOY.md` continuam como guias de execução e publicação; `plan.md` contém planejamento.

### Legenda

| Situação                 | Significado                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| Implementado             | Há código conectado ao fluxo ou endpoint correspondente.                     |
| Somente API              | Há endpoint e lógica no backend, sem tela correspondente identificada.       |
| Parcial                  | Parte do fluxo existe, com restrições descritas neste documento.             |
| Placeholder              | A rota/tela existe, mas não entrega o recurso anunciado.                     |
| Dependente de integração | O funcionamento externo exige configuração e disponibilidade de um provedor. |

## 2. Visão geral e perfis

| Perfil     | Capacidades atuais                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visitante  | Acessar landing page, consultar planos, cadastrar empresa ou cliente, entrar, recuperar senha, consultar empresa pública, reservar com OTP e usar links de confirmação/cancelamento. |
| `CUSTOMER` | Acessar suas reservas, ver detalhes, cancelar e remarcar reservas futuras; usar endpoints de exportação de dados e exclusão de conta.                                                |
| `OWNER`    | Acessar o dashboard e gerenciar dados da empresa, serviços, horários, exceções e assinatura; consultar agenda e histórico.                                                           |
| `STAFF`    | O código autoriza as mesmas rotas empresariais de `OWNER`, inclusive cobrança. Não há fluxo de criação ou gestão de equipe.                                                          |

O cadastro empresarial cria uma empresa e seu proprietário. O cadastro de cliente cria um usuário sem empresa. Clientes que reservam pela página pública são registros separados, associados à empresa; reservar não cria automaticamente uma conta de acesso.

O isolamento empresarial usa `companyId` obtido da sessão, `TenantInterceptor` e `TenantContextService`. Os serviços empresariais filtram os dados pela empresa autenticada. Não existe seletor de múltiplas empresas para o mesmo usuário.

**Fontes:** `apps/api/src/modules/auth/`, `apps/api/src/shared/auth/`, `apps/api/src/shared/tenant/`, `apps/web/src/app/core/auth/`.

## 3. Catálogo resumido

| Área               | Funcionalidades                                                                                                 | Situação                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Site público       | Apresentação, preços, CTAs, encaminhamento para cadastro e navegação conforme sessão                            | Implementado                                 |
| Identidade         | Cadastro empresarial e de cliente, login por senha e Google, sessão, logout, recuperação e redefinição de senha | Implementado; Firebase necessário            |
| Empresa            | Nome, slug, telefone, fuso e preferências de notificações                                                       | Implementado                                 |
| Marca              | Seleção/remoção visual de logo e escolha de cores                                                               | Parcial: prévia local sem persistência       |
| Serviços           | Cadastro, edição, ativação/desativação, pesquisa e exclusão lógica                                              | Implementado                                 |
| Expediente         | Múltiplos intervalos por dia da semana e fechamento de dias                                                     | Implementado                                 |
| Exceções           | Bloqueio de dia inteiro ou intervalo em uma data, motivo e exclusão                                             | Implementado                                 |
| Reserva pública    | Serviços ativos, disponibilidade, dados do cliente, OTP e criação de reserva pendente                           | Implementado                                 |
| Ações por link     | Prévia, confirmação, cancelamento e arquivo de calendário                                                       | Implementado                                 |
| Área do cliente    | Lista paginada, filtros temporais, detalhe, cancelamento e remarcação                                           | Implementado                                 |
| Agenda empresarial | Semana atual, mês, dia, indicadores e histórico por status                                                      | Implementado para consulta                   |
| Clientes no painel | Página com mensagem de indisponibilidade                                                                        | Placeholder                                  |
| Assinatura         | Planos, trial, checkout, troca de plano, cancelamento, portal, uso e faturas                                    | Implementado; Stripe necessário              |
| Comunicação        | E-mail, SMS, WhatsApp e lembretes por fila                                                                      | Implementado; provedores e Redis necessários |
| Dados pessoais     | Exportação, anonimização de clientes e remoção lógica de usuário                                                | Somente API, com restrições                  |
| Auditoria          | Estrutura e gravação nos fluxos de exportação/exclusão de conta                                                 | Parcial                                      |
| Operação           | Logs, Sentry opcional, health, Swagger em desenvolvimento, CI e workflow de deploy                              | Implementado no repositório                  |

## 4. Landing page e entrada na plataforma

A rota `/` apresenta a plataforma, conteúdo comercial e cartões dos quatro planos. Busca os planos na API; se a consulta falhar, usa os cartões locais definidos no frontend.

Os CTAs levam visitantes ao cadastro de empresa, encaminham `OWNER`/`STAFF` para assinatura e clientes autenticados à sua área. A escolha de plano é transmitida pelo parâmetro `plan`. O formulário de e-mail encaminha ao cadastro com o parâmetro `email`; **não há persistência de leads, CRM ou envio de formulário para uma API de marketing**.

Há layout responsivo e CTA fixo para celular. Textos de marketing descrevem a oferta, mas não ampliam as capacidades técnicas documentadas aqui.

**Fontes:** `apps/web/src/app/features/landing/landing.page.ts`, `landing.copy.ts`, `landing.plans.ts`, `landing.lead.ts`.

## 5. Cadastro, login e sessão

### 5.1 Cadastro de empresa

Recebe nome, slug e telefone opcional da empresa, mais nome, e-mail, senha e telefone opcional do proprietário. Valida duplicidade de slug e e-mail, cria identidade Firebase e grava empresa/proprietário em transação no banco.

Valores iniciais:

- Perfil `OWNER`, vinculado à nova empresa.
- Fuso `America/Sao_Paulo`.
- E-mail empresarial igual ao e-mail do proprietário.
- Notificações por e-mail habilitadas e canal secundário `NONE`.
- Flags locais de e-mail/telefone verificados inicialmente falsas.

Cria sessão automaticamente e tenta enviar e-mail de boas-vindas com acesso aos planos. O cadastro não cria assinatura, serviços ou horários de funcionamento. A página pública fica indisponível para novas reservas sem assinatura.

### 5.2 Cadastro de cliente

Recebe nome, e-mail, senha e telefone opcional. Cria usuário Firebase e registro local `CUSTOMER`, sem `companyId`, inicia sessão e tenta enviar boas-vindas com acesso aos agendamentos.

### 5.3 Validações compartilhadas

| Campo                         | Regra                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------ |
| E-mail                        | Remove espaços externos, converte para minúsculas e valida formato.            |
| Senha de cadastro/redefinição | Mínimo de 8 caracteres, uma maiúscula, uma minúscula e um número.              |
| Slug                          | De 3 a 60 caracteres; letras minúsculas, números e hífens separando segmentos. |
| Telefone na API               | De 10 a 15 dígitos, com `+` opcional.                                          |
| Nome de empresa/usuário       | De 2 a 120 caracteres nos contratos de cadastro.                               |

### 5.4 Login e Google

Login por e-mail/senha usa Firebase Identity Toolkit. Login Google usa o cliente Firebase e a API valida o ID token, exigindo provedor `google.com`.

Google **não cadastra automaticamente um novo usuário local**. Procura conta pelo UID; na ausência, pode associar uma conta existente pelo e-mail verificado. Se não houver conta, rejeita o login. Atualiza claims de perfil/empresa e a flag local de e-mail verificado quando aplicável.

### 5.5 Sessão, redirecionamento e logout

A autenticação da API usa cookie de sessão Firebase, normalmente `__session`, `HttpOnly`, `SameSite=Lax`, com `Secure` e domínio conforme configuração. O guard verifica validade/revogação da sessão e busca o usuário local.

“Lembrar de mim” usa duração configurável, padrão de 5 dias; desmarcado, 1 dia. O frontend restaura a sessão e protege rotas por autenticação/perfil. Proprietários e equipe seguem ao dashboard; clientes, aos seus agendamentos. Logout revoga tokens de atualização e limpa o cookie.

### 5.6 Recuperação de senha

`/esqueci-senha` solicita um link enviado por e-mail. A API retorna `{ sent: true }` também para e-mail inexistente, evitando revelar diretamente a existência de conta. O link Firebase é adaptado para `/redefinir-senha`, e a nova senha é aplicada usando `oobCode`.

**Fontes:** `apps/api/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `auth.guard.ts`; `libs/shared/contracts/src/lib/auth.ts`, `common.ts`; `apps/web/src/app/features/auth/`.

## 6. Configuração da empresa

O painel consulta e atualiza nome, slug, telefone, fuso horário e preferências de notificação. Alterar o slug exige exclusividade e muda o endereço público. A tela oferece abertura e cópia do link `/p/:slug`.

A API aceita e-mail ligado/desligado e canal secundário `NONE`, `SMS` ou `WHATSAPP`. **A tela atual mantém e-mail obrigatório, com controle desabilitado, e sempre envia `email: true` ao salvar.**

O DTO expõe `email` e `logoUrl`, mas o contrato de atualização não permite modificá-los. A tela permite selecionar imagem, removê-la da prévia e trocar cores; esses valores ficam no estado do componente e não entram no payload salvo. Não existe upload ou persistência de logo/cores nesse fluxo.

O fuso recebido pela API tem validação de tamanho, sem validação explícita de identificador IANA nesse contrato. A disponibilidade usa o fuso da empresa, mas a agenda administrativa usa o fuso global `America/Sao_Paulo`.

**Fontes:** `apps/api/src/modules/companies/companies.service.ts`; `libs/shared/contracts/src/lib/company.ts`; `apps/web/src/app/features/admin/settings/settings.page.ts`, `settings.logic.ts`.

## 7. Serviços

A empresa pode criar, consultar, pesquisar por nome, editar, ativar/desativar e excluir logicamente serviços.

| Campo                                        | Regra de criação                      |
| -------------------------------------------- | ------------------------------------- |
| Nome                                         | De 2 a 120 caracteres.                |
| Descrição                                    | Opcional/nula, até 500 caracteres.    |
| Duração                                      | Inteiro de 5 a 480 minutos.           |
| Intervalo após atendimento (`bufferMinutes`) | Inteiro de 0 a 240 minutos; padrão 0. |
| Preço                                        | Número não negativo; padrão 0.        |
| Ativo                                        | Booleano; padrão verdadeiro.          |

A API lista com `page`, `pageSize` e pesquisa `q`, ordenando por criação decrescente; tamanho máximo da página de 100. A tela atual solicita somente a primeira página de 50 itens, sem navegação de páginas implementada nesse componente.

Somente serviços ativos aparecem na página pública e podem ser selecionados na consulta de disponibilidade. A exclusão usa soft delete. O preço é informativo para o atendimento: **não há cobrança online do serviço reservado**.

**Fontes:** `apps/api/src/modules/services/`; `libs/shared/contracts/src/lib/service.ts`; `apps/web/src/app/features/admin/services/`.

## 8. Horários de funcionamento e exceções

### 8.1 Expediente semanal

Configura intervalos de início/fim para cada dia (`0` domingo a `6` sábado). Suporta vários intervalos no mesmo dia, por exemplo antes/depois do almoço. Sem intervalos, o dia fica fechado.

A tela permite ligar/desligar um dia, adicionar/remover intervalos e salvar. O fim deve ser posterior ao início; intervalos sobrepostos no mesmo dia são rejeitados no frontend e backend. O contrato limita o conjunto a 56 intervalos; não impõe separadamente um máximo de 8 por dia. Não há intervalo atravessando meia-noite nesse modelo.

Salvar substitui o conjunto inteiro da empresa em transação, removendo os anteriores e criando novos registros.

### 8.2 Exceções por data

Permite consultar, criar e excluir bloqueios em uma data, de dia inteiro ou de intervalo parcial, com motivo opcional de até 200 caracteres. Bloqueio parcial exige início/fim ordenados. Os horários de bloqueio são nulos quando o dia inteiro está marcado.

A listagem pode filtrar entre `from` e `to`; o service aplica o intervalo quando ambos estão presentes. Excluir usa soft delete. Não há endpoint de edição: para alterar, é necessário remover e criar outra exceção.

Exceções retiram disponibilidade; não abrem um expediente extra e não cancelam reservas já existentes.

**Fontes:** `apps/api/src/modules/business-hours/`; `libs/shared/contracts/src/lib/business-hours.ts`; `apps/web/src/app/features/admin/hours/`.

## 9. Página pública e disponibilidade

### 9.1 Página empresarial

`/p/:slug` mostra identidade da empresa, contato, serviços ativos, duração, preço e horários, conforme dados disponíveis. A API retorna fuso, logo e situação pública:

| Situação     | Comportamento                                                              |
| ------------ | -------------------------------------------------------------------------- |
| `AVAILABLE`  | Empresa habilitada para receber novas reservas.                            |
| `OVER_LIMIT` | Limite do período atingido; informa indisponibilidade e renovação.         |
| `SUSPENDED`  | Sem assinatura ou com status bloqueador; indisponível para novas reservas. |

A interface impede avançar para reserva quando indisponível. A API de criação repete a checagem financeira. O endpoint de disponibilidade, isoladamente, não verifica a assinatura.

### 9.2 Cálculo de horários

Recebe serviço e data inicial, com data final opcional. Retorna dias e slots com início/fim ISO e offset. Gera no máximo **31 datas**, do início até início + 30 dias; intervalos maiores são truncados na geração.

`computeSlotsForDate` combina expediente semanal, bloqueios, duração do serviço, reservas existentes e momento atual. Não oferece horários passados. Bloqueio de dia inteiro elimina todos os slots; bloqueios parciais e reservas retiram os intervalos que conflitam.

Os candidatos avançam pela duração do serviço. Ao encontrar bloqueio, o cursor pode saltar para o fim do bloco. O término do atendimento deve caber no expediente. O buffer ocupa o período posterior a uma reserva existente; a validação transacional compara também o buffer da nova reserva.

**A ocupação é calculada por empresa e serviço.** Reservas de serviços diferentes podem ocorrer simultaneamente. Não há profissional, sala, equipamento, capacidade configurável ou agenda compartilhada entre serviços.

Todas as reservas não canceladas são consideradas ocupação, inclusive os status `COMPLETED` e `NO_SHOW`. Registros excluídos logicamente são ignorados.

**Fontes:** `apps/api/src/modules/public/public.controller.ts`; `apps/api/src/modules/availability/availability.service.ts`; `libs/shared/contracts/src/lib/availability.ts`.

## 10. Agendamento público com verificação

### 10.1 Fluxo na interface

1. Abrir a empresa e selecionar serviço.
2. Escolher dia e horário disponível.
3. Informar nome, e-mail, celular e observações opcionais.
4. Solicitar código de seis dígitos.
5. Informar o código e concluir a solicitação.
6. Ver a tela de sucesso com resumo do horário solicitado.

O fluxo é organizado em etapas que podem ser reabertas conforme os dados já selecionados. Ao trocar o serviço, a disponibilidade e seleção de horário são recarregadas. O celular usa máscara brasileira e é convertido para formato internacional com `+55`. Observações aceitam até 500 caracteres.

A interface consulta uma janela inicial de hoje até hoje + 14 dias, controla reenvio com espera de 60 segundos e estados de carregamento/erro. O fluxo exige OTP inclusive quando chamado por um usuário com sessão: o service público não implementa dispensa por login.

### 10.2 OTP

A API exige e-mail e telefone. Escolhe **SMS** quando `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_SMS_FROM` estão preenchidos; caso contrário, escolhe **e-mail**. Não há escolha livre de canal pelo visitante nem OTP por WhatsApp.

O código é aleatório, de seis dígitos, armazenado como hash com o destino. Padrões configuráveis:

| Regra                                     | Padrão      |
| ----------------------------------------- | ----------- |
| Validade do código                        | 10 minutos. |
| Tentativas incorretas permitidas          | 5.          |
| Validade do token após confirmar o código | 15 minutos. |

A confirmação usa o registro pendente mais recente para canal/destino, rejeita ausência, expiração ou excesso de tentativas, consome o código e retorna JWT com canal e destino. O token de verificação não tem mecanismo de consumo único por reserva.

Fora de produção, o código também pode ser armazenado temporariamente no Redis para consulta por `GET /public/verification/dev-otp`. Em produção, o endpoint responde como inexistente.

### 10.3 Criação da reserva

A API verifica empresa, assinatura/cota, serviço ativo da empresa, token e correspondência do contato verificado. Exige ambos os contatos, embora a verificação comprove apenas o canal escolhido. Rejeita passado e início fora dos slots válidos.

Em transação, consulta reservas com bloqueio pessimista e revalida conflitos. Se identificar conflito, responde `409`. A implementação tem essa proteção, mas este documento não presume garantia absoluta de concorrência: a quota é checada antes da transação e a consulta pode não encontrar registros para bloquear em intervalos vazios.

Procura cliente empresarial pelo contato verificado. Reutiliza e atualiza nome, contatos e observações, ou cria um cliente novo. As observações ficam no registro do cliente, não em um campo próprio da reserva.

A reserva nasce como **`PENDING`**, com término calculado pela duração. Depois da gravação, tenta enfileirar mensagem de criação e lembretes de 24 horas e 1 hora, apenas se seus momentos de disparo ainda estiverem no futuro. Falha nesse enfileiramento é registrada e não desfaz a reserva pública.

**Fontes:** `apps/web/src/app/features/public/booking-flow.page.ts`, `booking/`; `apps/api/src/modules/verification/verification.service.ts`; `apps/api/src/modules/appointments/appointments.service.ts`.

## 11. Estados e ações por link

| Status      | Significado e origem atual                                                            |
| ----------- | ------------------------------------------------------------------------------------- |
| `PENDING`   | Solicitação criada ou nova reserva gerada por remarcação.                             |
| `CONFIRMED` | Confirmação por link válido.                                                          |
| `CANCELLED` | Cancelamento por link, área do cliente ou substituição por remarcação.                |
| `COMPLETED` | Reconhecido pelo banco, contratos e interface; sem fluxo de atualização identificado. |
| `NO_SHOW`   | Reconhecido pelo banco, contratos e interface; sem fluxo de atualização identificado. |

### 11.1 Links sem login

As notificações podem gerar links `/a/:token` de confirmação e cancelamento. São JWTs com nonce, validade padrão de 72 horas e registro do hash no banco. Cada chamada de emissão cria novos tokens.

A prévia mostra empresa, telefone/logo, cliente, serviço, duração, preço, início/fim, status, ação, expiração e se o token já foi consumido. A ação exige POST explícito; abrir a página não confirma automaticamente.

O consumo ocorre em transação com bloqueio do registro do token. Token expirado, inválido ou consumido é rejeitado. Confirmação exige token `CONFIRM` e rejeita reserva cancelada. Cancelamento pode ser solicitado tanto por token `CANCEL` quanto `CONFIRM`, registra motivo e consome o token.

Essas ações por link não verificam se o atendimento já começou e não aplicam a mesma restrição temporal da área autenticada. O service altera status/motivo, mas **não enfileira notificação de confirmação/cancelamento nem remove jobs de lembrete**. O worker ignora lembretes de reservas canceladas quando executa.

### 11.2 Calendário

A página da ação gera download local de `agendamento.ics`, com identificador, início/fim e resumo de serviço/empresa. É um arquivo para importação no calendário, sem sincronização com Google Calendar ou Outlook.

**Fontes:** `apps/api/src/modules/appointments/appointment-action.service.ts`, `appointment-action.controller.ts`; `apps/web/src/app/features/public/action-confirm.page.ts`, `confirmation-display.ts`.

## 12. Área do cliente

### 12.1 Identificação das reservas e listagem

`/me/agendamentos` apresenta reservas vinculadas a clientes encontrados por **`userId` ou e-mail ou telefone do usuário**, inclusive entre empresas. A associação por contatos não exige flags locais de verificação nesse service.

A API oferece `range=upcoming|past|all`, página padrão 1 e tamanho padrão 20, máximo 50. Próximas reservas são ordenadas por início crescente; passadas/todas, por início decrescente. O filtro temporal usa `startsAt`, não status, portanto uma reserva cancelada futura pode aparecer em próximas.

O detalhe mostra empresa, serviço, datas e situação. A propriedade da reserva é conferida antes de consulta, cancelamento ou remarcação.

### 12.2 Cancelamento

A tela pede confirmação. A API permite motivo opcional de até 200 caracteres; a tela envia corpo vazio. Cancelamento já realizado retorna o estado atual. Reservas no passado são rejeitadas.

Salva `CANCELLED`, remove jobs de lembrete e enfileira comunicação de cancelamento. A interface esconde ações para `COMPLETED`/`NO_SHOW`; o backend de cancelamento não implementa essa mesma restrição por status, além das regras de cancelado/passado.

### 12.3 Remarcação

A tela consulta novos slots, permite escolher e envia o novo início. A API rejeita reserva cancelada, reserva antiga no passado, novo horário passado, slot inválido e conflito. Mantém serviço, cliente e empresa.

**Não altera a reserva original no lugar:** cancela a antiga com motivo “Remarcado pelo cliente” e cria outra `PENDING`, com novo ID. Remove lembretes antigos, enfileira cancelamento/criação e agenda novos lembretes. A tela passa a abrir o novo ID.

A remarcação não chama a checagem de assinatura/cota usada na criação pública. Além disso, a consulta pública de slots usada pela tela inclui a reserva original como ocupação, enquanto a validação da remarcação exclui essa reserva.

**Fontes:** `apps/api/src/modules/me/my-appointments.service.ts`; `libs/shared/contracts/src/lib/me.ts`; `apps/web/src/app/features/me/`.

## 13. Dashboard e agenda empresarial

O dashboard tem navegação responsiva para agenda, empresa, serviços, horários, clientes, exceções, assinatura e menu “Mais”, além de logout e acesso ao link público.

### 13.1 Semana atual

A entrada `/dashboard/agenda` mostra os sete dias da semana atual, começando na segunda-feira, seleção de dia, atendimentos e indicadores de hoje: quantidade não cancelada, pendências e próximo atendimento identificado pelo helper.

Consulta os meses envolvidos quando a semana atravessa o mês, além de horários/exceções para sinalizar dias fechados. A semana exibida é derivada de hoje; não há navegação para semanas anteriores/seguintes nesse componente.

### 13.2 Mês e dia

A visão mensal permite navegar entre meses, visualizar o calendário e abrir um dia. A visão diária consulta a data da rota e apresenta reservas em ordem de horário, com serviço, cliente, telefone e status.

A API exige exatamente `date=AAAA-MM-DD` ou `month=AAAA-MM`, filtra pela empresa e retorna reservas com cliente/serviço. Essas consultas usam `America/Sao_Paulo` como fuso padrão, mesmo se a empresa tiver outro fuso configurado.

### 13.3 Histórico

O histórico consulta um mês, agrupa por dia e exibe somente `COMPLETED`, `CANCELLED` e `NO_SHOW`, com contadores por status e detalhe. Permite navegar até o mês atual, sem avançar para mês futuro.

Não é uma lista de todas as reservas passadas: reservas antigas ainda `PENDING` ou `CONFIRMED` não entram nesse histórico.

### 13.4 Limites administrativos

O painel oferece **consulta da agenda**. Não há endpoint empresarial para criar manualmente reserva, alterar horário, confirmar, cancelar, marcar conclusão ou falta. A presença de badges e contadores desses estados não representa entrega dessas ações.

`/dashboard/clientes` mostra “Lista ainda não disponível”. Os clientes existem no banco e são usados na reserva, mas não há CRUD/listagem administrativa de clientes entregue.

**Fontes:** `apps/web/src/app/features/admin/admin-layout.page.ts`, `agenda/`, `customers/customers.page.html`; `apps/api/src/modules/appointments/company-appointments.service.ts`, `company-appointments.range.ts`.

## 14. Planos, assinatura, cota e faturas

### 14.1 Catálogo comercial

| Código   | Plano  | Preço mensal em BRL | Limite de agendamentos por período |
| -------- | ------ | ------------------- | ---------------------------------- |
| `basico` | Básico | R$ 39,90            | 25                                 |
| `medio`  | Médio  | R$ 79,90            | 50                                 |
| `grande` | Grande | R$ 149,90           | 100                                |
| `super`  | Super  | R$ 249,90           | 250                                |

A definição compartilhada alimenta o catálogo da API e frontend. A API sincroniza os registros na inicialização e tenta preencher novamente caso a listagem esteja vazia. Existe também `npm run seed:plans`. Checkout/troca exigem `stripePriceId` configurado para o plano.

O trial padrão é **14 dias**, configurável, elegível somente quando a empresa não tem registro anterior de assinatura. O checkout exige coleta de método de pagamento mesmo durante trial. O cadastro empresarial isoladamente não inicia o trial.

### 14.2 Contratação e sincronização

O painel cria uma sessão de Stripe Checkout em modo assinatura e redireciona para URL externa. Cria/reutiliza cliente Stripe da empresa, com metadata empresarial e do plano. No retorno de sucesso, pode confirmar a sessão para sincronizar assinatura sem depender apenas do webhook, inclusive em ambiente local.

A API valida a associação da sessão com empresa/cliente Stripe quando esses identificadores estão presentes. Se não receber `sessionId`, pode consultar assinaturas pelo cliente Stripe já conhecido.

### 14.3 Resumo e uso

O painel consulta plano, status Stripe, período, cancelamento programado, trial, quantidade usada, limite e data de renovação.

A assinatura usada nas verificações é o registro local mais recente não excluído; o método chamado `findActiveSubscription` não filtra somente status `active`.

A quota conta reservas **criadas** dentro de `[currentPeriodStart, currentPeriodEnd)`, não atendimentos cuja data ocorre no mês. Exclui canceladas e soft deleted; não exclui pendentes, concluídas ou faltas. Ao atingir `used >= limit`, retorna `OVER_LIMIT`. A renovação acompanha o período da assinatura, não necessariamente o mês calendário.

| Estado de uso     | Regra atual                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `NO_SUBSCRIPTION` | Sem registro de assinatura selecionado.                          |
| `SUSPENDED`       | Status `incomplete_expired`, `past_due`, `canceled` ou `unpaid`. |
| `OVER_LIMIT`      | Assinatura sem status bloqueador e uso maior ou igual à quota.   |
| `AVAILABLE`       | Assinatura sem status bloqueador e uso inferior à quota.         |

`incomplete` e `paused` não estão na lista bloqueadora atual. A regra não compara explicitamente o fim do período com agora para suspender assinatura vencida; depende da sincronização Stripe.

### 14.4 Troca, cancelamento e portal

A troca atualiza o item da assinatura Stripe. Preço maior é tratado como upgrade e usa `create_prorations`; preço menor/igual usa `none`, mantém a âncora do ciclo e define `cancel_at_period_end: false`. Não há agendamento explícito de downgrade para o próximo ciclo nesse método.

O cancelamento solicita `cancel_at_period_end: true`, sem cancelamento imediato. O portal Stripe permite gestão externa de cobrança conforme sua configuração. Troca/cancelamento retornam o resumo local, que pode depender de webhook posterior para refletir a mudança.

### 14.5 Faturas e eventos

A tela lista faturas da empresa com valor, moeda, número/status, datas e links externos de fatura/PDF, quando disponíveis. Os registros são sincronizados a partir de eventos Stripe.

O webhook valida `stripe-signature` com corpo bruto e registra o evento para evitar reprocessamento de eventos já marcados. Trata:

- `checkout.session.completed`.
- `customer.subscription.created`, `.updated`, `.deleted`.
- `invoice.created`, `.finalized`, `.paid`, `.payment_failed`, `.voided`, `.marked_uncollectible`.

O registro de processamento armazena erro quando ocorre falha. A implementação marca também eventos com erro como processados; não deve ser descrita como garantia de retry automático bem-sucedido. O guia de deploy precisa considerar `checkout.session.completed`, tratado no código embora ausente de sua lista de eventos.

Há e-mail de seleção de plano conforme transições de plano/status reconhecidas pelo helper, enviado ao proprietário ou ao e-mail empresarial como alternativa.

**Fontes:** `libs/shared/contracts/src/lib/billing.ts`; `apps/api/src/modules/billing/`; `apps/web/src/app/features/admin/subscription/`; `tools/seed-plans.ts`.

## 15. Notificações e lembretes

### 15.1 Eventos e destinatários

Os fluxos conectados enfileiram mensagem de criação (`CREATED`), cancelamento (`CANCELLED`) e lembretes (`REMINDER_24H`, `REMINDER_1H`). As notificações de reservas são destinadas ao cliente, obedecendo às preferências da empresa.

Também há envio direto de e-mails de boas-vindas empresarial/cliente, recuperação de senha, código OTP e seleção de plano. Esses envios diretos não passam pelo mesmo histórico de notificações de reservas.

Templates de reserva recebem empresa, cliente, serviço, horário e links de ação. O worker carrega os dados atuais no momento do processamento; não usa um snapshot completo da criação.

### 15.2 Canais e provedores

| Canal    | Implementação                                                       |
| -------- | ------------------------------------------------------------------- |
| E-mail   | Resend com chave configurada; alternativamente SMTP via Nodemailer. |
| SMS      | Twilio, com credenciais e remetente SMS.                            |
| WhatsApp | Twilio, com credenciais e remetente WhatsApp.                       |

E-mail depende da preferência e do contato do cliente. Pode ser combinado com um único canal secundário: SMS ou WhatsApp; `NONE` desabilita o secundário.

Sem transporte configurado, os providers registram a mensagem em log e retornam sem envio externo. Assim, um registro `SENT` significa que a chamada ao provider terminou sem erro, **não comprova entrega real**. Não há confirmação de entrega/leitura nem callback de status de provedores nesse fluxo.

### 15.3 Fila e histórico

BullMQ usa Redis, com IDs de jobs por reserva/evento e delay para lembretes. Jobs concluídos são removidos; retenção de falhas é limitada a 200. Não há política explícita de tentativas/backoff nas opções desses jobs.

O worker ignora reserva ausente/excluída, mensagem não canceladora de reserva cancelada e lembrete cujo início já passou. Envio por canal registra `SENT` ou `FAILED` em `notification_logs`; erros de envio por canal são capturados. A restrição única do log não funciona como trava de envio externo.

Cancelamento autenticado/remarcação removem lembretes programados. Confirmação/cancelamento por link têm comportamento diferente, descrito na seção 11. Não existe tela de administração de fila ou consulta de logs de notificação.

**Fontes:** `apps/api/src/modules/notifications/notifications.service.ts`, `notifications.processor.ts`, `notifications.constants.ts`, `templates.ts`, `platform-emails.ts`, `providers/`.

## 16. Exportação, exclusão de conta e auditoria

### 16.1 Exportação — somente API

`GET /me/data-export` retorna JSON com usuário, clientes associados, reservas desses clientes e `exportedAt`. Inclui identificação, contatos, empresas, serviços, datas, status e motivo de cancelamento, conforme DTO implementado.

A associação usa usuário/e-mail/telefone, como na área de reservas. Registra `LGPD_EXPORT`, com quantidade de clientes/reservas. Não foi identificada interface para exportação nem geração de arquivo pela aplicação web.

### 16.2 Exclusão — somente API

`DELETE /me/account` localiza os clientes associados e, em transação:

- Substitui seus nomes por identificadores anônimos.
- Limpa e-mail, telefone, vínculo ao usuário e observações desses clientes.
- Executa a remoção lógica de verificações relacionadas aos contatos.
- Executa a remoção lógica do usuário local.

Depois tenta apagar a identidade Firebase, sem desfazer a operação local se essa etapa falhar, e registra `LGPD_DELETE`. Reservas são preservadas.

**Limites:** o usuário local é removido logicamente, mas seus campos pessoais não são sobrescritos por esse método. O log de auditoria também recebe e-mail do ator. Não há limpeza global de PII em todos os históricos nem garantia de conformidade legal integral apenas por esses endpoints.

Usuário `OWNER` com `companyId` é bloqueado, com orientação para cancelar assinatura e contatar suporte. Não existe fluxo de transferência de titularidade entregue. A operação não cancela automaticamente reservas futuras.

### 16.3 Auditoria

A estrutura suporta ator, empresa, entidade, ação, metadata e data. Há tipos para CRUD, confirmação, cancelamento, remarcação e cobrança, mas os pontos de chamada identificados estão nos fluxos de exportação/exclusão. Não há trilha completa automática de todas as alterações nem tela de consulta. Falhas de gravação são capturadas para não interromper o fluxo principal.

**Fontes:** `apps/api/src/modules/me/me-account.service.ts`, `me-account.controller.ts`; `apps/api/src/modules/audit/`.

## 17. Rotas da aplicação web

| Rota                          | Finalidade / acesso                                 |
| ----------------------------- | --------------------------------------------------- |
| `/`                           | Landing pública.                                    |
| `/login`                      | Login por senha/Google; guard de visitante.         |
| `/esqueci-senha`              | Solicitar recuperação; guard de visitante.          |
| `/redefinir-senha`            | Redefinir com código recebido; guard de visitante.  |
| `/registrar-empresa`          | Cadastro empresarial; guard de visitante.           |
| `/registrar-cliente`          | Cadastro de cliente; guard de visitante.            |
| `/p/:slug`                    | Página pública empresarial.                         |
| `/p/:slug/agendar/:serviceId` | Fluxo público de reserva.                           |
| `/a/:token`                   | Confirmação/cancelamento e calendário por link.     |
| `/me/agendamentos`            | Lista própria; sessão necessária.                   |
| `/me/agendamentos/:id`        | Detalhe e ações próprias; sessão necessária.        |
| `/dashboard`                  | Redireciona para agenda; `OWNER`/`STAFF`.           |
| `/dashboard/agenda`           | Semana atual.                                       |
| `/dashboard/agenda/mes`       | Calendário mensal.                                  |
| `/dashboard/agenda/historico` | Histórico por status final.                         |
| `/dashboard/agenda/:date`     | Consulta diária.                                    |
| `/dashboard/empresa`          | Dados e preferências empresariais.                  |
| `/dashboard/servicos`         | Lista/pesquisa de serviços.                         |
| `/dashboard/servicos/novo`    | Cadastro de serviço.                                |
| `/dashboard/servicos/:id`     | Edição de serviço.                                  |
| `/dashboard/horarios`         | Expediente semanal.                                 |
| `/dashboard/excecoes`         | Bloqueios por data.                                 |
| `/dashboard/clientes`         | Placeholder.                                        |
| `/dashboard/assinatura`       | Planos, assinatura, uso e faturas.                  |
| `/dashboard/mais`             | Navegação complementar.                             |
| `/admin/...`                  | Compatibilidade: redireciona para `/dashboard/...`. |
| Demais rotas                  | Redirecionam para `/login`.                         |

**Fonte:** `apps/web/src/app/app.routes.ts`.

## 18. Inventário de endpoints

Prefixo padrão: **`/api`**, configurável por `API_GLOBAL_PREFIX`. “Empresa” significa sessão de `OWNER`/`STAFF` e contexto empresarial. Endpoints públicos continuam sujeitos a throttling e, se houver cookie de sessão, à regra CSRF aplicável; webhook tem exceção própria.

| Método | Caminho após o prefixo                 | Acesso                    | Função                                  |
| ------ | -------------------------------------- | ------------------------- | --------------------------------------- |
| POST   | `/auth/register-company`               | Público                   | Criar empresa/proprietário e sessão.    |
| POST   | `/auth/register-customer`              | Público                   | Criar cliente e sessão.                 |
| POST   | `/auth/login`                          | Público                   | Login por senha.                        |
| POST   | `/auth/login/google`                   | Público                   | Login com ID token Google.              |
| POST   | `/auth/password/forgot`                | Público                   | Enviar recuperação.                     |
| POST   | `/auth/password/reset`                 | Público                   | Aplicar nova senha.                     |
| POST   | `/auth/logout`                         | Público                   | Revogar/limpar sessão.                  |
| GET    | `/auth/me`                             | Sessão                    | Usuário autenticado.                    |
| GET    | `/company`                             | Empresa                   | Consultar empresa.                      |
| PATCH  | `/company`                             | Empresa                   | Atualizar dados/preferências.           |
| GET    | `/company/services`                    | Empresa                   | Listar/pesquisar/paginar serviços.      |
| GET    | `/company/services/:id`                | Empresa                   | Consultar serviço.                      |
| POST   | `/company/services`                    | Empresa                   | Criar serviço.                          |
| PATCH  | `/company/services/:id`                | Empresa                   | Editar serviço.                         |
| DELETE | `/company/services/:id`                | Empresa                   | Excluir logicamente serviço.            |
| GET    | `/company/business-hours`              | Empresa                   | Consultar expediente.                   |
| PUT    | `/company/business-hours`              | Empresa                   | Substituir expediente.                  |
| GET    | `/company/business-exceptions`         | Empresa                   | Listar bloqueios.                       |
| POST   | `/company/business-exceptions`         | Empresa                   | Criar bloqueio.                         |
| DELETE | `/company/business-exceptions/:id`     | Empresa                   | Excluir bloqueio.                       |
| GET    | `/company/appointments`                | Empresa                   | Consultar por `date` ou `month`.        |
| GET    | `/public/companies/:slug`              | Público                   | Empresa, serviços, horários e situação. |
| GET    | `/public/companies/:slug/availability` | Público                   | Slots por serviço/período.              |
| POST   | `/public/companies/:slug/appointments` | Público                   | Criar reserva com verificação.          |
| POST   | `/public/verification/request`         | Público                   | Solicitar OTP.                          |
| POST   | `/public/verification/confirm`         | Público                   | Confirmar OTP e obter JWT.              |
| GET    | `/public/verification/dev-otp`         | Público, fora de produção | Consultar código de desenvolvimento.    |
| GET    | `/public/appointments/action/:token`   | Token público             | Prévia da ação/reserva.                 |
| POST   | `/public/appointments/action/:token`   | Token público             | Consumir ação; corpo exige `kind`.      |
| GET    | `/me/appointments`                     | Sessão                    | Listar reservas próprias.               |
| GET    | `/me/appointments/:id`                 | Sessão/propriedade        | Consultar reserva própria.              |
| PATCH  | `/me/appointments/:id/cancel`          | Sessão/propriedade        | Cancelar.                               |
| PATCH  | `/me/appointments/:id/reschedule`      | Sessão/propriedade        | Remarcar.                               |
| GET    | `/me/data-export`                      | Sessão                    | Exportar JSON pessoal.                  |
| DELETE | `/me/account`                          | Sessão                    | Remover conta com restrições.           |
| GET    | `/billing/plans`                       | Público                   | Catálogo de planos.                     |
| GET    | `/company/billing/subscription`        | Empresa                   | Assinatura e uso.                       |
| GET    | `/company/billing/invoices`            | Empresa                   | Faturas.                                |
| POST   | `/company/billing/checkout-session`    | Empresa                   | Abrir contratação.                      |
| POST   | `/company/billing/confirm-checkout`    | Empresa                   | Sincronizar retorno do checkout.        |
| POST   | `/company/billing/portal-session`      | Empresa                   | Abrir portal Stripe.                    |
| POST   | `/company/billing/change-plan`         | Empresa                   | Solicitar troca de plano.               |
| POST   | `/company/billing/cancel`              | Empresa                   | Cancelar ao fim do período.             |
| POST   | `/webhooks/stripe`                     | Assinatura Stripe         | Sincronizar eventos financeiros.        |
| GET    | `/health`                              | Público                   | Retornar status e timestamp.            |
| GET    | `/debug-sentry`                        | Público                   | Lançar erro de diagnóstico.             |
| GET    | `/docs`                                | Fora de produção          | Swagger gerado na inicialização.        |

**Fontes:** controllers em `apps/api/src/modules/`, `apps/api/src/app/app.controller.ts`, `apps/api/src/main.ts`.

## 19. Mapa dos métodos e funções centrais

Esta seção aponta as unidades que determinam os comportamentos de negócio; funções de apresentação, helpers internos e testes complementam os arquivos indicados.

| Unidade / arquivo                                                                             | Métodos ou funções                                                                                                               | Responsabilidade                                               |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `auth/auth.service.ts`                                                                        | `registerCompany`, `registerCustomer`, `login`, `loginWithGoogle`, `requestPasswordReset`, `resetPassword`, `logout`, `me`       | Identidade, cadastro e sessão.                                 |
| `companies/companies.service.ts`                                                              | `getMine`, `updateMine`                                                                                                          | Configuração da empresa autenticada.                           |
| `services/services.service.ts`                                                                | `list`, `getById`, `create`, `update`, `remove`                                                                                  | Catálogo empresarial.                                          |
| `business-hours/business-hours.service.ts`                                                    | `list`, `replace`, `validateNoOverlap`                                                                                           | Expediente e validação de intervalos.                          |
| `business-hours/business-exceptions.service.ts`                                               | `list`, `create`, `remove`                                                                                                       | Bloqueios por data.                                            |
| `availability/availability.service.ts`                                                        | `getSlots`, `computeSlotsForDate`, `occupiedRangesOverlap`                                                                       | Geração de slots e detecção de ocupação com buffer.            |
| `verification/verification.service.ts`                                                        | `request`, `confirm`, `verifyToken`, `lookupDevOtp`                                                                              | OTP, JWT e apoio ao desenvolvimento.                           |
| `appointments/appointments.service.ts`                                                        | `createForPublicBooking`                                                                                                         | Regras financeiras, contato, slot, cliente e gravação pública. |
| `appointments/appointment-action.service.ts`                                                  | `issueLinks`, `preview`, `consume`                                                                                               | Tokens e ações sem login.                                      |
| `appointments/company-appointments.service.ts`                                                | `listByDate`, `listByMonth`                                                                                                      | Consulta empresarial da agenda.                                |
| `appointments/company-appointments.range.ts`                                                  | `appointmentDayRange`, `appointmentMonthRange`                                                                                   | Intervalos de consulta por dia/mês.                            |
| `me/my-appointments.service.ts`                                                               | `list`, `getById`, `cancel`, `reschedule`                                                                                        | Área do cliente e associação por contatos.                     |
| `me/me-account.service.ts`                                                                    | `export`, `deleteAccount`                                                                                                        | Dados pessoais e remoção de conta.                             |
| `billing/billing.service.ts`                                                                  | `listPlans`, `getSubscriptionSummary`, `canBookForCompany`, `listInvoices`                                                       | Catálogo, assinatura e quota.                                  |
| `billing/billing.service.ts`                                                                  | `createCheckoutSession`, `confirmCheckout`, `createPortalSession`, `changePlan`, `cancel`                                        | Operações Stripe da empresa.                                   |
| `billing/billing.service.ts`                                                                  | `tryRegisterEvent`, `markEventProcessed`, `upsertFromCheckoutSession`, `upsertSubscriptionFromStripe`, `upsertInvoiceFromStripe` | Sincronização financeira.                                      |
| `billing/plan-selection-notice.ts`                                                            | `shouldNotifyPlanSelection`                                                                                                      | Decisão de aviso de seleção de plano.                          |
| `notifications/notifications.service.ts`                                                      | `enqueueImmediate`, `scheduleReminder`, `cancelScheduled`, `process`                                                             | Fila e envio de mensagens.                                     |
| `notifications/templates.ts`                                                                  | `renderTemplate`                                                                                                                 | Conteúdo de comunicação de reservas.                           |
| `audit/audit.service.ts`                                                                      | `log`                                                                                                                            | Persistência de auditoria.                                     |
| Frontend `settings/settings.logic.ts`                                                         | Helpers de URL pública, cores, logo e fuso                                                                                       | Apresentação e validação local.                                |
| Frontend `agenda/agenda-week.ts`, `agenda-month.ts`, `agenda-history.ts`, `agenda-display.ts` | Helpers de calendário, agrupamento, resumo e status                                                                              | Projeções da agenda, sem alterar reservas.                     |
| Frontend `public/booking/booking-display.ts`                                                  | Helpers de telefone, etapas e resumo                                                                                             | Apresentação do fluxo público.                                 |
| Frontend `public/confirmation-display.ts`                                                     | `buildAppointmentIcs` e helpers de confirmação                                                                                   | Calendário e apresentação da ação.                             |

Caminhos da primeira coluna, exceto os marcados como frontend, são relativos a `apps/api/src/modules/`. Os serviços HTTP do frontend ficam em `libs/web/data-access/src/lib/`. Os contratos compartilhados ficam em `libs/shared/contracts/src/lib/`.

## 20. Dados persistidos

| Entidade                 | Papel                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| `Company`                | Identidade, contatos, slug, fuso, preferências e IDs Stripe.             |
| `User`                   | Conta local, UID Firebase, perfil, empresa e flags de verificação.       |
| `Customer`               | Cliente por empresa, contatos, observações e vínculo opcional a usuário. |
| `Service`                | Serviço, duração, intervalo posterior, preço e ativação.                 |
| `BusinessHour`           | Intervalo recorrente por dia da semana.                                  |
| `BusinessException`      | Bloqueio por data.                                                       |
| `Appointment`            | Empresa, serviço, cliente, horários, status e motivo de cancelamento.    |
| `Verification`           | Destino, canal, hash do OTP, validade, tentativas e consumo.             |
| `AppointmentActionToken` | Hash do link, reserva, ação, validade e consumo.                         |
| `NotificationLog`        | Evento/canal/status de envio e erro.                                     |
| `Plan`                   | Preço, limite, código e referência Stripe.                               |
| `Subscription`           | Situação, plano e período de cobrança.                                   |
| `Invoice`                | Fatura Stripe e links de pagamento/PDF.                                  |
| `BillingEvent`           | Evento recebido, payload, processamento e erro.                          |
| `AuditLog`               | Ator, entidade, ação e metadata.                                         |

A base compartilhada oferece identificadores e timestamps, inclusive exclusão lógica. As migrations existentes criam a estrutura inicial, configuração empresarial, reservas públicas, preferências/logs de notificação, cobrança e auditoria. Exclusão lógica não significa apagamento físico dos dados.

**Fontes:** entidades em `apps/api/src/modules/`; `apps/api/src/shared/infra/typeorm/base.entity.ts`, `migrations/`.

## 21. Segurança, observabilidade e operação

### 21.1 Controles implementados

- Guard global de sessão, com exceções explícitas para endpoints públicos.
- Guard empresarial por perfil e contexto por requisição.
- Validação de payload/query com contratos Zod nos endpoints correspondentes.
- Throttling global configurável, padrão 120 requisições por 60 segundos, e limites menores em autenticação/verificação.
- CSRF por cookie/header com comparação resistente a diferenças de tempo; métodos seguros ou requisições sem sessão são liberados; webhook Stripe excluído.
- CORS com origem configurada e credenciais.
- Helmet, CSP/HSTS condicionais em produção, compressão e confiança em um salto de proxy.
- Hash de códigos e tokens de ação no armazenamento correspondente.
- Logs Pino com redação de autorização, cookie e padrões de senha configurados.

Esses controles descrevem a implementação; não equivalem a auditoria integral de segurança ou certificação.

### 21.2 Diagnóstico e Sentry

Sentry é opcional na API e frontend, ativado por configuração/DSN. Há instrumentação de erros e traces, breadcrumbs do agendamento e configuração de replay no frontend. Sem DSN, o SDK permanece desativado.

`GET /health` retorna `status: ok` e timestamp; **não testa disponibilidade de banco, Redis, Firebase ou Stripe**. `/debug-sentry` lança erro de diagnóstico; não possui restrição explícita a desenvolvimento no controller. Swagger é habilitado somente fora de produção.

### 21.3 Execução e deploy

Monorepo Nx com Angular 19, NestJS 10, TypeORM, MySQL, Firebase, Redis/BullMQ e bibliotecas compartilhadas. Scripts disponíveis: `start`, `start:api`, `start:web`, `build`, `test`, `lint`, `format`, `format:check`, migrations e seed de planos.

Docker Compose define dependências locais, incluindo MySQL, Redis e MailHog. O workflow de CI executa formatação, lint, testes e build dos projetos afetados. O workflow de deploy contém build/push da API, execução de job de migrations, publicação Cloud Run, health e build/publicação Firebase Hosting.

A definição de deploy tolera falha do comando de migrations com `|| true`, e o input manual `environment` não é usado para separar os alvos: os passos publicados usam produção/live. Não se deve tratar esse workflow como comprovação de migração bem-sucedida ou de staging separado.

Operação real exige configuração de banco, Firebase, Redis, provedores de comunicação, preços/webhook Stripe, URLs, cookies, CORS e secrets. Não foram consultadas credenciais privadas nem validada infraestrutura externa para elaborar este documento.

**Fontes:** `package.json`, `docker-compose.yml`, `firebase.json`, `.github/workflows/`, `apps/api/src/main.ts`, `apps/api/src/app/app.module.ts`, `apps/api/src/shared/config/`, `apps/api/src/instrument.ts`, `apps/web/src/sentry.ts`.

## 22. Testes existentes e alcance desta revisão

Há testes unitários de API, componentes, contratos, entidades, helpers, migrations e infraestrutura compartilhada. Os smoke tests Playwright cobrem páginas públicas básicas, formulário de login/cadastro, fallback público e viewport mobile.

A suíte `apps/api-e2e/src/api/api.spec.ts` ainda espera `GET /api` com `Hello API`, comportamento diferente do controller atual. Não é evidência de validação completa do backend de hoje.

Esta revisão foi feita por leitura do repositório. Não foram executados fluxos reais de pagamento, entrega de mensagens, integração Firebase ou deploy. A presença de testes não implica que todos estejam passando nem cobertura ponta a ponta das jornadas.

## 23. Recursos que não podem ser considerados entregues

- Listagem, cadastro manual, edição e exclusão de clientes no dashboard.
- Criação/gestão de funcionários, convites e permissões granulares.
- Cadastro de profissionais/recursos, capacidade e prevenção de conflito entre serviços diferentes.
- Criação ou alteração manual de reservas pela empresa e marcação de conclusão/falta.
- Persistência de upload de logo e cores de marca pela tela de configuração.
- Cobrança do atendimento, sinal, carrinho, cupom ou checkout do cliente que reserva.
- Integração sincronizada com calendários externos; existe apenas download ICS.
- Captura persistida de leads e CRM.
- Tela de exportação/exclusão de conta, auditoria ou histórico de notificações.
- Auditoria automática de todas as mudanças, comprovação de entrega de mensagens ou retries garantidos.
- Relatórios financeiros de atendimentos, exportação CSV e analytics completos.
- Transferência de titularidade ou exclusão autônoma de empresa.

Esta lista delimita o produto atual; não constitui compromisso de implementação futura. Ao entregar um desses recursos, atualizar seu status e as regras correspondentes neste documento.
