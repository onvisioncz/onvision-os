/**
 * AI vyplnění call sheetu — z volného textu vytáhne strukturovaná pole.
 *
 * POST { text }  →  { fields: Partial<CallSheet> }
 * Auth: přihlášení + rate-limit (jako ostatní AI routy).
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimitOk, RATE_LIMIT_MSG } from "@/lib/ai-ratelimit";

export const runtime = "nodejs";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const SYSTEM = `Jsi asistent produkce kreativní agentury OnVision. Z volného popisu natáčení vytáhni údaje do call sheetu.

Vrať POUZE validní JSON objekt (nic dalšího, žádný text okolo) s klíči, které umíš z textu odvodit. Neznámé klíče vynech.

Schéma:
- nazev (string) — název natáčení
- klient (string)
- datum (string, formát "D. M. YYYY")
- typ ("VIDEO" | "FOTO" | "VIDEO + FOTO" | "BTS" | "REKLAMA")
- casSrazu (string, např. "8:00")
- konec (string)
- adresa (string)
- sraz (string) — sraz/parkování
- kontaktMisto (string)
- crew (pole { jmeno, role, prichod })
- talent (pole { jmeno, kontakt })
- technika (string) — vlastní technika
- pujcenaTechnika (pole { nazev, odkud, cena, vraceni })
- harmonogram (pole { cas, co })
- shotList (string)
- pocasi (string)
- golden (string) — východ/západ slunce
- planB (string)
- catering (string)
- rekvizity (string)
- dressCode (string)
- doprava (string)
- moodboard (string)
- deadlineVystup (string)
- poznamka (string)

Pravidla: relativní data ("zítra", "v pátek") přelož na konkrétní datum. Jména členů týmu nech tak, jak jsou uvedená. Nic si nevymýšlej — co v textu není, vynech.`;

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;

  if (!(await aiRateLimitOk(user.email))) {
    return NextResponse.json({ error: RATE_LIMIT_MSG }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI není nakonfigurováno." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const text: string = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "Chybí text." }, { status: 400 });

  const today = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: `${SYSTEM}\n\nDnešní datum: ${today}.`,
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!res.ok) {
      console.error("[call-sheet/ai] Anthropic error:", await res.text());
      return NextResponse.json({ error: "Chyba komunikace s AI." }, { status: 502 });
    }
    const data = await res.json();
    const raw = data.content?.[0]?.text ?? "";
    const fields = extractJson(raw);
    if (!fields) return NextResponse.json({ error: "AI nevrátila použitelná data." }, { status: 502 });

    return NextResponse.json({ fields });
  } catch (e) {
    console.error("[call-sheet/ai] chyba:", e);
    return NextResponse.json({ error: "Neočekávaná chyba." }, { status: 500 });
  }
}
