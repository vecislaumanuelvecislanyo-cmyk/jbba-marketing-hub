import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const inputSchema = z.object({
  fullName: z.string().trim().min(2, "Indique o nome completo.").max(100),
  email: z.string().trim().email("Email inválido.").max(255),
  password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres.").max(72),
  role: z.enum(["super_admin", "admin", "diretor_geral", "gestor_marketing", "promotor", "visualizador"]),
  employeeId: z.string().uuid().nullable().optional(),
});



const deleteInputSchema = z.object({
  targetUserId: z.string().uuid(),
});

function env(name: string) {
  return process.env[name] ?? import.meta.env[name] ?? "";
}

const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next, request }) => {
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  const url = env("SUPABASE_URL");
  const publishableKey = env("SUPABASE_PUBLISHABLE_KEY");
  if (!token || !url || !publishableKey) throw new Error("Sessão inválida.");

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) throw new Error("Sessão inválida.");

  const { data: roles, error: roleError } = await client.from("user_roles").select("role").eq("user_id", user.id);
  if (roleError) throw new Error("Não foi possível validar as permissões.");
  const actorRoles = (roles ?? []).map((row) => String(row.role));
  if (!actorRoles.includes("super_admin") && !actorRoles.includes("admin")) {
    throw new Error("Sem permissão para criar perfis.");
  }

  return next({ context: { userId: user.id, actorRoles } });
});

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const url = env("SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SECRET_KEY");
    if (!url || !serviceKey) throw new Error("A chave administrativa do Supabase não está configurada no servidor.");

    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    if (data.role === "super_admin" && !context.actorRoles.includes("super_admin")) {
      const { count, error } = await service.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
      if (error) throw new Error("Não foi possível validar o Super ADM existente.");
      if ((count ?? 0) > 0) throw new Error("Apenas o Super ADM existente pode criar outro Super ADM.");
    }

    if (data.employeeId) {
      const { data: employee, error: employeeError } = await service
        .from("employees")
        .select("id, user_id")
        .eq("id", data.employeeId)
        .maybeSingle();
      if (employeeError) throw new Error("Não foi possível validar o colaborador.");
      if (!employee) throw new Error("Colaborador não encontrado.");
      if (employee.user_id) throw new Error("O colaborador selecionado já está associado a uma conta.");
    }

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? "Não foi possível criar a conta.");

    const userId = created.user.id;

    try {
      const { error: roleDeleteError } = await service.from("user_roles").delete().eq("user_id", userId);
      if (roleDeleteError) throw new Error(roleDeleteError.message);

      const { error: roleInsertError } = await service.from("user_roles").insert({ user_id: userId, role: data.role });
      if (roleInsertError) throw new Error(roleInsertError.message);

      const { error: profileError } = await service.from("profiles").upsert({
        id: userId,
        full_name: data.fullName,
        email: data.email,
        employee_id: data.employeeId ?? null,
      });
      if (profileError) throw new Error(profileError.message);

      if (data.employeeId) {
        const { error: employeeUpdateError } = await service.from("employees").update({ user_id: userId }).eq("id", data.employeeId);
        if (employeeUpdateError) throw new Error(employeeUpdateError.message);
      }
    } catch (error) {
      await service.auth.admin.deleteUser(userId);
      throw error;
    }

    return { userId };
  });


export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(deleteInputSchema)
  .handler(async ({ data, context }) => {
    const url = env("SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SECRET_KEY");
    if (!url || !serviceKey) throw new Error("A chave administrativa do Supabase não está configurada no servidor.");
    if (data.targetUserId === context.userId) throw new Error("A sua própria conta não pode ser apagada aqui.");

    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: targetRoles, error: targetRoleError } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", data.targetUserId);

    if (targetRoleError) throw new Error("Não foi possível validar o perfil da conta.");
    if ((targetRoles ?? []).some((row) => String(row.role) === "super_admin") && !context.actorRoles.includes("super_admin")) {
      throw new Error("Apenas o Super ADM pode apagar uma conta de Super ADM.");
    }

    const { error: employeeError } = await service
      .from("employees")
      .update({ user_id: null })
      .eq("user_id", data.targetUserId);
    if (employeeError) throw new Error(employeeError.message);

    const { error: profileError } = await service.from("profiles").delete().eq("id", data.targetUserId);
    if (profileError) throw new Error(profileError.message);

    const { error: rolesError } = await service.from("user_roles").delete().eq("user_id", data.targetUserId);
    if (rolesError) throw new Error(rolesError.message);

    const { error: authError } = await service.auth.admin.deleteUser(data.targetUserId);
    if (authError) throw new Error(authError.message);

    return { userId: data.targetUserId };
  });
