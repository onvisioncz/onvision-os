"use client";

import { useMemo } from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { overdueInvoices, unpaidInvoices, type AnyInvoice } from "@/lib/overdue";
import { clientHealth } from "@/lib/client-health";
import { buildForecast, minBalance as forecastMin } from "@/lib/forecast";
import { mrrTrend, type MrrSnapshot } from "@/lib/mrr-history";
import { weightedPipeline, type PipelineDeal } from "@/lib/pipeline";
import { celkemZaMesic, monthKey, monthLabel, type OdmenaPerson } from "@/lib/odmeny";
import { parseDeadline, daysUntil } from "@/lib/dates";
import { companyVitals } from "@/lib/company-vitals";

interface MonthlyClient { name: string; pausal?: number; reklama?: number; aktivni?: boolean; deliverables?: { done: boolean }[]; hodinMesic?: number; hodinOdpracovano?: number }
interface Sub { castka?: number; mena?: string }
interface Task { status?: string; deadline?: string }

const match = (a: string, b: string) => { const x = (a || "").toLowerCase().trim(), y = (b || "").toLowerCase().trim(); return !!x && !!y && (x.includes(y) || y.includes(x)); };

/** Barometr firmy — jedno skóre „jak na tom jsme" + rozpad. Killer executive glance. */
export function CompanyBarometer() {
  const [invoices] = useSupabaseData<AnyInvoice[]>("ov-issued-invoices", () => []);
  const [finance] = useSupabaseData<AnyInvoice[]>("ov-finance-faktury", () => []);
  const [clients] = useSupabaseData<MonthlyClient[]>("ov-monthly-clients", () => []);
  const [odmeny] = useSupabaseData<OdmenaPerson[]>("ov-odmeny", () => []);
  const [predplatne] = useSupabaseData<Sub[]>("ov-finance-predplatne", () => []);
  const [startBalance] = useSupabaseData<number>("ov-vyhledy-zustatek", () => 0);
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [mrrHistory] = useSupabaseData<MrrSnapshot[]>("ov-mrr-history", () => []);
  const [pipelineDeals] = useSupabaseData<PipelineDeal[]>("ov-pipeline-deals", () => []);

  const vitals = useMemo(() => {
    const now = new Date();
    const active = clients.filter((c) => c.aktivni !== false);
    const mrr = active.reduce((s, c) => s + (c.pausal || 0) + (c.reklama || 0), 0);
    const odmenyMonthly = celkemZaMesic(odmeny, monthKey(now));
    const predplatneMonthly = predplatne.reduce((s, p) => s + (p.mena === "EUR" ? (p.castka || 0) * 25 : (p.castka || 0)), 0);
    const monthlyExpenses = odmenyMonthly + predplatneMonthly;

    const overdue = overdueInvoices(invoices, finance);

    // Cash gap z 6měs. projekce
    const receivablesByMonth = new Map<string, number>();
    for (const inv of unpaidInvoices(invoices, finance)) { if (!inv.due) continue; const k = `${inv.due.getFullYear()}-${String(inv.due.getMonth() + 1).padStart(2, "0")}`; receivablesByMonth.set(k, (receivablesByMonth.get(k) ?? 0) + inv.castka); }
    const forecast = buildForecast({ startBalance: startBalance || 0, retainerIncome: mrr, monthlyExpenses, receivablesByMonth, months: 6, from: now, monthKey, monthLabel });
    const cashGap = forecastMin(forecast, startBalance || 0) < 0;

    // Klienti v riziku (health)
    const allInv = [...invoices, ...finance];
    let atRisk = 0;
    for (const c of active) {
      const overdueSum = allInv
        .filter((i) => (i.stav ?? "") !== "Zaplacena" && (i.stav ?? "") !== "Storno")
        .filter((i) => match(i.klientNazev ?? i.klient ?? "", c.name))
        .filter((i) => { let d = parseDeadline(i.datumSplatnosti ?? i.splatnost ?? ""); if (!d) { const v = parseDeadline(i.datumVystaveni ?? i.datum ?? ""); if (v) d = new Date(v.getTime() + 14 * 86400000); } return d ? daysUntil(d) < 0 : false; })
        .reduce((s, i) => s + (Number(i.castka) || 0), 0);
      if (clientHealth(c, overdueSum).band === "riziko") atRisk++;
    }

    const trend = mrrTrend(mrrHistory, 30);
    const late = tasks.filter((t) => (t.status ?? "") !== "Hotovo").filter((t) => { const d = parseDeadline(t.deadline ?? ""); return d && daysUntil(d) < 0; }).length;
    const open = tasks.filter((t) => (t.status ?? "") !== "Hotovo").length;

    return companyVitals({
      mrr, monthlyExpenses, balance: startBalance || 0, cashGap,
      overdueTotal: overdue.total, clientsActive: active.length, clientsAtRisk: atRisk,
      mrrTrendPct: trend ? trend.deltaPct : null, weightedPipeline: weightedPipeline(pipelineDeals),
      openTasks: open, lateTasks: late,
    });
  }, [invoices, finance, clients, odmeny, predplatne, startBalance, tasks, mrrHistory, pipelineDeals]);

  const circ = 2 * Math.PI * 34;
  const dash = (vitals.score / 100) * circ;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4" style={{ color: vitals.color }} />
        <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>Barometr firmy</h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: `${vitals.color.replace(")", " / 0.14)")}`, color: vitals.color }}>{vitals.band}</span>
      </div>

      <div className="flex items-center gap-5">
        {/* Gauge */}
        <div className="relative shrink-0" style={{ width: 92, height: 92 }}>
          <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="46" cy="46" r="34" fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="8" />
            <circle cx="46" cy="46" r="34" fill="none" stroke={vitals.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray 0.6s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold leading-none" style={{ fontFamily: "var(--font-heading)", color: vitals.color }}>{vitals.score}</span>
            <span className="text-[9px] text-[--muted-foreground]">/ 100</span>
          </div>
        </div>

        {/* Pilíře */}
        <div className="flex-1 space-y-2">
          {vitals.pillars.map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-[--muted-foreground]">{p.label}</span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{p.score}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: p.score >= 60 ? "oklch(0.7 0.17 155)" : p.score >= 40 ? "oklch(0.78 0.165 75)" : "oklch(0.62 0.24 25)", transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Taháky */}
      {vitals.drivers.length > 0 && (
        <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
          {vitals.drivers.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[12px]">
              {d.positive ? <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.7 0.17 155)" }} /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.72 0.19 25)" }} />}
              <span style={{ color: "var(--foreground)" }}>{d.text}</span>
              <span className="text-[10px] text-[--muted-foreground]">· {d.pilar}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
