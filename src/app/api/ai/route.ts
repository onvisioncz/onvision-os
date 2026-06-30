import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimitOk, RATE_LIMIT_MSG } from "@/lib/ai-ratelimit";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (!(await aiRateLimitOk(user.email))) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 });
  }

  // ── API key ──────────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI není nakonfigurováno. Přidejte ANTHROPIC_API_KEY do prostředí." },
      { status: 503 }
    );
  }

  let body: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  const { systemPrompt, userPrompt, maxTokens = 500 } = body;

  if (!userPrompt?.trim()) {
    return NextResponse.json({ error: "Chybí userPrompt" }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: Math.min(maxTokens, 2048),
        system: systemPrompt ?? "Jsi asistent pro českou kreativní agenturu OnVision.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[ai] Anthropic error:", err);
      return NextResponse.json({ error: "Chyba komunikace s AI" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "";

    return NextResponse.json({ content });
  } catch (e) {
    console.error("[ai] Unexpected error:", e);
    return NextResponse.json({ error: "Neočekávaná chyba" }, { status: 500 });
  }
}
