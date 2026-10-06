DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['activities','contracts','followups','leads','proposals','targets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "delete managers" ON public.%I', t);
    EXECUTE format('CREATE POLICY "delete super admin only" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''super_admin''))', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "documents delete" ON public.documents;
CREATE POLICY "documents delete" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "employees delete" ON public.employees;
CREATE POLICY "employees delete" ON public.employees FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "fr delete" ON public.field_reports;
CREATE POLICY "fr delete" ON public.field_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['campaigns','departments','campaign_leads'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s update" ON public.%I FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s delete" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''super_admin''))', t, t);
  END LOOP;
END $$;

-- Promotores register companies/leads in their own account without approval:
-- auto-link (or create) their employee record and assign the row to them.
CREATE OR REPLACE FUNCTION public.ensure_promotor_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE emp uuid; p record;
BEGIN
  IF auth.uid() IS NULL OR public.is_manager(auth.uid()) OR NOT public.is_promotor(auth.uid()) THEN RETURN NEW; END IF;
  emp := public.current_employee_id();
  IF emp IS NULL THEN
    SELECT full_name, email INTO p FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.employees(user_id, full_name, email, position, status, created_by)
    VALUES (auth.uid(), coalesce(p.full_name, p.email, 'Promotor'), p.email, 'Promotor', 'aprovado', auth.uid())
    RETURNING id INTO emp;
    UPDATE public.profiles SET employee_id = emp WHERE id = auth.uid();
  END IF;
  NEW.assigned_to := emp;
  NEW.created_by := coalesce(NEW.created_by, auth.uid());
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ensure_promotor_owner ON public.clients;
CREATE TRIGGER ensure_promotor_owner BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.ensure_promotor_owner();
DROP TRIGGER IF EXISTS ensure_promotor_owner ON public.leads;
CREATE TRIGGER ensure_promotor_owner BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.ensure_promotor_owner();
REVOKE EXECUTE ON FUNCTION public.ensure_promotor_owner() FROM anon, public;