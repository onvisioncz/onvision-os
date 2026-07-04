"use client";

/**
 * Upomínky — pro faktury po splatnosti připraví zdvořilý text upomínky
 * (tón se stupňuje podle dní po splatnosti). NEODESÍLÁ nic sám — jen zkopíruješ
 * text nebo otevřeš předvyplněný e-mail a odešleš po kontrole.
 */
import { useState, useMemo } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { overdueInvoices, type AnyInvoice } from "@/lib/overdue";
import { buildUpominka } from "@/lib/upominky";
import { DODAVATEL } from "@/lib/invoice";
import { fmtKc } from "@/lib/format";
import { BellRing, Copy, Mail, Check } from "lucide-react";

const LEVEL_STYLE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "1. připomenutí", bg: "rgba(91,94,255,0.14)", color: "#5B5EFF" },
  2: { label: "2. upomínka", bg: "rgba(234,179,8,0.16)", color: "oklch(0.75 0.15 85)" },
  3: { label: "poslední výzva", bg: "rgba(229,72,77,0.14)", color: "oklch(0.65 0.2 25)" },
};

export default function UpominkyPage() {
  const [issued] = useSupabaseData<AnyInvoice[]>("ov-issued-invoices", () => []);
  const [finance] = useSupabaseData<AnyInvoice[]>("ov-finance-faktury", () => []);
  const [copied, setCopied] = useState<string | null>(null);

  const overdue = useMemo(() => overdueInvoices(issued, finance).items, [issued, finance]);

  const upominky = useMemo(() => overdue.map((o) => ({
    o,
    u: buildUpominka({
      cislo: o.cislo, klient: o.klient, castka: o.castka, dnuPoSplatnosti: o.dnuPoSplatnosti,
      iban: DODAVATEL.iban, vs: o.cislo.replace(/\D/g, ""),
    }),
  })), [overdue]);

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };
  const mailto = (subject: string, body: string) =>
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const totalOverdue = overdue.reduce((s, o) => s + o.castka, 0);

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <BellRing className="w-5 h-5" style={{ color: "#5B5EFF" }} /> Upomínky
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">
          Faktury po splatnosti s připraveným textem upomínky. Nic se neodesílá samo — zkopíruj nebo otevři v e-mailu a pošli po kontrole.
        </p>
      </div>

      {overdue.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Check className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.7 0.17 155)" }} />
          <p className="text-[14px] font-semibold">Nic po splatnosti 🎉</p>
          <p className="text-[12px] text-[--muted-foreground] mt-1">Všechny faktury jsou v termínu nebo zaplacené.</p>
        </div>
      ) : (
        <>
          <div className="glass-card px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-[13px] text-[--muted-foreground]">{overdue.length} faktur po splatnosti</span>
            <span className="text-[15px] font-bold" style={{ color: "oklch(0.65 0.2 25)" }}>{fmtKc(totalOverdue)}</span>
          </div>
          <div className="space-y-3">
            {upominky.map(({ o, u }) => {
              const st = LEVEL_STYLE[u.level];
              const key = o.cislo || `${o.klient}-${o.castka}`;
              return (
                <div key={key} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[5px] shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{o.klient} · {o.cislo}</p>
                      <p className="text-[12px] text-[--muted-foreground]">{fmtKc(o.castka)} · {o.dnuPoSplatnosti} dní po splatnosti</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => copyText(key, u.text)}
                        className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                        style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                        {copied === key ? <><Check className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.17 155)" }} /> Zkopírováno</> : <><Copy className="w-3.5 h-3.5" /> Kopírovat</>}
                      </button>
                      <a href={mailto(u.subject, u.text)}
                        className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                        style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: "#5B5EFF" }}>
                        <Mail className="w-3.5 h-3.5" /> E-mail
                      </a>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-[11px] text-[--muted-foreground] cursor-pointer select-none">náhled textu</summary>
                    <pre className="mt-2 p-3 rounded-[8px] text-[12px] whitespace-pre-wrap" style={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "inherit" }}>{u.text}</pre>
                  </details>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
