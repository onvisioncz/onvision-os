"use client";

import { useState, useMemo } from "react";
import { Target, TrendingUp, Wallet, Percent, Film } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { MonthlyReview } from "@/components/monthly-review";
import { buildProfit, invoiceYear, fmtKc, type InvoiceLite, type ClientCost } from "@/lib/ziskovost";
import { TIME_KEY, RATES_KEY, laborByClient, type TimeEntry } from "@/lib/vykazy";

const PRIMARY = "oklch(0.62 0.27 265)";
const GREEN = "oklch(0.67 0.155 155)";
const AMBER = "oklch(0.74 0.165 75)";
const RED = "oklch(0.65 0.22 25)";

interface Cil { obrat: number; zisk: number; marze: number; vystupy: number }
type CileMap = Record<string, Cil>;
const emptyCil: Cil = { obrat: 0, zisk: 0, marze: 0, vystupy: 0 };

function Bar({ pct }: { pct: number }) {
  const c = pct >= 100 ? GREEN : pct >= 70 ? AMBER : RED;
  return (
    <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: c }} />
    </div>
  );
}

function Metric({ label, icon: Icon, actual, target, unit, onTarget, canEdit, isKc }: {
  label: string; icon: React.ElementType; actual: number; target: number; unit: string;
  onTarget: (v: number) => void; canEdit: boolean; isKc?: boolean;
}) {
  const hasTarget = target > 0;
  const pct = hasTarget ? Math.round((actual / target) * 100) : 0;
  const fmt = (n: number) => isKc ? fmtKc(n) : `${n.toLocaleString("cs-CZ")}${unit}`;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: PRIMARY }} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">{label}</span>
        {hasTarget ? (
          <span className="ml-auto text-[12px] font-bold" style={{ color: pct >= 100 ? GREEN : pct >= 70 ? AMBER : RED }}>{pct} %</span>
        ) : (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">cíl nenastaven</span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[26px] font-bold leading-none" style={{ fontFamily: "var(--font-heading)" }}>{fmt(actual)}</div>
          <div className="text-[11px] text-[--muted-foreground] mt-1.5">{hasTarget ? `z cíle ${fmt(target)}` : "nastav roční cíl →"}</div>
        </div>
        {canEdit && (
          <div className="text-right shrink-0">
            <label className="block text-[9px] font-semibold uppercase tracking-[0.06em] text-[--muted-foreground] mb-1">Cíl na rok</label>
            <input type="number" className="glass-input px-2.5 py-1.5 text-[13px] w-28 text-right" value={target || ""} onChange={(e) => onTarget(Number(e.target.value))} placeholder="0" />
          </div>
        )}
      </div>
      <Bar pct={pct} />
    </div>
  );
}

export default function CilePage() {
  const { user, loading } = useUserRole();
  const [invoices] = useSupabaseData<InvoiceLite[]>("ov-issued-invoices", () => []);
  const [costs] = useSupabaseData<ClientCost[]>("ov-client-costs", () => []);
  const [vystupyMeta] = useSupabaseData<Record<string, number>>("ov-vyhledy-vystupy", () => ({}));
  const [timeEntries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [rates] = useSupabaseData<Record<string, number>>(RATES_KEY, () => ({}));
  const [cile, setCile] = useSupabaseData<CileMap>("ov-cile", () => ({}));

  const nowYear = new Date().getFullYear();
  const [rok, setRok] = useState(nowYear);
  const cil = cile[rok] ?? emptyCil;
  const canEdit = !!user && user.roles.includes("admin");

  const actuals = useMemo(() => {
    const obrat = invoices.filter((i) => invoiceYear(i) === rok).reduce((s, i) => s + (i.castka || 0), 0);
    const rows = buildProfit(invoices, costs, rok, false, laborByClient(timeEntries, rates, rok));
    const prijmy = rows.reduce((s, r) => s + r.prijmy, 0);
    const zisk = rows.reduce((s, r) => s + r.zisk, 0);
    const marze = prijmy > 0 ? Math.round((zisk / prijmy) * 100) : 0;
    const vystupy = vystupyMeta[rok] ?? 0;
    return { obrat, zisk, marze, vystupy };
  }, [invoices, costs, rok, vystupyMeta, timeEntries, rates]);

  const setTarget = (k: keyof Cil, v: number) => setCile({ ...cile, [rok]: { ...cil, [k]: v } });

  const years = useMemo(() => { const s = new Set<number>([nowYear, nowYear + 1]); invoices.forEach((i) => { const y = invoiceYear(i); if (y) s.add(y); }); return [...s].sort((a, b) => b - a); }, [invoices, nowYear]);

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !(user.roles.includes("admin") || user.roles.includes("fakturace"))) return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}><Target className="w-5 h-5" style={{ color: PRIMARY }} /> Cíle &amp; benchmarky</h1>
          <p className="text-[13px] text-[--muted-foreground]">Cíle na rok a jak si vedete vs realita</p>
        </div>
        <select className="glass-input px-3 py-2 text-[13px]" value={rok} onChange={(e) => setRok(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
      </div>

      {canEdit && (
        <div className="mb-5">
          <MonthlyReview />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Metric label="Obrat" icon={Wallet} actual={actuals.obrat} target={cil.obrat} unit="" isKc onTarget={(v) => setTarget("obrat", v)} canEdit={canEdit} />
        <Metric label="Zisk" icon={TrendingUp} actual={actuals.zisk} target={cil.zisk} unit="" isKc onTarget={(v) => setTarget("zisk", v)} canEdit={canEdit} />
        <Metric label="Marže" icon={Percent} actual={actuals.marze} target={cil.marze} unit=" %" onTarget={(v) => setTarget("marze", v)} canEdit={canEdit} />
        <Metric label="Počet výstupů" icon={Film} actual={actuals.vystupy} target={cil.vystupy} unit=" ks" onTarget={(v) => setTarget("vystupy", v)} canEdit={canEdit} />
      </div>

      <p className="text-[11px] text-[--muted-foreground] mt-4">
        Obrat a zisk se počítají z faktur a Ziskovosti, počet výstupů z Cashflow → Cena za výstup. Cíle nastavuje admin.
      </p>
    </div>
  );
}
