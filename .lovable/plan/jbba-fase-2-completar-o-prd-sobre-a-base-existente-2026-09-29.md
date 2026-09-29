# JBBA — Fase 2: completar o PRD sobre a base existente

A app já compila e tem login, RBAC (5 perfis), 21 tabelas com RLS, Dashboard, Equipa, Leads (Kanban + lista), Clientes 360°, Visitas, Follow-ups, Atividades, Metas, Auditoria e Configurações. Esta fase fecha as lacunas face ao PRD.

## 1. Dados em falta (migração aditiva, sem apagar nada)
- Leads/Clientes: `province`, `service` (interesse), `source` em clientes.
- Visitas: `next_steps`, `notes`.
- Follow-ups: `priority` (baixa/média/alta), `proposal_id`, `contract_id`, `reminder_at`.
- Atividades: `duration_minutes`, `outcome`.
- Campanhas: `audience`, `content`, `cost`.
- Metas: `department_id`, `province`, `service`.
- Nova tabela `role_permissions` (a atual `permissions` passa a ser o catálogo) + função `has_permission()`.
- Índices em FKs, `stage`, `due_date`, `scheduled_at`.
- Auditoria: registar também mudanças de fase e exportações; logs sem DELETE/UPDATE (já garantido).

## 2. CRM
- Formulários e tabelas com os novos campos, filtros por província/serviço/responsável/estado e ordenação por coluna.
- Ação "Converter em cliente" quando a lead passa a Ganho (cria cliente e liga a lead).
- Histórico da lead (atividades, visitas, follow-ups e alterações da auditoria).

## 3. Dashboard
- KPIs completos do PRD (qualificados, reuniões, negociações, ganhos/perdidos, receita contratada, conversão, follow-ups atrasados, progresso de metas).
- Filtros: período, técnico, província, serviço.

## 4. Módulos secundários
- Campanhas com leads geradas, conversões e retorno (receita / custo).
- Propostas e Contratos com estados, valores e receita contratada.
- Calendário mensal/semanal com visitas, follow-ups e atividades.
- Relatórios diário→anual com exportação CSV (PDF/Excel preparados).
- Notificações: follow-ups atrasados, leads sem movimento há 14 dias, eventos próximos.

## 5. IA assistiva (só preparação)
- Página "Sugestões IA" que grava pedidos em `ai_runs` como rascunho; só um gestor pode aprovar. Nada é alterado automaticamente.

## 6. Dados DEMO
- Preencher os novos campos nos registos DEMO; botão em Configurações para remover todos os dados DEMO.

## Decisões assumidas
- Moeda Kwanza (Kz); províncias de Angola como lista fixa.
- Serviços como lista editável simples (texto), sem regras complexas.
