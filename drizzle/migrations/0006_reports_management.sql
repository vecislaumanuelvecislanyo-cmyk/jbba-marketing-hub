-- Reports can be managed by managers, with Super ADM included through is_manager.
DROP POLICY IF EXISTS "reports delete managers" ON public.reports;
CREATE POLICY "reports delete managers" ON public.reports
  FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));
