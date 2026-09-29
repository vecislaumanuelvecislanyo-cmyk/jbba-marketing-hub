import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit, ChevronLeft, ChevronRight, Download, FileUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/app/common";
import { EntityForm } from "@/components/app/entity-form";
import { activitiesConfig } from "@/lib/entities";
import { useDatasets } from "@/lib/datasets";
import { db, errMsg, useInvalidate } from "@/lib/data";
import { canWriteOperational, isManager } from "@/lib/rbac";
import { fmtDate, label } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { downloadCsv } from "@/lib/export";
import { analyzeReport } from "@/lib/ai-report";

type CalendarEvent = { id: string; kind: "atividade" | "visita" | "followup"; title: string; date: string; status: string; location?: string | null };

const STATES = ["em_analise", "processando", "pendente", "rejeitado", "aprovado"];

function CalendarPage() {
  const me = useMe();
  const d = useDatasets();
  const inv = useInvalidate();
  const [cursor, setCursor] = useState(() => new Date());
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<{ summary: string; attentionPoints: string[]; actions: string[] } | null>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    const activities = d.activities.map((x) => ({ id: x.id, kind: "atividade" as const, title: x.subject, date: x.activity_date, status: String(x.status ?? "pendente") }));
    const visits = d.visits.map((x) => ({ id: x.id, kind: "visita" as const, title: x.objective || "Visita", date: x.scheduled_at, status: String(x.status ?? "pendente"), location: x.location }));
    const followups = d.followups.map((x) => ({ id: x.id, kind: "followup" as const, title: label(x.type) + " · " + (x.notes || "Follow-up"), date: x.due_date, status: x.status === "concluido" ? "aprovado" : x.status === "cancelado" ? "rejeitado" : "pendente" }));
    return [...activities, ...visits, ...followups].filter((x) => status === "all" || x.status === status).sort((a,b) => String(a.date).localeCompare(String(b.date)));
  }, [d.activities, d.visits, d.followups, status]);

  const monthEvents = events.filter((e) => { const dt = new Date(e.date); return dt.getFullYear() === cursor.getFullYear() && dt.getMonth() === cursor.getMonth(); });
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: offset + days }, (_, i) => i < offset ? null : i - offset + 1);


  async function importCalendar(file: File) {
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return toast.error("O CSV não contém atividades.");
    const headers = lines[0].split(",").map((x) => x.trim().toLowerCase().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => line.split(",").map((x) => x.trim().replace(/^"|"$/g, "")));
    const payload = rows.map((values) => {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { if (["subject","assunto","type","tipo","activity_date","data","status","estado","description","descricao"].includes(h) && values[i]) row[h] = values[i]; });
      return {
        subject: row.subject || row.assunto || "Atividade importada",
        type: row.type || row.tipo || "outro",
        activity_date: row.activity_date || row.data || new Date().toISOString(),
        status: row.status || row.estado || "pendente",
        description: row.description || row.descricao || null,
      };
    });
    const { error } = await db("activities").insert(payload);
    if (error) return toast.error(errMsg(error));
    toast.success(payload.length + " atividade(s) importada(s).");
    inv("activities");
  }

  async function analyzeCalendar() {
    if (!events.length) return toast.error("Não existem eventos para analisar.");
    setAiBusy(true);
    try {
      const statuses = events.reduce<Record<string, number>>((acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; }, {});
      const first = events[0].date, last = events[events.length - 1].date;
      const result = await analyzeReport({ data: { reportType: "Calendário operacional", periodStart: String(first), periodEnd: String(last), count: events.length, statuses } });
      setAiResult(result);
      setAiOpen(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível analisar o calendário."); }
    finally { setAiBusy(false); }
  }

  function exportCalendar() {
    downloadCsv("jbba-calendario-" + new Date().toISOString().slice(0,10) + ".csv", ["Tipo","Título","Data","Estado","Local"], events.map((e) => [e.kind, e.title, e.date, label(e.status), e.location ?? ""]));
  }

  async function deleteActivity() {
    if (!toDelete || toDelete.kind !== "atividade") return setToDelete(null);
    const { error } = await db("activities").delete().eq("id", toDelete.id);
    if (error) toast.error(errMsg(error)); else { toast.success("Atividade removida do calendário."); inv("activities"); }
    setToDelete(null);
  }

  if (d.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário" description="Visão central de atividades, visitas e follow-ups em execução." actions={<div className="flex flex-wrap gap-2">{canWriteOperational(me.roles) && <><input id="calendar-import" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importCalendar(file); e.currentTarget.value = ""; }} /><Button onClick={() => setFormOpen(true)}><Plus />Adicionar atividade</Button><Button variant="outline" onClick={() => document.getElementById("calendar-import")?.click()}><FileUp />Importar</Button></>}<Button variant="outline" onClick={exportCalendar}><Download />Exportar</Button><Button variant="outline" onClick={analyzeCalendar} disabled={aiBusy}><BrainCircuit />{aiBusy ? "A analisar…" : "Analisar IA"}</Button></div>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft /></Button><div className="min-w-40 text-center font-semibold">{cursor.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</div><Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight /></Button></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os estados</SelectItem>{STATES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent></Select>
      </div>
      <Panel>
        <div className="grid grid-cols-7 border-l border-t text-xs">
          {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((x) => <div key={x} className="border-b border-r bg-muted/40 p-2 font-semibold">{x}</div>)}
          {cells.map((day, i) => {
            const dayEvents = day ? monthEvents.filter((e) => new Date(e.date).getDate() === day) : [];
            return <div key={i} className="min-h-28 border-b border-r p-2"><div className="mb-1 font-medium text-muted-foreground">{day ?? ""}</div><div className="space-y-1">{dayEvents.slice(0, 4).map((e) => <button type="button" key={e.kind + e.id} className="w-full rounded-md border p-1 text-left hover:bg-muted" onClick={() => e.kind === "atividade" && setToDelete(e)}><div className="truncate font-medium">{e.title}</div><div className="truncate text-[10px] text-muted-foreground">{e.kind} · {label(e.status)}</div></button>)}{dayEvents.length > 4 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 4} eventos</div>}</div></div>;
          })}
        </div>
      </Panel>
      <Panel title={"Atividades do mês (" + monthEvents.length + ")"}>
        {monthEvents.length === 0 ? <EmptyState text="Não existem eventos para o período e estado selecionados." /> : <ul className="divide-y">{monthEvents.map((e) => <li key={e.kind + e.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="font-medium">{e.title}</div><div className="text-sm text-muted-foreground">{fmtDate(e.date, true)} · {e.kind}{e.location ? " · " + e.location : ""}</div></div><div className="flex items-center gap-2"><StatusBadge value={e.status} />{e.kind === "atividade" && isManager(me.roles) && <Button size="icon" variant="ghost" onClick={() => setToDelete(e)}><Trash2 className="text-destructive" /></Button>}</div></li>)}</ul>}
      </Panel>
      <EntityForm open={formOpen} onOpenChange={setFormOpen} table={activitiesConfig.table} title={activitiesConfig.singular} fields={activitiesConfig.fields} validate={activitiesConfig.validate} invalidate={activitiesConfig.invalidate} />

      <Dialog open={aiOpen} onOpenChange={setAiOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Análise IA do calendário</DialogTitle><DialogDescription>Resumo assistivo dos eventos atuais para revisão da gestão.</DialogDescription></DialogHeader>{aiResult && <div className="space-y-5"><div className="rounded-xl border p-4"><div className="font-semibold">Síntese</div><p className="mt-2 text-sm text-muted-foreground">{aiResult.summary}</p></div><div className="grid gap-4 md:grid-cols-2"><div><div className="font-semibold">Pontos de atenção</div><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{aiResult.attentionPoints.map((x) => <li key={x}>{x}</li>)}</ul></div><div><div className="font-semibold">Ações sugeridas</div><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{aiResult.actions.map((x) => <li key={x}>{x}</li>)}</ul></div></div></div>}</DialogContent></Dialog>

      <AlertDialog open={!!toDelete && toDelete.kind === "atividade"} onOpenChange={(o) => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir atividade do calendário?</AlertDialogTitle><AlertDialogDescription>A atividade será eliminada do registo e ficará na auditoria.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={deleteActivity}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/calendario")({
  head: pageHead("Calendário", "Calendário operacional de atividades."),
  component: CalendarPage,
});
