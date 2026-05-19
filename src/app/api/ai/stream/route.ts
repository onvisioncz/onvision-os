import { getUserFromRequest, EDGE_UNAUTHORIZED } from "@/lib/supabase/edge";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Model pricing guide (per 1M tokens, input/output):
//   haiku-3-5:  $0.80 / $4   — ⚡ fast, cheap, great for captions/briefs (~$0.60/month)
//   sonnet-4-5: $3    / $15  — ✨ balanced, better quality (~$8/month)
const MODELS = {
  haiku:  "claude-haiku-3-5",
  sonnet: "claude-sonnet-4-5",
} as const;

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const user = await getUserFromRequest(req);
  if (!user) return EDGE_UNAUTHORIZED;

  // ── API key ──────────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI není nakonfigurováno. Přidejte ANTHROPIC_API_KEY." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    messages: { role: "user" | "assistant"; content: string }[];
    systemPrompt?: string;
    maxTokens?: number;
    model?: keyof typeof MODELS;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Neplatný JSON" }), { status: 400 });
  }

  const { messages, systemPrompt, maxTokens = 2048, model = "sonnet" } = body;

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Chybí messages" }), { status: 400 });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: (model && model in MODELS) ? MODELS[model as keyof typeof MODELS] : MODELS.sonnet,
      max_tokens: Math.min(maxTokens, 4096),
      stream: true,
      system: systemPrompt ?? "Jsi asistent kreativní agentury OnVision.",
      messages,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error("[ai/stream] Anthropic error:", err);
    return new Response(JSON.stringify({ error: "Chyba komunikace s AI" }), { status: 502 });
  }

  // Pass the SSE stream straight through
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
