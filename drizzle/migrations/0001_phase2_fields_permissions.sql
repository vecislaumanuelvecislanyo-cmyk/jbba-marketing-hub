ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS province text, ADD COLUMN IF NOT EXISTS service text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS province text, ADD COLUMN IF NOT EXISTS service text, ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS next_steps text, ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.followups ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'media', ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS reminder_at timestamptz;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS duration_minutes integer, ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS audience text, ADD COLUMN IF NOT EXISTS content text, ADD COLUMN IF NOT EXISTS cost numeric;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS province text, ADD COLUMN IF NOT EXISTS service text;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL REFERENCES public.roles(code),
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem permissões" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gere permissões" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
INSERT INTO public.role_permissions(role, permission) SELECT role, permission FROM public.permissions ON CONFLICT DO NOTHING;
CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles ur join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = _user_id and (rp.permission = _permission or rp.permission = '*'))
$$;

-- explicit audit events (exports, approvals) from the app
CREATE OR REPLACE FUNCTION public.log_event(_action text, _table text, _record text, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _action not in ('EXPORT','APPROVE','REJECT','CONVERT','ADMIN') then raise exception 'invalid action'; end if;
  insert into public.audit_logs(table_name, record_id, action, new_data, changed_by)
  values (left(_table,64), left(_record,64), _action, _data, auth.uid());
end $$;
REVOKE ALL ON FUNCTION public.log_event(text,text,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_event(text,text,text,jsonb) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_client ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON public.clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_visits_sched ON public.visits(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_visits_emp ON public.visits(employee_id);
CREATE INDEX IF NOT EXISTS idx_followups_due ON public.followups(due_date);
CREATE INDEX IF NOT EXISTS idx_followups_emp ON public.followups(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_emp ON public.activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_logs(table_name, created_at desc);