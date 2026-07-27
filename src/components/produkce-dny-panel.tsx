"use client";

import { useMemo } from "react";
import { CalendarRange, Users } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { odmenyByPerson, type ProdukcniDen } from "@/lib/produkce-dny";

const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ").format(n || 0) + ",- Kč";

/**
 * „Co platíme" z produkčních dní — přehled odměn po lidech + poslední dny.
 * Čte ov-produkce-dny (jen admin+fakturace). Zobrazuje se v Kreativě → Přehled.
 */
export function ProdukcniDnyPanel() {
  const [dny] = useSupabaseData<ProdukcniDen[]>("ov-produkce-dny", () => []);

  const rows = useMemo(() => odmenyByPerson(dny), [dny]);
  const recent = useMemo(() => [...(dny ?? [])].sort((a, b) => b.id - a.id).slice(0, 6), [dny]);
  const total = useMemo(() => rows.reduce((s, r) => s + r.celkem, 0), [rows]);

  if (!dny?.length) return null;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-bold text-[--foreground] flex items-center gap-2" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>
          <CalendarRange className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} /> Produkční dny — co platíme
        </p>
        <span className="text-[13px] font-bold" style={{ color: "oklch(0.72 0.2 265)" }}>{fmtKc(total)}</span>
      </div>

      {/* Odměny po lidech */}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.jmeno} className="flex items-center gap-2 text-[13px]">
            <span className="text-[--foreground] font-semibold flex-1">{r.jmeno}</span>
            <span className="text-[--muted-foreground] text-[11px]">{r.pocetDni} {r.pocetDni === 1 ? "den" : r.pocetDni < 5 ? "dny" : "dní"}</span>
            <span className="font-bold w-28 text-right" style={{ color: "oklch(0.72 0.16 155)" }}>{fmtKc(r.celkem)}</span>
          </div>
        ))}
      </div>

      {/* Poslední dny */}
      <div className="pt-2 border-t space-y-1.5" style={{ borderColor: "oklch(1 0 0 / 0.07)" }}>
        {recent.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-[12px]">
            <span className="text-[--muted-foreground] w-24 shrink-0">{d.datum}</span>
            <span className="text-[--foreground] truncate flex-1">{d.projekt}{d.lokace ? ` · ${d.lokace}` : ""}</span>
            <span className="text-[--muted-foreground] flex items-center gap-1 shrink-0"><Users className="w-3 h-3" />{d.people?.length ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
