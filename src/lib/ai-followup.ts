import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const inputSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.string().min(1).max(50),
  notes: z.string().max(2000),
  title: z.string().max(255),
  company: z.string().max(255),
  contactName: z.string().max(255),
});

type AiContext = { userId: string; supabase: SupabaseClient };

function env(name: string) {
  return process.env[name] ?? import.meta.env[name] ?? "";
}

const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  if (!token || !url || !key) throw new Error("Sessão inválida.");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) throw new Error("Sessão inválida.");

  const { data: roles, error: roleError } = await client.from("user_roles").select("role").eq("user_id", user.id);
  if (roleError) throw new Error("Não foi possível validar as permissões.");
  const allowed = (roles ?? []).some((row) => ["super_admin", "admin", "diretor_geral", "gestor_marketing", "promotor"].includes(String(row.role)));
  if (!allowed) throw new Error("Sem permissão para utilizar a assistência de IA.");

  return next({ context: { userId: user.id, supabase: client } satisfies AiContext });
});

export const suggestFollowup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const gatewayKey = env("LOVABLE_API_KEY");
    if (!gatewayKey) throw new Error("AI Gateway não está configurado no servidor.");

    const model = "openai/gpt-6-astra";
    const prompt = [
      "És um assistente de vendas da JBBA. Sugere um único próximo follow-up, curto e acionável.",
      "Não inventes factos. Usa apenas a etapa do pipeline e as notas fornecidas.",
      "A sugestão é assistiva e deve ser revista pelo utilizador; não tomes decisões nem alteres dados.",
      "Responde APENAS em JSON válido com as chaves: summary, action, type, priority, dueInDays.",
      "type deve ser um de: chamada, email, reuniao, visita, outro.",
      "priority deve ser um de: baixa, media, alta. dueInDays deve ser um inteiro de 0 a 30.",
      "",
      `Etapa: ${data.stage}`,
      `Lead: ${data.title}`,
      `Empresa: ${data.company || "não indicada"}`,
      `Contacto: ${data.contactName || "não indicado"}`,
      `Notas da interação: ${data.notes || "não foram registadas"}`,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": gatewayKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: "Responde apenas com o JSON solicitado." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI Gateway respondeu com ${response.status}.`);

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("A IA não devolveu uma sugestão.");
    let suggestion: { summary: string; action: string; type: string; priority: string; dueInDays: number };
    try {
      suggestion = JSON.parse(raw);
    } catch {
      throw new Error("A resposta da IA não está num formato válido.");
    }
    if (!suggestion.summary || !suggestion.action || !["chamada", "email", "reuniao", "visita", "outro"].includes(suggestion.type) ||
        !["baixa", "media", "alta"].includes(suggestion.priority) || !Number.isInteger(suggestion.dueInDays)) {
      throw new Error("A IA devolveu uma sugestão incompleta.");
    }

    await context.supabase.from("ai_runs").insert({
      feature: "followup_suggestion",
      model,
      input: data,
      output: suggestion,
      status: "pendente_revisao",
      requested_by: context.userId,
    });

    return suggestion;
  });
