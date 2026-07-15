/**
 * Nedělní příprava AI týdenního briefu pro Adama. Běží neděli 19:00 Prague
 * (vercel.json: "0 17 * * 0" = 17 UTC = 19:00 letní čas). Sesbírá reálný stav
 * (faktury po splatnosti, úkoly, program týdne), nechá Claude napsat brief a
 * uloží ho do ov-weekly-brief. Dashboard ho pak zobrazí rovnou, bez klikání.
 *
 * Spuštění: Vercel cron (CRON_SECRET), nebo přihlášený admin otevře URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { overdueInvoices, type AnyInvoice } from "@/lib/overdue";
import { parseDeadline } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Task { nazev: string; prirazeno: string; status: string; deadline: string }
interface SmmPost { klient: string; datum: string; format?: string }
interface ShootingDay { klient: string; datum: string; lokace?: string }
interface CalEvent { title: string; datum: string; klient?: string }

async function readKey<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T[]> {
  const { data } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  return Array.isArray(data?.value) ? (data!.value as T[]) : [];
}

/** ISO klíč z "2026-07-08" i "8. 7." */
function toISO(raw: string, year: number): string | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const cz = raw.match(/(\d{1,2})\.\s*(\d{1,2})\.?\s*(\d{4})?/);
  if (cz) return `${cz[3] ?? year}-${String(+cz[2]).padStart(2, "0")}-${String(+cz[1]).padStart(2, "0")}`;
  return null;
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
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const invoices = await readKey<AnyInvoice>(sb, "ov-issued-invoices");
  const financeFaktury = await readKey<AnyInvoice>(sb, "ov-finance-faktury");
  const tasks = await readKey<Task>(sb, "ov-ukoly-tasks");
  const posts = await readKey<SmmPost>(sb, "ov-smm-posts");
  const shootings = await readKey<ShootingDay>(sb, "ov-shooting-days");
  const events = await readKey<CalEvent>(sb, "ov-calendar-events");

  // Nadcházející týden (Po–Ne od zítřka, resp. tohoto pondělí+7)
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 7);
  const weekSet = new Set(Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }));
  const inWeek = (raw: string) => { const k = toISO(raw, year); return k ? weekSet.has(k) : false; };

  const overdueAll = overdueInvoices(invoices, financeFaktury);
  const lateTasks = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseDeadline(t.deadline); return d && d < now; });
  const soonTasks = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseDeadline(t.deadline); return d && d >= now && d <= in7; });
  const weekPosts = posts.filter((p) => inWeek(p.datum));
  const weekShoots = shootings.filter((s) => inWeek(s.datum));
  const weekEvents = events.filter((e) => inWeek(e.datum));

  const fmt = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);
  const snapshot = {
    fakturyPoSplatnosti: { pocet: overdueAll.count, castka: overdueAll.total, klienti: overdueAll.items.slice(0, 6).map((i) => `${i.klient} ${fmt(i.castka)}`) },
    ukolyPoTerminu: { pocet: lateTasks.length, seznam: lateTasks.slice(0, 8).map((t) => `${t.nazev} (${t.prirazeno || "?"})`) },
    deadlinyDo7dni: soonTasks.slice(0, 8).map((t) => `${t.nazev} (${t.prirazeno || "?"}, ${t.deadline})`),
    programPristihoTydne: {
      prispevky: weekPosts.length,
      natateni: weekShoots.map((s) => `${s.klient}${s.lokace ? ` · ${s.lokace}` : ""}`),
      schuzky: weekEvents.map((e) => `${e.title}${e.klient ? ` · ${e.klient}` : ""}`),
    },
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });

  const today = now.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  const system = `Jsi zkušený výkonný poradce jednatelů kreativní agentury OnVision (Adam a Honza). Dnes je neděle ${today}, píšeš brief na NADCHÁZEJÍCÍ týden. Tykej, česky, konkrétně, opírej se o čísla ze snímku, nevymýšlej si.

Struktura (přesně tyto markdown nadpisy ###):
### Krátce
Jedna věta, jak firma stojí a co je hlavní téma týdne.
### Program týdne
2 až 4 odrážky: co jde ven (příspěvky), jaká natáčení a schůzky nás čekají.
### Co hoří
2 až 4 odrážky s čísly: faktury po splatnosti, úkoly po termínu.
### Rozhodni tento týden
1 až 3 konkrétní akce pro jednatele.

Max 180 slov. Žádné pomlčky. Když je klid, řekni to a pochval.`;

  let brief: string | null = null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 900, system, messages: [{ role: "user", content: "Snímek CRM (JSON):\n" + JSON.stringify(snapshot) }] }),
    });
    if (res.ok) { const d = await res.json(); brief = d.content?.[0]?.text?.trim() ?? null; }
  } catch { /* ulož aspoň nic; dashboard nabídne ruční generování */ }

  if (!brief) return NextResponse.json({ error: "AI nevrátila výstup." }, { status: 502 });

  await sb.from("app_data").upsert(
    { key: "ov-weekly-brief", value: { brief, generatedAt: now.toISOString() }, updated_at: now.toISOString() },
    { onConflict: "key" }
  );

  return NextResponse.json({ ok: true, chars: brief.length });
}
