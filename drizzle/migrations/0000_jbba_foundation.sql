
create type public.app_role as enum ('admin','diretor_geral','gestor_marketing','promotor','visualizador');

create table public.roles (
  code public.app_role primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null references public.roles(code) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  unique(role, permission)
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  full_name text not null,
  email text,
  phone text,
  position text,
  department_id uuid references public.departments(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  hire_date date,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.lead_stages (
  code text primary key,
  name text not null,
  position int not null,
  is_closed boolean not null default false
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nif text,
  sector text,
  email text,
  phone text,
  address text,
  city text,
  status text not null default 'ativo' check (status in ('prospeto','ativo','inativo')),
  assigned_to uuid references public.employees(id) on delete set null,
  notes text,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text,
  status text not null default 'planeada' check (status in ('planeada','ativa','concluida','cancelada')),
  start_date date, end_date date,
  budget numeric(14,2) default 0,
  description text,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  contact_name text,
  company text,
  email text,
  phone text,
  source text,
  stage text not null default 'lead' references public.lead_stages(code),
  estimated_value numeric(14,2) default 0,
  client_id uuid references public.clients(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  assigned_to uuid references public.employees(id) on delete set null,
  notes text,
  lost_reason text,
  closed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.campaign_leads (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, lead_id)
);
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  scheduled_at timestamptz not null,
  status text not null default 'agendada' check (status in ('agendada','realizada','cancelada')),
  location text,
  objective text,
  outcome text,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  due_date date not null,
  type text not null default 'chamada' check (type in ('chamada','email','reuniao','visita','outro')),
  status text not null default 'pendente' check (status in ('pendente','concluido','cancelado')),
  notes text,
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'chamada' check (type in ('chamada','email','reuniao','visita','outro')),
  subject text not null,
  description text,
  activity_date timestamptz not null default now(),
  employee_id uuid references public.employees(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  metric text not null check (metric in ('leads','visitas','reunioes','propostas','contratos','receita')),
  period_type text not null default 'mensal' check (period_type in ('mensal','trimestral','anual')),
  period_start date not null,
  period_end date not null,
  target_value numeric(14,2) not null check (target_value > 0),
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  value numeric(14,2) default 0,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceite','rejeitada')),
  sent_at date,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  proposal_id uuid references public.proposals(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  value numeric(14,2) default 0,
  status text not null default 'pendente' check (status in ('pendente','assinado','ativo','terminado','cancelado')),
  signed_at date, start_date date, end_date date,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text,
  type text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  name text not null,
  file_path text,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('diario','semanal','mensal','trimestral','anual')),
  period_start date not null, period_end date not null,
  data jsonb not null default '{}'::jsonb,
  generated_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  model text,
  input jsonb, output jsonb,
  status text not null default 'pendente_revisao' check (status in ('pendente_revisao','aceite','rejeitado','erro')),
  requested_by uuid default auth.uid(),
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb, new_data jsonb,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index on public.leads(assigned_to); create index on public.leads(stage);
create index on public.visits(employee_id); create index on public.visits(scheduled_at);
create index on public.followups(employee_id); create index on public.followups(due_date);
create index on public.activities(employee_id); create index on public.clients(assigned_to);
create index on public.audit_logs(table_name, created_at desc);
create index on public.notifications(user_id, created_at desc);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_manager(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','diretor_geral','gestor_marketing'))
$$;
create or replace function public.can_read_all(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','diretor_geral','gestor_marketing','visualizador'))
$$;
create or replace function public.is_promotor(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'promotor')
$$;
create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.employees where user_id = auth.uid() limit 1
$$;

create or replace function public.set_updated_meta()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  if tg_op = 'DELETE' then rid := (to_jsonb(old)->>'id'); else rid := (to_jsonb(new)->>'id'); end if;
  insert into public.audit_logs(table_name, record_id, action, old_data, new_data, changed_by)
  values (tg_table_name, rid, tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid());
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare emp uuid; first_user boolean;
begin
  select not exists(select 1 from public.user_roles) into first_user;
  select id into emp from public.employees where lower(email) = lower(new.email) and user_id is null limit 1;
  if emp is not null then update public.employees set user_id = new.id where id = emp; end if;
  insert into public.profiles(id, full_name, email, employee_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, emp);
  insert into public.user_roles(user_id, role) values (new.id, case when first_user then 'admin'::public.app_role else 'visualizador'::public.app_role end);
  insert into public.notifications(user_id, title, message, type, link)
  values (new.id, 'Bem-vindo ao JBBA Marketing Control', 'A sua conta foi criada. Um administrador definirá o seu perfil de acesso.', 'info', '/dashboard');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.notify_lead_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    select user_id into uid from public.employees where id = new.assigned_to;
    if uid is not null and uid is distinct from auth.uid() then
      insert into public.notifications(user_id, title, message, type, link)
      values (uid, 'Nova lead atribuída', new.title, 'lead', '/leads');
    end if;
  end if;
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    if new.stage in ('ganho','perdido') then new.closed_at := now(); else new.closed_at := null; end if;
  end if;
  return new;
end $$;

grant select on public.roles, public.permissions, public.lead_stages to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.departments, public.employees, public.profiles, public.clients, public.campaigns, public.leads, public.campaign_leads, public.visits, public.followups, public.activities, public.targets, public.proposals, public.contracts, public.notifications, public.documents, public.reports, public.ai_runs to authenticated;
grant select on public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;
revoke update, delete, truncate on public.audit_logs from authenticated, anon;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.profiles enable row level security;
alter table public.lead_stages enable row level security;
alter table public.clients enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.visits enable row level security;
alter table public.followups enable row level security;
alter table public.activities enable row level security;
alter table public.targets enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.notifications enable row level security;
alter table public.documents enable row level security;
alter table public.reports enable row level security;
alter table public.ai_runs enable row level security;
alter table public.audit_logs enable row level security;

create policy "catalog read" on public.roles for select to authenticated using (true);
create policy "catalog read" on public.permissions for select to authenticated using (true);
create policy "catalog read" on public.lead_stages for select to authenticated using (true);

create policy "own or managers read roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.can_read_all(auth.uid()));
create policy "admin insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.can_read_all(auth.uid()));
create policy "profiles update" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "departments read" on public.departments for select to authenticated using (true);
create policy "departments write" on public.departments for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

create policy "employees read" on public.employees for select to authenticated using (true);
create policy "employees insert" on public.employees for insert to authenticated with check (public.is_manager(auth.uid()));
create policy "employees update" on public.employees for update to authenticated using (public.is_manager(auth.uid()));
create policy "employees delete" on public.employees for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "campaigns read" on public.campaigns for select to authenticated using (true);
create policy "campaigns write" on public.campaigns for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));
create policy "campaign_leads read" on public.campaign_leads for select to authenticated using (true);
create policy "campaign_leads write" on public.campaign_leads for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

do $$
declare t text; col text;
begin
  for t, col in select * from (values ('clients','assigned_to'),('leads','assigned_to'),('visits','employee_id'),('followups','employee_id'),('activities','employee_id'),('proposals','employee_id'),('contracts','employee_id'),('targets','employee_id')) v(t,c) loop
    execute format('create policy "read scoped" on public.%I for select to authenticated using (public.can_read_all(auth.uid()) or (public.is_promotor(auth.uid()) and (%I = public.current_employee_id() or created_by = auth.uid())))', t, col);
    if t = 'targets' then
      execute format('create policy "insert managers" on public.%I for insert to authenticated with check (public.is_manager(auth.uid()))', t);
      execute format('create policy "update managers" on public.%I for update to authenticated using (public.is_manager(auth.uid()))', t);
    else
      execute format('create policy "insert scoped" on public.%I for insert to authenticated with check (public.is_manager(auth.uid()) or (public.is_promotor(auth.uid()) and %I = public.current_employee_id()))', t, col);
      execute format('create policy "update scoped" on public.%I for update to authenticated using (public.is_manager(auth.uid()) or (public.is_promotor(auth.uid()) and %I = public.current_employee_id())) with check (public.is_manager(auth.uid()) or (public.is_promotor(auth.uid()) and %I = public.current_employee_id()))', t, col, col);
    end if;
    execute format('create policy "delete managers" on public.%I for delete to authenticated using (public.is_manager(auth.uid()))', t);
  end loop;
end $$;

create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "notifications insert" on public.notifications for insert to authenticated with check (public.is_manager(auth.uid()) or user_id = auth.uid());

create policy "documents read" on public.documents for select to authenticated using (public.can_read_all(auth.uid()) or uploaded_by = auth.uid());
create policy "documents insert" on public.documents for insert to authenticated with check (uploaded_by = auth.uid() and not public.has_role(auth.uid(),'visualizador'));
create policy "documents delete" on public.documents for delete to authenticated using (public.is_manager(auth.uid()));

create policy "reports read" on public.reports for select to authenticated using (public.can_read_all(auth.uid()) or generated_by = auth.uid());
create policy "reports insert" on public.reports for insert to authenticated with check (generated_by = auth.uid());

create policy "ai_runs read" on public.ai_runs for select to authenticated using (requested_by = auth.uid() or public.is_manager(auth.uid()));
create policy "ai_runs insert" on public.ai_runs for insert to authenticated with check (requested_by = auth.uid());
create policy "ai_runs review" on public.ai_runs for update to authenticated using (public.is_manager(auth.uid()));

create policy "audit read" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'diretor_geral'));

insert into public.roles(code,name,description) values
('admin','Administrador','Acesso total, gestão de utilizadores e perfis'),
('diretor_geral','Diretor Geral','Visão executiva total e gestão operacional'),
('gestor_marketing','Gestor de Marketing','Gestão da equipa, leads, campanhas e metas'),
('promotor','Técnico/Promotor','Gestão da própria atividade comercial'),
('visualizador','Visualizador','Apenas consulta');
insert into public.permissions(role,permission) values
('admin','*'),('diretor_geral','read:*'),('diretor_geral','write:*'),('diretor_geral','audit:read'),
('gestor_marketing','read:*'),('gestor_marketing','write:*'),
('promotor','read:own'),('promotor','write:own'),('visualizador','read:*');
insert into public.lead_stages(code,name,position,is_closed) values
('lead','Lead',1,false),('contactado','Contactado',2,false),('qualificado','Qualificado',3,false),
('reuniao','Reunião',4,false),('proposta','Proposta',5,false),('negociacao','Negociação',6,false),
('ganho','Ganho',7,true),('perdido','Perdido',8,true);

insert into public.departments(id,name,description,created_by) values
('00000000-0000-0000-0000-0000000000d1','Marketing','[DEMO] Departamento de Marketing',null),
('00000000-0000-0000-0000-0000000000d2','Comercial','[DEMO] Departamento Comercial',null);

insert into public.employees(id,full_name,email,phone,position,department_id,status,hire_date,is_demo,created_by) values
('00000000-0000-0000-0000-00000000e001','[DEMO] Ana Mendes','ana.demo@jbba.test','+244 923 000 001','Gestora de Marketing','00000000-0000-0000-0000-0000000000d1','ativo','2024-02-01',true,null),
('00000000-0000-0000-0000-00000000e002','[DEMO] Carlos Neto','carlos.demo@jbba.test','+244 923 000 002','Promotor','00000000-0000-0000-0000-0000000000d2','ativo','2024-05-10',true,null),
('00000000-0000-0000-0000-00000000e003','[DEMO] Joana Silva','joana.demo@jbba.test','+244 923 000 003','Promotora','00000000-0000-0000-0000-0000000000d2','ativo','2024-09-15',true,null),
('00000000-0000-0000-0000-00000000e004','[DEMO] Pedro Lopes','pedro.demo@jbba.test','+244 923 000 004','Técnico Comercial','00000000-0000-0000-0000-0000000000d2','ativo','2025-01-20',true,null);
update public.employees set manager_id='00000000-0000-0000-0000-00000000e001' where id <> '00000000-0000-0000-0000-00000000e001' and is_demo;

insert into public.clients(id,name,nif,sector,email,phone,city,status,assigned_to,is_demo,created_by) values
('00000000-0000-0000-0000-00000000c001','[DEMO] Luanda Retail, Lda','5000000001','Retalho','geral@luandaretail.test','+244 222 000 101','Luanda','ativo','00000000-0000-0000-0000-00000000e002',true,null),
('00000000-0000-0000-0000-00000000c002','[DEMO] Benguela Logística','5000000002','Logística','info@bglog.test','+244 222 000 102','Benguela','ativo','00000000-0000-0000-0000-00000000e003',true,null),
('00000000-0000-0000-0000-00000000c003','[DEMO] Huambo Agro','5000000003','Agricultura','agro@huambo.test','+244 222 000 103','Huambo','prospeto','00000000-0000-0000-0000-00000000e002',true,null),
('00000000-0000-0000-0000-00000000c004','[DEMO] Kwanza Tech','5000000004','Tecnologia','contact@kwanzatech.test','+244 222 000 104','Luanda','ativo','00000000-0000-0000-0000-00000000e004',true,null),
('00000000-0000-0000-0000-00000000c005','[DEMO] Lobito Construções','5000000005','Construção','obras@lobito.test','+244 222 000 105','Lobito','inativo','00000000-0000-0000-0000-00000000e003',true,null);

insert into public.campaigns(id,name,channel,status,start_date,end_date,budget,description,is_demo,created_by) values
('00000000-0000-0000-0000-0000000ca001','[DEMO] Campanha Digital Q3','Digital','ativa',current_date - 30,current_date + 30,1500000,'Campanha de demonstração em redes sociais',true,null),
('00000000-0000-0000-0000-0000000ca002','[DEMO] Feira Empresarial','Evento','planeada',current_date + 15,current_date + 17,800000,'Participação em feira (demonstração)',true,null);

insert into public.leads(id,title,contact_name,company,email,phone,source,stage,estimated_value,client_id,campaign_id,assigned_to,is_demo,created_by,created_at) values
('00000000-0000-0000-0000-0000000a0001','[DEMO] Serviços de contabilidade','Mário Costa','Luanda Retail','mario@lr.test','+244 911 100 001','Referência','negociacao',2500000,'00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000ca001','00000000-0000-0000-0000-00000000e002',true,null,now()-interval '20 days'),
('00000000-0000-0000-0000-0000000a0002','[DEMO] Auditoria interna','Sofia Dias','Benguela Logística','sofia@bg.test','+244 911 100 002','Website','proposta',1800000,'00000000-0000-0000-0000-00000000c002',null,'00000000-0000-0000-0000-00000000e003',true,null,now()-interval '15 days'),
('00000000-0000-0000-0000-0000000a0003','[DEMO] Consultoria fiscal','Rui Tavares','Huambo Agro','rui@ha.test','+244 911 100 003','Campanha','qualificado',900000,'00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-0000000ca001','00000000-0000-0000-0000-00000000e002',true,null,now()-interval '10 days'),
('00000000-0000-0000-0000-0000000a0004','[DEMO] Gestão de riscos','Laura Pinto','Kwanza Tech','laura@kt.test','+244 911 100 004','Evento','reuniao',3200000,'00000000-0000-0000-0000-00000000c004',null,'00000000-0000-0000-0000-00000000e004',true,null,now()-interval '8 days'),
('00000000-0000-0000-0000-0000000a0005','[DEMO] Processamento salarial','Nuno Reis','Nova Empresa','nuno@ne.test','+244 911 100 005','Chamada','lead',600000,null,null,'00000000-0000-0000-0000-00000000e003',true,null,now()-interval '3 days'),
('00000000-0000-0000-0000-0000000a0006','[DEMO] Controlo interno','Paula Gomes','Grupo Sol','paula@gs.test','+244 911 100 006','Website','contactado',1200000,null,'00000000-0000-0000-0000-0000000ca001','00000000-0000-0000-0000-00000000e002',true,null,now()-interval '5 days'),
('00000000-0000-0000-0000-0000000a0007','[DEMO] Outsourcing contabilístico','Hugo Faria','Kwanza Tech','hugo@kt.test','+244 911 100 007','Referência','ganho',4000000,'00000000-0000-0000-0000-00000000c004',null,'00000000-0000-0000-0000-00000000e004',true,null,now()-interval '25 days'),
('00000000-0000-0000-0000-0000000a0008','[DEMO] Revisão de contas','Inês Cruz','Lobito Construções','ines@lc.test','+244 911 100 008','Chamada','perdido',700000,'00000000-0000-0000-0000-00000000c005',null,'00000000-0000-0000-0000-00000000e003',true,null,now()-interval '18 days');
update public.leads set closed_at = now() - interval '6 days' where stage in ('ganho','perdido') and is_demo;
insert into public.campaign_leads(campaign_id,lead_id) select campaign_id,id from public.leads where campaign_id is not null;

insert into public.visits(client_id,lead_id,employee_id,scheduled_at,status,location,objective,outcome,is_demo,created_by) values
('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000a0001','00000000-0000-0000-0000-00000000e002',now()-interval '6 days','realizada','Luanda','Apresentação de serviços','Cliente interessado',true,null),
('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000a0002','00000000-0000-0000-0000-00000000e003',now()-interval '3 days','realizada','Benguela','Levantamento de necessidades','Pedido de proposta',true,null),
('00000000-0000-0000-0000-00000000c004','00000000-0000-0000-0000-0000000a0004','00000000-0000-0000-0000-00000000e004',now()+interval '2 days','agendada','Luanda','Reunião técnica',null,true,null),
('00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-0000000a0003','00000000-0000-0000-0000-00000000e002',now()+interval '5 days','agendada','Huambo','Visita de qualificação',null,true,null);

insert into public.followups(lead_id,client_id,employee_id,due_date,type,status,notes,is_demo,created_by) values
('00000000-0000-0000-0000-0000000a0001','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000e002',current_date,'chamada','pendente','Confirmar condições comerciais',true,null),
('00000000-0000-0000-0000-0000000a0002','00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-00000000e003',current_date + 2,'email','pendente','Enviar proposta revista',true,null),
('00000000-0000-0000-0000-0000000a0005',null,'00000000-0000-0000-0000-00000000e003',current_date - 2,'chamada','pendente','Primeiro contacto (em atraso)',true,null),
('00000000-0000-0000-0000-0000000a0007','00000000-0000-0000-0000-00000000c004','00000000-0000-0000-0000-00000000e004',current_date - 5,'reuniao','concluido','Kick-off realizado',true,null);

insert into public.activities(type,subject,description,activity_date,employee_id,lead_id,client_id,is_demo,created_by) values
('chamada','[DEMO] Chamada inicial','Contacto telefónico',now()-interval '9 days','00000000-0000-0000-0000-00000000e002','00000000-0000-0000-0000-0000000a0003','00000000-0000-0000-0000-00000000c003',true,null),
('reuniao','[DEMO] Reunião de apresentação','Apresentação institucional',now()-interval '7 days','00000000-0000-0000-0000-00000000e004','00000000-0000-0000-0000-0000000a0004','00000000-0000-0000-0000-00000000c004',true,null),
('email','[DEMO] Envio de brochura','Material comercial enviado',now()-interval '4 days','00000000-0000-0000-0000-00000000e003','00000000-0000-0000-0000-0000000a0002','00000000-0000-0000-0000-00000000c002',true,null),
('reuniao','[DEMO] Reunião de negociação','Negociação de preço',now()-interval '2 days','00000000-0000-0000-0000-00000000e002','00000000-0000-0000-0000-0000000a0001','00000000-0000-0000-0000-00000000c001',true,null);

insert into public.proposals(id,title,lead_id,client_id,employee_id,value,status,sent_at,is_demo,created_by) values
('00000000-0000-0000-0000-0000000b0001','[DEMO] Proposta Auditoria Interna','00000000-0000-0000-0000-0000000a0002','00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-00000000e003',1800000,'enviada',current_date - 2,true,null),
('00000000-0000-0000-0000-0000000b0002','[DEMO] Proposta Outsourcing','00000000-0000-0000-0000-0000000a0007','00000000-0000-0000-0000-00000000c004','00000000-0000-0000-0000-00000000e004',4000000,'aceite',current_date - 12,true,null),
('00000000-0000-0000-0000-0000000b0003','[DEMO] Proposta Contabilidade','00000000-0000-0000-0000-0000000a0001','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000e002',2500000,'enviada',current_date - 4,true,null);

insert into public.contracts(title,proposal_id,client_id,employee_id,value,status,signed_at,start_date,end_date,is_demo,created_by) values
('[DEMO] Contrato Outsourcing Kwanza Tech','00000000-0000-0000-0000-0000000b0002','00000000-0000-0000-0000-00000000c004','00000000-0000-0000-0000-00000000e004',4000000,'ativo',current_date - 6,current_date - 5,current_date + 360,true,null);

insert into public.targets(employee_id,metric,period_type,period_start,period_end,target_value,is_demo,created_by) values
('00000000-0000-0000-0000-00000000e002','leads','mensal',date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month - 1 day')::date,10,true,null),
('00000000-0000-0000-0000-00000000e002','visitas','mensal',date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month - 1 day')::date,8,true,null),
('00000000-0000-0000-0000-00000000e003','propostas','mensal',date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month - 1 day')::date,4,true,null),
('00000000-0000-0000-0000-00000000e004','receita','mensal',date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month - 1 day')::date,5000000,true,null),
(null,'contratos','trimestral',date_trunc('quarter',current_date)::date,(date_trunc('quarter',current_date)+interval '3 months - 1 day')::date,5,true,null),
(null,'receita','trimestral',date_trunc('quarter',current_date)::date,(date_trunc('quarter',current_date)+interval '3 months - 1 day')::date,20000000,true,null);

do $$
declare t text;
begin
  foreach t in array array['departments','employees','clients','campaigns','leads','visits','followups','activities','targets','proposals','contracts'] loop
    execute format('create trigger set_updated before update on public.%I for each row execute function public.set_updated_meta()', t);
  end loop;
  foreach t in array array['departments','employees','clients','campaigns','leads','visits','followups','activities','targets','proposals','contracts','user_roles','documents','ai_runs'] loop
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;
create trigger lead_assignment before insert or update on public.leads for each row execute function public.notify_lead_assignment();
