import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { visitsConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: pageHead("Visitas", "Registo e agendamento de visitas."),
  component: () => <EntityPage config={visitsConfig} />,
});
