import type { ElementType } from "react";

/**
 * Sdílený prázdný stav — místo prázdné plochy dá kontext a výzvu k akci.
 * Použití: když seznam / tabulka nemá žádná data.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon?: ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && (
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
          style={{ background: "rgba(91,94,255,0.10)", border: "1px solid rgba(91,94,255,0.20)" }}
        >
          <Icon className="w-5 h-5" style={{ color: "#5B5EFF" }} />
        </div>
      )}
      <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-outfit)" }}>
        {title}
      </p>
      {hint && <p className="text-[12px] text-[--muted-foreground] mt-1.5 max-w-[300px] leading-relaxed">{hint}</p>}
    </div>
  );
}
