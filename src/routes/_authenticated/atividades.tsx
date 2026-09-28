import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { activitiesConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: pageHead("Atividades", "Registo de interações comerciais."),
  component: () => <EntityPage config={activitiesConfig} />,
});
