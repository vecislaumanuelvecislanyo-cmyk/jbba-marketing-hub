import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMe, MeProvider } from "@/lib/auth";
import { NAV } from "@/lib/nav";
import { hasAccess, ROLE_LABELS } from "@/lib/rbac";
import { LoadingState } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)).count ?? 0,
  });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_OUT") nav({ to: "/auth", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (me.isLoading) return <LoadingState text="A preparar o seu espaço…" />;
  if (!me.data) return <LoadingState text="Sessão inválida." />;
  const m = me.data;
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <MeProvider me={m}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="icon">
            <SidebarHeader className="px-4 py-4">
              <div className="font-display text-lg font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">JBBA <span className="text-sidebar-primary">Marketing</span></div>
            </SidebarHeader>
            <SidebarContent>
              {groups.map((g) => {
                const items = NAV.filter((n) => n.group === g && hasAccess(m.roles, n.access));
                if (!items.length) return null;
                return (
                  <SidebarGroup key={g}>
                    <SidebarGroupLabel>{g}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map((i) => (
                          <SidebarMenuItem key={i.url}>
                            <SidebarMenuButton asChild isActive={path.startsWith(i.url)} tooltip={i.title}>
                              <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })}
            </SidebarContent>
            <SidebarFooter className="group-data-[collapsible=icon]:hidden">
              <div className="px-2 text-xs text-sidebar-foreground/70">
                <div className="truncate font-medium text-sidebar-accent-foreground">{m.fullName}</div>
                <div>{ROLE_LABELS[m.role]}</div>
              </div>
            </SidebarFooter>
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur">
              <SidebarTrigger />
              <div className="flex-1" />
              <Button asChild variant="ghost" size="icon" aria-label="Notificações" className="relative">
                <Link to="/notificacoes"><Bell />{!!unread.data && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />}</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut />Sair</Button>
            </header>
            <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8"><Outlet /></main>
          </div>
        </div>
      </SidebarProvider>
    </MeProvider>
  );
}
