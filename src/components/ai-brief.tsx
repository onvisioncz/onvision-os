"use client";

import { useState, useMemo, useEffect } from "react";
import { Sparkles, Loader2, RefreshCw, ListPlus, Check } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { WeeklyDays } from "@/components/dashboard/weekly-outlook-panel";
import { buildProfit, type InvoiceLite, type ClientCost } from "@/lib/ziskovost";
import { TIME_KEY, RATES_KEY, laborByClient, type TimeEntry } from "@/lib/vykazy";
import { parseDeadline, daysUntil } from "@/lib/dates";
import { overdueInvoices, unpaidInvoices, type AnyInvoice } from "@/lib/overdue";
import { clientHealth } from "@/lib/client-health";
import { buildForecast, minBalance as forecastMin } from "@/lib/forecast";
import { celkemZaMesic, monthKey, monthLabel, type OdmenaPerson } from "@/lib/odmeny";
import { absenceCollisions, type Absence } from "@/lib/absence";
import { cadenceByClient, ymOf } from "@/lib/post-cadence";

interface Inv extends InvoiceLite { datumSplatnosti: string }
interface Task { status: string; deadline: string; nazev?: string; priorita?: string }
interface FullTask { id: number; nazev: string; projekt: string; prirazeno: string; priorita: string; status: string; deadline: string }
interface Approval { status: string }
interface Nps { score: number; createdAt: string }
interface MonthlyClient { name: string; pausal?: number; reklama?: number; aktivni?: boolean; deliverables?: { done: boolean }[]; hodinMesic?: number; hodinOdpracovano?: number }
interface Subscription { castka?: number; mena?: string }
interface ShootingDay { datum?: string; klient?: string; clenove?: string[] }
interface Reservation { kdo?: string; od?: string; do?: string; projekt?: string }

const PRIMARY = "#5B5EFF";

// Sdílený parser termínů (umí "8. 7." i ISO "2026-07-08") — viz lib/dates.
const parseCz = (s: string, _defYear: number) => parseDeadline(s || "");

/** Jednoduchý render briefu: ### nadpisy + odrážky. */
function BriefBody({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-1.5">
      {lines.map((raw, i) => {
        const l = raw.trim();
        if (l.startsWith("###")) {
          return <p key={i} className="text-[11px] font-bold uppercase tracking-[0.08em] mt-3 first:mt-0" style={{ color: PRIMARY }}>{l.replace(/^#+\s*/, "")}</p>;
        }
        if (l.startsWith("-") || l.startsWith("•") || l.startsWith("*")) {
          return (
            <div key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }}>
              <span style={{ color: PRIMARY }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineBold(l.replace(/^[-•*]\s*/, "")) }} />
            </div>
          );
        }
        return <p key={i} className="text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }} dangerouslySetInnerHTML={{ __html: inlineBold(l) }} />;
      })}
    </div>
  );
}
function inlineBold(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function AiBrief({ showWeekly = false }: { showWeekly?: boolean }) {
  const [invoices] = useSupabaseData<Inv[]>("ov-issued-invoices", () => []);
  const [financeFaktury] = useSupabaseData<AnyInvoice[]>("ov-finance-faktury", () => []);
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [approvals] = useSupabaseData<Approval[]>("ov-client-approvals", () => []);
  const [nps] = useSupabaseData<Nps[]>("ov-nps", () => []);
  const [costs] = useSupabaseData<ClientCost[]>("ov-client-costs", () => []);
  const [timeEntries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [rates] = useSupabaseData<Record<string, number>>(RATES_KEY, () => ({}));
  const [clients] = useSupabaseData<MonthlyClient[]>("ov-monthly-clients", () => []);
  const [smmPosts] = useSupabaseData<{ klient?: string; datum?: string; status?: string }[]>("ov-smm-posts", () => []);
  const [odmeny] = useSupabaseData<OdmenaPerson[]>("ov-odmeny", () => []);
  const [predplatne] = useSupabaseData<Subscription[]>("ov-finance-predplatne", () => []);
  const [startBalance] = useSupabaseData<number>("ov-vyhledy-zustatek", () => 0);
  const [absences] = useSupabaseData<Absence[]>("ov-absence", () => []);
  const [shooting] = useSupabaseData<ShootingDay[]>("ov-shooting-days", () => []);
  const [reservations] = useSupabaseData<Reservation[]>("ov-gear-reservations", () => []);

  // Nedělní cron předpřipraví brief do ov-weekly-brief → zobraz ho rovnou.
  const [stored] = useSupabaseData<{ brief?: string; generatedAt?: string } | null>("ov-weekly-brief", () => null);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefAt, setBriefAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jednorázově naplň brief z uloženého (dokud si uživatel nevygeneruje vlastní).
  useEffect(() => {
    if (!brief && stored?.brief) { setBrief(stored.brief); setBriefAt(stored.generatedAt ?? null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const [, setFullTasks] = useSupabaseData<FullTask[]>("ov-ukoly-tasks", () => []);
  const [makingTasks, setMakingTasks] = useState(false);
  const [tasksMade, setTasksMade] = useState<number | null>(null);

  /** Z briefu vytáhne akční kroky (sekce „Rozhodni tento týden") a založí je jako úkoly. */
  const createTasksFromBrief = async () => {
    if (!brief || makingTasks) return;
    setMakingTasks(true); setTasksMade(null);
    try {
      const res = await fetch("/api/tasks/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Týdenní brief jednatele — vytvoř úkoly z akčních kroků:\n\n${brief}` }),
      });
      const j = await res.json();
      if (!res.ok) { setTasksMade(-1); return; }
      const drafts = (j.tasks ?? []).filter((t: { nazev?: string }) => t.nazev?.trim());
      if (!drafts.length) { setTasksMade(0); return; }
      let id = Date.now();
      const nove: FullTask[] = drafts.map((d: { nazev: string; prirazeno?: string; deadline?: string }) => ({
        id: id++, nazev: d.nazev.trim(), projekt: "Interní · z briefu", prirazeno: d.prirazeno || "Adam",
        priorita: "Vysoká", status: "Nové", deadline: d.deadline || "",
      }));
      setFullTasks((prev) => [...prev, ...nove]);
      setTasksMade(nove.length);
    } catch {
      setTasksMade(-1);
    } finally {
      setMakingTasks(false);
    }
  };

  const snapshot = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const overdue = overdueInvoices(invoices as AnyInvoice[], financeFaktury);
    const late = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseCz(t.deadline, year); return d && d < now; });
    const open = tasks.filter((t) => t.status !== "Hotovo");
    const active = clients.filter((c) => c.aktivni !== false);
    const mrr = active.reduce((s, c) => s + (c.pausal || 0) + (c.reklama || 0), 0);
    const loss = buildProfit(invoices as InvoiceLite[], costs, year, false, laborByClient(timeEntries, rates, year)).filter((r) => r.zisk < 0);
    const ninety = new Date(now.getTime() - 90 * 86400000);
    const lowNps = nps.filter((n) => new Date(n.createdAt) >= ninety && n.score < 7).length;
    const pending = approvals.filter((a) => a.status === "Čeká").length;

    // ── Rizikoví klienti (Health Score < 60) — churn signál ──
    const allInv = [...(invoices as AnyInvoice[]), ...financeFaktury];
    const match = (a: string, b: string) => { const x = (a || "").toLowerCase().trim(), y = (b || "").toLowerCase().trim(); return !!x && !!y && (x.includes(y) || y.includes(x)); };
    const rizikoviKlienti = active.map((c) => {
      const overdueSum = allInv
        .filter((i) => (i.stav ?? "") !== "Zaplacena" && (i.stav ?? "") !== "Storno")
        .filter((i) => match(i.klientNazev ?? i.klient ?? "", c.name))
        .filter((i) => { let d = parseDeadline(i.datumSplatnosti ?? i.splatnost ?? ""); if (!d) { const v = parseDeadline(i.datumVystaveni ?? i.datum ?? ""); if (v) d = new Date(v.getTime() + 14 * 86400000); } return d ? daysUntil(d) < 0 : false; })
        .reduce((s, i) => s + (Number(i.castka) || 0), 0);
      const h = clientHealth(c, overdueSum);
      return { name: c.name, score: h.score, band: h.band, worst: [...h.factors].sort((a, b) => a.score - b.score)[0] };
    }).filter((h) => h.band === "riziko").sort((a, b) => a.score - b.score);

    // ── Cash-gap výhled (6 měsíců) ──
    const odmenyMonthly = celkemZaMesic(odmeny, monthKey(now));
    const predplatneMonthly = predplatne.reduce((s, p) => s + (p.mena === "EUR" ? (p.castka || 0) * 25 : (p.castka || 0)), 0);
    const receivablesByMonth = new Map<string, number>();
    for (const inv of unpaidInvoices(invoices as AnyInvoice[], financeFaktury)) { if (!inv.due) continue; const k = `${inv.due.getFullYear()}-${String(inv.due.getMonth() + 1).padStart(2, "0")}`; receivablesByMonth.set(k, (receivablesByMonth.get(k) ?? 0) + inv.castka); }
    const forecast = buildForecast({ startBalance: startBalance || 0, retainerIncome: mrr, monthlyExpenses: odmenyMonthly + predplatneMonthly, receivablesByMonth, months: 6, from: now, monthKey, monthLabel });
    const worstMonth = forecast.reduce((a, b) => (b.zustatek < a.zustatek ? b : a), forecast[0]);
    const cashGap = forecastMin(forecast, startBalance || 0) < 0 ? { mesic: worstMonth?.label, zustatek: Math.round(worstMonth?.zustatek ?? 0) } : null;

    // ── Kolize dovolených s natáčením / technikou ──
    const today = now.toISOString().slice(0, 10);
    const kolize = absenceCollisions(absences, shooting, reservations, today)
      .map((c) => `${c.name}: ${c.absenceTyp} vs. ${c.kind === "shooting" ? "natáčení" : "technika"} „${c.detail}" (${c.datum})`);

    // ── Klienti potichu na sítích (churn radar) ──
    const socialTicho = cadenceByClient(smmPosts, clients, ymOf(now.toISOString()))
      .filter((r) => r.band === "ticho")
      .map((r) => r.klient);

    return {
      mrr,
      aktivnichKlientu: active.length,
      fakturyPoSplatnosti: { pocet: overdue.count, castka: overdue.total, kdo: overdue.items.map((i) => `${i.klient} ${i.castka} Kč (${i.dnuPoSplatnosti} dní)`) },
      ukolyPoTerminu: late.length,
      otevrenychUkolu: open.length,
      cekaNaSchvaleniKlientem: pending,
      ztratoviKlienti: loss.map((r) => r.klient).slice(0, 6),
      nizkeNPS: lowNps,
      rizikoviKlienti: rizikoviKlienti.map((h) => `${h.name} (health ${h.score}/100, nejhorší: ${h.worst.label} — ${h.worst.note})`),
      cashGapVyhled: cashGap,
      kolizeDovolenych: kolize,
      klientiPotichuNaSitich: socialTicho,
    };
  }, [invoices, financeFaktury, tasks, approvals, nps, costs, timeEntries, rates, clients, odmeny, predplatne, startBalance, absences, shooting, reservations, smmPosts]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Nepodařilo se vygenerovat brief."); return; }
      setBrief(data.brief);
      setBriefAt(null);
    } catch {
      setError("Chyba spojení.");
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true); setAnswer(null);
    try {
      const res = await fetch("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, snapshot }) });
      const data = await res.json();
      if (!res.ok) { setAnswer(data.error || "Nepodařilo se odpovědět."); return; }
      setAnswer(data.answer);
    } catch {
      setAnswer("Chyba spojení.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: PRIMARY }} />
          <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>AI týdenní brief</h3>
        </div>
        <button onClick={generate} disabled={loading}
          className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{ background: PRIMARY, color: "white" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : brief ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Píšu…" : brief ? "Znovu" : "Vygenerovat"}
        </button>
      </div>
      <p className="text-[12px] text-[--muted-foreground] mb-3">Claude přečte reálný stav firmy a napíše ti, co hoří a co rozhodnout.</p>

      {showWeekly && (
        <div className="mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <WeeklyDays />
        </div>
      )}

      {error && <p className="text-[12px]" style={{ color: "oklch(0.68 0.2 25)" }}>{error}</p>}
      {!brief && !loading && !error && (
        <p className="text-[12px] text-[--muted-foreground]">Klikni na „Vygenerovat" a dostaneš brief z aktuálních dat.</p>
      )}
      {loading && <p className="text-[12px] text-[--muted-foreground]">Čtu data firmy a píšu brief…</p>}
      {brief && !loading && (
        <>
          {briefAt && (
            <p className="text-[11px] mb-2" style={{ color: "oklch(0.55 0.005 222)" }}>
              Připraveno automaticky {new Date(briefAt).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" })} · klikni „Znovu" pro aktuální
            </p>
          )}
          <BriefBody text={brief} />
          {/* AI, co koná: akční kroky z briefu → rovnou úkoly */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={createTasksFromBrief} disabled={makingTasks}
              className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
              style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.3)", color: PRIMARY }}>
              {makingTasks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListPlus className="w-3.5 h-3.5" />}
              {makingTasks ? "Zakládám…" : "Vytvořit úkoly z briefu"}
            </button>
            {tasksMade !== null && tasksMade > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "oklch(0.67 0.155 155)" }}>
                <Check className="w-3.5 h-3.5" /> {tasksMade} {tasksMade === 1 ? "úkol založen" : tasksMade < 5 ? "úkoly založeny" : "úkolů založeno"} → Úkoly
              </span>
            )}
            {tasksMade === 0 && <span className="text-[12px] text-[--muted-foreground]">Brief neobsahuje akční kroky.</span>}
            {tasksMade === -1 && <span className="text-[12px]" style={{ color: "oklch(0.65 0.22 25)" }}>Nepodařilo se — zkus znovu.</span>}
          </div>
        </>
      )}

      {/* Mini co-pilot: zeptej se na data */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
            placeholder="Zeptej se na data… např. kolik nám dluží klienti?"
            className="glass-input flex-1 px-3 py-2 text-[13px]"
          />
          <button onClick={ask} disabled={asking || !question.trim()}
            className="btn-tactile px-3 py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-50 shrink-0"
            style={{ background: "rgba(91,94,255,0.14)", border: "1px solid rgba(91,94,255,0.3)", color: PRIMARY }}>
            {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Zeptat se"}
          </button>
        </div>
        {answer && (
          <p className="text-[13px] leading-relaxed mt-3 px-3 py-2.5 rounded-[8px]"
            style={{ color: "var(--foreground)", background: "rgba(91,94,255,0.06)", border: "1px solid rgba(91,94,255,0.14)" }}>
            {answer}
          </p>
        )}
      </div>
    </div>
  );
}
