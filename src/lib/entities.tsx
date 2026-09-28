import { Link } from "@tanstack/react-router";
import type { EntityConfig } from "@/components/app/entity-page";
import type { FieldDef } from "@/components/app/entity-form";
import { StatusBadge } from "@/components/app/common";
import { fmtDate, fmtMoney, label, opts, STAGES, stageName } from "./format";

const emp = (k = "employee_id", lbl = "Responsável"): FieldDef => ({ name: k, label: lbl, type: "select", lookup: "employees", owner: true });
const dateRangeCheck = (s: string, e: string) => (v: Record<string, string>) =>
  v[s] && v[e] && v[e] < v[s] ? "A data de fim não pode ser anterior à data de início." : null;

export const employeesConfig: EntityConfig = {
  table: "employees", title: "Equipa", singular: "colaborador", order: "full_name",
  description: "Colaboradores de Marketing e Comercial.", write: "managers", deleteBy: "admin",
  searchKeys: ["full_name", "email", "position"],
  filters: [{ key: "status", label: "Estado", options: opts("ativo", "inativo") }],
  fields: [
    { name: "full_name", label: "Nome completo", type: "text", required: true, wide: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "position", label: "Função", type: "text" },
    { name: "department_id", label: "Departamento", type: "select", lookup: "departments" },
    { name: "manager_id", label: "Superior hierárquico", type: "select", lookup: "employees" },
    { name: "status", label: "Estado", type: "select", options: opts("ativo", "inativo"), required: true, defaultValue: "ativo" },
    { name: "hire_date", label: "Data de admissão", type: "date" },
  ],
  columns: [
    { key: "full_name", label: "Nome", className: "font-medium" },
    { key: "position", label: "Função" },
    { key: "department_id", label: "Departamento", render: (r, l) => l.departments[r.department_id] ?? "—" },
    { key: "email", label: "Email" },
    { key: "user_id", label: "Conta", render: (r) => <StatusBadge tone={r.user_id ? "success" : "neutral"} text={r.user_id ? "Associada" : "Sem conta"} /> },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const clientsConfig: EntityConfig = {
  table: "clients", title: "Clientes", singular: "cliente", order: "name",
  description: "Carteira de clientes com visão 360°.",
  searchKeys: ["name", "nif", "city", "sector", "email"],
  filters: [{ key: "status", label: "Estado", options: opts("prospeto", "ativo", "inativo") }],
  fields: [
    { name: "name", label: "Nome / Razão social", type: "text", required: true, wide: true },
    { name: "nif", label: "NIF", type: "text" },
    { name: "sector", label: "Setor", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "address", label: "Morada", type: "text" },
    { name: "city", label: "Cidade", type: "text" },
    { name: "status", label: "Estado", type: "select", options: opts("prospeto", "ativo", "inativo"), required: true, defaultValue: "prospeto" },
    emp("assigned_to", "Gestor de conta"),
    { name: "notes", label: "Notas", type: "textarea" },
  ],
  columns: [
    { key: "name", label: "Cliente", className: "font-medium", render: (r) => <Link to="/clientes/$id" params={{ id: r.id }} className="hover:text-primary hover:underline">{r.name}</Link> },
    { key: "sector", label: "Setor", render: (r) => r.sector ?? "—" },
    { key: "city", label: "Cidade", render: (r) => r.city ?? "—" },
    { key: "assigned_to", label: "Gestor", render: (r, l) => l.employees[r.assigned_to] ?? "—" },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const leadFields: FieldDef[] = [
  { name: "title", label: "Oportunidade", type: "text", required: true, wide: true },
  { name: "contact_name", label: "Contacto", type: "text" },
  { name: "company", label: "Empresa", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Telefone", type: "text" },
  { name: "source", label: "Origem", type: "select", options: ["Website", "Referência", "Campanha", "Evento", "Chamada", "Redes sociais", "Outro"].map((v) => ({ value: v, label: v })) },
  { name: "stage", label: "Fase", type: "select", options: STAGES.map((s) => ({ value: s.code, label: s.name })), required: true, defaultValue: "lead" },
  { name: "estimated_value", label: "Valor estimado (Kz)", type: "number" },
  { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
  { name: "campaign_id", label: "Campanha", type: "select", lookup: "campaigns" },
  emp("assigned_to", "Responsável"),
  { name: "lost_reason", label: "Motivo de perda", type: "text" },
  { name: "notes", label: "Notas", type: "textarea" },
];

export const leadsConfig: EntityConfig = {
  table: "leads", title: "Leads", singular: "lead",
  searchKeys: ["title", "company", "contact_name", "email"],
  filters: [{ key: "stage", label: "Fase", options: STAGES.map((s) => ({ value: s.code, label: s.name })) }],
  fields: leadFields,
  validate: (v) => (v.stage === "perdido" && !v.lost_reason ? "Indique o motivo de perda." : null),
  columns: [
    { key: "title", label: "Oportunidade", className: "font-medium" },
    { key: "company", label: "Empresa", render: (r) => r.company ?? "—" },
    { key: "stage", label: "Fase", render: (r) => <StatusBadge value={r.stage} text={stageName(r.stage)} /> },
    { key: "estimated_value", label: "Valor", render: (r) => fmtMoney(r.estimated_value) },
    { key: "assigned_to", label: "Responsável", render: (r, l) => l.employees[r.assigned_to] ?? "—" },
    { key: "created_at", label: "Criada", render: (r) => fmtDate(r.created_at) },
  ],
};

export const visitsConfig: EntityConfig = {
  table: "visits", title: "Visitas", singular: "visita", order: "scheduled_at",
  description: "Agendamento e registo de visitas a clientes.",
  searchKeys: ["location", "objective", "outcome"],
  filters: [{ key: "status", label: "Estado", options: opts("agendada", "realizada", "cancelada") }],
  fields: [
    { name: "scheduled_at", label: "Data e hora", type: "datetime", required: true },
    { name: "status", label: "Estado", type: "select", options: opts("agendada", "realizada", "cancelada"), required: true, defaultValue: "agendada" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    emp(),
    { name: "location", label: "Local", type: "text" },
    { name: "objective", label: "Objetivo", type: "textarea" },
    { name: "outcome", label: "Resultado", type: "textarea" },
  ],
  columns: [
    { key: "scheduled_at", label: "Data", className: "font-medium", render: (r) => fmtDate(r.scheduled_at, true) },
    { key: "client_id", label: "Cliente", render: (r, l) => l.clients[r.client_id] ?? "—" },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "location", label: "Local", render: (r) => r.location ?? "—" },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const followupsConfig: EntityConfig = {
  table: "followups", title: "Follow-ups", singular: "follow-up", order: "due_date",
  description: "Próximos passos e acompanhamento de oportunidades.",
  searchKeys: ["notes"],
  filters: [{ key: "status", label: "Estado", options: opts("pendente", "concluido", "cancelado") }, { key: "type", label: "Tipo", options: opts("chamada", "email", "reuniao", "visita", "outro") }],
  fields: [
    { name: "due_date", label: "Data limite", type: "date", required: true },
    { name: "type", label: "Tipo", type: "select", options: opts("chamada", "email", "reuniao", "visita", "outro"), required: true, defaultValue: "chamada" },
    { name: "status", label: "Estado", type: "select", options: opts("pendente", "concluido", "cancelado"), required: true, defaultValue: "pendente" },
    emp(),
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    { name: "notes", label: "Notas", type: "textarea" },
  ],
  columns: [
    { key: "due_date", label: "Data limite", className: "font-medium", render: (r) => {
      const late = r.status === "pendente" && r.due_date < new Date().toISOString().slice(0, 10);
      return <span className={late ? "text-destructive" : ""}>{fmtDate(r.due_date)}{late && " · em atraso"}</span>;
    } },
    { key: "type", label: "Tipo", render: (r) => label(r.type) },
    { key: "lead_id", label: "Lead", render: (r, l) => l.leads[r.lead_id] ?? "—" },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "notes", label: "Notas", render: (r) => <span className="line-clamp-1 max-w-xs">{r.notes ?? "—"}</span> },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const activitiesConfig: EntityConfig = {
  table: "activities", title: "Atividades", singular: "atividade", order: "activity_date",
  description: "Registo de chamadas, emails, reuniões e outras interações.",
  searchKeys: ["subject", "description"],
  filters: [{ key: "type", label: "Tipo", options: opts("chamada", "email", "reuniao", "visita", "outro") }],
  fields: [
    { name: "subject", label: "Assunto", type: "text", required: true, wide: true },
    { name: "type", label: "Tipo", type: "select", options: opts("chamada", "email", "reuniao", "visita", "outro"), required: true, defaultValue: "chamada" },
    { name: "activity_date", label: "Data e hora", type: "datetime", required: true },
    emp(),
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    { name: "description", label: "Descrição", type: "textarea" },
  ],
  columns: [
    { key: "subject", label: "Assunto", className: "font-medium" },
    { key: "type", label: "Tipo", render: (r) => <StatusBadge tone="info" text={label(r.type)} /> },
    { key: "activity_date", label: "Data", render: (r) => fmtDate(r.activity_date, true) },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "client_id", label: "Cliente", render: (r, l) => l.clients[r.client_id] ?? "—" },
  ],
};

export const campaignsConfig: EntityConfig = {
  table: "campaigns", title: "Campanhas", singular: "campanha", write: "managers",
  description: "Campanhas de marketing e respetivas leads associadas.",
  searchKeys: ["name", "channel", "description"],
  filters: [{ key: "status", label: "Estado", options: opts("planeada", "ativa", "concluida", "cancelada") }],
  validate: dateRangeCheck("start_date", "end_date"),
  fields: [
    { name: "name", label: "Nome", type: "text", required: true, wide: true },
    { name: "channel", label: "Canal", type: "text" },
    { name: "status", label: "Estado", type: "select", options: opts("planeada", "ativa", "concluida", "cancelada"), required: true, defaultValue: "planeada" },
    { name: "start_date", label: "Início", type: "date" },
    { name: "end_date", label: "Fim", type: "date" },
    { name: "budget", label: "Orçamento (Kz)", type: "number" },
    { name: "description", label: "Descrição", type: "textarea" },
  ],
  columns: [
    { key: "name", label: "Campanha", className: "font-medium" },
    { key: "channel", label: "Canal", render: (r) => r.channel ?? "—" },
    { key: "start_date", label: "Período", render: (r) => `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}` },
    { key: "budget", label: "Orçamento", render: (r) => fmtMoney(r.budget) },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const proposalsConfig: EntityConfig = {
  table: "proposals", title: "Propostas", singular: "proposta",
  description: "Propostas comerciais enviadas a clientes e leads.",
  searchKeys: ["title"],
  filters: [{ key: "status", label: "Estado", options: opts("rascunho", "enviada", "aceite", "rejeitada") }],
  invalidate: ["dashboard"],
  fields: [
    { name: "title", label: "Título", type: "text", required: true, wide: true },
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    emp(),
    { name: "value", label: "Valor (Kz)", type: "number" },
    { name: "status", label: "Estado", type: "select", options: opts("rascunho", "enviada", "aceite", "rejeitada"), required: true, defaultValue: "rascunho" },
    { name: "sent_at", label: "Data de envio", type: "date" },
  ],
  columns: [
    { key: "title", label: "Proposta", className: "font-medium" },
    { key: "client_id", label: "Cliente", render: (r, l) => l.clients[r.client_id] ?? "—" },
    { key: "value", label: "Valor", render: (r) => fmtMoney(r.value) },
    { key: "sent_at", label: "Envio", render: (r) => fmtDate(r.sent_at) },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const contractsConfig: EntityConfig = {
  table: "contracts", title: "Contratos", singular: "contrato",
  description: "Contratos celebrados. A receita considera contratos com data de assinatura.",
  searchKeys: ["title"],
  filters: [{ key: "status", label: "Estado", options: opts("pendente", "assinado", "ativo", "terminado", "cancelado") }],
  validate: dateRangeCheck("start_date", "end_date"),
  fields: [
    { name: "title", label: "Título", type: "text", required: true, wide: true },
    { name: "proposal_id", label: "Proposta", type: "select", lookup: "proposals" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    emp(),
    { name: "value", label: "Valor (Kz)", type: "number" },
    { name: "status", label: "Estado", type: "select", options: opts("pendente", "assinado", "ativo", "terminado", "cancelado"), required: true, defaultValue: "pendente" },
    { name: "signed_at", label: "Data de assinatura", type: "date" },
    { name: "start_date", label: "Início", type: "date" },
    { name: "end_date", label: "Fim", type: "date" },
  ],
  columns: [
    { key: "title", label: "Contrato", className: "font-medium" },
    { key: "client_id", label: "Cliente", render: (r, l) => l.clients[r.client_id] ?? "—" },
    { key: "value", label: "Valor", render: (r) => fmtMoney(r.value) },
    { key: "signed_at", label: "Assinatura", render: (r) => fmtDate(r.signed_at) },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const targetFields: FieldDef[] = [
  { name: "employee_id", label: "Colaborador (vazio = meta de equipa)", type: "select", lookup: "employees", wide: true },
  { name: "metric", label: "Indicador", type: "select", options: opts("leads", "visitas", "reunioes", "propostas", "contratos", "receita"), required: true },
  { name: "period_type", label: "Periodicidade", type: "select", options: opts("mensal", "trimestral", "anual"), required: true, defaultValue: "mensal" },
  { name: "period_start", label: "Início do período", type: "date", required: true },
  { name: "period_end", label: "Fim do período", type: "date", required: true },
  { name: "target_value", label: "Valor da meta", type: "number", required: true },
];
export const validateTarget = (v: Record<string, string>) =>
  dateRangeCheck("period_start", "period_end")(v) ?? (Number(v.target_value) <= 0 ? "A meta deve ser superior a zero." : null);
