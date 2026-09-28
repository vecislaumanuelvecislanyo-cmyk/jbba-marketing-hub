import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/app/common";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: pageHead("Relatórios", "Relatórios diário, semanal, mensal, trimestral e anual."),
  component: () => (
    <div>
      <PageHeader title="Relatórios" description="Relatórios diário, semanal, mensal, trimestral e anual." />
      <Panel><p className="text-sm text-muted-foreground">Área preparada para a próxima entrega. Os dados já estão disponíveis no <Link to="/dashboard" className="text-primary underline">Dashboard</Link>.</p></Panel>
    </div>
  ),
});
