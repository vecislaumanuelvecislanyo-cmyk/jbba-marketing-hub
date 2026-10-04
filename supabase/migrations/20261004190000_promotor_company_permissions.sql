-- JBBA: promoters may register/update their own companies; only SUPER ADM may delete companies.
DROP POLICY IF EXISTS "delete managers" ON public.clients;
CREATE POLICY "delete super admin only" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to_created_by ON public.clients(assigned_to, created_by);
