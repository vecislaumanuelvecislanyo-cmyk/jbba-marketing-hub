import { describe, expect, test } from "bun:test";
import {
  canAudit,
  canCreate,
  canDelete,
  canEdit,
  canExportMaps,
  canWriteOperational,
  hasAccess,
  isAdmin,
  isManager,
  primaryRole,
  type AppRole,
} from "../src/lib/rbac";
import { buildMe } from "../src/lib/auth";

const roles = (...items: AppRole[]) => items;

describe("autenticação e perfil", () => {
  test("resolve o perfil principal e os dados da sessão", () => {
    const me = buildMe(
      { id: "00000000-0000-0000-0000-000000000001", email: "admin@jbba.test" },
      roles("super_admin"),
      { full_name: "Super Admin", employee_id: "emp-1" },
      { id: "emp-1" },
    );
    expect(me.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(me.role).toBe("super_admin");
    expect(me.fullName).toBe("Super Admin");
  });
});

describe("RBAC", () => {
  test("super admin tem controlo administrativo total", () => {
    const r = roles("super_admin");
    expect(isAdmin(r)).toBe(true);
    expect(isManager(r)).toBe(true);
    expect(canWriteOperational(r)).toBe(true);
    expect(canAudit(r)).toBe(true);
    expect(hasAccess(r, "admin")).toBe(true);
    expect(hasAccess(r, "audit")).toBe(true);
    expect(primaryRole(r)).toBe("super_admin");
  });

  test("promotor pode criar/editar operação, mas não administrar perfis", () => {
    const r = roles("promotor");
    expect(canCreate(r, "operational")).toBe(true);
    expect(canEdit(r, "operational")).toBe(true);
    expect(canDelete(r, "admin")).toBe(false);
    expect(hasAccess(r, "admin")).toBe(false);
  });

  test("promotora pode operar mas não exportar mapas nem apagar", () => {
    const r = roles("promotor");
    expect(canCreate(r, "operational")).toBe(true);
    expect(canEdit(r, "operational")).toBe(true);
    expect(canExportMaps(r)).toBe(false);
    expect(canDelete(r, "super_admin")).toBe(false);
  });

  test("gestora de marketing pode exportar mapas mas não apagar", () => {
    const r = roles("gestor_marketing");
    expect(canExportMaps(r)).toBe(true);
    expect(canDelete(r, "super_admin")).toBe(false);
  });

  test("super admin pode exportar mapas e apagar", () => {
    const r = roles("super_admin");
    expect(canExportMaps(r)).toBe(true);
    expect(canDelete(r, "super_admin")).toBe(true);
  });

  test("visualizador não pode criar, editar ou eliminar", () => {
    const r = roles("visualizador");
    expect(canCreate(r, "operational")).toBe(false);
    expect(canEdit(r, "operational")).toBe(false);
    expect(canDelete(r, "managers")).toBe(false);
  });
});

describe("operações CRUD prioritárias", () => {
  test("gestores podem criar e editar operações e eliminar registos operacionais", () => {
    const r = roles("gestor_marketing");
    expect(canCreate(r, "operational")).toBe(true);
    expect(canEdit(r, "operational")).toBe(true);
    expect(canDelete(r, "managers")).toBe(true);
  });

  test("apenas administrador pode eliminar pela regra de nível admin", () => {
    expect(canDelete(roles("admin"), "admin")).toBe(true);
    expect(canDelete(roles("diretor_geral"), "admin")).toBe(false);
  });
});
