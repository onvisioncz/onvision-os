/**
 * Měsíční byznys přehled pro jednatele (Adam + Honza). Běží 1. v měsíci 7:30
 * Prague (vercel.json: "30 5 1 * *" = 5:30 UTC = 7:30 letní čas). Sesbírá reálný
 * stav za PŘEDCHOZÍ měsíc — obrat vs cíl, pohyb MRR, pipeline forecast,
 * dokončené jednorázovky, pohledávky — nechá Claude napsat strategický přehled
 * a uloží ho do ov-monthly-review. Stránka /growth ho zobrazí rovnou.
 *
 * Spuštění: Vercel cron (CRON_SECRET), nebo přihlášený admin otevře URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { overdueInvoices, type AnyInvoice } from "@/lib/overdue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CZ_MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

interface Income { mesic: string; klient: string; typ: string; castka: number; stav: string }
interface Retainer { klient?: string; nazev?: string; pausal: number; reklama?: number; aktivni: boolean }
interface Deal { klient: string; faze: string; hodnota: number; pravdepodobnost: number }
interface Oneoff { title: string; klient: string; column: string; castka: number }
interface Cil { obrat: number; zisk: number; marze: number; vystupy: number }
interface MrrSnap { date: string; mrr: number; klientu: number }

async function readVal<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T | null> {
  const { data } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? null) as T | null;
}
async function readArr<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T[]> {
  const v = await readVal<T[]>(sb, key);
  return Array.isArray(v) ? v : [];
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  let authed = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!authed) {
    try {
      const cookieSb = await createClient();
      const { data: { user } } = await cookieSb.auth.getUser();
      authed = !!(user?.email && identityFromEmail(user.email)?.isAdmin);
    } catch { /* ignore */ }
  }
  if (!authed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = createAdminClient();
  const now = new Date();
  const year = now.getFullYear();
  const prevMonthIdx = (now.getMonth() + 11) % 12;      // předchozí měsíc
  const prevMonthName = CZ_MONTHS[prevMonthIdx];
  const prevYear = now.getMonth() === 0 ? year - 1 : year;

  const [incomes, retainers, deals, oneoffs, issued, faktury, cileMap, mrrHist] = await Promise.all([
    readArr<Income>(sb, "ov-finance-incomes"),
    readArr<Retainer>(sb, "ov-monthly-clients"),
    readArr<Deal>(sb, "ov-pipeline-deals"),
    readArr<Oneoff>(sb, "ov-oneoffs-projects"),
    readArr<AnyInvoice>(sb, "ov-issued-invoices"),
    readArr<AnyInvoice>(sb, "ov-finance-faktury"),
    readVal<Record<string, Cil>>(sb, "ov-cile"),
    readArr<MrrSnap>(sb, "ov-mrr-history"),
  ]);

  // ── Obrat za předchozí měsíc (podle názvu měsíce) ──
  const monthIncomes = incomes.filter((i) => i.mesic === prevMonthName);
  const obratMesic = monthIncomes.filter((i) => i.stav === "Zaplaceno").reduce((s, i) => s + (i.castka || 0), 0);
  const cekaMesic = monthIncomes.filter((i) => i.stav !== "Zaplaceno").reduce((s, i) => s + (i.castka || 0), 0);
  const obratByTyp: Record<string, number> = {};
  monthIncomes.forEach((i) => { obratByTyp[i.typ || "Ostatní"] = (obratByTyp[i.typ || "Ostatní"] || 0) + (i.castka || 0); });

  // ── Roční cíl + YTD plnění ──
  const cil = cileMap?.[String(year)] ?? null;
  const ytdZaplaceno = incomes.filter((i) => i.stav === "Zaplaceno").reduce((s, i) => s + (i.castka || 0), 0);

  // ── MRR teď + pohyb za ~30 dní ──
  const activeRetainers = retainers.filter((r) => r.aktivni);
  const mrrNow = activeRetainers.reduce((s, r) => s + (r.pausal || 0) + (r.reklama || 0), 0);
  const sorted = [...mrrHist].sort((a, b) => a.date.localeCompare(b.date));
  const monthAgoTs = now.getTime() - 30 * 86400000;
  const past = [...sorted].reverse().find((s) => new Date(s.date).getTime() <= monthAgoTs) ?? sorted[0] ?? null;
  const mrrDelta = past ? mrrNow - past.mrr : 0;

  // ── Pipeline: otevřené dealy vážený forecast ──
  const closedFazes = new Set(["Dokončeno", "Prohráno", "Zrušeno"]);
  const openDeals = deals.filter((d) => !closedFazes.has(d.faze));
  const weightedForecast = openDeals.reduce((s, d) => s + (d.hodnota || 0) * (d.pravdepodobnost || 0) / 100, 0);
  const hotDeals = openDeals.filter((d) => (d.pravdepodobnost || 0) >= 70).sort((a, b) => b.hodnota - a.hodnota);

  // ── Dokončené jednorázovky ──
  const doneOneoffs = oneoffs.filter((o) => o.column === "dokonceno");
  const oneoffValue = doneOneoffs.reduce((s, o) => s + (o.castka || 0), 0);

  // ── Pohledávky (po splatnosti) ──
  const overdue = overdueInvoices(issued, faktury);

  const fmt = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);

  const snapshot = {
    obdobi: `${prevMonthName} ${prevYear}`,
    obratMinulyMesic: { zaplaceno: obratMesic, cekaNaPlatbu: cekaMesic, podleTypu: Object.fromEntries(Object.entries(obratByTyp).map(([k, v]) => [k, fmt(v)])) },
    rocniCil: cil ? { obrat: cil.obrat, ytdZaplaceno, plneniProcent: cil.obrat > 0 ? Math.round((ytdZaplaceno / cil.obrat) * 100) : null } : null,
    mrr: { nyni: mrrNow, pred30dny: past?.mrr ?? null, zmena: mrrDelta, aktivnichKlientu: activeRetainers.length },
    pipeline: { otevrenychDealu: openDeals.length, vazenyForecast: Math.round(weightedForecast), horkeDealy: hotDeals.slice(0, 5).map((d) => `${d.klient} ${fmt(d.hodnota)} (${d.pravdepodobnost}%)`) },
    jednorazovkyDokonceno: { pocet: doneOneoffs.length, hodnota: oneoffValue },
    pohledavkyPoSplatnosti: { pocet: overdue.count, castka: overdue.total },
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });

  const system = `Jsi zkušený finanční a byznys poradce jednatelů kreativní agentury OnVision (Adam a Honza). Píšeš MĚSÍČNÍ přehled za období ${prevMonthName} ${prevYear}. Tykej, česky, věcně a strategicky. Opírej se výhradně o čísla ze snímku, nic si nevymýšlej. Pokud data chybí (nula), řekni to na rovinu.

Struktura (přesně tyto markdown nadpisy ###):
### Výsledek měsíce
2 až 3 věty: obrat, jak to sedí k ročnímu cíli, hlavní zdroj příjmů.
### MRR a klienti
1 až 3 odrážky: kolik děláme na paušálech, pohyb za měsíc, počet aktivních klientů.
### Pipeline a výhled
1 až 3 odrážky: vážený forecast, nejžhavější rozjednané zakázky.
### Na co si dát pozor
1 až 3 odrážky: pohledávky po splatnosti, rizika.
### Priority na tento měsíc
2 až 3 konkrétní strategické kroky pro jednatele.

Max 260 slov. Žádné pomlčky mezi slovy. Buď konkrétní a používej částky.`;

  let review: string | null = null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1200, system, messages: [{ role: "user", content: "Snímek CRM (JSON):\n" + JSON.stringify(snapshot) }] }),
    });
    if (res.ok) { const d = await res.json(); review = d.content?.[0]?.text?.trim() ?? null; }
  } catch { /* ulož aspoň nic; stránka nabídne ruční generování */ }

  if (!review) return NextResponse.json({ error: "AI nevrátila výstup." }, { status: 502 });

  await sb.from("app_data").upsert(
    { key: "ov-monthly-review", value: { review, generatedAt: now.toISOString(), obdobi: `${prevMonthName} ${prevYear}`, snapshot }, updated_at: now.toISOString() },
    { onConflict: "key" }
  );

  return NextResponse.json({ ok: true, chars: review.length, obdobi: `${prevMonthName} ${prevYear}` });
}
