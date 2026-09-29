import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownUp, BrainCircuit, Download, Eye, FileUp, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { downloadCsv, logEvent } from "@/lib/export";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoBadge, EmptyState, ErrorState, LoadingState, PageHeader } from "./common";
import { EntityForm, type FieldDef } from "./entity-form";
import { db, errMsg, useInvalidate, useLookup, useTable, type LookupKey, type Row } from "@/lib/data";
import { useMe } from "@/lib/auth";
import { canWriteOperational, isAdmin, isManager } from "@/lib/rbac";

export type Lookups = Record<LookupKey, Record<string, string>>;
export type ColumnDef = { key: string; label: string; render?: (row: Row, l: Lookups) => ReactNode; className?: string };

export type EntityConfig = {
  table: string;
  title: string;
  singular: string;
  description?: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  searchKeys: string[];
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  order?: string;
  /** who may create/edit: operational = managers + promotor (scoped by RLS), managers, admin */
  write?: "operational" | "managers" | "admin";
  deleteBy?: "managers" | "admin";
  validate?: (v: Record<string, string>) => string | null;
  invalidate?: string[];
  headerExtra?: ReactNode;
  rowActions?: (row: Row) => ReactNode;
  dateField?: string;
  importable?: boolean;
  analyzable?: boolean;
  inspectable?: boolean;
  createLabel?: string;
  invalidatable?: boolean;
};

export function useAllLookups(): Lookups {
  const e = useLookup("employees"), c = useLookup("clients"), l = useLookup("leads"),
    ca = useLookup("campaigns"), d = useLookup("departments"), p = useLookup("proposals");
  return { employees: e.byId, clients: c.byId, leads: l.byId, campaigns: ca.byId, departments: d.byId, proposals: p.byId };
}

export function EntityPage({ config }: { config: EntityConfig }) {
  const me = useMe();
  const q = useTable(config.table, { order: config.order ?? "created_at" });
  const lookups = useAllLookups();
  const inv = useInvalidate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);
  const [datePreset, setDatePreset] = useState<"all" | "day" | "week" | "month" | "year">("all");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [inspecting, setInspecting] = useState<Row | null>(null);
  const [toInvalidate, setToInvalidate] = useState<Row | null>(null);

  const canWrite = config.write === "admin" ? isAdmin(me.roles) : config.write === "managers" ? isManager(me.roles) : canWriteOperational(me.roles);
  const canDelete = config.deleteBy === "admin" ? isAdmin(me.roles) : isManager(me.roles);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const now = new Date();
    const start = new Date(now);
    if (datePreset === "day") start.setHours(0, 0, 0, 0);
    if (datePreset === "week") { start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); }
    if (datePreset === "month") { start.setHours(0, 0, 0, 0); start.setDate(1); }
    if (datePreset === "year") { start.setHours(0, 0, 0, 0); start.setMonth(0, 1); }
    const end = new Date(now);
    if (datePreset === "day") end.setHours(23, 59, 59, 999);
    if (datePreset === "week") { end.setTime(start.getTime()); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); }
    if (datePreset === "month") { end.setMonth(end.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); }
    if (datePreset === "year") { end.setFullYear(end.getFullYear() + 1, 0, 0); end.setHours(23, 59, 59, 999); }
    return (q.data ?? []).filter((r) => {
      for (const [k, v] of Object.entries(filters)) if (v && v !== "all" && String(r[k]) !== v) return false;
      if (config.dateField && datePreset !== "all") { const d = new Date(String(r[config.dateField] ?? "")); if (Number.isNaN(d.getTime()) || d < start || d > end) return false; }
      if (!s) return true;
      return config.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s));
    }).sort((a, b) => {
      if (!sort) return 0;
      const x = a[sort.key] ?? "", y = b[sort.key] ?? "";
      const c = typeof x === "number" || typeof y === "number" ? Number(x) - Number(y) : String(x).localeCompare(String(y), "pt");
      return sort.asc ? c : -c;
    });
  }, [q.data, search, filters, config.searchKeys, sort, config.dateField, datePreset]);


  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return toast.error("O ficheiro CSV não contém registos.");
    const headers = lines[0].split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    const aliases = new Map<string, string>();
    for (const col of config.columns) { aliases.set(col.key.toLowerCase(), col.key); aliases.set(col.label.toLowerCase(), col.key); }
    const payload = lines.slice(1).map((line) => {
      const values = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
      const row: Record<string, unknown> = {};
      const fieldMap = Object.fromEntries(config.fields.map((f) => [f.name, f]));
      headers.forEach((h, i) => {
        const key = aliases.get(h.toLowerCase());
        if (!key || values[i] === "") return;
        const field = fieldMap[key];
        let value: unknown = values[i];
        if (field?.type === "number") value = Number(values[i]);
        if (field?.lookup) {
          const lookup = lookups[field.lookup];
          const match = Object.entries(lookup).find(([id, name]) => name.toLowerCase() === values[i].toLowerCase());
          if (match) value = match[0];
        }
        row[key] = value;
      });
      return row;
    }).filter((row) => Object.keys(row).length > 0);
    if (!payload.length) return toast.error("Nenhuma linha válida foi encontrada.");
    const { error } = await db(config.table).insert(payload);
    if (error) return toast.error(errMsg(error));
    toast.success(payload.length + " registo(s) importado(s).");
    inv(config.table, ...(config.invalidate ?? []));
  }

  function openImport() { document.getElementById("import-" + config.table)?.click(); }

  const analysis = useMemo(() => {
    const statusCounts = rows.reduce<Record<string, number>>((acc, row) => { const s = String(row.status ?? "sem estado"); acc[s] = (acc[s] ?? 0) + 1; return acc; }, {});
    const value = rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
    return { count: rows.length, statusCounts, value };
  }, [rows]);

  async function exportCsv() {
    const text = (n: ReactNode) => (typeof n === "string" || typeof n === "number" ? n : null);
    downloadCsv(`${config.table}-${new Date().toISOString().slice(0, 10)}.csv`, config.columns.map((c) => c.label),
      rows.map((r) => config.columns.map((c) => {
        const v = r[c.key];
        const lk = (lookups as Record<string, Record<string, string>>);
        for (const t of Object.values(lk)) if (typeof v === "string" && t[v]) return t[v];
        return text(v) ?? (v == null ? "" : String(v));
      })));
    await logEvent("EXPORT", config.table, null, { format: "csv", rows: rows.length });
  }


  async function invalidateRecord() {
    if (!toInvalidate) return;
    const { error } = await db(config.table).update({ status: "rejeitado" }).eq("id", toInvalidate.id);
    if (error) toast.error(errMsg(error));
    else { toast.success("Registo invalidado."); inv(config.table, ...(config.invalidate ?? [])); }
    setToInvalidate(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await db(config.table).delete().eq("id", toDelete.id);
    if (error) toast.error(errMsg(error));
    else { toast.success("Registo eliminado (registado na auditoria)"); inv(config.table, ...(config.invalidate ?? [])); }
    setToDelete(null);
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={<>
          {config.headerExtra}
          {config.importable && canWrite && <><input id={"import-" + config.table} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importCsv(file); e.currentTarget.value = ""; }} /><Button variant="outline" onClick={openImport}><FileUp />Importar</Button></>}
          {config.analyzable && <Button variant="outline" onClick={() => setAnalysisOpen(true)}><BrainCircuit />Analisar</Button>}
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download />Exportar</Button>
          {canWrite && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus />{config.createLabel ?? "Novo"}</Button>}
        </>}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Pesquisar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        {config.dateField && <Select value={datePreset} onValueChange={(v) => setDatePreset(v as typeof datePreset)}><SelectTrigger className="bg-card sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os períodos</SelectItem><SelectItem value="day">Hoje</SelectItem><SelectItem value="week">Esta semana</SelectItem><SelectItem value="month">Este mês</SelectItem><SelectItem value="year">Este ano</SelectItem></SelectContent></Select>}
        {config.filters?.map((f) => (
          <Select key={f.key} value={filters[f.key] ?? "all"} onValueChange={(v) => setFilters((p) => ({ ...p, [f.key]: v }))}>
            <SelectTrigger className="bg-card sm:w-48"><SelectValue placeholder={f.label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{f.label}: todos</SelectItem>
              {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {q.isLoading ? <LoadingState /> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : rows.length === 0 ? (
          <EmptyState text={search ? "Nenhum resultado para a pesquisa." : "Ainda não existem registos."} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {config.columns.map((c) => (
                    <TableHead key={c.key} className={c.className}>
                      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((p) => ({ key: c.key, asc: p?.key === c.key ? !p.asc : true }))}>
                        {c.label}<ArrowDownUp className={sort?.key === c.key ? "h-3 w-3 text-primary" : "h-3 w-3 opacity-40"} />
                      </button>
                    </TableHead>
                  ))}
                  {(canWrite || canDelete || config.rowActions || config.inspectable || config.invalidatable) && <TableHead className="w-24 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    {config.columns.map((c, i) => (
                      <TableCell key={c.key} className={c.className}>
                        <div className="flex items-center gap-2">
                          {c.render ? c.render(r, lookups) : String(r[c.key] ?? "—")}
                          {i === 0 && r.is_demo && <DemoBadge />}
                        </div>
                      </TableCell>
                    ))}
                    {(canWrite || canDelete || config.rowActions || config.inspectable || config.invalidatable) && (
                      <TableCell className="text-right whitespace-nowrap">
                        {config.rowActions?.(r)}
                        {config.inspectable && <Button size="icon" variant="ghost" aria-label="Inspecionar" onClick={() => setInspecting(r)}><Eye /></Button>}
                        {config.invalidatable && isManager(me.roles) && <Button size="icon" variant="ghost" aria-label="Invalidar" onClick={() => setToInvalidate(r)}><XCircle className="text-destructive" /></Button>}
                        {canWrite && <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { setEditing(r); setOpen(true); }}><Pencil /></Button>}
                        {canDelete && <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setToDelete(r)}><Trash2 className="text-destructive" /></Button>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{rows.length} registo(s)</p>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Análise de {config.title}</DialogTitle><DialogDescription>Resumo operacional dos registos atualmente filtrados.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Registos</div><div className="text-2xl font-semibold">{analysis.count}</div></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Estados</div><div className="mt-1 space-y-1 text-sm">{Object.entries(analysis.statusCounts).map(([s,n]) => <div key={s} className="flex justify-between gap-3"><span>{s}</span><b>{n}</b></div>)}</div></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Valor total</div><div className="text-xl font-semibold">{analysis.value.toLocaleString("pt-PT")} Kz</div></div></div></DialogContent></Dialog>



      <Dialog open={!!inspecting} onOpenChange={(o) => !o && setInspecting(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Inspeção de {config.singular}</DialogTitle><DialogDescription>Detalhes completos do registo selecionado.</DialogDescription></DialogHeader>{inspecting && <dl className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">{Object.entries(inspecting).filter(([k]) => !["id"].includes(k)).map(([k,v]) => <div key={k} className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{k.replaceAll("_"," ")}</dt><dd className="mt-1 break-words text-sm">{v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}</dd></div>)}</dl>}</DialogContent></Dialog>
      <AlertDialog open={!!toInvalidate} onOpenChange={(o) => !o && setToInvalidate(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Invalidar {config.singular}?</AlertDialogTitle><AlertDialogDescription>O estado será alterado para Rejeitado e a ação ficará registada na auditoria.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={invalidateRecord}>Invalidar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <EntityForm open={open} onOpenChange={setOpen} table={config.table} title={config.singular} fields={config.fields} row={editing} validate={config.validate} invalidate={config.invalidate} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registo?</AlertDialogTitle>
            <AlertDialogDescription>Esta operação é irreversível e ficará registada no Audit Trail.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
