-- JBBA runtime sync: add the Super ADM role to the PostgreSQL enum.
-- Kept isolated because PostgreSQL requires the new enum value to commit
-- before another migration can reference it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
