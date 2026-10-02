import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/app/common";
import { db, errMsg, useInvalidate, useTable } from "@/lib/data";

export const EXTRA_PERMISSIONS: { value: string; label: string }[] = [
  { value: "leads.read_all", label: "Ver todas as leads" },
  { value: "clients.read_all", label: "Ver todos os clientes" },
  { value: "reports.export", label: "Exportar relatórios" },
  { value: "reports.import", label: "Importar relatórios" },
  { value: "campaigns.write", label: "Gerir campanhas" },
  { value: "proposals.write", label: "Gerir propostas" },
  { value: "targets.read_all", label: "Ver metas da equipa" },
];
const label = (v: string) => EXTRA_PERMISSIONS.find((p) => p.value === v)?.label ?? v;

/** Super ADM only: grant extra per-user permissions (backend enforces via RLS). */
export function ExtraPermissionsPanel() {
  const profiles = useTable("profiles", { select: "id, full_name, email", order: "full_name", ascending: true });
  const roles = useTable("user_roles", { select: "user_id, role" });
  const grants = useTable("user_permissions", { order: "created_at", ascending: false });
  const inv = useInvalidate();
  const [user, setUser] = useState("");
  const [perm, setPerm] = useState("");
  const techs = (profiles.data ?? []).filter((p) => (roles.data ?? []).some((r) => r.user_id === p.id && r.role === "promotor"));
  const name = (id: string) => { const p = (profiles.data ?? []).find((x) => x.id === id); return p?.full_name ?? p?.email ?? "—"; };

  async function add() {
    if (!user || !perm) return toast.error("Escolha o técnico e a permissão.");
    const { error } = await db("user_permissions").insert({ user_id: user, permission: perm });
    if (error) return toast.error(errMsg(error));
    toast.success("Permissão atribuída."); setPerm(""); inv("user_permissions");
  }
  async function remove(id: string) {
    const { error } = await db("user_permissions").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    toast.success("Permissão removida."); inv("user_permissions");
  }

  return (
    <Panel title="Permissões adicionais dos técnicos (só Super ADM)">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select value={user} onValueChange={setUser}><SelectTrigger className="sm:w-64"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent>{techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.email}</SelectItem>)}</SelectContent></Select>
        <Select value={perm} onValueChange={setPerm}><SelectTrigger className="sm:w-64"><SelectValue placeholder="Permissão" /></SelectTrigger>
          <SelectContent>{EXTRA_PERMISSIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
        <Button onClick={add}><Plus />Atribuir</Button>
      </div>
      {(grants.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma permissão adicional atribuída.</p> : (
        <Table><TableHeader><TableRow><TableHead>Técnico</TableHead><TableHead>Permissão</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>{(grants.data ?? []).map((g) => (
            <TableRow key={g.id}><TableCell>{name(g.user_id)}</TableCell><TableCell>{label(g.permission)}</TableCell>
              <TableCell className="text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(g.id)}><Trash2 /></Button></TableCell></TableRow>
          ))}</TableBody></Table>
      )}
    </Panel>
  );
}
