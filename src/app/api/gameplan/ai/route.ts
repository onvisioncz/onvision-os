/**
 * AI návrhy posunů firmy. POST { horizont, brief, existing } → { ideas: [{nazev, popis}] }
 * Auth + rate-limit.
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimitOk, RATE_LIMIT_MSG } from "@/lib/ai-ratelimit";

export const runtime = "nodejs";
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

function extractJson(t: string): Record<string, unknown> | null {
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s < 0 || e < 0) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;
  if (!(await aiRateLimitOk(user.email))) return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI není nakonfigurováno." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const horizont = body?.horizont || "Čtvrtletí";
  const existing: string[] = Array.isArray(body?.existing) ? body.existing : [];

  const system = `Jsi strategický poradce majitelů kreativní agentury OnVision (video/foto produkce, SMM, branding, Brno). Navrhni 4–6 konkrétních POSUNŮ firmy pro horizont „${horizont}" — ne běžné úkoly, ale iniciativy, které firmu posunou (růst, procesy, značka, tým, nabídka, zisk, systém).

${existing.length ? `Už mají rozjeté: ${existing.join("; ")}. Nenavrhuj duplicity, navaž nebo přijď s novým.` : ""}
${body?.brief ? `Kontext/přání majitelů: ${body.brief}` : ""}

Každý posun: úderný název + 1 věta proč/jak. Konkrétně na OnVision, žádné generické fráze. Vrať POUZE validní JSON:
{"ideas": [{"nazev": "…", "popis": "…"}]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1200, system, messages: [{ role: "user", content: `Navrhni posuny pro horizont ${horizont}.` }] }),
    });
    if (!res.ok) { console.error("[gameplan/ai]", await res.text()); return NextResponse.json({ error: "Chyba AI." }, { status: 502 }); }
    const data = await res.json();
    const parsed = extractJson(data.content?.[0]?.text ?? "");
    if (!parsed) return NextResponse.json({ error: "AI nevrátila použitelný výstup." }, { status: 502 });
    return NextResponse.json({ ideas: parsed.ideas ?? [] });
  } catch (e) {
    console.error("[gameplan/ai]", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
