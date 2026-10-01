import { Link } from "@tanstack/react-router";
import type { EntityConfig } from "@/components/app/entity-page";
import type { FieldDef } from "@/components/app/entity-form";
import { StatusBadge } from "@/components/app/common";
import { fmtDate, fmtMoney, label, list, opts, PROVINCES, SERVICES, STAGES, stageName } from "./format";

const emp = (k = "employee_id", lbl = "Responsável"): FieldDef => ({ name: k, label: lbl, type: "select", lookup: "employees", owner: true });
const WORKFLOW_STATES = opts("em_analise", "processando", "pendente", "rejeitado", "aprovado");
const dateRangeCheck = (s: string, e: string) => (v: Record<string, string>) =>
  v[s] && v[e] && v[e] < v[s] ? "A data de fim não pode ser anterior à data de início." : null;

export const employeesConfig: EntityConfig = {
  table: "employees", title: "Equipa", singular: "colaborador", order: "full_name", createLabel: "Adicionar equipa",
  description: "Membros da equipa de Marketing e Comercial. Pode adicionar, alterar estado e remover membros autorizados.", write: "managers", deleteBy: "admin",
  searchKeys: ["full_name", "email", "position"],
  filters: [{ key: "status", label: "Estado", options: WORKFLOW_STATES }],
  fields: [
    { name: "full_name", label: "Nome completo", type: "text", required: true, wide: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "position", label: "Função", type: "text" },
    { name: "department_id", label: "Departamento", type: "select", lookup: "departments" },
    { name: "manager_id", label: "Superior hierárquico", type: "select", lookup: "employees" },
    { name: "status", label: "Estado", type: "select", options: WORKFLOW_STATES, required: true, defaultValue: "pendente" },
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

const provinceField: FieldDef = { name: "province", label: "Província", type: "select", options: list(PROVINCES) };
const serviceField = (lbl = "Serviço"): FieldDef => ({ name: "service", label: lbl, type: "select", options: list(SERVICES) });
const SOURCES = list(["Website", "Referência", "Campanha", "Evento", "Chamada", "Redes sociais", "Visita de campo", "Outro"]);

export const clientsConfig: EntityConfig = {
  table: "clients", title: "Clientes", singular: "cliente", order: "name", createLabel: "Registar cliente",
  description: "Carteira de clientes com visão 360°.",
  searchKeys: ["name", "nif", "city", "sector", "email", "contact_name"],
  dateField: "created_at",
  filters: [
    { key: "status", label: "Estado", options: WORKFLOW_STATES },
    { key: "province", label: "Província", options: list(PROVINCES) },
    { key: "service", label: "Serviço", options: list(SERVICES) },
  ],
  fields: [
    { name: "name", label: "Nome / Razão social", type: "text", required: true, wide: true },
    { name: "nif", label: "NIF", type: "text" },
    { name: "contact_name", label: "Pessoa de contacto", type: "text" },
    { name: "sector", label: "Setor", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "address", label: "Morada", type: "text" },
    { name: "city", label: "Cidade / Município", type: "text" },
    provinceField,
    serviceField("Serviços contratados/interesse"),
    { name: "source", label: "Origem", type: "select", options: SOURCES },
    { name: "status", label: "Estado", type: "select", options: WORKFLOW_STATES, required: true, defaultValue: "pendente" },
    emp("assigned_to", "Gestor de conta"),
    { name: "notes", label: "Notas", type: "textarea" },
  ],
  columns: [
    { key: "name", label: "Cliente", className: "font-medium", render: (r) => <Link to="/clientes/$id" params={{ id: r.id }} className="hover:text-primary hover:underline">{r.name}</Link> },
    { key: "sector", label: "Setor", render: (r) => r.sector ?? "—" },
    { key: "province", label: "Província", render: (r) => r.province ?? "—" },
    { key: "service", label: "Serviço", render: (r) => r.service ?? "—" },
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
  { name: "source", label: "Origem", type: "select", options: SOURCES },
  serviceField("Serviço / interesse"),
  provinceField,
  { name: "stage", label: "Fase", type: "select", options: STAGES.map((s) => ({ value: s.code, label: s.name })), required: true, defaultValue: "lead" },
  { name: "estimated_value", label: "Valor potencial (Kz)", type: "number" },
  { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
  { name: "campaign_id", label: "Campanha", type: "select", lookup: "campaigns" },
  emp("assigned_to", "Responsável"),
  { name: "lost_reason", label: "Motivo de perda", type: "text" },
  { name: "notes", label: "Notas da interação", type: "textarea", wide: true },
];

export const leadsConfig: EntityConfig = {
  table: "leads", title: "Leads", singular: "lead",
  searchKeys: ["title", "company", "contact_name", "email", "phone"],
  filters: [
    { key: "stage", label: "Fase", options: STAGES.map((s) => ({ value: s.code, label: s.name })) },
    { key: "province", label: "Província", options: list(PROVINCES) },
    { key: "service", label: "Serviço", options: list(SERVICES) },
    { key: "source", label: "Origem", options: SOURCES },
  ],
  fields: leadFields,
  validate: (v) => (v.stage === "perdido" && !v.lost_reason ? "Indique o motivo de perda." : null),
  columns: [
    { key: "title", label: "Oportunidade", className: "font-medium" },
    { key: "company", label: "Empresa", render: (r) => r.company ?? "—" },
    { key: "stage", label: "Fase", render: (r) => <StatusBadge value={r.stage} text={stageName(r.stage)} /> },
    { key: "estimated_value", label: "Valor", render: (r) => fmtMoney(r.estimated_value) },
    { key: "province", label: "Província", render: (r) => r.province ?? "—" },
    { key: "service", label: "Serviço", render: (r) => r.service ?? "—" },
    { key: "assigned_to", label: "Responsável", render: (r, l) => l.employees[r.assigned_to] ?? "—" },
    { key: "created_at", label: "Criada", render: (r) => fmtDate(r.created_at) },
  ],
};

export const visitsConfig: EntityConfig = {
  table: "visits", title: "Visitas", singular: "visita", order: "scheduled_at", inspectable: true, invalidatable: true, createLabel: "Registar visita",
  description: "Agendamento e registo de visitas a clientes.",
  searchKeys: ["location", "objective", "outcome"],
  filters: [{ key: "status", label: "Estado", options: WORKFLOW_STATES }],
  fields: [
    { name: "scheduled_at", label: "Data e hora", type: "datetime", required: true },
    { name: "status", label: "Estado", type: "select", options: WORKFLOW_STATES, required: true, defaultValue: "pendente" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    emp(),
    { name: "location", label: "Local", type: "text" },
    { name: "objective", label: "Objetivo", type: "textarea" },
    { name: "outcome", label: "Resultado", type: "textarea" },
    { name: "next_steps", label: "Próximos passos", type: "textarea" },
    { name: "notes", label: "Observações", type: "textarea" },
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
  filters: [{ key: "status", label: "Estado", options: opts("pendente", "concluido", "cancelado") }, { key: "priority", label: "Prioridade", options: opts("baixa", "media", "alta") }, { key: "type", label: "Tipo", options: opts("chamada", "email", "reuniao", "visita", "outro") }],
  fields: [
    { name: "due_date", label: "Data limite", type: "date", required: true },
    { name: "type", label: "Tipo", type: "select", options: opts("chamada", "email", "reuniao", "visita", "outro"), required: true, defaultValue: "chamada" },
    { name: "priority", label: "Prioridade", type: "select", options: opts("baixa", "media", "alta"), required: true, defaultValue: "media" },
    { name: "status", label: "Estado", type: "select", options: opts("pendente", "concluido", "cancelado"), required: true, defaultValue: "pendente" },
    { name: "reminder_at", label: "Lembrete", type: "datetime" },
    emp(),
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    { name: "proposal_id", label: "Proposta", type: "select", lookup: "proposals" },
    { name: "notes", label: "Notas", type: "textarea" },
  ],
  columns: [
    { key: "due_date", label: "Data limite", className: "font-medium", render: (r) => {
      const late = r.status === "pendente" && r.due_date < new Date().toISOString().slice(0, 10);
      return <span className={late ? "text-destructive" : ""}>{fmtDate(r.due_date)}{late && " · em atraso"}</span>;
    } },
    { key: "type", label: "Tipo", render: (r) => label(r.type) },
    { key: "priority", label: "Prioridade", render: (r) => <StatusBadge tone={r.priority === "alta" ? "danger" : r.priority === "baixa" ? "neutral" : "warning"} text={label(r.priority)} /> },
    { key: "lead_id", label: "Lead", render: (r, l) => l.leads[r.lead_id] ?? "—" },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "notes", label: "Notas", render: (r) => <span className="line-clamp-1 max-w-xs">{r.notes ?? "—"}</span> },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const activitiesConfig: EntityConfig = {
  table: "activities", title: "Atividades", singular: "atividade", order: "activity_date", analyzable: true, createLabel: "Registar atividade",
  description: "Registo de chamadas, emails, reuniões e outras interações.",
  searchKeys: ["subject", "description"],
  dateField: "activity_date",
  filters: [{ key: "status", label: "Estado", options: WORKFLOW_STATES }, { key: "type", label: "Tipo", options: opts("chamada", "email", "reuniao", "visita", "outro") }],
  fields: [
    { name: "subject", label: "Assunto", type: "text", required: true, wide: true },
    { name: "type", label: "Tipo", type: "select", options: opts("chamada", "email", "reuniao", "visita", "outro"), required: true, defaultValue: "chamada" },
    { name: "activity_date", label: "Data e hora", type: "datetime", required: true },
    { name: "status", label: "Estado", type: "select", options: WORKFLOW_STATES, required: true, defaultValue: "pendente" },
    { name: "duration_minutes", label: "Duração (min)", type: "number" },
    emp("employee_id", "Atribuir a"),
    { name: "lead_id", label: "Lead", type: "select", lookup: "leads" },
    { name: "client_id", label: "Cliente", type: "select", lookup: "clients" },
    { name: "outcome", label: "Resultado", type: "text", wide: true },
    { name: "description", label: "Notas", type: "textarea" },
  ],
  columns: [
    { key: "subject", label: "Assunto", className: "font-medium" },
    { key: "type", label: "Tipo", render: (r) => <StatusBadge tone="info" text={label(r.type)} /> },
    { key: "activity_date", label: "Data", render: (r) => fmtDate(r.activity_date, true) },
    { key: "duration_minutes", label: "Duração", render: (r) => (r.duration_minutes ? `${r.duration_minutes} min` : "—") },
    { key: "employee_id", label: "Responsável", render: (r, l) => l.employees[r.employee_id] ?? "—" },
    { key: "client_id", label: "Cliente", render: (r, l) => l.clients[r.client_id] ?? "—" },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const campaignPhase = (r: Record<string, any>) => {
  const t = todayIso();
  if (r.status === "rejeitado") return "encerrada";
  if (r.start_date && r.start_date > t) return "agendada";
  if (r.end_date && r.end_date < t) return "encerrada";
  return "andamento";
};

export const campaignsConfig: EntityConfig = {
  table: "campaigns", title: "Campanhas", singular: "campanha", write: "managers", createLabel: "Registar campanha",
  description: "Campanhas de marketing, execução e acompanhamento de desempenho.",
  searchKeys: ["name", "channel", "description"],
  analyzable: true, dateField: "start_date",
  filters: [
    { key: "phase", label: "Execução", options: [{ value: "andamento", label: "Em andamento" }, { value: "agendada", label: "Agendadas" }, { value: "encerrada", label: "Encerradas" }], match: (r, v) => campaignPhase(r) === v },
    { key: "status", label: "Estado", options: WORKFLOW_STATES },
  ],
  validate: dateRangeCheck("start_date", "end_date"),
  fields: [
    { name: "name", label: "Nome", type: "text", required: true, wide: true },
    { name: "channel", label: "Canal", type: "text" },
    { name: "status", label: "Estado", type: "select", options: WORKFLOW_STATES, required: true, defaultValue: "pendente" },
    { name: "start_date", label: "Início", type: "date" },
    { name: "end_date", label: "Fim", type: "date" },
    { name: "budget", label: "Orçamento (Kz)", type: "number" },
    { name: "cost", label: "Custo real (Kz)", type: "number" },
    { name: "audience", label: "Público-alvo", type: "text", wide: true },
    { name: "content", label: "Conteúdo / mensagem", type: "textarea" },
    { name: "description", label: "Descrição", type: "textarea" },
  ],
  columns: [
    { key: "name", label: "Campanha", className: "font-medium" },
    { key: "channel", label: "Canal", render: (r) => r.channel ?? "—" },
    { key: "start_date", label: "Período", render: (r) => `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}` },
    { key: "budget", label: "Orçamento", render: (r) => fmtMoney(r.budget) },
    { key: "phase", label: "Execução", render: (r) => { const p = campaignPhase(r); return <StatusBadge tone={p === "andamento" ? "success" : p === "agendada" ? "info" : "neutral"} text={p === "andamento" ? "Em andamento" : p === "agendada" ? "Agendada" : "Encerrada"} />; } },
    { key: "status", label: "Estado", render: (r) => <StatusBadge value={r.status} /> },
  ],
};

export const proposalsConfig: EntityConfig = {
  table: "proposals", title: "Propostas", singular: "proposta", importable: true, analyzable: true,
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
  table: "contracts", title: "Contratos", singular: "contrato", importable: true, analyzable: true,
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
  { name: "department_id", label: "Equipa / departamento", type: "select", lookup: "departments" },
  { name: "province", label: "Província", type: "select", options: list(PROVINCES) },
  { name: "service", label: "Serviço", type: "select", options: list(SERVICES) },
  { name: "metric", label: "Indicador", type: "select", options: opts("leads", "visitas", "reunioes", "propostas", "contratos", "receita"), required: true },
  { name: "status", label: "Estado", type: "select", options: WORKFLOW_STATES, required: true, defaultValue: "pendente" },
  { name: "period_type", label: "Periodicidade", type: "select", options: opts("mensal", "trimestral", "anual"), required: true, defaultValue: "mensal" },
  { name: "period_start", label: "Início do período", type: "date", required: true },
  { name: "period_end", label: "Fim do período", type: "date", required: true },
  { name: "target_value", label: "Valor da meta", type: "number", required: true },
];
export const validateTarget = (v: Record<string, string>) =>
  dateRangeCheck("period_start", "period_end")(v) ?? (Number(v.target_value) <= 0 ? "A meta deve ser superior a zero." : null);
