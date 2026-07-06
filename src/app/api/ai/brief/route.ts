/**
 * AI týdenní brief pro jednatele. POST { snapshot } → { brief }
 * Claude dostane kompaktní snímek stavu CRM a napíše ostrý, stručný brief.
 * Auth + rate-limit (fail-open jako ostatní AI endpointy).
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
  // Týdenní brief nad firemními financemi — jen jednatelé (admin).
  if (!(await hasAnyRole(user.email, []))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await aiRateLimitOk(user.email))) return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI není nakonfigurováno. Přidejte ANTHROPIC_API_KEY." }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.snapshot) return NextResponse.json({ error: "Chybí snapshot." }, { status: 400 });

  const today = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

  const system = `Jsi zkušený výkonný poradce, který radí jednatelům malé kreativní agentury OnVision (Adam a Honza). Dnes je ${today}.

Dostaneš JSON snímek reálného stavu jejich CRM. Napiš z něj STRUČNÝ týdenní brief pro jednatele v češtině, tykej. Buď konkrétní, opírej se o čísla ze snímku, nevymýšlej si data.

Struktura (používej přesně tyto nadpisy jako markdown ###):
### Krátce
Jedna věta shrnující, jak firma stojí.
### Co hoří
2 až 4 odrážky s tím nejpalčivějším. Priorita signálů: cashGapVyhled (hrozící díra v hotovosti), rizikoviKlienti (health score, churn), klientiPotichuNaSitich (retainer klient bez postů tento měsíc = tichý odchod), faktury po splatnosti, úkoly po termínu, kolizeDovolenych (někdo je na natáčení/technice během dovolené). Ke každé přidej konkrétní číslo/jméno.
### Rozhodni tento týden
1 až 3 konkrétní rozhodnutí nebo akce, které by měl jednatel udělat.
### Doporučení
Jedna věta, jeden jasný tah, který teď dává největší smysl.

Pravidla: max 180 slov celkem. Žádné pomlčky (—), žádné omáčky, žádné omluvy. Když je snímek klidný, řekni to a pochval. Piš věcně a sebevědomě.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: "Snímek CRM (JSON):\n" + JSON.stringify(body.snapshot) }],
      }),
    });
    if (!res.ok) { console.error("[ai/brief]", await res.text()); return NextResponse.json({ error: "Chyba AI." }, { status: 502 }); }
    const data = await res.json();
    const brief = data.content?.[0]?.text?.trim();
    if (!brief) return NextResponse.json({ error: "AI nevrátila výstup." }, { status: 502 });
    return NextResponse.json({ brief });
  } catch (e) {
    console.error("[ai/brief]", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
