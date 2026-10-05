import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BellRing, Briefcase, CalendarCheck, CheckCircle2, FileText, Handshake, MapPin, Percent, Target, TrendingUp, Trophy, Users } from "lucide-react";
import { ErrorState, LoadingState, PageHeader, Panel } from "@/components/app/common";
import { GoalBar, KpiCard } from "@/components/app/kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { periodRange, today, useDatasets, within, type Period } from "@/lib/datasets";
import { fmtMoney, fmtPct, label, PROVINCES, SERVICES, STAGES } from "@/lib/format";
import { useLookup } from "@/lib/data";
import { pct, targetActual } from "@/lib/targets";
import { useMe } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { TechnicianPanel } from "@/components/app/technician-panel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · JBBA Marketing" }, { name: "description", content: "Indicadores executivos da equipa comercial." }, { property: "og:title", content: "Dashboard · JBBA Marketing" }, { property: "og:description", content: "Indicadores executivos da equipa comercial." }] }),
  component: Dashboard,
});

const ADVANCED = ["qualificado", "reuniao", "proposta", "negociacao", "ganho"];
const CHART = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const me = useMe();
  const raw = useDatasets();
  const emps = useLookup("employees");
  const [period, setPeriod] = useState<Period>("mes");
  const [emp, setEmp] = useState("all");
  const [prov, setProv] = useState("all");
  const [svc, setSvc] = useState("all");
  const range = periodRange(period);
  const d = useMemo(() => {
    const leadIds = new Set(raw.leads.filter((l) => (prov === "all" || l.province === prov) && (svc === "all" || l.service === svc)).map((l) => l.id));
    const byEmp = <T extends Record<string, unknown>>(rows: T[], f = "employee_id") => rows.filter((r) => emp === "all" || r[f] === emp);
    const byLead = <T extends Record<string, unknown>>(rows: T[]) => (prov === "all" && svc === "all") ? rows : rows.filter((r) => r["lead_id"] && leadIds.has(r["lead_id"] as string));
    return {
      ...raw,
      leads: byEmp(raw.leads, "assigned_to").filter((l) => leadIds.has(l.id)),
      visits: byLead(byEmp(raw.visits)), activities: byLead(byEmp(raw.activities)),
      proposals: byLead(byEmp(raw.proposals)), contracts: byEmp(raw.contracts).filter((c) => (prov === "all" && svc === "all") || raw.proposals.some((p) => p.id === c.proposal_id && p.lead_id && leadIds.has(p.lead_id))),
      followups: byLead(byEmp(raw.followups)),
      targets: raw.targets.filter((t) => (emp === "all" || t.employee_id === emp) && (prov === "all" || t.province === prov) && (svc === "all" || t.service === svc)),
    };
  }, [raw, emp, prov, svc]);

  const k = useMemo(() => {
    const leads = d.leads.filter((l) => within(l.created_at, range));
    const won = d.leads.filter((l) => l.stage === "ganho" && within(l.closed_at, range));
    const lost = d.leads.filter((l) => l.stage === "perdido" && within(l.closed_at, range));
    const contracts = d.contracts.filter((c) => c.signed_at && within(c.signed_at, range) && c.status !== "cancelado");
    const t = today();
    const activeTargets = d.targets.filter((x) => x.period_start <= t && x.period_end >= t);
    const goalPcts = activeTargets.map((x) => pct(targetActual(x, d), Number(x.target_value)));
    return {
      leads: leads.length,
      qualified: leads.filter((l) => ADVANCED.includes(l.stage)).length,
      meetings: d.activities.filter((a) => a.type === "reuniao" && within(a.activity_date, range)).length,
      visits: d.visits.filter((v) => v.status === "aprovado" && within(v.scheduled_at, range)).length,
      proposals: d.proposals.filter((p) => p.status !== "rascunho" && within(p.sent_at ?? p.created_at, range)).length,
      negotiation: d.leads.filter((l) => l.stage === "negociacao").length,
      contracts: contracts.length,
      revenue: contracts.reduce((a, c) => a + Number(c.value ?? 0), 0),
      conversion: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0,
      pending: d.followups.filter((f) => f.status === "pendente").length,
      overdue: d.followups.filter((f) => f.status === "pendente" && f.due_date < t).length,
      goals: goalPcts.length ? goalPcts.reduce((a, b) => a + b, 0) / goalPcts.length : 0,
      activeTargets,
    };
  }, [d, range]);

  const pipeline = STAGES.map((s) => ({ name: s.name, total: d.leads.filter((l) => l.stage === s.code).length }));
  const months = useMemo(() => {
    const out: { name: string; leads: number; ganhos: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = m.toISOString().slice(0, 7);
      out.push({
        name: m.toLocaleDateString("pt-PT", { month: "short" }),
        leads: d.leads.filter((l) => l.created_at?.slice(0, 7) === key).length,
        ganhos: d.leads.filter((l) => l.stage === "ganho" && l.closed_at?.slice(0, 7) === key).length,
      });
    }
    return out;
  }, [d.leads]);

  const ranking = useMemo(() => emps.items.map((e) => {
    const mine = <T extends Record<string, unknown>>(rows: T[], f: string) => rows.filter((r) => r[f] === e.value);
    const rev = mine(d.contracts, "employee_id").filter((c) => c.signed_at && within(c.signed_at, range)).reduce((a, c) => a + Number(c.value ?? 0), 0);
    return {
      id: e.value, name: e.label,
      leads: mine(d.leads, "assigned_to").filter((l) => within(l.created_at, range)).length,
      visits: mine(d.visits, "employee_id").filter((v) => v.status === "aprovado" && within(v.scheduled_at, range)).length,
      activities: mine(d.activities, "employee_id").filter((a) => within(a.activity_date, range)).length,
      revenue: rev,
    };
  }).filter((r) => r.leads + r.visits + r.activities + r.revenue > 0).sort((a, b) => b.revenue - a.revenue || b.leads - a.leads), [emps.items, d, range]);

  if (d.isLoading) return <LoadingState />;
  if (d.error) return <ErrorState error={d.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${me.fullName.split(" ")[0]}`}
        description={`${ROLE_LABELS[me.role]} · indicadores calculados a partir dos dados reais${me.role === "promotor" ? " (apenas a sua carteira)" : ""}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este mês</SelectItem><SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="trimestre">Este trimestre</SelectItem><SelectItem value="ano">Este ano</SelectItem><SelectItem value="tudo">Todo o período</SelectItem>
              </SelectContent>
            </Select>
            <Select value={emp} onValueChange={setEmp}>
              <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os técnicos</SelectItem>{emps.items.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={prov} onValueChange={setProv}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas as províncias</SelectItem>{PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={svc} onValueChange={setSvc}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os serviços</SelectItem>{SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />
      {me.roles.includes("promotor") && <TechnicianPanel employeeId={me.employeeId} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard accent label="Receita" value={fmtMoney(k.revenue)} hint={`${k.contracts} contrato(s)`} icon={TrendingUp} />
        <KpiCard label="Leads" value={k.leads} icon={Target} />
        <KpiCard label="Qualificadas" value={k.qualified} icon={CheckCircle2} />
        <KpiCard label="Reuniões" value={k.meetings} icon={Users} />
        <KpiCard label="Visitas" value={k.visits} hint="realizadas" icon={MapPin} />
        <KpiCard label="Propostas" value={k.proposals} icon={FileText} />
        <KpiCard label="Em negociação" value={k.negotiation} icon={Handshake} />
        <KpiCard label="Contratos" value={k.contracts} icon={Briefcase} />
        <KpiCard label="Conversão" value={fmtPct(k.conversion)} hint="ganhos / fechados" icon={Percent} />
        <KpiCard label="Follow-ups" value={k.pending} hint={`${k.overdue} em atraso`} icon={BellRing} />
        <KpiCard label="Metas" value={fmtPct(k.goals)} hint="cumprimento médio" icon={Trophy} />
        <KpiCard label="Agenda" value={d.visits.filter((v) => v.status === "pendente").length} hint="visitas agendadas" icon={CalendarCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pipeline por fase">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>{pipeline.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Evolução (6 meses)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="ganhos" name="Ganhos" stroke="var(--chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Desempenho da equipa" className="lg:col-span-3">
          {ranking.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Sem atividade no período.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Visitas</TableHead><TableHead className="text-right">Atividades</TableHead><TableHead className="text-right">Receita</TableHead></TableRow></TableHeader>
                <TableBody>{ranking.map((r) => (
                  <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right">{r.leads}</TableCell><TableCell className="text-right">{r.visits}</TableCell><TableCell className="text-right">{r.activities}</TableCell><TableCell className="text-right">{fmtMoney(r.revenue)}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </Panel>
        <Panel title="Metas em curso" className="lg:col-span-2">
          {k.activeTargets.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Sem metas ativas.</p> : (
            <div className="space-y-4">{k.activeTargets.slice(0, 6).map((t) => {
              const a = targetActual(t, d);
              return <GoalBar key={t.id} label={`${label(t.metric)} · ${t.employee_id ? emps.byId[t.employee_id] ?? "—" : "Equipa"}`} actual={a} target={Number(t.target_value)} pct={pct(a, Number(t.target_value))} format={t.metric === "receita" ? fmtMoney : String} />;
            })}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
