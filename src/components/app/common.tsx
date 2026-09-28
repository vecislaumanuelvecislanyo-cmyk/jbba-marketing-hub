import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { label } from "@/lib/format";
import { useMe } from "@/lib/auth";
import { hasAccess, type Access } from "@/lib/rbac";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-info/10 text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  gold: "bg-gold/20 text-gold-foreground border-gold/40",
};
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  ativo: "success", ativa: "success", realizada: "success", concluido: "success", concluida: "success", aceite: "success", assinado: "success", ganho: "success",
  pendente: "warning", agendada: "info", planeada: "info", enviada: "info", prospeto: "info", negociacao: "gold", proposta: "gold",
  cancelada: "danger", cancelado: "danger", rejeitada: "danger", perdido: "danger", inativo: "neutral", terminado: "neutral", rascunho: "neutral",
  DELETE: "danger", INSERT: "success", UPDATE: "info",
};

export function StatusBadge({ value, text, tone }: { value?: string | null; text?: string; tone?: keyof typeof TONES }) {
  const t = tone ?? STATUS_TONE[value ?? ""] ?? "neutral";
  return <Badge variant="outline" className={cn("font-medium", TONES[t])}>{text ?? label(value)}</Badge>;
}

export function DemoBadge() {
  return <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", TONES.gold)}>Demo</Badge>;
}

export function LoadingState({ text = "A carregar…" }: { text?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{text}</div>;
}
export function EmptyState({ text = "Sem registos.", action }: { text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
      <Inbox className="h-8 w-8 opacity-60" />{text}{action}
    </div>
  );
}
export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" />Erro ao carregar dados: {(error as Error)?.message ?? "desconhecido"}
    </div>
  );
}

export function RequireAccess({ access, children }: { access: Access; children: ReactNode }) {
  const me = useMe();
  if (!hasAccess(me.roles, access)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="max-w-sm text-sm text-muted-foreground">O seu perfil não tem permissão para aceder a esta área.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-card", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
