import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMe } from "@/lib/auth";
import { type AppRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar · JBBA Marketing Control" },
      { name: "description", content: "Acesso seguro à plataforma JBBA Marketing Control & Management." },
      { property: "og:title", content: "Entrar · JBBA Marketing Control" },
      { property: "og:description", content: "Acesso seguro à plataforma JBBA." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  full_name: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginAs, setLoginAs] = useState<"super_admin" | "tecnico" | "ceo">("tecnico");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && nav({ to: "/dashboard" }));
  }, [nav]);

  const roleByLogin: Record<typeof loginAs, AppRole> = {
    super_admin: "super_admin",
    tecnico: "promotor",
    ceo: "diretor_geral",
  };

  async function go(mode: "in" | "up") {
    const p = schema.safeParse({ email, password, full_name: name || undefined });
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("Credenciais inválidas ou email por confirmar.");
      const me = await fetchMe();
      if (!me || !me.roles.includes(roleByLogin[loginAs])) {
        await supabase.auth.signOut();
        setBusy(false);
        return toast.error("A conta autenticada não possui o perfil selecionado.");
      }
      nav({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Conta criada. Verifique o seu email para confirmar o registo.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-12 text-primary-foreground lg:flex">
        <div className="font-display text-xl font-semibold">JBBA <span className="text-gold">Marketing</span></div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Controlo e gestão da equipa comercial, num só lugar.</h1>
          <p className="mt-4 max-w-md opacity-80">Leads, clientes, visitas, metas e desempenho em tempo real.</p>
        </div>
        <p className="text-xs opacity-60">JBBA Prestação de Serviços, Lda. (SU)</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="mb-2 text-2xl font-semibold">Bem-vindo</h2>
          <Tabs defaultValue="in">
            <div className="mb-4 space-y-2">
              <Label>Iniciar sessão com:</Label>
              <div className="grid grid-cols-3 gap-2">
                {([["super_admin", "Super ADM"], ["tecnico", "Técnico"], ["ceo", "CEO"]] as const).map(([value, label]) => (
                  <Button key={value} type="button" variant={loginAs === value ? "default" : "outline"} className="h-9 text-xs" onClick={() => setLoginAs(value)} disabled={busy}>{label}</Button>
                ))}
              </div>
            </div>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="in">Entrar</TabsTrigger><TabsTrigger value="up">Criar conta</TabsTrigger></TabsList>
            {(["in", "up"] as const).map((m) => (
              <TabsContent key={m} value={m}>
                <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); go(m); }}>
                  {m === "up" && <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>}
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Palavra-passe</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button className="w-full" disabled={busy}>{m === "in" ? "Entrar" : "Criar conta"}</Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
          <p className="mt-6 text-xs text-muted-foreground">A opção escolhida é validada contra o perfil real da conta após a autenticação. O perfil não é atribuído apenas pela seleção.</p>
        </div>
      </div>
    </div>
  );
}
