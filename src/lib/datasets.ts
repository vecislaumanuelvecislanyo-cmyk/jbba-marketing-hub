import { useTable } from "./data";

/** All operational datasets visible to the current user (already scoped by RLS). */
export function useDatasets() {
  const leads = useTable("leads");
  const visits = useTable("visits", { order: "scheduled_at" });
  const activities = useTable("activities", { order: "activity_date" });
  const proposals = useTable("proposals");
  const contracts = useTable("contracts");
  const followups = useTable("followups", { order: "due_date", ascending: true });
  const targets = useTable("targets");
  const all = [leads, visits, activities, proposals, contracts, followups, targets];
  return {
    isLoading: all.some((q) => q.isLoading),
    error: all.find((q) => q.error)?.error,
    leads: leads.data ?? [], visits: visits.data ?? [], activities: activities.data ?? [],
    proposals: proposals.data ?? [], contracts: contracts.data ?? [], followups: followups.data ?? [],
    targets: targets.data ?? [],
  };
}

export const today = () => new Date().toISOString().slice(0, 10);

export type Period = "mes" | "30d" | "trimestre" | "ano" | "tudo";
export function periodRange(p: Period): [string, string] {
  const now = new Date();
  const end = today();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  switch (p) {
    case "mes": return [d(new Date(now.getFullYear(), now.getMonth(), 1)), end];
    case "30d": return [d(new Date(Date.now() - 30 * 864e5)), end];
    case "trimestre": return [d(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)), end];
    case "ano": return [d(new Date(now.getFullYear(), 0, 1)), end];
    default: return ["1900-01-01", "2999-12-31"];
  }
}
export const within = (v: string | null | undefined, [s, e]: [string, string]) => !!v && v.slice(0, 10) >= s && v.slice(0, 10) <= e;
