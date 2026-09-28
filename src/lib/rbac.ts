export type AppRole = "admin" | "diretor_geral" | "gestor_marketing" | "promotor" | "visualizador";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  diretor_geral: "Diretor Geral",
  gestor_marketing: "Gestor de Marketing",
  promotor: "Técnico/Promotor",
  visualizador: "Visualizador",
};

export const ROLE_ORDER: AppRole[] = ["admin", "diretor_geral", "gestor_marketing", "promotor", "visualizador"];

export const primaryRole = (roles: AppRole[]): AppRole =>
  ROLE_ORDER.find((r) => roles.includes(r)) ?? "visualizador";

export const isAdmin = (r: AppRole[]) => r.includes("admin");
export const isManager = (r: AppRole[]) =>
  r.some((x) => x === "admin" || x === "diretor_geral" || x === "gestor_marketing");
export const isPromotor = (r: AppRole[]) => r.includes("promotor");
export const canWriteOperational = (r: AppRole[]) => isManager(r) || isPromotor(r);
export const canAudit = (r: AppRole[]) => r.includes("admin") || r.includes("diretor_geral");

export type Access = "all" | "managers" | "audit" | "admin";
export const hasAccess = (roles: AppRole[], access: Access) => {
  switch (access) {
    case "all": return true;
    case "managers": return isManager(roles);
    case "audit": return canAudit(roles);
    case "admin": return isAdmin(roles);
  }
};
