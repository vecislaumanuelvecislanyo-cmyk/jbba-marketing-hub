import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Kanban, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoBadge, ErrorState, LoadingState, PageHeader } from "@/components/app/common";
import { EntityPage } from "@/components/app/entity-page";
import { EntityForm } from "@/components/app/entity-form";
import { leadFields, leadsConfig } from "@/lib/entities";
import { db, errMsg, useInvalidate, useLookup, useTable, type Row } from "@/lib/data";
import { fmtMoney, STAGES } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { useMe } from "@/lib/auth";
import { canWriteOperational } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads")({
  head: pageHead("Leads", "Pipeline comercial em Kanban."),
  component: LeadsPage,
});

function LeadsPage() {
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const toggle = (
    <div className="flex rounded-md border bg-card p-0.5">
      <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} onClick={() => setView("kanban")}><Kanban />Kanban</Button>
      <Button size="sm" variant={view === "lista" ? "secondary" : "ghost"} onClick={() => setView("lista")}><List />Lista</Button>
    </div>
  );
  if (view === "lista") return <EntityPage config={{ ...leadsConfig, headerExtra: toggle, description: "Lista de oportunidades." }} />;
  return <Board toggle={toggle} />;
}

function Board({ toggle }: { toggle: React.ReactNode }) {
  const me = useMe();
  const canWrite = canWriteOperational(me.roles);
  const q = useTable("leads");
  const emps = useLookup("employees");
  const inv = useInvalidate();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [lost, setLost] = useState<{ id: string; reason: string } | null>(null);

  async function move(id: string, stage: string, lost_reason?: string) {
    const { error } = await db("leads").update({ stage, ...(lost_reason ? { lost_reason } : {}) }).eq("id", id);
    if (error) toast.error(errMsg(error)); else { toast.success("Fase atualizada"); inv("leads"); }
  }
  function drop(stage: string) {
    setOver(null);
    const lead = q.data?.find((l) => l.id === dragId);
    if (!lead || lead.stage === stage) return;
    if (stage === "perdido") setLost({ id: lead.id, reason: "" });
    else move(lead.id, stage);
  }

  const s = search.toLowerCase();
  const rows = (q.data ?? []).filter((l) => !s || [l.title, l.company, l.contact_name].some((x) => String(x ?? "").toLowerCase().includes(s)));

  return (
    <div>
      <PageHeader title="Leads" description="Arraste os cartões entre fases para atualizar o pipeline." actions={<>{toggle}{canWrite && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus />Nova lead</Button>}</>} />
      <Input placeholder="Pesquisar leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 bg-card sm:max-w-sm" />
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState error={q.error} /> : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {STAGES.map((st) => {
            const items = rows.filter((l) => l.stage === st.code);
            const total = items.reduce((a, l) => a + Number(l.estimated_value ?? 0), 0);
            return (
              <div key={st.code}
                onDragOver={(e) => { if (canWrite) { e.preventDefault(); setOver(st.code); } }}
                onDragLeave={() => setOver(null)}
                onDrop={() => drop(st.code)}
                className={cn("flex w-64 shrink-0 flex-col rounded-xl border bg-muted/60 p-2 transition-colors", over === st.code && "border-gold bg-gold/10")}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{st.name}</span>
                  <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="mb-2 px-1 text-xs text-muted-foreground">{fmtMoney(total)}</div>
                <div className="flex min-h-24 flex-col gap-2">
                  {items.map((l) => (
                    <button key={l.id} draggable={canWrite} onDragStart={() => setDragId(l.id)}
                      onClick={() => { setEditing(l); setOpen(true); }}
                      className="rounded-lg border bg-card p-3 text-left shadow-card transition hover:border-primary/40">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm font-medium leading-snug">{l.title}</span>
                        {l.is_demo && <DemoBadge />}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{l.company ?? l.contact_name ?? "—"}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-semibold">{fmtMoney(l.estimated_value)}</span>
                        <span className="truncate text-muted-foreground">{emps.byId[l.assigned_to] ?? "Sem responsável"}</span>
                      </div>
                    </button>
                  ))}
                  {items.length === 0 && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Vazio</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <EntityForm open={open} onOpenChange={setOpen} table="leads" title="lead" fields={leadFields} row={editing} validate={leadsConfig.validate} />
      <Dialog open={!!lost} onOpenChange={(o) => !o && setLost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo de perda</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Ex.: preço, concorrência, timing…" value={lost?.reason ?? ""} onChange={(e) => setLost((p) => p && { ...p, reason: e.target.value })} maxLength={255} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLost(null)}>Cancelar</Button>
            <Button disabled={!lost?.reason.trim()} onClick={() => { if (lost) move(lost.id, "perdido", lost.reason.trim()); setLost(null); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
