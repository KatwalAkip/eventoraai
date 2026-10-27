import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function friendlyAiError(status: number): string {
  if (status === 429) return "The AI service is busy right now. Please wait a minute and try again.";
  if (status === 402) return "AI credits are used up for this workspace. Add credits or use the sample plan.";
  if (status === 403) return "AI access is not available for this workspace right now.";
  if (status === 401) return "The AI service is not configured.";
  if (status === 422) return "The AI returned an incomplete answer. Please try again.";
  return "The AI service could not complete the request. Please try again.";
}

/** Stream a structured response and return the validated object. Never retries automatically. */
export async function generateStructured<T>(schema: z.ZodType<T>, prompt: string): Promise<unknown> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AiError("AI is not configured", 401);
  let upstreamStatus = 0;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      if (!res.ok) upstreamStatus = res.status;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions:
      "You are Eventora AI, a careful event-planning assistant. Be specific to the user's inputs, concise, and honest. Never fabricate vendor names, reviews, verified prices or availability.",
    prompt,
    output: Output.object({ schema }),
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return await result.output;
  } catch (err) {
    if (upstreamStatus) throw new AiError("upstream", upstreamStatus);
    if (NoObjectGeneratedError.isInstance(err)) {
      if (err.text) {
        try {
          return JSON.parse(err.text);
        } catch {
          /* fall through */
        }
      }
      throw new AiError("malformed", 422);
    }
    const status =
      typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode: number }).statusCode) : 500;
    throw new AiError("failed", status || 500);
  }
}
