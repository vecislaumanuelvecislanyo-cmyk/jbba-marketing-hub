import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { VisitAiButton } from "@/components/app/visit-ai";
import { visitsConfig } from "@/lib/entities";
import { useLookup } from "@/lib/data";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: pageHead("Visitas", "Registo e agendamento de visitas."),
  component: VisitsPage,
});

function VisitsPage() {
  const clients = useLookup("clients");
  const name = (id: string) => clients.items.find((c) => c.value === id)?.label ?? "";
  return <EntityPage config={{ ...visitsConfig, rowActions: (r) => <VisitAiButton row={r} clientName={name(r.client_id)} /> }} />;
}
