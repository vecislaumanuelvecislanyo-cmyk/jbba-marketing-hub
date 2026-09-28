import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { proposalsConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/propostas")({
  head: pageHead("Propostas", "Propostas comerciais."),
  component: () => <EntityPage config={proposalsConfig} />,
});
