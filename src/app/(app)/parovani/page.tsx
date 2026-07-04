"use client";

/**
 * Párování plateb — nahraj CSV výpis z banky, my ho napárujeme na nezaplacené
 * faktury podle VS + částky, ty jedním klikem označíš zaplaceno.
 * CSV se parsuje jen v prohlížeči, nikam se neposílá.
 */
import { useState, useMemo } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { parseBankCsv, matchPayments, type MatchSuggestion } from "@/lib/bank-match";
import type { AnyInvoice } from "@/lib/overdue";
import { fmtKc } from "@/lib/format";
import { Landmark, Check, Upload, X } from "lucide-react";

const ISSUED = "ov-issued-invoices";
const FINANCE = "ov-finance-faktury";

const CONF_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: "jistá", bg: "rgba(34,197,94,0.14)", color: "oklch(0.7 0.17 155)" },
  medium: { label: "pravděpodobná", bg: "rgba(91,94,255,0.14)", color: "#5B5EFF" },
  low: { label: "ke kontrole", bg: "rgba(229,72,77,0.14)", color: "oklch(0.65 0.2 25)" },
};

export default function ParovaniPage() {
  const [issued, setIssued] = useSupabaseData<AnyInvoice[]>(ISSUED, () => []);
  const [finance, setFinance] = useSupabaseData<AnyInvoice[]>(FINANCE, () => []);
  const [csv, setCsv] = useState("");
  const [done, setDone] = useState<Set<string>>(new Set());

  const invoices = useMemo(() => {
    // dedup dle čísla přes oba sklady (pro matching)
    const seen = new Set<string>();
    const out: AnyInvoice[] = [];
    for (const inv of [...issued, ...finance]) {
      const k = (inv.cislo || "").trim().toLowerCase();
      if (k && seen.has(k)) continue;
      if (k) seen.add(k);
      out.push(inv);
    }
    return out;
  }, [issued, finance]);

  const suggestions: MatchSuggestion[] = useMemo(() => {
    if (!csv.trim()) return [];
    const txs = parseBankCsv(csv);
    return matchPayments(txs, invoices)
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.confidence] - { high: 0, medium: 1, low: 2 }[b.confidence]));
  }, [csv, invoices]);

  const markPaid = (cislo: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const patch = (arr: AnyInvoice[]) =>
      arr.map((inv) => (inv.cislo === cislo ? { ...inv, stav: "Zaplacena", datumZaplaceni: today } as AnyInvoice & { datumZaplaceni: string } : inv));
    setIssued((prev) => patch(prev));
    setFinance((prev) => patch(prev));
    setDone((prev) => new Set(prev).add(cislo));
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCsv(String(r.result ?? ""));
    r.readAsText(f, "utf-8");
  };

  const txCount = csv.trim() ? parseBankCsv(csv).length : 0;

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <Landmark className="w-5 h-5" style={{ color: "#5B5EFF" }} /> Párování plateb
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">
          Nahraj CSV výpis z banky (FIO, KB, ČSOB…). Napárujeme příchozí platby na nezaplacené faktury podle VS a částky. Vše jen v prohlížeči.
        </p>
      </div>

      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <label className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer"
            style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: "#5B5EFF" }}>
            <Upload className="w-3.5 h-3.5" /> Nahrát CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </label>
          {csv && (
            <button onClick={() => setCsv("")} className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] text-[--muted-foreground]">
              <X className="w-3.5 h-3.5" /> Vyčistit
            </button>
          )}
          {csv && <span className="text-[12px] text-[--muted-foreground]">{txCount} příchozích plateb · {suggestions.length} napárováno</span>}
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="…nebo sem vlož obsah CSV výpisu (hlavička s Datum;Částka;VS;Zpráva)"
          className="w-full px-3 py-2 rounded-[8px] text-[12px] font-mono outline-none"
          style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)", minHeight: 90 }}
        />
      </div>

      {csv.trim() && suggestions.length === 0 && (
        <div className="glass-card p-6 text-center text-[13px] text-[--muted-foreground]">
          Žádná platba se nenapárovala na nezaplacenou fakturu. Zkontroluj, že CSV má sloupce s částkou a VS.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="glass-card divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {suggestions.map((s, i) => {
            const st = CONF_STYLE[s.confidence];
            const isDone = done.has(s.invoiceCislo);
            const amtDiff = Math.round(s.invoiceCastka) !== Math.round(s.tx.amount);
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[5px] shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">
                    {s.invoiceCislo} · {s.invoiceKlient} · {fmtKc(s.invoiceCastka)}
                  </p>
                  <p className="text-[11px] text-[--muted-foreground]">
                    {s.reason}
                    {s.tx.vs && ` · VS ${s.tx.vs}`}
                    {amtDiff && ` · přišlo ${fmtKc(s.tx.amount)}`}
                    {s.tx.date && ` · ${s.tx.date}`}
                  </p>
                </div>
                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold shrink-0" style={{ color: "oklch(0.7 0.17 155)" }}>
                    <Check className="w-4 h-4" /> Zaplaceno
                  </span>
                ) : (
                  <button onClick={() => markPaid(s.invoiceCislo)}
                    className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold shrink-0"
                    style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.3)", color: "oklch(0.7 0.17 155)" }}>
                    <Check className="w-3.5 h-3.5" /> Označit zaplaceno
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
