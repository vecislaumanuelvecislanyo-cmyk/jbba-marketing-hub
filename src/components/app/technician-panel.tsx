import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Panel, StatusBadge } from "@/components/app/common";

type Visit = { id: string; scheduled_at: string; status: string; location: string | null; objective: string | null; notes: string | null; outcome: string | null; next_steps: string | null };
type Report = { id: string; title: string; report_date: string; status: string; results: string | null; next_steps: string | null; review_notes: string | null };

const fmt = (s: string) => new Date(s).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });

export function TechnicianPanel({ employeeId }: { employeeId: string | null }) {
  const visits = useQuery({
    queryKey: ["tech-visits", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("visits")
        .select("id, scheduled_at, status, location, objective, notes, outcome, next_steps")
        .eq("employee_id", employeeId!).order("scheduled_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data as Visit[];
    },
  });
  const reports = useQuery({
    queryKey: ["tech-reports", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("field_reports")
        .select("id, title, report_date, status, results, next_steps, review_notes")
        .eq("employee_id", employeeId!).order("report_date", { ascending: false }).limit(5);
      if (error) throw error;
      return data as Report[];
    },
  });

  if (!employeeId) return <Panel title="As minhas visitas"><p className="text-sm text-muted-foreground">A sua conta ainda não está associada a um colaborador. Peça ao SUPER ADM para fazer a associação.</p></Panel>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Visitas atribuídas e notas">
        {visits.isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p>
          : visits.error ? <p className="text-sm text-destructive">Não foi possível carregar as visitas.</p>
          : !visits.data?.length ? <p className="text-sm text-muted-foreground">Sem visitas atribuídas.</p>
          : <ul className="space-y-3">{visits.data.map((v) => (
            <li key={v.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.objective || v.location || "Visita"}</span>
                <StatusBadge value={v.status} />
              </div>
              <p className="text-xs text-muted-foreground">{fmt(v.scheduled_at)}{v.location ? ` · ${v.location}` : ""}</p>
              {v.notes && <p className="mt-2 text-sm"><span className="font-medium">Notas: </span>{v.notes}</p>}
              {v.outcome && <p className="mt-1 text-sm"><span className="font-medium">Resumo: </span>{v.outcome}</p>}
              {v.next_steps && <p className="mt-1 text-sm text-primary"><span className="font-medium">Próximos passos (IA, validados): </span>{v.next_steps}</p>}
            </li>))}</ul>}
        <Link to="/visitas" className="mt-3 inline-block text-sm text-primary underline">Ver todas as visitas</Link>
      </Panel>
      <Panel title="Relatórios digitais">
        {reports.isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p>
          : reports.error ? <p className="text-sm text-destructive">Não foi possível carregar os relatórios.</p>
          : !reports.data?.length ? <p className="text-sm text-muted-foreground">Ainda não preencheu relatórios.</p>
          : <ul className="space-y-3">{reports.data.map((r) => (
            <li key={r.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.title}</span>
                <StatusBadge value={r.status} />
              </div>
              <p className="text-xs text-muted-foreground">{new Date(r.report_date).toLocaleDateString("pt-PT")}</p>
              {r.results && <p className="mt-2 text-sm"><span className="font-medium">Resultados: </span>{r.results}</p>}
              {r.next_steps && <p className="mt-1 text-sm text-primary"><span className="font-medium">Próximos passos: </span>{r.next_steps}</p>}
              {r.review_notes && <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium">Avaliação do SUPER ADM: </span>{r.review_notes}</p>}
            </li>))}</ul>}
        <Link to="/relatorios-campo" className="mt-3 inline-block text-sm text-primary underline">Abrir Relatórios de Campo</Link>
      </Panel>
    </div>
  );
}
