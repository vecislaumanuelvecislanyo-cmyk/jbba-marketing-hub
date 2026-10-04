-- JBBA: report/map deletion is exclusive to SUPER ADM.
DROP POLICY IF EXISTS "reports delete managers" ON public.reports;
CREATE POLICY "reports delete super admin only" ON public.reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
