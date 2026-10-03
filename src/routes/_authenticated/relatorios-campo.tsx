import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Pencil, Plus, Send, Trash2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/app/common";
import { db, errMsg, useInvalidate, useTable } from "@/lib/data";
import { downloadCsv, logEvent } from "@/lib/export";
import { useMe } from "@/lib/auth";
import { canWriteOperational } from "@/lib/rbac";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/relatorios-campo")({
  head: pageHead("Relatórios de Campo", "Relatórios digitais das atividades de campo, enviados ao Super ADM para avaliação."),
  component: FieldReportsPage,
});

const FIELDS = [
  ["title", "Título"], ["report_date", "Data"], ["location", "Local"], ["activities_done", "Atividades realizadas"],
  ["results", "Resultados"], ["issues", "Dificuldades"], ["next_steps", "Próximos passos"],
] as const;
type Key = (typeof FIELDS)[number][0];
type Form = Record<Key, string> & { id?: string };
const empty = (): Form => ({ title: "", report_date: new Date().toISOString().slice(0, 10), location: "", activities_done: "", results: "", issues: "", next_steps: "" });
const STATUS_TEXT: Record<string, string> = { rascunho: "Rascunho", enviado: "Enviado · aguarda avaliação", aprovado: "Aprovado", rejeitado: "Rejeitado" };

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  const sep = text.split("\n")[0]?.includes(";") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function FieldReportsPage() {
  const me = useMe();
  const isSuper = me.roles.includes("super_admin");
  const canWrite = canWriteOperational(me.roles);
  const q = useTable("field_reports", { order: "report_date", ascending: false });
  const inv = useInvalidate();
  const [form, setForm] = useState<Form | null>(null);
  const [review, setReview] = useState<{ id: string; status: "aprovado" | "rejeitado"; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save(status: "rascunho" | "enviado") {
    if (!form) return;
    if (form.title.trim().length < 3) return toast.error("Indique um título.");
    if (!form.report_date) return toast.error("Indique a data.");
    if (status === "enviado" && form.activities_done.trim().length < 5) return toast.error("Descreva as atividades realizadas antes de enviar.");
    setBusy(true);
    const { id, ...rest } = form;
    const payload = { ...rest, status, employee_id: me.employeeId };
    const { error } = id ? await db("field_reports").update(payload).eq("id", id) : await db("field_reports").insert(payload);
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(status === "enviado" ? "Relatório enviado ao Super ADM para avaliação." : "Rascunho guardado.");
    setForm(null); inv("field_reports");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function submit(r: any) {
    const { error } = await db("field_reports").update({ status: "enviado" }).eq("id", r.id);
    if (error) return toast.error(errMsg(error));
    toast.success("Relatório enviado ao Super ADM."); inv("field_reports");
  }
  async function remove(id: string) {
    const { error } = await db("field_reports").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    toast.success("Relatório eliminado."); inv("field_reports");
  }
  async function doReview() {
    if (!review) return;
    if (review.status === "rejeitado" && review.notes.trim().length < 3) return toast.error("Indique o motivo da rejeição.");
    const { error } = await db("field_reports").update({ status: review.status, review_notes: review.notes || null }).eq("id", review.id);
    if (error) return toast.error(errMsg(error));
    await logEvent(review.status === "aprovado" ? "APPROVE" : "REJECT", "field_reports", review.id, { notes: review.notes });
    toast.success(review.status === "aprovado" ? "Relatório aprovado." : "Relatório rejeitado.");
    setReview(null); inv("field_reports");
  }

  function exportCsv() {
    const rows = q.data ?? [];
    downloadCsv(`relatorios-campo-${new Date().toISOString().slice(0, 10)}.csv`, [...FIELDS.map((f) => f[1]), "Estado", "Notas de avaliação"],
      rows.map((r) => [...FIELDS.map(([k]) => r[k]), STATUS_TEXT[r.status] ?? r.status, r.review_notes]));
    logEvent("EXPORT", "field_reports", null, { count: rows.length });
  }

  async function importCsv(file: File) {
    const rows = parseCsv((await file.text()).replace(/^\ufeff/, ""));
    if (rows.length < 2) return toast.error("Ficheiro vazio ou sem linhas de dados.");
    const header = rows[0]!.map((h) => h.trim().toLowerCase());
    const idx = (k: Key, lbl: string) => { const i = header.indexOf(k); return i >= 0 ? i : header.indexOf(lbl.toLowerCase()); };
    const map = FIELDS.map(([k, l]) => [k, idx(k, l)] as const);
    if ((map.find(([k]) => k === "title")?.[1] ?? -1) < 0) return toast.error("O ficheiro precisa de uma coluna \"Título\".");
    const items = rows.slice(1).map((r) => {
      const o: Record<string, string | null> = { status: "rascunho", employee_id: me.employeeId };
      for (const [k, i] of map) o[k] = i >= 0 ? (r[i]?.trim() || null) : null;
      if (!o.report_date || !/^\d{4}-\d{2}-\d{2}$/.test(o.report_date)) o.report_date = new Date().toISOString().slice(0, 10);
      return o;
    }).filter((o) => o.title && o.title.length >= 3).slice(0, 500);
    if (!items.length) return toast.error("Nenhuma linha válida encontrada.");
    const { error } = await db("field_reports").insert(items);
    if (error) return toast.error(errMsg(error));
    toast.success(`${items.length} relatório(s) importado(s) como rascunho.`); inv("field_reports");
  }

  function template() {
    downloadCsv("modelo-relatorio-campo.csv", FIELDS.map((f) => f[1]), [["Visita ao cliente X", new Date().toISOString().slice(0, 10), "Luanda", "Apresentação do serviço", "Cliente interessado", "", "Enviar proposta"]]);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios de Campo" description="Preencha o relatório digital das atividades de campo e envie-o ao Super ADM para avaliação."
        actions={<div className="flex flex-wrap gap-2">
          {canWrite && <><Button variant="outline" onClick={template}><Download />Modelo</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />Importar</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} /></>}
          <Button variant="outline" onClick={exportCsv}><Download />Exportar</Button>
          {canWrite && <Button onClick={() => setForm(empty())}><Plus />Novo relatório</Button>}
        </div>} />
      <Panel>
        {q.isLoading ? <LoadingState /> : q.error ? <ErrorState error={q.error} /> : !(q.data ?? []).length ? <EmptyState text="Ainda não há relatórios de campo." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Título</TableHead><TableHead>Local</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>{(q.data ?? []).map((r) => {
              const mine = r.created_by === me.userId;
              const editable = mine && (r.status === "rascunho" || r.status === "rejeitado");
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.report_date}</TableCell>
                  <TableCell><div className="font-medium">{r.title}</div>{r.review_notes && <div className="text-xs text-muted-foreground">Avaliação: {r.review_notes}</div>}</TableCell>
                  <TableCell>{r.location ?? "—"}</TableCell>
                  <TableCell><StatusBadge value={r.status} text={STATUS_TEXT[r.status]} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {editable && <Button size="sm" variant="ghost" title="Editar" onClick={() => setForm({ id: r.id, ...Object.fromEntries(FIELDS.map(([k]) => [k, r[k] ?? ""])) } as Form)}><Pencil /></Button>}
                    {editable && <Button size="sm" variant="ghost" title="Enviar ao Super ADM" onClick={() => submit(r)}><Send /></Button>}
                    {isSuper && r.status === "enviado" && <>
                      <Button size="sm" variant="ghost" title="Aprovar" onClick={() => setReview({ id: r.id, status: "aprovado", notes: "" })}><CheckCircle2 /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" title="Rejeitar" onClick={() => setReview({ id: r.id, status: "rejeitado", notes: "" })}><XCircle /></Button></>}
                    {((mine && r.status === "rascunho") || isSuper) && <Button size="sm" variant="ghost" className="text-destructive" title="Eliminar" onClick={() => remove(r.id)}><Trash2 /></Button>}
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        )}
      </Panel>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Relatório digital de campo</DialogTitle><DialogDescription>Guarde como rascunho ou envie diretamente ao Super ADM para avaliação.</DialogDescription></DialogHeader>
          {form && <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([k, l]) => (
              <div key={k} className={`space-y-1.5 ${k === "title" || k.length > 8 ? "sm:col-span-2" : ""}`}>
                <Label>{l}</Label>
                {k === "title" || k === "location" || k === "report_date"
                  ? <Input type={k === "report_date" ? "date" : "text"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  : <Textarea rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
              </div>
            ))}
          </div>}
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => save("rascunho")}>Guardar rascunho</Button>
            <Button disabled={busy} onClick={() => save("enviado")}><Send />Enviar ao Super ADM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{review?.status === "aprovado" ? "Aprovar relatório" : "Rejeitar relatório"}</DialogTitle><DialogDescription>O técnico será notificado da decisão.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label>Notas de avaliação</Label><Textarea rows={3} value={review?.notes ?? ""} onChange={(e) => review && setReview({ ...review, notes: e.target.value })} /></div>
          <DialogFooter><Button onClick={doReview}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
