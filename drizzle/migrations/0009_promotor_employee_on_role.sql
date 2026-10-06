CREATE OR REPLACE FUNCTION public.ensure_promotor_employee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE emp uuid; p record;
BEGIN
  IF NEW.role <> 'promotor' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT full_name, email INTO p FROM public.profiles WHERE id = NEW.user_id;
  IF p IS NULL THEN SELECT email INTO p FROM auth.users WHERE id = NEW.user_id; END IF;
  INSERT INTO public.employees(user_id, full_name, email, position, status)
  VALUES (NEW.user_id, coalesce(p.full_name, p.email, 'Promotor'), p.email, 'Promotor', 'aprovado') RETURNING id INTO emp;
  UPDATE public.profiles SET employee_id = emp WHERE id = NEW.user_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ensure_promotor_employee ON public.user_roles;
CREATE TRIGGER ensure_promotor_employee AFTER INSERT OR UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.ensure_promotor_employee();
REVOKE EXECUTE ON FUNCTION public.ensure_promotor_employee() FROM anon, public;