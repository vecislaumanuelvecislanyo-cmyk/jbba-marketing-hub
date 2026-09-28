import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { followupsConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/followups")({
  head: pageHead("Follow-ups", "Acompanhamento de próximos passos."),
  component: () => <EntityPage config={followupsConfig} />,
});
