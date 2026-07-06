/**
 * AI dotaz nad daty firmy. POST { question, snapshot } → { answer }
 * Krátká, věcná odpověď opřená o snímek CRM. Auth + rate-limit.
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimitOk, RATE_LIMIT_MSG } from "@/lib/ai-ratelimit";
import { hasAnyRole } from "@/lib/api-auth";

export const runtime = "nodejs";
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;
  // Datový asistent nad firemními čísly (obrat, finance) — jen jednatelé (admin).
  if (!(await hasAnyRole(user.email, []))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await aiRateLimitOk(user.email))) return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI není nakonfigurováno." }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.question?.trim()) return NextResponse.json({ error: "Chybí dotaz." }, { status: 400 });

  const system = `Jsi datový asistent jednatelů kreativní agentury OnVision. Odpovídej v češtině, tykej, KRÁTCE a věcně (ideálně 1 až 3 věty).

Máš k dispozici JSON snímek stavu CRM. Odpovídej POUZE na základě těchto dat. Když odpověď v datech není, řekni upřímně, že to ze snímku nevíš, a nevymýšlej si. Uváděj konkrétní čísla. Žádné pomlčky (—).`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: `Data (JSON):\n${JSON.stringify(body.snapshot ?? {})}\n\nDotaz: ${body.question}` }],
      }),
    });
    if (!res.ok) { console.error("[ai/ask]", await res.text()); return NextResponse.json({ error: "Chyba AI." }, { status: 502 }); }
    const data = await res.json();
    const answer = data.content?.[0]?.text?.trim();
    if (!answer) return NextResponse.json({ error: "AI nevrátila výstup." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch (e) {
    console.error("[ai/ask]", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
