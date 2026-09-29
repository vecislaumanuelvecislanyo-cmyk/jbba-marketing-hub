# JBBA Marketing Hub

Constrói o projeto completo **JBBA Marketing Control & Management** usando o PRD fornecido nesta conversa como especificação principal.

OBJETIVO:
Aplicação web empresarial/PWA full-stack para gestão e controlo da equipa de Marketing/Comercial da JBBA Prestação de Serviços, Lda. (SU).

REQUISITOS PRINCIPAIS:
- Interface integralmente em Português.
- Design empresarial moderno, limpo, premium e responsivo para desktop, tablet e Android.
- Stack full-stack TypeScript com Tailwind/shadcn e backend/database Lovable/Supabase.
- Autenticação segura e RBAC.
- Perfis: Administrador, Diretor Geral, Gestor de Marketing, Técnico/Promotor e Visualizador.
- Sidebar: Dashboard, Minha Atividade, Equipa, Leads, Clientes, Visitas, Follow-ups, Campanhas, Metas, Propostas, Contratos, Calendário, Relatórios, Notificações, Auditoria e Configurações.
- Dashboard com KPIs de leads, qualificação, reuniões, visitas, propostas, negociações, contratos, receita, conversão, follow-ups e metas.
- CRM pipeline: Lead → Contactado → Qualificado → Reunião → Proposta → Negociação → Ganho/Perdido.
- Gestão de clientes com visão 360°.
- Registo de visitas, atividades e follow-ups.
- Gestão de campanhas.
- Metas individuais/equipa por leads, visitas, reuniões, propostas, contratos e receita.
- Propostas e contratos.
- Calendário.
- Relatórios diário, semanal, mensal, trimestral/anual.
- Centro de notificações.
- Audit Trail para operações críticas.
- Estrutura preparada para IA assistiva futura.
- Arquitetura extensível para futura integração com o JCMS da JBBA, incluindo Controlo Interno, Gestão de Riscos, Auditoria, Contabilidade e IA.

BASE DE DADOS:
Criar PostgreSQL/Supabase com entidades:
users, roles, permissions, employees, departments, clients, leads, lead_stages, visits, followups, activities, campaigns, campaign_leads, targets, proposals, contracts, notifications, documents, reports, ai_runs, audit_logs.
Usar UUIDs, timestamps e created_by/updated_by quando aplicável. Criar relações e constraints adequados.

PRIMEIRA ENTREGA:
1. Fundação full-stack.
2. Login/autenticação.
3. RBAC e proteção das rotas.
4. Schema de base de dados.
5. Dashboard funcional ligado à base de dados.
6. CRUD funcional para Equipa, Leads, Clientes, Atividades, Visitas, Follow-ups e Metas.
7. Kanban de Leads.
8. Audit Trail.
9. Dados demo/seed para testes, identificados como demonstração.
10. Páginas e navegação preparadas para Campanhas, Propostas, Contratos, Calendário e Relatórios avançados.

REGRAS:
- Não criar apenas mockups ou telas estáticas.
- Botões e ações principais devem funcionar.
- Aplicar validação de formulários.
- Respeitar RBAC em UI e backend.
- Utilizadores só podem consultar dados autorizados.
- Registar alterações críticas.
- Não apagar logs silenciosamente.
- Não inventar regras de negócio não especificadas; manter arquitetura extensível.
- Não implementar IA como autoridade final.
- Dashboard deve usar dados reais da base de dados.
- Usar componentes reutilizáveis e código organizado.

DESIGN:
Dashboard executivo com cards KPI, gráficos, tabelas, filtros, pesquisa, badges, Kanban, modais/drawers e estados de loading/vazio/erro. Navegação clara e experiência especialmente simples para utilização diária pelos promotores.

CRITÉRIOS DE ACEITAÇÃO:
Login funcional; RBAC funcional; dashboard com dados reais; CRUD de leads/clientes/atividades/visitas/follow-ups/metas; pipeline funcional; acompanhamento de equipa; cálculo de cumprimento de metas; audit trail; responsividade; arquitetura preparada para evolução.

Começa pela fundação e implementa uma primeira versão funcional completa. Não pares numa especificação: escreve o código e deixa o projeto executável.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/711edb99-e99c-4177-8b44-93944dbb9f9c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
