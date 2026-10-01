-- Testes de autenticação, RBAC e CRUD dos módulos prioritários (pgTAP).
BEGIN;
SELECT plan(20);

-- 1. Autenticação: trigger de novo utilizador existe e cria perfil
SELECT has_function('public', 'handle_new_user', 'função handle_new_user existe');
SELECT has_trigger('auth', 'users', 'on_auth_user_created', 'trigger de novo utilizador existe');

-- 2. RBAC: funções de perfil e permissão
SELECT has_function('public', 'has_role', ARRAY['uuid', 'app_role'], 'has_role existe');
SELECT has_function('public', 'has_permission', ARRAY['uuid', 'text'], 'has_permission existe');
SELECT has_function('public', 'is_manager', ARRAY['uuid'], 'is_manager existe');
SELECT has_function('public', 'can_read_all', ARRAY['uuid'], 'can_read_all existe');

-- 3. RBAC: super_admin existe com permissão total
SELECT ok(
  EXISTS (SELECT 1 FROM public.roles WHERE code = 'super_admin'),
  'perfil super_admin existe'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'super_admin' AND permission = '*'),
  'super_admin tem permissão total (*)'
);

-- 4. RBAC: utilizador de teste com perfil super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'super_admin');

SELECT ok(
  public.has_role('00000000-0000-0000-0000-000000000001', 'super_admin'),
  'has_role reconhece super_admin'
);
SELECT ok(
  public.has_role('00000000-0000-0000-0000-000000000001', 'admin'),
  'super_admin herda privilégios de admin'
);
SELECT ok(
  public.is_manager('00000000-0000-0000-0000-000000000001'),
  'super_admin é gestor'
);
SELECT ok(
  public.has_permission('00000000-0000-0000-0000-000000000001', 'qualquer_permissao'),
  'super_admin passa qualquer verificação de permissão'
);

-- 5. CRUD: criar, editar e eliminar nos módulos prioritários
INSERT INTO public.clients (name, status) VALUES ('Cliente Teste', 'em_analise') RETURNING id \gset
SELECT ok(true, 'cliente criado');

UPDATE public.clients SET status = 'aprovado' WHERE id = :id;
SELECT is(
  (SELECT status FROM public.clients WHERE id = :id), 'aprovado',
  'cliente editado'
);

DELETE FROM public.clients WHERE id = :id;
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.clients WHERE id = :id),
  'cliente eliminado'
);

INSERT INTO public.leads (title, stage) VALUES ('Lead Teste', 'lead') RETURNING id \gset
SELECT ok(true, 'lead criada');

UPDATE public.leads SET stage = 'qualificado' WHERE id = :id;
SELECT is(
  (SELECT stage FROM public.leads WHERE id = :id), 'qualificado',
  'lead movida no pipeline'
);

DELETE FROM public.leads WHERE id = :id;
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.leads WHERE id = :id),
  'lead eliminada'
);

-- 6. Auditoria: logs não podem ser alterados nem apagados
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND cmd IN ('UPDATE', 'DELETE')
  ),
  'audit_logs sem políticas de UPDATE/DELETE (imutável)'
);

SELECT * FROM finish();
ROLLBACK;
