import type { Row } from "./data";

const inRange = (d: string | null | undefined, s: string, e: string) => {
  if (!d) return false;
  const x = d.slice(0, 10);
  return x >= s && x <= e;
};

export type Datasets = { leads: Row[]; visits: Row[]; activities: Row[]; proposals: Row[]; contracts: Row[] };

/** Realized value of a target (metric, employee or team, period) computed from real records. */
export function targetActual(t: Row, d: Datasets): number {
  const s = t.period_start as string, e = t.period_end as string, emp = t.employee_id as string | null;
  const mine = (r: Row, f: string) => !emp || r[f] === emp;
  switch (t.metric) {
    case "leads": return d.leads.filter((r) => mine(r, "assigned_to") && inRange(r.created_at, s, e)).length;
    case "visitas": return d.visits.filter((r) => mine(r, "employee_id") && r.status === "realizada" && inRange(r.scheduled_at, s, e)).length;
    case "reunioes": return d.activities.filter((r) => mine(r, "employee_id") && r.type === "reuniao" && inRange(r.activity_date, s, e)).length;
    case "propostas": return d.proposals.filter((r) => mine(r, "employee_id") && r.status !== "rascunho" && inRange(r.sent_at ?? r.created_at, s, e)).length;
    case "contratos": return d.contracts.filter((r) => mine(r, "employee_id") && r.signed_at && inRange(r.signed_at, s, e)).length;
    case "receita": return d.contracts.filter((r) => mine(r, "employee_id") && r.signed_at && inRange(r.signed_at, s, e) && r.status !== "cancelado").reduce((a, r) => a + Number(r.value ?? 0), 0);
    default: return 0;
  }
}

export const pct = (actual: number, target: number) => (target > 0 ? Math.min(999, (actual / target) * 100) : 0);
