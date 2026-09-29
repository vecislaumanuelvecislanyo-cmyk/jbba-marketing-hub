-- JBBA runtime sync: bring the deployed Supabase schema in line with the
-- application code. All statements are idempotent.

INSERT INTO public.roles(code, name, description)
VALUES ('super_admin', 'Super Administrador', 'Controlo total do sistema, perfis, permissões, estados, dados e auditoria')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.permissions(role, permission)
VALUES ('super_admin', '*')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role, permission)
VALUES ('super_admin', '*')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  ) OR (_role = 'admin' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'
  ))
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','diretor_geral','gestor_marketing')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_all(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','diretor_geral','gestor_marketing','visualizador')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND (rp.permission = _permission OR rp.permission = '*')
  ) OR public.has_role(_user_id, 'super_admin')
$$;

DROP POLICY IF EXISTS "admin insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin update roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin delete roles" ON public.user_roles;

CREATE POLICY "admin insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin') AND (
      role <> 'super_admin'
      OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
    ))
  );

CREATE POLICY "admin update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin') AND (
      role <> 'super_admin'
      OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin') AND (
      role <> 'super_admin'
      OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
    ))
  );

CREATE POLICY "admin delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin') AND role <> 'super_admin')
  );

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_status_check;

UPDATE public.employees SET status = CASE
  WHEN status IN ('ativo','aprovado') THEN 'aprovado'
  WHEN status IN ('inativo','rejeitado') THEN 'rejeitado'
  WHEN status IN ('em_analise','processando','pendente') THEN status
  ELSE 'pendente'
END;

UPDATE public.clients SET status = CASE
  WHEN status = 'ativo' THEN 'aprovado'
  WHEN status = 'inativo' THEN 'rejeitado'
  WHEN status IN ('em_analise','processando','pendente','rejeitado','aprovado') THEN status
  ELSE 'em_analise'
END;

UPDATE public.campaigns SET status = CASE
  WHEN status = 'ativa' THEN 'processando'
  WHEN status = 'concluida' THEN 'aprovado'
  WHEN status = 'cancelada' THEN 'rejeitado'
  WHEN status = 'planeada' THEN 'em_analise'
  WHEN status IN ('em_analise','processando','pendente','rejeitado','aprovado') THEN status
  ELSE 'em_analise'
END;

UPDATE public.visits SET status = CASE
  WHEN status = 'agendada' THEN 'pendente'
  WHEN status = 'realizada' THEN 'aprovado'
  WHEN status = 'cancelada' THEN 'rejeitado'
  WHEN status IN ('em_analise','processando','pendente','rejeitado','aprovado') THEN status
  ELSE 'pendente'
END;

ALTER TABLE public.employees ADD CONSTRAINT employees_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.visits ADD CONSTRAINT visits_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.activities ADD CONSTRAINT activities_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.targets ADD CONSTRAINT targets_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));

CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_targets_status ON public.targets(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status);

DROP POLICY IF EXISTS "Super admin gere perfis" ON public.role_permissions;
CREATE POLICY "Super admin gere perfis" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "reports delete managers" ON public.reports;
CREATE POLICY "reports delete managers" ON public.reports
  FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_activity_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NEW.employee_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.employee_id IS DISTINCT FROM OLD.employee_id) THEN
    SELECT user_id INTO uid FROM public.employees WHERE id = NEW.employee_id;
    IF uid IS NOT NULL AND uid IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (uid, 'Nova atividade atribuída', NEW.subject, 'activity', '/atividades');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'activity_assignment' AND tgrelid = 'public.activities'::regclass
  ) THEN
    CREATE TRIGGER activity_assignment
      AFTER INSERT OR UPDATE ON public.activities
      FOR EACH ROW EXECUTE FUNCTION public.notify_activity_assignment();
  END IF;
END $$;
