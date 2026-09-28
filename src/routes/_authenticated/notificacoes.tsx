import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/app/common";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useInvalidate, useTable } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: pageHead("Notificações", "Centro de notificações."),
  component: Notifs,
});

function Notifs() {
  const q = useTable("notifications");
  const inv = useInvalidate();
  async function mark(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    if (error) toast.error(errMsg(error)); else inv("notifications");
  }
  const unread = (q.data ?? []).filter((n) => !n.read_at).map((n) => n.id as string);
  return (
    <div>
      <PageHeader title="Notificações" description={`${unread.length} por ler`} actions={<Button variant="outline" onClick={() => mark(unread)} disabled={!unread.length}><CheckCheck />Marcar todas como lidas</Button>} />
      <div className="rounded-xl border bg-card shadow-card">
        {q.isLoading ? <LoadingState /> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : !q.data?.length ? <EmptyState text="Sem notificações." /> : (
          <ul className="divide-y">{q.data.map((n) => (
            <li key={n.id} className={cn("flex items-start justify-between gap-3 p-4", !n.read_at && "bg-gold/5")}>
              <div>
                <div className="flex items-center gap-2 font-medium">{!n.read_at && <span className="h-2 w-2 rounded-full bg-gold" />}{n.title}</div>
                {n.message && <p className="text-sm text-muted-foreground">{n.message}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.created_at, true)}</p>
              </div>
              {!n.read_at && <Button size="sm" variant="ghost" onClick={() => mark([n.id])}>Marcar lida</Button>}
            </li>
          ))}</ul>
        )}
      </div>
    </div>
  );
}
