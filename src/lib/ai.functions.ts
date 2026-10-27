import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AiError, friendlyAiError, generateStructured } from "./ai.server";
import { buildDemoPlan, eventPlanSchema, parsePlan, planPrompt, type EventPlan } from "./plan-schema";
import { ideasPrompt, ideasResponseSchema, parseIdeas, sampleIdeas, type Idea } from "./ideas";

const HOURLY_LIMIT = 20;

export type AiResult<T> =
  | { ok: true; data: T; source: "ai" | "demo" }
  | { ok: false; error: string; status: number };

async function underRateLimit(
  supabase: { from: (t: "ai_usage") => any },
  userId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) return false;
  await supabase.from("ai_usage").insert({ user_id: userId });
  return true;
}

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid(), mode: z.enum(["ai", "demo"]) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<AiResult<EventPlan>> => {
    const { supabase, userId } = context;
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error || !event) return { ok: false, error: "Event not found.", status: 404 };
    if (data.mode === "demo") return { ok: true, data: buildDemoPlan(event), source: "demo" };
    if (!process.env["LOVABLE_API_KEY"])
      return { ok: false, error: "Live AI is not configured. Use the sample plan instead.", status: 401 };
    if (!(await underRateLimit(supabase, userId)))
      return { ok: false, error: `You've reached ${HOURLY_LIMIT} AI generations this hour. Try again later.`, status: 429 };
    try {
      const raw = await generateStructured(eventPlanSchema, planPrompt(event));
      return { ok: true, data: parsePlan(raw), source: "ai" };
    } catch (err) {
      const status = err instanceof AiError ? err.status : 422;
      console.error("generatePlan failed", status);
      return { ok: false, error: friendlyAiError(status), status };
    }
  });

const ideaInput = z.object({
  eventType: z.string().max(30),
  focus: z.string().max(30),
  budget: z.enum(["low", "medium", "high"]),
  audience: z.string().max(120),
  theme: z.string().max(120),
  location: z.string().max(120),
  ecoOnly: z.boolean(),
  mode: z.enum(["ai", "demo"]),
});

export const generateIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ideaInput.parse(input))
  .handler(async ({ data, context }): Promise<AiResult<Idea[]>> => {
    if (data.mode === "demo") return { ok: true, data: sampleIdeas(data), source: "demo" };
    if (!process.env["LOVABLE_API_KEY"])
      return { ok: false, error: "Live AI is not configured. Showing sample ideas is available.", status: 401 };
    if (!(await underRateLimit(context.supabase, context.userId)))
      return { ok: false, error: `You've reached ${HOURLY_LIMIT} AI generations this hour. Try again later.`, status: 429 };
    try {
      const raw = await generateStructured(ideasResponseSchema, ideasPrompt(data));
      return { ok: true, data: parseIdeas(raw), source: "ai" };
    } catch (err) {
      const status = err instanceof AiError ? err.status : 422;
      return { ok: false, error: friendlyAiError(status), status };
    }
  });
