import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
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
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Neplatný JSON" }), { status: 400 });
  }

  const { messages, systemPrompt, maxTokens = 2048 } = body;

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
      model: "claude-opus-4-5",
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
