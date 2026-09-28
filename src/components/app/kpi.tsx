import type { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function KpiCard({ label, value, hint, icon: Icon, accent }: { label: string; value: string | number; hint?: string; icon: LucideIcon; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4 shadow-card", accent ? "bg-hero text-primary-foreground border-transparent" : "bg-card")}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-xs font-medium uppercase tracking-wide", accent ? "opacity-80" : "text-muted-foreground")}>{label}</span>
        <Icon className={cn("h-4 w-4", accent ? "text-gold" : "text-muted-foreground")} />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", accent ? "opacity-80" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}

export function GoalBar({ label, actual, target, pct, format = (n: number) => String(n) }: { label: string; actual: number; target: number; pct: number; format?: (n: number) => string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", pct >= 100 ? "text-success" : pct < 50 ? "text-destructive" : "text-muted-foreground")}>{format(actual)} / {format(target)} · {Math.round(pct)}%</span>
      </div>
      <Progress value={Math.min(100, pct)} />
    </div>
  );
}
