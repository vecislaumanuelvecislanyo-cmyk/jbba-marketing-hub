CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

ALTER POLICY "catalog read" ON public.roles USING (public.has_any_role(auth.uid()));
ALTER POLICY "catalog read" ON public.permissions USING (public.has_any_role(auth.uid()));
ALTER POLICY "catalog read" ON public.lead_stages USING (public.has_any_role(auth.uid()));
ALTER POLICY "departments read" ON public.departments USING (public.has_any_role(auth.uid()));
ALTER POLICY "employees read" ON public.employees USING (public.has_any_role(auth.uid()));
ALTER POLICY "campaigns read" ON public.campaigns USING (public.has_any_role(auth.uid()));
ALTER POLICY "campaign_leads read" ON public.campaign_leads USING (public.has_any_role(auth.uid()));
ALTER POLICY "Autenticados leem permissões" ON public.role_permissions USING (public.has_any_role(auth.uid()));