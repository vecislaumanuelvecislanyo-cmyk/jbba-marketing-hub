CREATE OR REPLACE FUNCTION public.guard_promotor_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.role = 'promotor' AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o Super ADM pode atribuir o perfil Técnico/Promotor.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_promotor_role ON public.user_roles;
CREATE TRIGGER guard_promotor_role BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_promotor_role();