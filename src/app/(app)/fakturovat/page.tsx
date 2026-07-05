"use client";

/**
 * Kontrola fakturace — kteří aktivní měsíční klienti ještě nemají fakturu za
 * PŘEDCHOZÍ měsíc. Pojistka proti zapomenutí. Read-only, odkaz vede do Fakturace.
 *
 * Konvence (viz banner ve Fakturaci): „Faktury se vydávají 1. pracovní den
 * v měsíci za předchozí měsíc." Proto kontrolujeme měsíc M-1, ne aktuální —
 * jinak by byli celý měsíc falešně červení všichni (fakturu za tenhle měsíc
 * nikdo nemá, vystaví se až příští měsíc).
 */
import { useMemo } from "react";
import Link from "next/link";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { invoicingStatus, type ClientLite, type IssuedLite } from "@/lib/invoicing-status";
import { fmtKc } from "@/lib/format";
import { ClipboardCheck, Check, ArrowRight } from "lucide-react";

const MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

export default function FakturovatPage() {
  const [clients] = useSupabaseData<ClientLite[]>("ov-monthly-clients", () => []);
  const [issued] = useSupabaseData<IssuedLite[]>("ov-issued-invoices", () => []);

  const now = new Date();
  // Fakturuje se předchozí měsíc (arrears) → kontrolujeme M-1 se správným
  // přechodem roku (leden → prosinec loňska).
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = prev.getMonth() + 1;
  const year = prev.getFullYear();

  const status = useMemo(() => invoicingStatus(clients, issued, month, year), [clients, issued, month, year]);
  const pendingSum = status.pending.reduce((s, c) => s + (c.pausal ?? 0), 0);

  return (
    <div className="p-5 md:p-7 max-w-[820px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <ClipboardCheck className="w-5 h-5" style={{ color: "#5B5EFF" }} /> Kontrola fakturace
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">
          Aktivní měsíční klienti, kteří ještě nemají fakturu za <b>{MONTHS[month - 1]} {year}</b>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card p-4">
          <p className="text-[11px] uppercase tracking-[0.06em] text-[--muted-foreground]">Chybí vyfakturovat</p>
          <p className="text-[26px] font-bold leading-none mt-1" style={{ color: status.pending.length ? "oklch(0.75 0.15 60)" : "oklch(0.7 0.17 155)" }}>{status.pending.length}</p>
          {pendingSum > 0 && <p className="text-[12px] text-[--muted-foreground] mt-1">≈ {fmtKc(pendingSum)} paušál</p>}
        </div>
        <div className="glass-card p-4">
          <p className="text-[11px] uppercase tracking-[0.06em] text-[--muted-foreground]">Hotovo</p>
          <p className="text-[26px] font-bold leading-none mt-1" style={{ color: "oklch(0.7 0.17 155)" }}>{status.invoiced.length}</p>
        </div>
      </div>

      {status.pending.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Check className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.7 0.17 155)" }} />
          <p className="text-[14px] font-semibold">Všichni vyfakturováni 🎉</p>
          <p className="text-[12px] text-[--muted-foreground] mt-1">Za {MONTHS[month - 1]} má fakturu každý aktivní klient.</p>
        </div>
      ) : (
        <div className="glass-card divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {status.pending.map((c) => (
            <div key={c.name} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "oklch(0.75 0.15 60)" }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold truncate">{c.name}</p>
                {c.pausal ? <p className="text-[11px] text-[--muted-foreground]">paušál {fmtKc(c.pausal)}</p> : null}
              </div>
              <Link href="/fakturace" className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold shrink-0"
                style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: "#5B5EFF" }}>
                Vystavit <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {status.invoiced.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground] mb-2">Už vyfakturováno</p>
          <div className="flex flex-wrap gap-1.5">
            {status.invoiced.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-[6px]" style={{ background: "rgba(34,197,94,0.1)", color: "oklch(0.7 0.17 155)" }}>
                <Check className="w-3 h-3" /> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
