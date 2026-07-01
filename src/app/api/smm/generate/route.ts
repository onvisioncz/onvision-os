/**
 * AI tvorba SMM obsahu — captiony + hashtagy v brand voice klienta.
 * POST { klient, voice, brief, platform, pocet } → { captions[], hashtags[] }
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
  if (!body?.brief?.trim()) return NextResponse.json({ error: "Chybí zadání." }, { status: 400 });

  const platform = body.platform || "Instagram";
  const pocet = Math.min(Number(body.pocet) || 3, 5);
  const system = `Jsi zkušený social media copywriter české kreativní agentury OnVision. Píšeš pro klienta „${body.klient || "klient"}".

Brand voice klienta:
${body.voice?.trim() || "(neuveden — piš moderně, čistě, bez korporátních frází)"}

Vytvoř ${pocet} variant captionu pro ${platform} k tomuto zadání. Každý caption: poutavý hook, hodnota/příběh, jasná výzva k akci. Přiměřeně emoji. Česky.
Přidej sadu 12–18 relevantních hashtagů.

Vrať POUZE validní JSON: {"captions": ["…", "…"], "hashtags": ["#…", "#…"]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1800, system, messages: [{ role: "user", content: body.brief }] }),
    });
    if (!res.ok) { console.error("[smm/generate]", await res.text()); return NextResponse.json({ error: "Chyba AI." }, { status: 502 }); }
    const data = await res.json();
    const parsed = extractJson(data.content?.[0]?.text ?? "");
    if (!parsed) return NextResponse.json({ error: "AI nevrátila použitelný výstup." }, { status: 502 });
    return NextResponse.json({ captions: parsed.captions ?? [], hashtags: parsed.hashtags ?? [] });
  } catch (e) {
    console.error("[smm/generate]", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
