"use client";

import { useMemo } from "react";
import { Award, Clock } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { portfolioTenure, type TenureClient } from "@/lib/client-tenure";
import { pluralCz } from "@/lib/format";

const fmt = (n: number) => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(n || 0);
const mesicu = (n: number) => `${n} ${pluralCz(n, "měsíc", "měsíce", "měsíců")}`;

export function ClientLoyalty() {
  const [clients] = useSupabaseData<TenureClient[]>("ov-monthly-clients", () => []);
  const r = useMemo(() => portfolioTenure(clients, new Date()), [clients]);

  if (!r.clients.length) return null;

  return (
    <div className="rounded-[12px] px-5 py-4" style={{ background: "oklch(0.7 0.15 85 / 0.06)", border: "1px solid oklch(0.7 0.15 85 / 0.2)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4" style={{ color: "oklch(0.78 0.15 85)" }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.78 0.15 85)" }}>Loajalita &amp; hodnota klientů</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[18px] font-bold leading-none" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.94 0.005 265)" }}>{mesicu(r.prumerMesicu)}</p>
          <p className="text-[11px] mt-1" style={{ color: "oklch(0.5 0.005 222)" }}>průměrná spolupráce</p>
        </div>
        <div>
          <p className="text-[18px] font-bold leading-none truncate" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.94 0.005 265)" }}>{r.nejdeleClient?.name ?? "—"}</p>
          <p className="text-[11px] mt-1" style={{ color: "oklch(0.5 0.005 222)" }}>nejdéle s námi{r.nejdeleClient ? ` · ${mesicu(r.nejdeleClient.mesicu)}` : ""}</p>
        </div>
        <div>
          <p className="text-[18px] font-bold leading-none" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.78 0.15 85)" }}>{fmt(r.celkemLtv)} Kč</p>
          <p className="text-[11px] mt-1" style={{ color: "oklch(0.5 0.005 222)" }}>odhad LTV (dosud)</p>
        </div>
      </div>

      {/* Top 3 nejloajálnější */}
      <div className="flex flex-wrap gap-1.5">
        {r.clients.slice(0, 3).map((c, i) => (
          <span key={c.name} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.7 0.01 265)" }}>
            {i === 0 ? <Award className="w-3 h-3" style={{ color: "oklch(0.78 0.15 85)" }} /> : <Clock className="w-3 h-3" style={{ color: "oklch(0.78 0.15 85)" }} />}
            {c.name} · {mesicu(c.mesicu)}
          </span>
        ))}
      </div>
    </div>
  );
}
