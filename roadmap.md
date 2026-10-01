# Roadmap JBBA

## Concluído
- [x] Colisão de rotas `/` e erros TypeScript resolvidos; build OK
- [x] Logotipo real JBBA no login, sidebar e ícone do separador (favicon)
- [x] Perfil SUPER ADM na base de dados (enum, permissões `*`, políticas, funções has_role/is_manager/has_permission)
- [x] Sugestões IA de follow-up ligadas ao AI Gateway da Lovable (openai/gpt-6-astra); resultados ficam como rascunho em ai_runs
- [x] Testes pgTAP de autenticação, RBAC e CRUD (supabase/tests/database/auth_rbac_crud.test.sql)
- [x] Typecheck e build de produção validados

## Pendente (fases seguintes)
- [ ] Converter lead ganha em cliente
- [ ] Filtros técnico/província/serviço no Dashboard
- [ ] Calendário mensal/semanal
- [ ] Relatórios diário→anual com exportação
- [ ] Alertas automáticos (follow-ups atrasados, leads paradas)
- [ ] Botão "Remover dados DEMO" em Configurações
