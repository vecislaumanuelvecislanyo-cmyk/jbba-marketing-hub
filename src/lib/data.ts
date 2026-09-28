import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Generic, RLS-scoped reads. Every table access goes through the browser client so
// Row Level Security decides what each user can see.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = (table: string) => supabase.from(table as any) as any;

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function useTable(table: string, opts: { select?: string; order?: string; ascending?: boolean; enabled?: boolean } = {}) {
  const { select = "*", order = "created_at", ascending = false, enabled = true } = opts;
  return useQuery({
    queryKey: [table, select, order, ascending],
    enabled,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await db(table).select(select).order(order, { ascending }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...tables: string[]) => tables.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
}

export type LookupKey = "employees" | "clients" | "leads" | "campaigns" | "departments" | "proposals";
const LOOKUP: Record<LookupKey, { label: string; order: string }> = {
  employees: { label: "full_name", order: "full_name" },
  clients: { label: "name", order: "name" },
  leads: { label: "title", order: "title" },
  campaigns: { label: "name", order: "name" },
  departments: { label: "name", order: "name" },
  proposals: { label: "title", order: "title" },
};

export function useLookup(key: LookupKey, enabled = true) {
  const cfg = LOOKUP[key];
  const q = useTable(key, { select: `id, ${cfg.label}`, order: cfg.order, ascending: true, enabled });
  const items = (q.data ?? []).map((r) => ({ value: r.id as string, label: r[cfg.label] as string }));
  const byId = Object.fromEntries(items.map((i) => [i.value, i.label])) as Record<string, string>;
  return { items, byId, isLoading: q.isLoading };
}

export function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes("row-level security")) return "Sem permissão para esta operação.";
  if (m.includes("violates foreign key")) return "Registo associado a outros dados; não é possível concluir.";
  return m;
}
