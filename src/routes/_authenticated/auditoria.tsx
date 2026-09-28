import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, RequireAccess, StatusBadge } from "@/components/app/common";
import { supabase } from "@/integrations/supabase/client";
import { useTable } from "@/lib/data";
import { fmtDate, label } from "@/lib/format";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: pageHead("Auditoria", "Registo imutável de operações críticas."),
  component: () => <RequireAccess access="audit"><Audit /></RequireAccess>,
});

const TABLES = ["leads", "clients", "employees", "visits", "followups", "activities", "targets", "proposals", "contracts", "campaigns", "user_roles"];

function Audit() {
  const [table, setTable] = useState("all");
  const [action, setAction] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const profiles = useTable("profiles", { select: "id, full_name, email" });
  const names = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p.full_name ?? p.email]));
  const q = useQuery({
    queryKey: ["audit_logs", table, action],
    queryFn: async () => {
      let r = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
      if (table !== "all") r = r.eq("table_name", table);
      if (action !== "all") r = r.eq("action", action);
      const { data, error } = await r; if (error) throw error; return data;
    },
  });

  const diff = (o: Record<string, unknown> | null, n: Record<string, unknown> | null) => {
    const keys = [...new Set([...Object.keys(o ?? {}), ...Object.keys(n ?? {})])].filter((k) => !["updated_at", "updated_by"].includes(k));
    return keys.filter((k) => JSON.stringify(o?.[k]) !== JSON.stringify(n?.[k]));
  };

  return (
    <div>
      <PageHeader title="Audit Trail" description="Registos gerados automaticamente pela base de dados. Não podem ser alterados nem apagados." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select value={table} onValueChange={setTable}><SelectTrigger className="bg-card sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as entidades</SelectItem>{TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Select value={action} onValueChange={setAction}><SelectTrigger className="bg-card sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as ações</SelectItem>{["INSERT", "UPDATE", "DELETE"].map((a) => <SelectItem key={a} value={a}>{label(a)}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {q.isLoading ? <LoadingState /> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : !q.data?.length ? <EmptyState /> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead className="w-8" /><TableHead>Data</TableHead><TableHead>Entidade</TableHead><TableHead>Ação</TableHead><TableHead>Utilizador</TableHead><TableHead>Campos</TableHead></TableRow></TableHeader>
            <TableBody>{q.data.map((r) => {
              const o = r.old_data as Record<string, unknown> | null, n = r.new_data as Record<string, unknown> | null;
              const changed = r.action === "UPDATE" ? diff(o, n) : [];
              return (
                <Fragment key={r.id}>
                  <TableRow className="cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <TableCell>{open === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.created_at, true)}</TableCell>
                    <TableCell>{r.table_name}</TableCell>
                    <TableCell><StatusBadge value={r.action} /></TableCell>
                    <TableCell>{r.changed_by ? names[r.changed_by] ?? r.changed_by.slice(0, 8) : "Sistema"}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{changed.join(", ") || "—"}</TableCell>
                  </TableRow>
                  {open === r.id && (
                    <TableRow><TableCell colSpan={6} className="bg-muted/40">
                      <div className="grid gap-3 md:grid-cols-2">
                        <pre className="max-h-72 overflow-auto rounded bg-card p-3 text-xs">{o ? JSON.stringify(o, null, 2) : "—"}</pre>
                        <pre className="max-h-72 overflow-auto rounded bg-card p-3 text-xs">{n ? JSON.stringify(n, null, 2) : "—"}</pre>
                      </div>
                    </TableCell></TableRow>
                  )}
                </Fragment>
              );
            })}</TableBody>
          </Table></div>
        )}
      </div>
    </div>
  );
}
