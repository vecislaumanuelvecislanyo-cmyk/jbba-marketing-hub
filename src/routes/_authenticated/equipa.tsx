import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { employeesConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/equipa")({
  head: pageHead("Equipa", "Gestão dos colaboradores de Marketing e Comercial."),
  component: () => <EntityPage config={employeesConfig} />,
});
