import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const inputSchema = z.object({
  visitId: z.string().uuid(),
  notes: z.string().trim().min(5, "Escreva as notas da visita.").max(4000),
  objective: z.string().max(2000),
  client: z.string().max(255),
  location: z.string().max(255),
});

export type VisitSummary = { summary: string; keyPoints: string[]; outcome: string; nextSteps: string[]; risks: string[] };

function env(name: string) {
  return process.env[name] ?? import.meta.env[name] ?? "";
}

const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const token = getRequest().headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  if (!token || !url || !key) throw new Error("Sessão inválida.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error("Sessão inválida.");
  const { data: roles } = await client.from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles ?? []).some((r) => ["super_admin", "admin", "diretor_geral", "gestor_marketing", "promotor"].includes(String(r.role)));
  if (!allowed) throw new Error("Sem permissão para utilizar a assistência de IA.");
  return next({ context: { userId: user.id, supabase: client as SupabaseClient } });
});

export const summarizeVisit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    // RLS: the user must be able to read the visit.
    const { data: visit } = await context.supabase.from("visits").select("id").eq("id", data.visitId).maybeSingle();
    if (!visit) throw new Error("Visita não encontrada ou sem acesso.");

    const gatewayKey = env("LOVABLE_API_KEY");
    if (!gatewayKey) throw new Error("AI Gateway não está configurado no servidor.");
    const model = "openai/gpt-6-astra";
    const prompt = [
      "És um assistente da equipa comercial da JBBA. A partir das notas livres de um técnico sobre uma visita, produz um resumo estruturado.",
      "Não inventes factos; usa apenas as notas. É uma sugestão que será revista por um humano.",
      "Responde APENAS em JSON válido com as chaves: summary (string), keyPoints (array de strings), outcome (string), nextSteps (array de 1 a 5 strings acionáveis), risks (array de strings, pode ser vazio).",
      "Escreve em Português.",
      "",
      `Cliente: ${data.client || "não indicado"}`,
      `Local: ${data.location || "não indicado"}`,
      `Objetivo: ${data.objective || "não indicado"}`,
      `Notas do técnico: ${data.notes}`,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": gatewayKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Responde apenas com o JSON solicitado." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao espaço de trabalho.");
    if (response.status === 429) throw new Error("Muitos pedidos à IA. Tente novamente dentro de instantes.");
    if (!response.ok) throw new Error(`AI Gateway respondeu com ${response.status}.`);

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("A IA não devolveu um resumo.");
    let out: VisitSummary;
    try {
      out = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
    } catch {
      throw new Error("A resposta da IA não está num formato válido.");
    }
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
    const result: VisitSummary = {
      summary: String(out.summary ?? ""), outcome: String(out.outcome ?? ""),
      keyPoints: arr(out.keyPoints), nextSteps: arr(out.nextSteps), risks: arr(out.risks),
    };
    if (!result.summary || result.nextSteps.length === 0) throw new Error("A IA devolveu um resumo incompleto.");

    await context.supabase.from("ai_runs").insert({
      feature: "visit_summary", model, input: data, output: result, status: "pendente_revisao", requested_by: context.userId,
    });
    return result;
  });
