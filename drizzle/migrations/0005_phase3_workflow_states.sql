-- JBBA Phase 3: workflow states and operational controls
-- Normaliza os estados pedidos sem eliminar registos existentes.

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_status_check;

UPDATE public.employees SET status = CASE WHEN status = 'ativo' THEN 'aprovado' ELSE 'rejeitado' END;
UPDATE public.clients SET status = CASE WHEN status = 'ativo' THEN 'aprovado' WHEN status = 'inativo' THEN 'rejeitado' ELSE 'em_analise' END;
UPDATE public.campaigns SET status = CASE WHEN status = 'ativa' THEN 'processando' WHEN status = 'concluida' THEN 'aprovado' WHEN status = 'cancelada' THEN 'rejeitado' ELSE 'em_analise' END;
UPDATE public.visits SET status = CASE WHEN status = 'agendada' THEN 'pendente' WHEN status = 'realizada' THEN 'aprovado' ELSE 'rejeitado' END;

ALTER TABLE public.employees ADD CONSTRAINT employees_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.visits ADD CONSTRAINT visits_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.activities ADD CONSTRAINT activities_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));
ALTER TABLE public.targets ADD CONSTRAINT targets_status_check CHECK (status IN ('em_analise','processando','pendente','rejeitado','aprovado'));

CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status);
CREATE INDEX IF NOT EXISTS idx_targets_status ON public.targets(status);

-- SUPER ADM pode gerir/apagar qualquer registo operacional já protegido pelo is_manager.
-- Acesso de importação/exportação/análise fica registado na auditoria da aplicação.
