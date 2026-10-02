CREATE TABLE public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  report_date date NOT NULL DEFAULT current_date,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  location text,
  activities_done text,
  results text,
  issues text,
  next_steps text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','aprovado','rejeitado')),
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_reports_created_by_idx ON public.field_reports(created_by);
CREATE INDEX field_reports_status_idx ON public.field_reports(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_reports TO authenticated;
GRANT ALL ON public.field_reports TO service_role;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr read" ON public.field_reports FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.can_read_all(auth.uid()));
CREATE POLICY "fr insert" ON public.field_reports FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_promotor(auth.uid()) OR public.is_manager(auth.uid())));
CREATE POLICY "fr update" ON public.field_reports FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "fr delete" ON public.field_reports FOR DELETE TO authenticated
  USING ((created_by = auth.uid() AND status = 'rascunho') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.field_report_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE is_super boolean := public.has_role(auth.uid(),'super_admin'); r record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('rascunho','enviado') AND NOT is_super THEN RAISE EXCEPTION 'Estado inválido.'; END IF;
  ELSE
    IF NOT is_super THEN
      IF OLD.status IN ('enviado','aprovado') THEN RAISE EXCEPTION 'Relatório já enviado; aguarda avaliação do Super ADM.'; END IF;
      IF NEW.status NOT IN ('rascunho','enviado') THEN RAISE EXCEPTION 'Apenas o Super ADM pode avaliar relatórios.'; END IF;
      NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at; NEW.review_notes := OLD.review_notes;
    ELSIF NEW.status IN ('aprovado','rejeitado') AND NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
      IF OLD.created_by IS NOT NULL THEN
        INSERT INTO public.notifications(user_id,title,message,type,link)
        VALUES (OLD.created_by, 'Relatório '||NEW.status, NEW.title, 'info', '/relatorios-campo');
      END IF;
    END IF;
  END IF;
  IF NEW.status = 'enviado' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'enviado') THEN
    NEW.submitted_at := now();
    FOR r IN SELECT user_id FROM public.user_roles WHERE role='super_admin' LOOP
      INSERT INTO public.notifications(user_id,title,message,type,link)
      VALUES (r.user_id, 'Novo relatório de campo para avaliar', NEW.title, 'info', '/relatorios-campo');
    END LOOP;
  END IF;
  NEW.updated_at := now(); NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
CREATE TRIGGER field_report_workflow BEFORE INSERT OR UPDATE ON public.field_reports
FOR EACH ROW EXECUTE FUNCTION public.field_report_workflow();
CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.field_reports
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL,
  granted_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT, INSERT, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up read" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager(auth.uid()));
CREATE POLICY "up insert super" ON public.user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "up delete super" ON public.user_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND (rp.permission = _permission OR rp.permission = '*')
  ) OR EXISTS (SELECT 1 FROM public.user_permissions up WHERE up.user_id = _user_id AND up.permission = _permission)
  OR public.has_role(_user_id, 'super_admin')
$$;

DROP POLICY IF EXISTS "Admin gere permissões" ON public.role_permissions;