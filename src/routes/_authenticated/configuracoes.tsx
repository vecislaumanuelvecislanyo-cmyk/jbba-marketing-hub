import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, RequireAccess } from "@/components/app/common";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useInvalidate, useLookup, useTable } from "@/lib/data";
import { pageHead } from "@/lib/head";
import { ROLE_LABELS, ROLE_ORDER, primaryRole, type AppRole } from "@/lib/rbac";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: pageHead("Configurações", "Utilizadores, perfis e permissões."),
  component: () => <RequireAccess access="admin"><Settings /></RequireAccess>,
});

const NONE = "__none__";

function Settings() {
  const me = useMe();
  const profiles = useTable("profiles", { order: "created_at" });
  const roles = useTable("user_roles", { select: "user_id, role" });
  const perms = useTable("permissions", { order: "role", ascending: true });
  const emps = useTable("employees", { select: "id, full_name, user_id", order: "full_name", ascending: true });
  const empLookup = useLookup("employees");
  const inv = useInvalidate();
  const hasSuperAdmin = (roles.data ?? []).some((x) => x.role === "super_admin");

  async function setRole(userId: string, role: AppRole) {
    if (userId === me.userId && role !== me.role) return toast.error("Não pode alterar o seu próprio perfil.");
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) return toast.error(errMsg(del.error));
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (ins.error) return toast.error(errMsg(ins.error));
    toast.success("Perfil atualizado"); inv("user_roles");
  }
  async function linkEmployee(userId: string, empId: string) {
    const prev = (emps.data ?? []).find((e) => e.user_id === userId);
    if (prev) { const r = await supabase.from("employees").update({ user_id: null }).eq("id", prev.id); if (r.error) return toast.error(errMsg(r.error)); }
    if (empId !== NONE) {
      const r = await supabase.from("employees").update({ user_id: userId }).eq("id", empId);
      if (r.error) return toast.error(errMsg(r.error));
    }
    await supabase.from("profiles").update({ employee_id: empId === NONE ? null : empId }).eq("id", userId);
    toast.success("Associação atualizada"); inv("employees", "profiles", "me");
  }

  if (profiles.isLoading || roles.isLoading) return <LoadingState />;
  if (profiles.error) return <ErrorState error={profiles.error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gestão de utilizadores, perfis de acesso e associação a colaboradores." />
      <Panel title="Utilizadores">
        {!profiles.data?.length ? <EmptyState /> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Utilizador</TableHead><TableHead>Perfil</TableHead><TableHead>Colaborador associado</TableHead></TableRow></TableHeader>
            <TableBody>{profiles.data.map((p) => {
              const r = primaryRole((roles.data ?? []).filter((x) => x.user_id === p.id).map((x) => x.role as AppRole));
              const emp = (emps.data ?? []).find((e) => e.user_id === p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell><div className="font-medium">{p.full_name}</div><div className="text-xs text-muted-foreground">{p.email}</div></TableCell>
                  <TableCell>
                    <Select value={r} onValueChange={(v) => setRole(p.id, v as AppRole)}>
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_ORDER.filter((x) => x !== "super_admin" || me.roles.includes("super_admin") || !hasSuperAdmin).map((x) => <SelectItem key={x} value={x}>{ROLE_LABELS[x]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={emp?.id ?? NONE} onValueChange={(v) => linkEmployee(p.id, v)}>
                      <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>— Nenhum —</SelectItem>
                        {empLookup.items.filter((e) => { const row = emps.data?.find((x) => x.id === e.value); return !row?.user_id || row.user_id === p.id; }).map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table></div>
        )}
      </Panel>
      <Panel title="Matriz de permissões">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ROLE_ORDER.map((r) => (
            <div key={r} className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-semibold">{ROLE_LABELS[r]}</div>
              <ul className="space-y-1 text-xs text-muted-foreground">{(perms.data ?? []).filter((p) => p.role === r).map((p) => <li key={p.id}><code>{p.permission}</code></li>)}</ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
