import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { clientsConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: pageHead("Clientes", "Carteira de clientes."),
  component: () => <EntityPage config={clientsConfig} />,
});
