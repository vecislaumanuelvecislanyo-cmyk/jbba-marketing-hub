import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const inputSchema = z.object({
  reportType: z.string().min(1).max(30),
  periodStart: z.string().min(8).max(30),
  periodEnd: z.string().min(8).max(30),
  count: z.number().int().nonnegative(),
  statuses: z.record(z.string(), z.number().int().nonnegative()),
});

function env(name: string) { return process.env[name] ?? import.meta.env[name] ?? ""; }

const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  const url = env("SUPABASE_URL"), key = env("SUPABASE_PUBLISHABLE_KEY");
  if (!token || !url || !key) throw new Error("Sessão inválida.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error("Sessão inválida.");
  const { data: roles } = await client.from("user_roles").select("role").eq("user_id", user.id);
  if (!(roles ?? []).some((r) => ["super_admin","admin","diretor_geral","gestor_marketing"].includes(String(r.role)))) throw new Error("Sem permissão para análise IA.");
  return next({ context: { userId: user.id, supabase: client } satisfies { userId: string; supabase: SupabaseClient } });
});

export const analyzeReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const gatewayKey = env("LOVABLE_API_KEY");
    if (!gatewayKey) throw new Error("AI Gateway não está configurado no servidor.");
    const model = "openai/gpt-6-astra";
    const prompt = [
      "És o analista de gestão da JBBA.",
      "Analisa apenas os dados fornecidos. Não inventes factos.",
      "Responde apenas JSON com summary, attentionPoints e actions.",
      "summary deve ser uma síntese curta. attentionPoints e actions devem ser arrays de strings.",
      "Tipo: " + data.reportType,
      "Período: " + data.periodStart + " a " + data.periodEnd,
      "Total de registos: " + data.count,
      "Estados: " + JSON.stringify(data.statuses),
    ].join("\n");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": gatewayKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({ model, reasoning_effort: "low", messages: [{ role: "system", content: "Responde apenas JSON válido." }, { role: "user", content: prompt }] }),
    });
    if (!response.ok) throw new Error("AI Gateway respondeu com " + response.status + ".");
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("A IA não devolveu análise.");
    let result: { summary: string; attentionPoints: string[]; actions: string[] };
    try { result = JSON.parse(raw); } catch { throw new Error("A análise IA não está num formato válido."); }
    if (!result.summary || !Array.isArray(result.attentionPoints) || !Array.isArray(result.actions)) throw new Error("A análise IA está incompleta.");
    await context.supabase.from("ai_runs").insert({ feature: "report_analysis", model, input: data, output: result, status: "pendente_revisao", requested_by: context.userId });
    return result;
  });
