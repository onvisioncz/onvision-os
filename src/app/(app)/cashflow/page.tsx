"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Film, Repeat,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { fmtKc } from "@/lib/ziskovost";
import { unpaidInvoices, type AnyInvoice } from "@/lib/overdue";
import { castkaZaMesic, monthKey, monthLabel, celkemZaMesic, type OdmenaPerson } from "@/lib/odmeny";
import { buildForecast, minBalance as minBal, type ForecastParams } from "@/lib/forecast";
import { mrrTrend, type MrrSnapshot } from "@/lib/mrr-history";

/* ── Typy dat ────────────────────────────────────────────────────────────── */
interface Invoice { castka: number; stav: string; datumSplatnosti: string; klient: string }
interface Retainer { name: string; pausal: number; reklama?: number; aktivni?: boolean }
interface Subscription { castka: number; mena: "CZK" | "EUR" }
interface ClientCost { klient: string; rok: number; castka: number }

const GREEN = "oklch(0.67 0.155 155)";
const RED = "oklch(0.65 0.22 25)";
const PRIMARY = "oklch(0.62 0.27 265)";
const AMBER = "oklch(0.74 0.165 75)";
const EUR_CZK = 25;

/* "D. M. YYYY" → "YYYY-MM" */

const iCls = "px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

function Stat({ label, value, color, icon: Icon, sub }: { label: string; value: string; color: string; icon: React.ElementType; sub?: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[150px] p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2"><Icon className="w-3.5 h-3.5" style={{ color }} /><span className="text-[11px] font-semibold tracking-[0.04em] uppercase text-[--muted-foreground]">{label}</span></div>
      <div className="text-[22px] font-bold" style={{ color, fontFamily: "var(--font-heading)" }}>{value}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

export default function CashflowPage() {
  const { user, loading: roleLoading } = useUserRole();
  const [invoices] = useSupabaseData<Invoice[]>("ov-issued-invoices", () => []);
  const [financeFaktury] = useSupabaseData<AnyInvoice[]>("ov-finance-faktury", () => []);
  // (import níže) sdílený helper na nezaplacené faktury z obou skladů
  const [retainers] = useSupabaseData<Retainer[]>("ov-monthly-clients", () => []);
  const [odmeny] = useSupabaseData<OdmenaPerson[]>("ov-odmeny", () => []);
  const [predplatne] = useSupabaseData<Subscription[]>("ov-finance-predplatne", () => []);
  const [clientCosts] = useSupabaseData<ClientCost[]>("ov-client-costs", () => []);
  const [meta, setMeta] = useSupabaseData<Record<string, number>>("ov-vyhledy-vystupy", () => ({}));
  const [mrrHistory] = useSupabaseData<MrrSnapshot[]>("ov-mrr-history", () => []);

  const [tab, setTab] = useState<"cashflow" | "vystup" | "pausaly">("cashflow");
  const [startBalance, setStartBalance] = useSupabaseData<number>("ov-vyhledy-zustatek", () => 0);
  const [scenarioClient, setScenarioClient] = useState<string>(""); // "co když odejde klient X"

  const nowYear = new Date().getFullYear();
  const activeRetainers = useMemo(() => retainers.filter((r) => r.aktivni !== false), [retainers]);

  // recurring measures
  const retainerIncome = useMemo(() => activeRetainers.reduce((s, r) => s + (r.pausal || 0) + (r.reklama || 0), 0), [activeRetainers]);
  const odmenyMonthly = useMemo(() => celkemZaMesic(odmeny, monthKey(new Date())), [odmeny]);
  const predplatneMonthly = useMemo(() => predplatne.reduce((s, p) => s + (p.mena === "EUR" ? (p.castka || 0) * EUR_CZK : (p.castka || 0)), 0), [predplatne]);

  // Nezaplacené faktury dle měsíce splatnosti — sloučené oba sklady (Fakturace + Finance), dedup
  const receivablesByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const inv of unpaidInvoices(invoices as AnyInvoice[], financeFaktury)) {
      if (!inv.due) continue;
      const k = `${inv.due.getFullYear()}-${String(inv.due.getMonth() + 1).padStart(2, "0")}`;
      m.set(k, (m.get(k) ?? 0) + inv.castka);
    }
    return m;
  }, [invoices, financeFaktury]);
  const receivablesTotal = useMemo(() => [...receivablesByMonth.values()].reduce((a, b) => a + b, 0), [receivablesByMonth]);

  // MRR klienta, jehož odchod simulujeme (0 = žádný scénář)
  const lostMrr = useMemo(() => {
    if (!scenarioClient) return 0;
    const c = activeRetainers.find((r) => r.name === scenarioClient);
    return c ? (c.pausal || 0) + (c.reklama || 0) : 0;
  }, [scenarioClient, activeRetainers]);

  // 6-month forecast (přes sdílený lib) — s odečtením MRR odcházejícího klienta
  const baseParams = useMemo<ForecastParams>(() => ({
    startBalance,
    retainerIncome: retainerIncome - lostMrr,
    monthlyExpenses: odmenyMonthly + predplatneMonthly,
    receivablesByMonth,
    months: 6,
    from: new Date(),
    monthKey,
    monthLabel,
  }), [startBalance, retainerIncome, lostMrr, odmenyMonthly, predplatneMonthly, receivablesByMonth]);

  const forecast = useMemo(() => buildForecast(baseParams), [baseParams]);
  const minBalance = minBal(forecast, startBalance);

  // Srovnání s "baseline" (bez scénáře) — o kolik scénář zhorší nejnižší zůstatek
  const baselineMin = useMemo(
    () => (lostMrr ? minBal(buildForecast({ ...baseParams, retainerIncome }), startBalance) : minBalance),
    [baseParams, retainerIncome, lostMrr, startBalance, minBalance]
  );

  // Cena za výstup
  const odmenyRok = useMemo(() => {
    let s = 0;
    for (let mo = 0; mo < 12; mo++) s += celkemZaMesic(odmeny, monthKey(new Date(nowYear, mo, 1)));
    return s;
  }, [odmeny, nowYear]);
  const pocetVystupu = meta[nowYear] ?? 0;
  const cenaZaVystup = pocetVystupu > 0 ? odmenyRok / pocetVystupu : 0;

  // Rentabilita paušálů
  const pausalRows = useMemo(() => {
    return activeRetainers.map((r) => {
      const yearCost = clientCosts.filter((c) => c.klient === r.name && c.rok === nowYear).reduce((s, c) => s + (c.castka || 0), 0);
      const monthlyCost = yearCost / 12;
      const prijem = (r.pausal || 0) + (r.reklama || 0);
      const zisk = prijem - monthlyCost;
      const marze = prijem > 0 ? (zisk / prijem) * 100 : 0;
      return { name: r.name, prijem, monthlyCost, zisk, marze };
    }).sort((a, b) => a.marze - b.marze);
  }, [activeRetainers, clientCosts, nowYear]);

  if (roleLoading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !(user.roles.includes("admin") || user.roles.includes("fakturace"))) {
    return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;
  }

  const maxBal = Math.max(...forecast.map((f) => Math.abs(f.zustatek)), 1);

  // MRR trend z historie snímků (selfcheck ukládá denně) — vůči ~30 dnům zpět
  const trend = mrrTrend(mrrHistory, 30);
  const trendBadge = trend && trend.direction !== "flat" ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: trend.direction === "up" ? GREEN : RED }}>
      {trend.direction === "up" ? "▲" : "▼"} {trend.deltaAbs >= 0 ? "+" : ""}{fmtKc(trend.deltaAbs)} ({trend.deltaPct >= 0 ? "+" : ""}{Math.round(trend.deltaPct)} %) za 30 dní
    </span>
  ) : trend ? (
    <span className="text-[11px] text-[--muted-foreground]">beze změny za 30 dní</span>
  ) : null;

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Cashflow &amp; výhledy</h1>
        <p className="text-[13px] text-[--muted-foreground]">Předpověď hotovosti, cena za výstup a rentabilita paušálů</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-[10px] w-fit" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {([["cashflow", "Cashflow předpověď"], ["vystup", "Cena za výstup"], ["pausaly", "Rentabilita paušálů"]] as const).map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} className="px-3.5 py-1.5 rounded-[7px] text-[13px] font-semibold transition-colors" style={tab === id ? { background: PRIMARY, color: "white" } : { color: "var(--muted-foreground)" }}>{lbl}</button>
        ))}
      </div>

      {/* ── CASHFLOW ── */}
      {tab === "cashflow" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Stat label="Recurring příjem / měs" value={fmtKc(retainerIncome)} color={PRIMARY} icon={Repeat} sub={trendBadge} />
            <Stat label="Recurring výdaje / měs" value={fmtKc(odmenyMonthly + predplatneMonthly)} color={RED} icon={TrendingDown} />
            <Stat label="Nezaplacené faktury" value={fmtKc(receivablesTotal)} color={AMBER} icon={Wallet} />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[--muted-foreground]">Aktuální zůstatek na účtu:</span>
              <input type="number" className={iCls} style={{ ...iStyle, width: 140 }} value={startBalance || ""} onChange={(e) => setStartBalance(Number(e.target.value))} placeholder="0" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[--muted-foreground]">Scénář — co když odejde:</span>
              <select className={iCls} style={{ ...iStyle, width: 180 }} value={scenarioClient} onChange={(e) => setScenarioClient(e.target.value)}>
                <option value="">— nikdo (baseline) —</option>
                {activeRetainers
                  .filter((r) => (r.pausal || 0) + (r.reklama || 0) > 0)
                  .sort((a, b) => ((b.pausal || 0) + (b.reklama || 0)) - ((a.pausal || 0) + (a.reklama || 0)))
                  .map((r) => (
                    <option key={r.name} value={r.name}>{r.name} (−{fmtKc((r.pausal || 0) + (r.reklama || 0))}/měs)</option>
                  ))}
              </select>
            </div>
          </div>

          {lostMrr > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-[10px] text-[13px]" style={{ background: "oklch(0.74 0.165 75 / 0.1)", border: "1px solid oklch(0.74 0.165 75 / 0.3)" }}>
              <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" style={{ color: AMBER }} />
              <span>
                Scénář <strong>{scenarioClient} odchází</strong>: recurring příjem klesne o <strong>{fmtKc(lostMrr)}/měs</strong>.
                Nejnižší zůstatek za 6 měsíců by spadl z <strong>{fmtKc(baselineMin)}</strong> na <strong style={{ color: minBalance < 0 ? RED : "inherit" }}>{fmtKc(minBalance)}</strong>
                {" "}(rozdíl {fmtKc(minBalance - baselineMin)}).
                {baselineMin >= 0 && minBalance < 0 && <span style={{ color: RED }}> Tímto odchodem vzniká cash gap.</span>}
              </span>
            </div>
          )}

          {minBalance < 0 && (
            <div className="flex items-center gap-2 p-3 rounded-[10px] text-[13px]" style={{ background: "oklch(0.65 0.22 25 / 0.1)", border: "1px solid oklch(0.65 0.22 25 / 0.3)", color: RED }}>
              <AlertTriangle className="w-4 h-4" /> Pozor — v jednom z měsíců klesá zůstatek do mínusu ({fmtKc(minBalance)}). Hrozí cash gap.
            </div>
          )}

          <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-left">
              <thead><tr className="text-[11px] uppercase tracking-[0.04em] text-[--muted-foreground]" style={{ background: "var(--card)" }}>
                <th className="px-4 py-3 font-semibold">Měsíc</th><th className="px-4 py-3 font-semibold text-right">Příjmy</th><th className="px-4 py-3 font-semibold text-right">Výdaje</th><th className="px-4 py-3 font-semibold text-right">Net</th><th className="px-4 py-3 font-semibold text-right">Zůstatek</th>
              </tr></thead>
              <tbody>
                {forecast.map((f) => (
                  <tr key={f.key} className="border-t text-[13px]" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium capitalize">{f.label}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "var(--font-heading)" }}>{fmtKc(f.prijmy)}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "var(--font-heading)", color: RED }}>{fmtKc(f.vydaje)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: "var(--font-heading)", color: f.net >= 0 ? GREEN : RED }}>{f.net >= 0 ? "+" : ""}{fmtKc(f.net)}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: "var(--font-heading)", color: f.zustatek >= 0 ? GREEN : RED }}>{fmtKc(f.zustatek)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[--muted-foreground]">Recurring příjem = součet paušálů aktivních měsíčních klientů. Recurring výdaje = odměny (odhad z aktuálního měsíce) + předplatné. K příjmům se v daném měsíci přičtou nezaplacené faktury podle splatnosti.</p>
        </div>
      )}

      {/* ── CENA ZA VÝSTUP ── */}
      {tab === "vystup" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Stat label={`Produkční náklady ${nowYear}`} value={fmtKc(odmenyRok)} color={RED} icon={TrendingDown} />
            <Stat label="Počet výstupů" value={String(pocetVystupu)} color={PRIMARY} icon={Film} />
            <Stat label="Cena za výstup" value={cenaZaVystup ? fmtKc(cenaZaVystup) : "—"} color={GREEN} icon={TrendingUp} />
          </div>
          <div className="flex items-center gap-2 p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span className="text-[13px]">Kolik výstupů (reelů/videí/foto) jste za {nowYear} vyrobili?</span>
            <input type="number" className={iCls} style={{ ...iStyle, width: 120 }} value={pocetVystupu || ""} onChange={(e) => setMeta({ ...meta, [nowYear]: Number(e.target.value) })} placeholder="0" />
          </div>
          <p className="text-[12px] text-[--muted-foreground]">
            Cena za výstup = produkční náklady (odměny za rok) ÷ počet výstupů = <strong>{cenaZaVystup ? fmtKc(cenaZaVystup) : "—"}</strong> na výstup.
            Ukazuje efektivitu produkce — čím níž, tím levněji vyrábíte jeden kus obsahu.
          </p>
        </div>
      )}

      {/* ── RENTABILITA PAUŠÁLŮ ── */}
      {tab === "pausaly" && (
        <div className="space-y-4">
          <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-left">
              <thead><tr className="text-[11px] uppercase tracking-[0.04em] text-[--muted-foreground]" style={{ background: "var(--card)" }}>
                <th className="px-4 py-3 font-semibold">Klient</th><th className="px-4 py-3 font-semibold text-right">Paušál / měs</th><th className="px-4 py-3 font-semibold text-right">Náklady / měs</th><th className="px-4 py-3 font-semibold text-right">Zisk</th><th className="px-4 py-3 font-semibold text-right">Marže</th>
              </tr></thead>
              <tbody>
                {pausalRows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[--muted-foreground]">Žádní měsíční klienti. Náklady se berou z Ziskovosti (per klient).</td></tr>}
                {pausalRows.map((r) => (
                  <tr key={r.name} className="border-t text-[13px]" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium flex items-center gap-1.5">{r.marze < 20 && <AlertTriangle className="w-3.5 h-3.5" style={{ color: AMBER }} />}{r.name}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "var(--font-heading)" }}>{fmtKc(r.prijem)}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "var(--font-heading)", color: RED }}>{r.monthlyCost ? fmtKc(r.monthlyCost) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: "var(--font-heading)", color: r.zisk >= 0 ? GREEN : RED }}>{fmtKc(r.zisk)}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: r.marze >= 40 ? GREEN : r.marze >= 20 ? AMBER : RED }}>{Math.round(r.marze)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[--muted-foreground]">Náklady per klient bereme z modulu Ziskovost (rok {nowYear} ÷ 12). Klienti s marží pod 20 % jsou označeni — paušál se nemusí vyplácet. Doplň jim náklady v Ziskovosti pro přesnost.</p>
        </div>
      )}
    </div>
  );
}
