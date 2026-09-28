import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { contractsConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/contratos")({
  head: pageHead("Contratos", "Contratos celebrados."),
  component: () => <EntityPage config={contractsConfig} />,
});
