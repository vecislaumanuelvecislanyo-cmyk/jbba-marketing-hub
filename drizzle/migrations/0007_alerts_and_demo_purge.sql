CREATE OR REPLACE FUNCTION public.generate_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE emp uuid; n integer := 0; r record;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT id INTO emp FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
  FOR r IN SELECT f.id, f.notes, f.type FROM public.followups f
    WHERE f.status = 'pendente' AND f.due_date < current_date
      AND (f.employee_id = emp OR (emp IS NULL AND public.is_manager(auth.uid())))
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = auth.uid() AND type='alerta_followup' AND link = '/followups#'||r.id AND created_at::date = current_date) THEN
      INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (auth.uid(),'Follow-up em atraso', coalesce(r.notes, r.type), 'alerta_followup', '/followups#'||r.id);
      n := n + 1;
    END IF;
  END LOOP;
  FOR r IN SELECT l.id, l.title FROM public.leads l
    WHERE l.stage NOT IN ('ganho','perdido') AND l.updated_at < now() - interval '14 days'
      AND (l.assigned_to = emp OR (emp IS NULL AND public.is_manager(auth.uid())))
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = auth.uid() AND type='alerta_lead' AND link = '/leads#'||r.id AND created_at > now() - interval '7 days') THEN
      INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (auth.uid(),'Lead sem movimento há 14 dias', r.title, 'alerta_lead', '/leads#'||r.id);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.purge_demo_data()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE total integer := 0; c integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Apenas o Super ADM pode remover dados DEMO.'; END IF;
  UPDATE public.field_reports SET visit_id = NULL WHERE visit_id IN (SELECT id FROM public.visits WHERE is_demo);
  UPDATE public.field_reports SET client_id = NULL WHERE client_id IN (SELECT id FROM public.clients WHERE is_demo);
  UPDATE public.field_reports SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  DELETE FROM public.followups WHERE is_demo
    OR lead_id IN (SELECT id FROM public.leads WHERE is_demo) OR client_id IN (SELECT id FROM public.clients WHERE is_demo)
    OR proposal_id IN (SELECT id FROM public.proposals WHERE is_demo) OR contract_id IN (SELECT id FROM public.contracts WHERE is_demo);
  GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.activities WHERE is_demo OR lead_id IN (SELECT id FROM public.leads WHERE is_demo) OR client_id IN (SELECT id FROM public.clients WHERE is_demo);
  GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.visits WHERE is_demo OR lead_id IN (SELECT id FROM public.leads WHERE is_demo) OR client_id IN (SELECT id FROM public.clients WHERE is_demo);
  GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.contracts WHERE is_demo OR proposal_id IN (SELECT id FROM public.proposals WHERE is_demo) OR client_id IN (SELECT id FROM public.clients WHERE is_demo);
  GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.proposals WHERE is_demo OR lead_id IN (SELECT id FROM public.leads WHERE is_demo) OR client_id IN (SELECT id FROM public.clients WHERE is_demo);
  GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.campaign_leads WHERE lead_id IN (SELECT id FROM public.leads WHERE is_demo) OR campaign_id IN (SELECT id FROM public.campaigns WHERE is_demo);
  UPDATE public.leads SET campaign_id = NULL WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE is_demo);
  UPDATE public.leads SET client_id = NULL WHERE NOT is_demo AND client_id IN (SELECT id FROM public.clients WHERE is_demo);
  DELETE FROM public.leads WHERE is_demo; GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.targets WHERE is_demo; GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.clients WHERE is_demo; GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  DELETE FROM public.campaigns WHERE is_demo; GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  -- detach real records from demo employees without accounts, then remove those employees
  UPDATE public.leads SET assigned_to = NULL WHERE assigned_to IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.clients SET assigned_to = NULL WHERE assigned_to IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.visits SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.activities SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.followups SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.proposals SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.contracts SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.targets SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.profiles SET employee_id = NULL WHERE employee_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  UPDATE public.employees SET manager_id = NULL WHERE manager_id IN (SELECT id FROM public.employees WHERE is_demo AND user_id IS NULL);
  DELETE FROM public.employees WHERE is_demo AND user_id IS NULL; GET DIAGNOSTICS c = ROW_COUNT; total := total + c;
  INSERT INTO public.audit_logs(table_name, record_id, action, new_data, changed_by) VALUES ('demo', NULL, 'ADMIN', jsonb_build_object('purged', total), auth.uid());
  RETURN total;
END $$;

REVOKE EXECUTE ON FUNCTION public.generate_alerts() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.purge_demo_data() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_demo_data() TO authenticated;