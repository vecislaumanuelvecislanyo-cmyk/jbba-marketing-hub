import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/app/common";
import { GoalBar } from "@/components/app/kpi";
import { EntityForm } from "@/components/app/entity-form";
import { activitiesConfig, visitsConfig, followupsConfig } from "@/lib/entities";
import { today, useDatasets } from "@/lib/datasets";
import { db, errMsg, useInvalidate, useLookup } from "@/lib/data";
import { fmtDate, fmtMoney, label } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { pct, targetActual } from "@/lib/targets";
import { useMe } from "@/lib/auth";
import { canWriteOperational } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/minha-atividade")({
  head: pageHead("Minha Atividade", "Agenda e tarefas do dia."),
  component: MyActivity,
});

function MyActivity() {
  const me = useMe();
  const d = useDatasets();
  const leads = useLookup("leads"), clients = useLookup("clients");
  const inv = useInvalidate();
  const [form, setForm] = useState<null | "activities" | "visits" | "followups">(null);
  const canWrite = canWriteOperational(me.roles);

  if (!me.employeeId) return (
    <div><PageHeader title="Minha Atividade" />
      <EmptyState text="A sua conta ainda não está associada a um colaborador. Peça ao administrador para fazer a associação em Configurações." /></div>
  );
  if (d.isLoading) return <LoadingState />;
  if (d.error) return <ErrorState error={d.error} />;

  const mine = <T extends Record<string, unknown>>(rows: T[]) => rows.filter((r) => r.employee_id === me.employeeId);
  const t = today();
  const fups = mine(d.followups).filter((f) => f.status === "pendente").sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const visits = mine(d.visits).filter((v) => v.status === "agendada").sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
  const targets = d.targets.filter((x) => x.employee_id === me.employeeId && x.period_start <= t && x.period_end >= t);

  async function done(id: string) {
    const { error } = await db("followups").update({ status: "concluido", completed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(errMsg(error)); else { toast.success("Follow-up concluído"); inv("followups"); }
  }
  const cfg = form === "activities" ? activitiesConfig : form === "visits" ? visitsConfig : followupsConfig;

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Atividade" description="O seu dia de trabalho num só ecrã." actions={canWrite && <>
        <Button variant="gold" onClick={() => setForm("activities")}><Plus />Registar atividade</Button>
        <Button variant="outline" onClick={() => setForm("visits")}><Plus />Visita</Button>
        <Button variant="outline" onClick={() => setForm("followups")}><Plus />Follow-up</Button>
      </>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Follow-ups pendentes (${fups.length})`}>
          {fups.length === 0 ? <EmptyState text="Tudo em dia." /> : <ul className="divide-y">{fups.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 py-3">
              <div className="min-w-0 text-sm">
                <div className={f.due_date < t ? "font-medium text-destructive" : "font-medium"}>{fmtDate(f.due_date)} · {label(f.type)}{f.due_date < t && " · em atraso"}</div>
                <div className="truncate text-muted-foreground">{leads.byId[f.lead_id] ?? clients.byId[f.client_id] ?? ""} {f.notes ? `— ${f.notes}` : ""}</div>
              </div>
              {canWrite && <Button size="sm" variant="outline" onClick={() => done(f.id)}><Check />Concluir</Button>}
            </li>
          ))}</ul>}
        </Panel>
        <Panel title={`Próximas visitas (${visits.length})`}>
          {visits.length === 0 ? <EmptyState text="Sem visitas agendadas." /> : <ul className="divide-y">{visits.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 py-3 text-sm">
              <div><div className="font-medium">{fmtDate(v.scheduled_at, true)}</div><div className="text-muted-foreground">{clients.byId[v.client_id] ?? "—"} · {v.location ?? ""}</div></div>
              <StatusBadge value={v.status} />
            </li>
          ))}</ul>}
        </Panel>
        <Panel title="As minhas metas" actions={<Link to="/metas" className="text-xs text-primary hover:underline">Ver todas</Link>}>
          {targets.length === 0 ? <EmptyState text="Sem metas ativas atribuídas." /> : <div className="space-y-4">{targets.map((x) => {
            const a = targetActual(x, d);
            return <GoalBar key={x.id} label={label(x.metric)} actual={a} target={Number(x.target_value)} pct={pct(a, Number(x.target_value))} format={x.metric === "receita" ? fmtMoney : String} />;
          })}</div>}
        </Panel>
        <Panel title="Atividades recentes">
          {mine(d.activities).length === 0 ? <EmptyState /> : <ul className="divide-y">{[...mine(d.activities)].slice(0, 6).map((a) => (
            <li key={a.id} className="flex justify-between gap-2 py-3 text-sm"><span className="font-medium">{a.subject}</span><span className="text-muted-foreground">{fmtDate(a.activity_date)}</span></li>
          ))}</ul>}
        </Panel>
      </div>
      {form && <EntityForm open onOpenChange={(o) => !o && setForm(null)} table={cfg.table} title={cfg.singular} fields={cfg.fields} validate={cfg.validate} />}
    </div>
  );
}
