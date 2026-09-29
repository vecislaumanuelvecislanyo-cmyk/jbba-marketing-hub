import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { Progress } from "@/components/ui/progress";
import { targetFields, validateTarget } from "@/lib/entities";
import { fmtDate, fmtMoney, label, opts } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { useDatasets } from "@/lib/datasets";
import { pct, targetActual } from "@/lib/targets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/metas")({
  head: pageHead("Metas", "Metas individuais e de equipa com cálculo de cumprimento."),
  component: MetasPage,
});

function MetasPage() {
  const d = useDatasets();
  return (
    <EntityPage config={{
      table: "targets", title: "Metas", singular: "meta", write: "managers", createLabel: "Adicionar meta",
      description: "O realizado é calculado automaticamente a partir dos registos do período.",
      searchKeys: ["metric"], fields: targetFields, validate: validateTarget,
      filters: [{ key: "status", label: "Estado", options: opts("em_analise", "processando", "pendente", "rejeitado", "aprovado") }, { key: "metric", label: "Indicador", options: opts("leads", "visitas", "reunioes", "propostas", "contratos", "receita") }, { key: "period_type", label: "Periodicidade", options: opts("mensal", "trimestral", "anual") }],
      columns: [
        { key: "employee_id", label: "Colaborador", className: "font-medium", render: (r, l) => r.employee_id ? l.employees[r.employee_id] ?? "—" : "Equipa" },
        { key: "metric", label: "Indicador", render: (r) => label(r.metric) },
        { key: "period_start", label: "Período", render: (r) => `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}` },
        { key: "progress", label: "Cumprimento", className: "min-w-56", render: (r) => {
          const a = targetActual(r, d), t = Number(r.target_value), p = pct(a, t);
          const f = r.metric === "receita" ? fmtMoney : String;
          return (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs"><span>{f(a)} / {f(t)}</span><span className={cn(p >= 100 ? "text-success" : p < 50 ? "text-destructive" : "")}>{Math.round(p)}%</span></div>
              <Progress value={Math.min(100, p)} />
            </div>
          );
        } },
      ],
    }} />
  );
}
