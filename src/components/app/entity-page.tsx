import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const canWrite = config.write === "admin" ? isAdmin(me.roles) : config.write === "managers" ? isManager(me.roles) : canWriteOperational(me.roles);
  const canDelete = config.deleteBy === "admin" ? isAdmin(me.roles) : isManager(me.roles);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((r) => {
      for (const [k, v] of Object.entries(filters)) if (v && v !== "all" && String(r[k]) !== v) return false;
      if (!s) return true;
      return config.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s));
    });
  }, [q.data, search, filters, config.searchKeys]);

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
          {canWrite && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus />Novo</Button>}
        </>}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Pesquisar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
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
                  {config.columns.map((c) => <TableHead key={c.key} className={c.className}>{c.label}</TableHead>)}
                  {(canWrite || canDelete) && <TableHead className="w-24 text-right">Ações</TableHead>}
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
                    {(canWrite || canDelete) && (
                      <TableCell className="text-right whitespace-nowrap">
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
