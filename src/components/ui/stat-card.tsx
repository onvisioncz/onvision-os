import type { ElementType } from "react";

/**
 * Sdílená KPI karta pro celou appku — jednotný vzhled „číslo nahoře".
 * Podporuje volitelnou ikonu i podřádek. Používá glass `.card` povrch,
 * aby seděla s ostatními kartami napříč sekcemi.
 */
export function StatCard({
  label,
  value,
  color,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  icon?: ElementType;
}) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: color ?? "var(--muted-foreground)" }} />}
        <p className="text-[10px] text-[--muted-foreground] font-semibold uppercase tracking-[0.06em] leading-tight">
          {label}
        </p>
      </div>
      <p
        className="num leading-none"
        style={{
          fontSize: "clamp(22px,3.5vw,30px)",
          fontWeight: 700,
          fontFamily: "var(--font-outfit)",
          color: color ?? "var(--foreground)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-[--muted-foreground] mt-1.5">{sub}</p>}
    </div>
  );
}
