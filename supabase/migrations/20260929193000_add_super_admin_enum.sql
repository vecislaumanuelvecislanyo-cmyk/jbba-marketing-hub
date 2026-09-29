-- Add the enum value in an isolated migration so it is committed before use.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
