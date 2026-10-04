export type AppRole = "super_admin" | "admin" | "diretor_geral" | "gestor_marketing" | "promotor" | "visualizador";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  diretor_geral: "Diretor Geral",
  gestor_marketing: "Gestor de Marketing",
  promotor: "Promotor",
  visualizador: "Técnico",
};

export const ROLE_ORDER: AppRole[] = ["super_admin", "admin", "diretor_geral", "gestor_marketing", "promotor", "visualizador"];

export const primaryRole = (roles: AppRole[]): AppRole =>
  ROLE_ORDER.find((r) => roles.includes(r)) ?? "visualizador";

export const isSuperAdmin = (r: AppRole[]) => r.includes("super_admin");
export const isAdmin = (r: AppRole[]) => isSuperAdmin(r) || r.includes("admin");
export const isManager = (r: AppRole[]) =>
  r.some((x) => x === "super_admin" || x === "admin" || x === "diretor_geral" || x === "gestor_marketing");
export const isPromotor = (r: AppRole[]) => r.includes("promotor");
export const canExportMaps = (r: AppRole[]) => isSuperAdmin(r) || r.includes("gestor_marketing");
export const canWriteOperational = (r: AppRole[]) => isManager(r) || isPromotor(r);
export const canAudit = (r: AppRole[]) => isAdmin(r) || r.includes("diretor_geral");

export type Access = "all" | "managers" | "audit" | "admin" | "super_admin";
export const hasAccess = (roles: AppRole[], access: Access) => {
  switch (access) {
    case "all": return true;
    case "managers": return isManager(roles);
    case "audit": return canAudit(roles);
    case "admin": return isAdmin(roles);
    case "super_admin": return isSuperAdmin(roles);
  }
};

export type MutationLevel = "operational" | "managers" | "admin";
export type DeleteLevel = "managers" | "admin" | "super_admin";
export const canCreate = (r: AppRole[], level: MutationLevel) =>
  level === "admin" ? isAdmin(r) : level === "managers" ? isManager(r) : canWriteOperational(r);
export const canEdit = canCreate;
export const canDelete = (r: AppRole[], level: DeleteLevel) =>
  level === "super_admin" ? isSuperAdmin(r) : level === "admin" ? isAdmin(r) : isManager(r);
