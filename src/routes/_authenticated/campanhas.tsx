import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/app/entity-page";
import { campaignsConfig } from "@/lib/entities";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/campanhas")({
  head: pageHead("Campanhas", "Gestão de campanhas de marketing."),
  component: () => <EntityPage config={campaignsConfig} />,
});
