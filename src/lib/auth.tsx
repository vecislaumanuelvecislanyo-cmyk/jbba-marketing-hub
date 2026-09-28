import { createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { primaryRole, type AppRole } from "./rbac";

export type Me = {
  userId: string;
  email: string;
  fullName: string;
  roles: AppRole[];
  role: AppRole;
  employeeId: string | null;
};

export async function fetchMe(): Promise<Me | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: roles }, { data: profile }, { data: emp }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("full_name, employee_id").eq("id", user.id).maybeSingle(),
    supabase.from("employees").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  const r = (roles ?? []).map((x) => x.role as AppRole);
  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "",
    roles: r,
    role: primaryRole(r),
    employeeId: emp?.id ?? profile?.employee_id ?? null,
  };
}

const Ctx = createContext<Me | null>(null);
export function MeProvider({ me, children }: { me: Me; children: ReactNode }) {
  return <Ctx.Provider value={me}>{children}</Ctx.Provider>;
}
export function useMe() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMe fora de MeProvider");
  return v;
}
