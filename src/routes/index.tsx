import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "JBBA Marketing Control & Management" },
      { name: "description", content: "Plataforma de gestão comercial e de marketing da JBBA." },
      { property: "og:title", content: "JBBA Marketing Control & Management" },
      { property: "og:description", content: "Plataforma de gestão comercial e de marketing da JBBA." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
});
