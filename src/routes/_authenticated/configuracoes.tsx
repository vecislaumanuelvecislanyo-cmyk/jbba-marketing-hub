import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, RequireAccess } from "@/components/app/common";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useInvalidate, useLookup, useTable } from "@/lib/data";
import { pageHead } from "@/lib/head";
import { ROLE_LABELS, ROLE_ORDER, primaryRole, type AppRole } from "@/lib/rbac";
import { useMe } from "@/lib/auth";
import { createManagedUser, deleteManagedUser } from "@/lib/admin-users";
import { ExtraPermissionsPanel } from "@/components/app/extra-permissions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: pageHead("Configurações", "Utilizadores, perfis e permissões."),
  component: () => <RequireAccess access="admin"><Settings /></RequireAccess>,
});

const NONE = "__none__";

function Settings() {
  const me = useMe();
  const [toDeleteUser, setToDeleteUser] = useState<{ id: string; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProfile, setNewProfile] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "visualizador" as AppRole,
    employeeId: NONE,
  });
  const profiles = useTable("profiles", { order: "created_at" });
  const roles = useTable("user_roles", { select: "user_id, role" });
  const perms = useTable("permissions", { order: "role", ascending: true });
  const emps = useTable("employees", { select: "id, full_name, user_id", order: "full_name", ascending: true });
  const empLookup = useLookup("employees");
  const inv = useInvalidate();
  const hasSuperAdmin = (roles.data ?? []).some((x) => x.role === "super_admin");

  async function createProfile() {
    if (!newProfile.fullName.trim()) return toast.error("Indique o nome completo.");
    if (!newProfile.email.trim()) return toast.error("Indique o email.");
    if (newProfile.password.length < 8) return toast.error("A palavra-passe deve ter pelo menos 8 caracteres.");
    setCreating(true);
    try {
      await createManagedUser({
        data: {
          fullName: newProfile.fullName.trim(),
          email: newProfile.email.trim(),
          password: newProfile.password,
          role: newProfile.role,
          employeeId: newProfile.employeeId === NONE ? null : newProfile.employeeId,
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      toast.success("Conta criada. Foi enviado um link de validação para o email do utilizador.");
      setCreateOpen(false);
      setNewProfile({ fullName: "", email: "", password: "", role: "visualizador", employeeId: NONE });
      inv("profiles", "user_roles", "employees", "me");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setCreating(false);
    }
  }

  async function setRole(userId: string, role: AppRole) {
    if (userId === me.userId && role !== me.role) return toast.error("Não pode alterar o seu próprio perfil.");
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) return toast.error(errMsg(del.error));
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
    if (ins.error) return toast.error(errMsg(ins.error));
    toast.success("Perfil atualizado"); inv("user_roles");
  }
  async function deleteUserAccount(userId: string) {
    if (!me.roles.includes("super_admin")) return toast.error("Apenas o Super ADM pode apagar contas.");
    if (userId === me.userId) return toast.error("A sua própria conta não pode ser apagada aqui.");
    try {
      await deleteManagedUser({ data: { targetUserId: userId } });
    } catch (error) {
      return toast.error(errMsg(error));
    }
    toast.success("Conta, perfil, funções e acessos apagados.");
    setToDeleteUser(null);
    inv("profiles", "user_roles", "employees", "me");
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
      <PageHeader title="Configurações" description="Gestão de utilizadores, perfis de acesso e associação a colaboradores." actions={<Button onClick={() => setCreateOpen(true)}><Plus />Criar perfil</Button>} />
      <Panel title="Utilizadores">
        {!profiles.data?.length ? <EmptyState /> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Utilizador</TableHead><TableHead>Perfil</TableHead><TableHead>Colaborador associado</TableHead><TableHead className="text-right">Administração</TableHead></TableRow></TableHeader>
            <TableBody>{profiles.data.map((p) => {
              const r = primaryRole((roles.data ?? []).filter((x) => x.user_id === p.id).map((x) => x.role as AppRole));
              const emp = (emps.data ?? []).find((e) => e.user_id === p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell><div className="font-medium">{p.full_name}</div><div className="text-xs text-muted-foreground">{p.email}</div></TableCell>
                  <TableCell>
                    <Select value={r} onValueChange={(v) => setRole(p.id, v as AppRole)}>
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_ORDER.filter((x) => (x !== "super_admin" || me.roles.includes("super_admin") || !hasSuperAdmin) && (x !== "promotor" || me.roles.includes("super_admin"))).map((x) => <SelectItem key={x} value={x}>{ROLE_LABELS[x]}</SelectItem>)}</SelectContent>
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
                  <TableCell className="text-right">{me.roles.includes("super_admin") && p.id !== me.userId && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDeleteUser({ id: p.id, name: p.full_name ?? p.email })}><Trash2 />Apagar conta</Button>}</TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table></div>
        )}
      </Panel>
      {me.roles.includes("super_admin") && <Panel title="Controlo total do Super ADM"><div className="flex items-start gap-3 rounded-lg border p-4"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><div className="font-medium">Super Administrador ativo</div><p className="text-sm text-muted-foreground">Controlo integral de dados, perfis, permissões, estados, eliminações e auditoria.</p></div></div></Panel>}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar perfil de utilizador</DialogTitle>
            <DialogDescription>Crie a conta, atribua o perfil de acesso e associe opcionalmente a um colaborador.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Nome completo</Label><Input value={newProfile.fullName} onChange={(e) => setNewProfile((p) => ({ ...p, fullName: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={newProfile.email} onChange={(e) => setNewProfile((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Palavra-passe inicial</Label><Input type="password" autoComplete="new-password" value={newProfile.password} onChange={(e) => setNewProfile((p) => ({ ...p, password: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Perfil</Label>
              <Select value={newProfile.role} onValueChange={(v) => setNewProfile((p) => ({ ...p, role: v as AppRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_ORDER.filter((x) => (x !== "super_admin" || me.roles.includes("super_admin") || !hasSuperAdmin) && (x !== "promotor" || me.roles.includes("super_admin"))).map((x) => <SelectItem key={x} value={x}>{ROLE_LABELS[x]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Colaborador associado</Label>
              <Select value={newProfile.employeeId} onValueChange={(v) => setNewProfile((p) => ({ ...p, employeeId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>— Nenhum —</SelectItem>{empLookup.items.filter((e) => !(emps.data ?? []).find((x) => x.id === e.value)?.user_id).map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={createProfile} disabled={creating}>{creating ? "A criar…" : "Criar perfil"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!toDeleteUser} onOpenChange={(open) => !open && setToDeleteUser(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apagar conta de utilizador?</AlertDialogTitle><AlertDialogDescription>Esta operação remove a conta de autenticação, perfil, funções e acessos. É irreversível.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => toDeleteUser && deleteUserAccount(toDeleteUser.id)}>Apagar definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {me.roles.includes("super_admin") && <ExtraPermissionsPanel />}
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
