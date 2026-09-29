import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityPage } from "@/components/app/entity-page";
import { type EntityConfig } from "@/components/app/entity-page";
import { useTable } from "@/lib/data";
import { analyzeReport } from "@/lib/ai-report";
import { pageHead } from "@/lib/head";
import { useMe } from "@/lib/auth";
import { isManager } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";

const reportsConfig: EntityConfig = {
  table: "reports",
  title: "Relatórios",
  singular: "relatório",
  description: "Relatórios operacionais com importação, exportação, análise IA e controlo administrativo.",
  searchKeys: ["report_type"],
  dateField: "period_start",
  importable: true,
  deleteBy: "admin",
  filters: [{ key: "report_type", label: "Tipo", options: [
    { value: "diario", label: "Diário" }, { value: "semanal", label: "Semanal" },
    { value: "mensal", label: "Mensal" }, { value: "trimestral", label: "Trimestral" }, { value: "anual", label: "Anual" },
  ] }],
  fields: [
    { name: "report_type", label: "Tipo de relatório", type: "select", options: [
      { value: "diario", label: "Diário" }, { value: "semanal", label: "Semanal" }, { value: "mensal", label: "Mensal" }, { value: "trimestral", label: "Trimestral" }, { value: "anual", label: "Anual" },
    ], required: true, defaultValue: "mensal" },
    { name: "period_start", label: "Início", type: "date", required: true },
    { name: "period_end", label: "Fim", type: "date", required: true },
  ],
  columns: [
    { key: "report_type", label: "Tipo", render: (r) => String(r.report_type) },
    { key: "period_start", label: "Período", render: (r) => fmtDate(r.period_start) + " – " + fmtDate(r.period_end) },

  ],
};

function AiReportButton() {
  const me = useMe();
  const q = useTable("reports", { order: "period_start" });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string; attentionPoints: string[]; actions: string[] } | null>(null);
  const data = useMemo(() => q.data ?? [], [q.data]);

  async function run() {
    if (!data.length) return toast.error("Não existem relatórios para analisar.");
    setBusy(true);
    try {
      const first = data[0], last = data[data.length - 1];
      const statuses = data.reduce<Record<string, number>>((acc, row) => { const key = String(row.report_type ?? "outro"); acc[key] = (acc[key] ?? 0) + 1; return acc; }, {});
      const response = await analyzeReport({ data: {
        reportType: "Consolidação de relatórios",
        periodStart: String(first.period_start),
        periodEnd: String(last.period_end),
        count: data.length,
        statuses,
      } });
      setResult(response);
      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível analisar.");
    } finally { setBusy(false); }
  }

  if (!isManager(me.roles)) return null;

  return <>
    <Button variant="outline" onClick={run} disabled={busy}><BrainCircuit />{busy ? "A analisar…" : "Analisar IA"}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Análise IA dos relatórios</DialogTitle><DialogDescription>Resultado assistivo para revisão da gestão.</DialogDescription></DialogHeader>{result && <div className="space-y-5"><div className="rounded-xl border p-4"><div className="text-sm font-semibold">Síntese</div><p className="mt-2 text-sm text-muted-foreground">{result.summary}</p></div><div className="grid gap-4 md:grid-cols-2"><div><div className="text-sm font-semibold">Pontos de atenção</div><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{result.attentionPoints.map((x) => <li key={x}>{x}</li>)}</ul></div><div><div className="text-sm font-semibold">Ações sugeridas</div><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{result.actions.map((x) => <li key={x}>{x}</li>)}</ul></div></div></div>}</DialogContent></Dialog>
  </>;
}

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: pageHead("Relatórios", "Relatórios diário, semanal, mensal, trimestral e anual."),
  component: () => <EntityPage config={{ ...reportsConfig, headerExtra: <AiReportButton /> }} />,
});
