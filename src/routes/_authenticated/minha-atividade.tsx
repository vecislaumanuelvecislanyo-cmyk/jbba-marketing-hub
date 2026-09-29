import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { canWriteOperational, isManager } from "@/lib/rbac";

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
  const [activityPeriod, setActivityPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [activityToDelete, setActivityToDelete] = useState<Record<string, unknown> | null>(null);
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
  const activityRows = (() => {
    const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (activityPeriod === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (activityPeriod === "month") start.setDate(1);
    if (activityPeriod === "year") start.setMonth(0, 1);
    const end = new Date(start);
    if (activityPeriod === "day") end.setHours(23, 59, 59, 999);
    if (activityPeriod === "week") { end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); }
    if (activityPeriod === "month") { end.setMonth(end.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); }
    if (activityPeriod === "year") { end.setFullYear(end.getFullYear() + 1, 0, 0); end.setHours(23, 59, 59, 999); }
    return mine(d.activities).filter((a) => { const dt = new Date(String(a.activity_date)); return dt >= start && dt <= end; }).sort((a, b) => String(b.activity_date).localeCompare(String(a.activity_date)));
  })();

  async function deleteActivity(id: string) {
    const { error } = await db("activities").delete().eq("id", id);
    if (error) toast.error(errMsg(error)); else { toast.success("Atividade eliminada."); inv("activities"); }
    setActivityToDelete(null);
  }

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
      <Panel title="Registo de atividades" actions={<div className="flex flex-wrap items-center gap-2"><Select value={activityPeriod} onValueChange={(v) => setActivityPeriod(v as typeof activityPeriod)}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Por dia</SelectItem><SelectItem value="week">Por semana</SelectItem><SelectItem value="month">Por mês</SelectItem><SelectItem value="year">Por ano</SelectItem></SelectContent></Select>{canWrite && <Button size="sm" onClick={() => setForm("activities")}><Plus />Registar</Button>}</div>}>
        {activityRows.length === 0 ? <EmptyState text="Não existem atividades no período selecionado." /> : <ul className="divide-y">{activityRows.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><div className="font-medium">{a.subject}</div><div className="text-sm text-muted-foreground">{fmtDate(String(a.activity_date), true)} · {label(String(a.type))}{a.description ? ` · ${a.description}` : ""}</div><StatusBadge value={String(a.status ?? "pendente")} /></div>{isManager(me.roles) && <Button size="icon" variant="ghost" aria-label="Eliminar atividade" onClick={() => setActivityToDelete(a)}><Trash2 className="text-destructive" /></Button>}</li>)}</ul>}
      </Panel>
      <AlertDialog open={!!activityToDelete} onOpenChange={(o) => !o && setActivityToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar atividade?</AlertDialogTitle><AlertDialogDescription>Esta operação é irreversível e ficará registada na auditoria.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => activityToDelete && deleteActivity(String(activityToDelete.id))}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {form && <EntityForm open onOpenChange={(o) => !o && setForm(null)} table={cfg.table} title={cfg.singular} fields={cfg.fields} validate={cfg.validate} />}
    </div>
  );
}
