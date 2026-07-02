/**
 * AI návrh odpovědi klientovi. POST { comment, context } → { reply }
 * Zdvořilá, věcná odpověď v češtině na komentář/námitku klienta. Auth + rate-limit.
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimitOk, RATE_LIMIT_MSG } from "@/lib/ai-ratelimit";

export const runtime = "nodejs";
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;
  if (!(await aiRateLimitOk(user.email))) return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI není nakonfigurováno." }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.comment?.trim()) return NextResponse.json({ error: "Chybí komentář." }, { status: 400 });

  const system = `Jsi za kreativní agenturu OnVision a píšeš odpověď klientovi na jeho komentář nebo námitku. Piš v češtině, vykej klientovi, profesionálně, vstřícně a věcně. Drž se faktů z kontextu, nic neslibuj navíc.

Napiš POUZE tělo odpovědi (2 až 5 vět), bez oslovení typu "Dobrý den" a bez podpisu, připravené k vložení. Žádné pomlčky (—).`;

  const userMsg = `Kontext (o co jde): ${body.context || "neuvedeno"}\n\nKomentář klienta: "${body.comment}"\n\nNavrhni odpověď.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 500, system, messages: [{ role: "user", content: userMsg }] }),
    });
    if (!res.ok) { console.error("[ai/reply]", await res.text()); return NextResponse.json({ error: "Chyba AI." }, { status: 502 }); }
    const data = await res.json();
    const reply = data.content?.[0]?.text?.trim();
    if (!reply) return NextResponse.json({ error: "AI nevrátila výstup." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[ai/reply]", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
