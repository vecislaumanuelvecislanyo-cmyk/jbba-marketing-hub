import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

const money = new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-PT");

export const fmtMoney = (v: number | string | null | undefined) => money.format(Number(v ?? 0));
export const fmtNum = (v: number | null | undefined) => num.format(v ?? 0);
export const fmtPct = (v: number) => `${Math.round(v)}%`;

export function fmtDate(v: string | null | undefined, withTime = false) {
  if (!v) return "—";
  try {
    return format(parseISO(v), withTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: pt });
  } catch {
    return v;
  }
}

export const STAGES = [
  { code: "lead", name: "Lead" },
  { code: "contactado", name: "Contactado" },
  { code: "qualificado", name: "Qualificado" },
  { code: "reuniao", name: "Reunião" },
  { code: "proposta", name: "Proposta" },
  { code: "negociacao", name: "Negociação" },
  { code: "ganho", name: "Ganho" },
  { code: "perdido", name: "Perdido" },
] as const;
export const stageName = (c: string) => STAGES.find((s) => s.code === c)?.name ?? c;

export const LABELS: Record<string, string> = {
  ativo: "Ativo", inativo: "Inativo", prospeto: "Prospeto",
  agendada: "Agendada", realizada: "Realizada", cancelada: "Cancelada",
  pendente: "Pendente", concluido: "Concluído", cancelado: "Cancelado",
  chamada: "Chamada", email: "Email", reuniao: "Reunião", visita: "Visita", outro: "Outro",
  planeada: "Planeada", ativa: "Ativa", concluida: "Concluída",
  rascunho: "Rascunho", enviada: "Enviada", aceite: "Aceite", rejeitada: "Rejeitada",
  assinado: "Assinado", terminado: "Terminado",
  leads: "Leads", visitas: "Visitas", reunioes: "Reuniões", propostas: "Propostas", contratos: "Contratos", receita: "Receita",
  mensal: "Mensal", trimestral: "Trimestral", anual: "Anual",
  INSERT: "Criação", UPDATE: "Alteração", DELETE: "Eliminação",
};
export const label = (v: string | null | undefined) => (v ? LABELS[v] ?? v : "—");

export const opts = (...keys: string[]) => keys.map((k) => ({ value: k, label: label(k) }));
