import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/app/common";
import { KpiCard } from "@/components/app/kpi";
import { db, useLookup } from "@/lib/data";
import { fmtDate, fmtMoney, label, stageName } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { Briefcase, FileText, MapPin, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: pageHead("Cliente 360°", "Visão completa do cliente."),
  component: Client360,
});

function useRel(table: string, id: string, order: string) {
  return useQuery({ queryKey: [table, "client", id], queryFn: async () => {
    const { data, error } = await db(table).select("*").eq("client_id", id).order(order, { ascending: false });
    if (error) throw error; return data as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  } });
}

function Client360() {
  const { id } = Route.useParams();
  const emps = useLookup("employees");
  const c = useQuery({ queryKey: ["clients", id], queryFn: async () => {
    const { data, error } = await db("clients").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data;
  } });
  const leads = useRel("leads", id, "created_at"), visits = useRel("visits", id, "scheduled_at"),
    fups = useRel("followups", id, "due_date"), acts = useRel("activities", id, "activity_date"),
    props = useRel("proposals", id, "created_at"), cons = useRel("contracts", id, "created_at");

  if (c.isLoading) return <LoadingState />;
  if (c.error) return <ErrorState error={c.error} />;
  if (!c.data) return <EmptyState text="Cliente não encontrado ou sem permissão de acesso." />;
  const cl = c.data;
  const revenue = (cons.data ?? []).filter((x) => x.status !== "cancelado").reduce((a, x) => a + Number(x.value ?? 0), 0);

  const list = (rows: Record<string, any>[] | undefined, render: (r: Record<string, any>) => React.ReactNode) => // eslint-disable-line @typescript-eslint/no-explicit-any
    !rows ? <LoadingState /> : rows.length === 0 ? <EmptyState /> : <ul className="divide-y">{rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">{render(r)}</li>)}</ul>;

  return (
    <div className="space-y-6">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Clientes</Link>
      <PageHeader title={cl.name} description={[cl.sector, cl.city, cl.nif && `NIF ${cl.nif}`].filter(Boolean).join(" · ")} actions={<><StatusBadge value={cl.status} />{cl.is_demo && <DemoBadge />}</>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard accent label="Receita contratada" value={fmtMoney(revenue)} icon={Briefcase} />
        <KpiCard label="Leads" value={leads.data?.length ?? 0} icon={Target} />
        <KpiCard label="Visitas" value={visits.data?.length ?? 0} icon={MapPin} />
        <KpiCard label="Propostas" value={props.data?.length ?? 0} icon={FileText} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Dados">
          <dl className="space-y-2 text-sm">
            {[["Email", cl.email], ["Telefone", cl.phone], ["Morada", cl.address], ["Gestor de conta", emps.byId[cl.assigned_to]], ["Notas", cl.notes]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel className="lg:col-span-2">
          <Tabs defaultValue="leads">
            <TabsList className="flex-wrap"><TabsTrigger value="leads">Leads</TabsTrigger><TabsTrigger value="visitas">Visitas</TabsTrigger><TabsTrigger value="fups">Follow-ups</TabsTrigger><TabsTrigger value="acts">Atividades</TabsTrigger><TabsTrigger value="props">Propostas</TabsTrigger><TabsTrigger value="cons">Contratos</TabsTrigger></TabsList>
            <TabsContent value="leads">{list(leads.data, (r) => <><span className="font-medium">{r.title}</span><span className="flex gap-2"><StatusBadge value={r.stage} text={stageName(r.stage)} />{fmtMoney(r.estimated_value)}</span></>)}</TabsContent>
            <TabsContent value="visitas">{list(visits.data, (r) => <><span>{fmtDate(r.scheduled_at, true)} · {r.objective ?? "—"}</span><StatusBadge value={r.status} /></>)}</TabsContent>
            <TabsContent value="fups">{list(fups.data, (r) => <><span>{fmtDate(r.due_date)} · {label(r.type)} · {r.notes ?? ""}</span><StatusBadge value={r.status} /></>)}</TabsContent>
            <TabsContent value="acts">{list(acts.data, (r) => <><span>{fmtDate(r.activity_date, true)} · {r.subject}</span><StatusBadge tone="info" text={label(r.type)} /></>)}</TabsContent>
            <TabsContent value="props">{list(props.data, (r) => <><span>{r.title}</span><span className="flex gap-2"><StatusBadge value={r.status} />{fmtMoney(r.value)}</span></>)}</TabsContent>
            <TabsContent value="cons">{list(cons.data, (r) => <><span>{r.title}</span><span className="flex gap-2"><StatusBadge value={r.status} />{fmtMoney(r.value)}</span></>)}</TabsContent>
          </Tabs>
        </Panel>
      </div>
    </div>
  );
}
