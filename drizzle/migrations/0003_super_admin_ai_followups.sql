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
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR (_role = 'admin' AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;

DROP POLICY IF EXISTS "admin insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin update roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin delete roles" ON public.user_roles;

CREATE POLICY "admin insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND (
        role <> 'super_admin'
        OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
      )
    )
  );

CREATE POLICY "admin update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND (
        role <> 'super_admin'
        OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND (
        role <> 'super_admin'
        OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
      )
    )
  );

CREATE POLICY "admin delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin') AND role <> 'super_admin')
  );

CREATE POLICY "Super admin gere perfis" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin gere perfis de utilizador" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND (rp.permission = _permission OR rp.permission = '*')
  ) OR public.has_role(_user_id, 'super_admin')
$$;
