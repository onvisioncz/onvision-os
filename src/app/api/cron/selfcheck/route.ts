/**
 * Self-check — noční autoimunita systému (běží denně, viz vercel.json).
 *
 * Projde vlastní data a hledá anomálie, které by jinak tiše kazily čísla:
 *  - faktury s neexistujícím / nečitelným datem splatnosti (viz "31.6.2026")
 *  - duplicitní čísla faktur napříč oběma sklady
 *  - úkoly s nečitelným termínem
 *  - kolize rezervací techniky
 *  - aktivní měsíční klienti bez fakturační řady (nejde jim vystavit faktura)
 *  - záporné / nečíselné částky
 *
 * Nálezy pošle do Upozornění (broadcast) — ale JEN když se změnily oproti
 * minulému běhu (hash), takže nespamuje. Systém se tak sám hlídá.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { parseDeadline, isValidCzDate, daysUntil } from "@/lib/dates";
import { overlaps } from "@/lib/gear";
import { clientHealth } from "@/lib/client-health";
import { buildForecast, minBalance as forecastMin } from "@/lib/forecast";
import { unpaidInvoices } from "@/lib/overdue";
import { celkemZaMesic, monthKey, monthLabel } from "@/lib/odmeny";
import { absenceCollisions } from "@/lib/absence";
import { appendSnapshot, detectAnomalies, type MrrSnapshot } from "@/lib/mrr-history";
import { cadenceByClient, ymOf, type CadencePost, type CadenceClient } from "@/lib/post-cadence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readKey<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T> {
  const { data, error } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  // DŮLEŽITÉ: při chybě čtení VYHODIT, ne vrátit null. Jinak by transientní
  // DB chyba (timeout) → null → prázdné pole a následný writeKey by NENÁVRATNĚ
  // přepsal historii/notifikace (ov-mrr-history, ov-notif-events) jedním
  // záznamem. Fail-closed: raději selfcheck spadne, než tiše smaže data.
  if (error) throw new Error(`readKey(${key}) failed: ${error.message}`);
  return (data?.value ?? null) as T;
}

async function writeKey(sb: ReturnType<typeof createAdminClient>, key: string, value: unknown) {
  await sb.from("app_data").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return String(h);
}

interface Inv { cislo?: string; klient?: string; klientNazev?: string; castka?: unknown; stav?: string; datumSplatnosti?: string; splatnost?: string; datumVystaveni?: string; datum?: string }
interface Task { nazev?: string; status?: string; deadline?: string }
interface Res { gearId?: number; kdo?: string; od?: string; do?: string }
interface Client {
  name?: string; aktivni?: boolean; fakturaRada?: number; ico?: string;
  pausal?: number; reklama?: number;
  deliverables?: { done: boolean }[];
  hodinMesic?: number; hodinOdpracovano?: number;
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
  const [issued, finance, tasks, reservations, clients] = await Promise.all([
    readKey<Inv[]>(sb, "ov-issued-invoices"),
    readKey<Inv[]>(sb, "ov-finance-faktury"),
    readKey<Task[]>(sb, "ov-ukoly-tasks"),
    readKey<Res[]>(sb, "ov-gear-reservations"),
    readKey<Client[]>(sb, "ov-monthly-clients"),
  ]);

  const findings: string[] = [];

  // 1) Neexistující / nečitelná / CHYBĚJÍCÍ data splatnosti
  for (const inv of [...(issued ?? []), ...(finance ?? [])]) {
    if ((inv.stav ?? "") === "Zaplacena" || (inv.stav ?? "") === "Storno") continue;
    const due = inv.datumSplatnosti ?? inv.splatnost ?? "";
    if (!due) {
      // Nezaplacená faktura bez splatnosti — nikdy nespadne do upomínek.
      findings.push(`Faktura ${inv.cislo ?? "?"} (${inv.klient ?? "?"}) nemá vyplněné datum splatnosti`);
      continue;
    }
    const hasYear = /\d{4}/.test(due);
    if (/\d[A-Za-z]|[A-Za-z]\d/.test(due.replace(/\s/g, ""))) {
      // Písmeno vmíchané do číslic ("2O26" s O místo nuly) — parseDeadline by
      // to tiše zparsoval bez roku, proto kontrolujeme dřív.
      findings.push(`Faktura ${inv.cislo ?? "?"} (${inv.klient ?? "?"}) má překlep v datu splatnosti „${due}"`);
    } else if (hasYear && !due.includes("-") && !isValidCzDate(due.replace(/\s/g, ""))) {
      findings.push(`Faktura ${inv.cislo ?? "?"} (${inv.klient ?? "?"}) má neexistující datum splatnosti „${due}"`);
    } else if (!parseDeadline(due)) {
      findings.push(`Faktura ${inv.cislo ?? "?"} (${inv.klient ?? "?"}) má nečitelné datum splatnosti „${due}"`);
    }
  }

  // 2) Duplicitní čísla faktur (jen skutečně vyplněná)
  const seen = new Map<string, number>();
  for (const inv of [...(issued ?? []), ...(finance ?? [])]) {
    const c = (inv.cislo ?? "").trim();
    if (!c) continue;
    seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  for (const [c, n] of seen) if (n > 2) findings.push(`Číslo faktury ${c} se vyskytuje ${n}× — zkontroluj duplicitu`);

  // 3) Úkoly s nečitelným termínem
  for (const t of tasks ?? []) {
    if ((t.status ?? "") === "Hotovo") continue;
    const d = (t.deadline ?? "").trim();
    if (d && !parseDeadline(d)) findings.push(`Úkol „${t.nazev ?? "?"}" má nečitelný termín „${d}"`);
  }

  // 4) Kolize rezervací techniky
  const res = reservations ?? [];
  for (let i = 0; i < res.length; i++)
    for (let j = i + 1; j < res.length; j++)
      if (res[i].gearId === res[j].gearId && res[i].od && res[j].od && overlaps(res[i].od!, res[i].do!, res[j].od!, res[j].do!))
        findings.push(`Kolize rezervace techniky: ${res[i].kdo ?? "?"} × ${res[j].kdo ?? "?"} (${res[i].od}–${res[i].do})`);

  // 4b) Klienti v riziku péče (Health Score < 60) — proaktivní churn alarm.
  // Zachytí i "tichý úpadek" (klient neplatí / nedodává / neaktivní), který
  // by jinak nikoho neupozornil, dokud neodejde.
  const match = (a: string, b: string) => {
    const x = (a || "").toLowerCase().trim(), y = (b || "").toLowerCase().trim();
    return !!x && !!y && (x.includes(y) || y.includes(x));
  };
  const allInv = [...(issued ?? []), ...(finance ?? [])];
  const activeClients = (clients ?? []).filter((c) => c.aktivni !== false && (c.name ?? "").trim());
  let mrrTotal = 0, overdueTotal = 0, rizikCount = 0;
  for (const c of activeClients) {
    mrrTotal += (c.pausal ?? 0) + (c.reklama ?? 0);
    const overdueSum = allInv
      .filter((i) => (i.stav ?? "") !== "Zaplacena" && (i.stav ?? "") !== "Storno")
      .filter((i) => match(i.klientNazev ?? i.klient ?? "", c.name!))
      .filter((i) => {
        let d = parseDeadline(i.datumSplatnosti ?? i.splatnost ?? "");
        if (!d) { const v = parseDeadline(i.datumVystaveni ?? i.datum ?? ""); if (v) d = new Date(v.getTime() + 14 * 86_400_000); }
        return d ? daysUntil(d) < 0 : false;
      })
      .reduce((s, i) => s + (Number(i.castka) || 0), 0);
    overdueTotal += overdueSum;
    const h = clientHealth(c, overdueSum);
    if (h.band === "riziko") {
      rizikCount++;
      const worst = [...h.factors].sort((a, b) => a.score - b.score)[0];
      findings.push(`Klient ${c.name} v riziku péče (health ${h.score}/100, nejhorší: ${worst.label} — ${worst.note})`);
    }
  }

  // 5) Podezřelé částky
  for (const inv of [...(issued ?? []), ...(finance ?? [])]) {
    const n = Number(inv.castka);
    if (inv.castka != null && (!Number.isFinite(n) || n < 0)) {
      findings.push(`Faktura ${inv.cislo ?? "?"} má podezřelou částku „${String(inv.castka)}"`);
    }
  }

  // 6) Osiřelé vazby deliverable → úkol (úkol smazán, odkaz zůstal)
  try {
    const taskIds = new Set((tasks ?? []).map((t) => (t as { id?: unknown }).id));
    const monthly = (clients ?? []) as Array<{ name?: string; deliverables?: Array<{ text?: string; linkedTaskId?: number }> }>;
    for (const c of monthly) {
      for (const d of c.deliverables ?? []) {
        if (d.linkedTaskId != null && !taskIds.has(d.linkedTaskId)) {
          findings.push(`Deliverable „${d.text ?? "?"}" (${c.name ?? "?"}) odkazuje na smazaný úkol`);
        }
      }
    }
  } catch { /* nikdy neshodit selfcheck */ }

  // 7) Rezervace na neexistující techniku (kus smazán ze skladu)
  try {
    const gearList = await readKey<Array<{ id?: number }>>(sb, "ov-gear");
    const gearIds = new Set((gearList ?? []).map((g) => g.id));
    for (const r of res) {
      if (r.gearId != null && !gearIds.has(r.gearId) && (r.do ?? "") >= new Date().toISOString().slice(0, 10)) {
        findings.push(`Rezervace (${r.kdo ?? "?"}, ${r.od}–${r.do}) odkazuje na smazanou techniku`);
      }
    }
  } catch { /* nikdy neshodit selfcheck */ }

  // 8) Cash-gap výhled — proaktivní varování, když 6měsíční projekce
  // zůstatku spadne do mínusu (stejná logika jako cashflow stránka).
  try {
    const [odmeny, predplatne, startBalance] = await Promise.all([
      readKey<import("@/lib/odmeny").OdmenaPerson[]>(sb, "ov-odmeny"),
      readKey<Array<{ castka?: number; mena?: string }>>(sb, "ov-finance-predplatne"),
      readKey<number>(sb, "ov-vyhledy-zustatek"),
    ]);
    const active = (clients ?? []).filter((c) => c.aktivni !== false);
    const retainerIncome = active.reduce((s, c) => s + (c.pausal || 0) + (c.reklama || 0), 0);
    const odmenyMonthly = celkemZaMesic(odmeny ?? [], monthKey(new Date()));
    const predplatneMonthly = (predplatne ?? []).reduce((s, p) => s + (p.mena === "EUR" ? (p.castka || 0) * 25 : (p.castka || 0)), 0);
    const receivablesByMonth = new Map<string, number>();
    for (const inv of unpaidInvoices((issued ?? []) as never, (finance ?? []) as never)) {
      if (!inv.due) continue;
      const k = `${inv.due.getFullYear()}-${String(inv.due.getMonth() + 1).padStart(2, "0")}`;
      receivablesByMonth.set(k, (receivablesByMonth.get(k) ?? 0) + inv.castka);
    }
    const forecast = buildForecast({
      startBalance: startBalance ?? 0, retainerIncome, monthlyExpenses: odmenyMonthly + predplatneMonthly,
      receivablesByMonth, months: 6, from: new Date(), monthKey, monthLabel,
    });
    const worst = forecast.reduce((a, b) => (b.zustatek < a.zustatek ? b : a), forecast[0]);
    if (worst && forecastMin(forecast, startBalance ?? 0) < 0) {
      findings.push(`Cash-gap výhled: v ${worst.label} klesá projektovaný zůstatek na ${Math.round(worst.zustatek).toLocaleString("cs-CZ")} Kč`);
    }
  } catch { /* nikdy neshodit selfcheck */ }

  // 9) Kolize dovolených s natáčením / rezervací techniky
  try {
    const [absences, shootingDays] = await Promise.all([
      readKey<import("@/lib/absence").Absence[]>(sb, "ov-absence"),
      readKey<Array<{ datum?: string; klient?: string; clenove?: string[] }>>(sb, "ov-shooting-days"),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    for (const c of absenceCollisions(absences ?? [], shootingDays ?? [], (reservations ?? []) as never, today)) {
      findings.push(`Kolize dovolené: ${c.name} má ${c.absenceTyp}, ale je ${c.kind === "shooting" ? "na natáčení" : "na rezervaci techniky"} „${c.detail}" (${c.datum})`);
    }
  } catch { /* nikdy neshodit selfcheck */ }

  // 11) Klienti potichu na sítích — churn radar. Aktivní retainer klient, který
  // tento měsíc nemá ANI publikovaný, ANI naplánovaný post. Hlásíme až od 10.
  // dne v měsíci, aby začátek měsíce (plán se teprve chystá) nedělal šum.
  try {
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth >= 10) {
      const posts = await readKey<CadencePost[]>(sb, "ov-smm-posts");
      const ym = ymOf(new Date().toISOString());
      const rows = cadenceByClient(posts ?? [], (clients ?? []) as CadenceClient[], ym);
      for (const r of rows.filter((r) => r.band === "ticho")) {
        findings.push(`Klient ${r.klient} nemá tento měsíc na sítích žádný post (publikovaný ani naplánovaný)`);
      }
    }
  } catch { /* nikdy neshodit selfcheck */ }

  // 10) Denní snímek MRR/metrik do historie + detekce anomálií (trend v čase)
  try {
    const today = new Date().toISOString().slice(0, 10);
    const snap: MrrSnapshot = { date: today, mrr: mrrTotal, klientu: activeClients.length, pohledavky: overdueTotal, rizik: rizikCount };
    const prevHistory = await readKey<MrrSnapshot[]>(sb, "ov-mrr-history") ?? [];
    // Anomálie hlásíme jen když dnešní snímek přináší nová data (jiný den).
    const isNewDay = !prevHistory.some((s) => s.date === today);
    const history = appendSnapshot(prevHistory, snap);
    if (isNewDay) {
      for (const a of detectAnomalies(history)) findings.push(`Anomálie: ${a.message}`);
    }
    await writeKey(sb, "ov-mrr-history", history);
  } catch { /* nikdy neshodit selfcheck */ }

  // ── Ozvi se jen při změně nálezů ──
  const currentHash = hash(findings.slice().sort().join("|"));
  const state = await readKey<{ hash?: string } | null>(sb, "ov-selfcheck-state");
  const changed = state?.hash !== currentHash;

  if (changed && findings.length > 0) {
    const events = await readKey<unknown[]>(sb, "ov-notif-events") ?? [];
    const ev = {
      id: `selfcheck-${Date.now()}`,
      type: "task_assigned",
      title: `Self-check: ${findings.length} ${findings.length === 1 ? "nález" : findings.length < 5 ? "nálezy" : "nálezů"} v datech`,
      body: findings.slice(0, 3).join(" · ") + (findings.length > 3 ? ` (+${findings.length - 3} dalších)` : ""),
      url: "/inbox",
      createdAt: new Date().toISOString(),
      targetEmail: null,
    };
    await writeKey(sb, "ov-notif-events", [...(Array.isArray(events) ? events : []), ev].slice(-100));
  }
  await writeKey(sb, "ov-selfcheck-state", { hash: currentHash, ts: new Date().toISOString(), count: findings.length });

  return NextResponse.json({ ok: true, findings, changed });
}
