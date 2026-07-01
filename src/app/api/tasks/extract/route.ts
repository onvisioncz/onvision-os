/**
 * Zápis z porady → úkoly. POST { text } → { tasks: [{nazev, prirazeno, deadline}] }
 * Auth + rate-limit.
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimitOk, RATE_LIMIT_MSG } from "@/lib/ai-ratelimit";
import { DEFAULT_USERS } from "@/lib/roles";

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
  if (!body?.text?.trim()) return NextResponse.json({ error: "Chybí text." }, { status: 400 });

  const team = DEFAULT_USERS.filter((u) => u.aktivni).map((u) => u.displayName).join(", ");
  const today = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

  const system = `Jsi asistent, který ze zápisu z porady vytáhne konkrétní úkoly (action items).

Tým: ${team}. Dnes je ${today}.

Pro každý úkol urči:
- nazev: stručný, akční (např. "Natočit promo pro Firestu")
- prirazeno: jméno člena týmu, pokud je v textu zmíněný, jinak ""
- deadline: termín ve formátu "D. M." pokud je zmíněný (relativní přelož na datum), jinak ""

Ignoruj obecné poznámky, ber jen reálné úkoly. Vrať POUZE validní JSON:
{"tasks": [{"nazev": "…", "prirazeno": "…", "deadline": "…"}]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1500, system, messages: [{ role: "user", content: body.text }] }),
    });
    if (!res.ok) { console.error("[tasks/extract]", await res.text()); return NextResponse.json({ error: "Chyba AI." }, { status: 502 }); }
    const data = await res.json();
    const parsed = extractJson(data.content?.[0]?.text ?? "");
    if (!parsed) return NextResponse.json({ error: "AI nevrátila použitelný výstup." }, { status: 502 });
    return NextResponse.json({ tasks: parsed.tasks ?? [] });
  } catch (e) {
    console.error("[tasks/extract]", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
