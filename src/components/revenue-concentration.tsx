"use client";

import { useMemo } from "react";
import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { clientConcentration, type RevenueClient } from "@/lib/revenue-risk";

const fmt = (n: number) => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(n || 0);

const BAND = {
  "zdravé": { color: "oklch(0.7 0.17 155)", bg: "oklch(0.7 0.17 155 / 0.12)", icon: ShieldCheck, label: "Zdravé rozložení" },
  "pozor":  { color: "oklch(0.78 0.16 75)", bg: "oklch(0.78 0.16 75 / 0.12)", icon: Shield,      label: "Pozor na koncentraci" },
  "riziko": { color: "oklch(0.62 0.24 25)", bg: "oklch(0.62 0.24 25 / 0.12)", icon: ShieldAlert, label: "Riziko závislosti" },
} as const;

export function RevenueConcentration() {
  const [clients] = useSupabaseData<RevenueClient[]>("ov-monthly-clients", () => []);
  const r = useMemo(() => clientConcentration(clients), [clients]);

  if (r.totalMrr === 0) return null;
  const b = BAND[r.band];
  const Icon = b.icon;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: b.color }} />
          <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>Koncentrace obratu</h3>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: b.color, background: b.bg }}>{b.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat label="Největší klient" value={`${Math.round(r.topShare)} %`} sub={r.topClient?.name ?? "—"} color={b.color} />
        <Stat label="Top 3 klienti" value={`${Math.round(r.top3Share)} %`} sub={`z ${fmt(r.totalMrr)} Kč MRR`} />
        <Stat label="HHI index" value={fmt(r.hhi)} sub={r.hhi >= 2500 ? "vysoká koncentrace" : "rozloženo"} />
      </div>

      {/* Podíly top klientů — jednoduchý bar */}
      <div className="space-y-1.5">
        {r.clients.slice(0, 5).map((c) => (
          <div key={c.name} className="flex items-center gap-2">
            <span className="text-[12px] w-28 shrink-0 truncate" style={{ color: "var(--foreground)" }}>{c.name}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${c.share}%`, background: c.share >= 40 ? BAND.riziko.color : c.share >= 25 ? BAND.pozor.color : "oklch(0.62 0.19 265)" }} />
            </div>
            <span className="text-[11px] w-10 text-right shrink-0" style={{ color: "var(--muted-foreground)" }}>{Math.round(c.share)} %</span>
          </div>
        ))}
      </div>

      {r.band !== "zdravé" && (
        <p className="text-[11px] mt-3" style={{ color: "var(--muted-foreground)" }}>
          {r.topClient?.name} tvoří {Math.round(r.topShare)} % paušálního obratu. Zvaž rozložení rizika — získat další klienty nebo rozšířit spolupráci u menších.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="rounded-[10px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-[18px] font-bold leading-none" style={{ fontFamily: "var(--font-outfit)", color: color ?? "var(--foreground)" }}>{value}</p>
      <p className="text-[11px] mt-1 truncate" style={{ color: "var(--muted-foreground)" }}>{sub}</p>
    </div>
  );
}
