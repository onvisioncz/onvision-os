"use client";

import { useState, useEffect } from "react";
import { CalendarRange, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";

const PRIMARY = "#5B5EFF";

interface Stored { review?: string; generatedAt?: string; obdobi?: string }

/** Render: ### nadpisy + odrážky + **tučně** (stejný styl jako AI brief). */
function ReviewBody({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-1.5">
      {lines.map((raw, i) => {
        const l = raw.trim();
        if (l.startsWith("###")) {
          return <p key={i} className="text-[11px] font-bold uppercase tracking-[0.08em] mt-3 first:mt-0" style={{ color: PRIMARY }}>{l.replace(/^#+\s*/, "")}</p>;
        }
        if (l.startsWith("-") || l.startsWith("•") || l.startsWith("*")) {
          return (
            <div key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }}>
              <span style={{ color: PRIMARY }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineBold(l.replace(/^[-•*]\s*/, "")) }} />
            </div>
          );
        }
        return <p key={i} className="text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }} dangerouslySetInnerHTML={{ __html: inlineBold(l) }} />;
      })}
    </div>
  );
}
function inlineBold(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function MonthlyReview() {
  // Cron 1. v měsíci předpřipraví přehled → zobraz ho rovnou.
  const [stored] = useSupabaseData<Stored | null>("ov-monthly-review", () => null);
  const [review, setReview] = useState<string | null>(null);
  const [obdobi, setObdobi] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!review && stored?.review) { setReview(stored.review); setObdobi(stored.obdobi ?? null); setAt(stored.generatedAt ?? null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  // Ruční přegenerování = spustí stejný cron server-side (staví snímek sám, jen admin).
  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/cron/monthly-review");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Nepodařilo se vygenerovat přehled."); return; }
      // Přečti čerstvě uložený výstup.
      const fresh = await fetch("/api/sync?key=ov-monthly-review").then((r) => r.json());
      const v: Stored = fresh?.value ?? {};
      setReview(v.review ?? null); setObdobi(v.obdobi ?? data.obdobi ?? null); setAt(v.generatedAt ?? new Date().toISOString());
    } catch {
      setError("Chyba spojení.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4" style={{ color: PRIMARY }} />
          <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>Měsíční byznys přehled{obdobi ? ` · ${obdobi}` : ""}</h3>
        </div>
        <button onClick={generate} disabled={loading}
          className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{ background: PRIMARY, color: "white" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : review ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Píšu…" : review ? "Aktualizovat" : "Vygenerovat"}
        </button>
      </div>
      <p className="text-[12px] text-[--muted-foreground] mb-3">Automaticky 1. v měsíci: obrat vs cíl, pohyb MRR, pipeline forecast a priority pro jednatele.</p>

      {error && <p className="text-[12px]" style={{ color: "oklch(0.68 0.2 25)" }}>{error}</p>}
      {loading && <p className="text-[12px] text-[--muted-foreground]">Čtu data za minulý měsíc a píšu přehled…</p>}
      {!review && !loading && !error && (
        <p className="text-[12px] text-[--muted-foreground]">Zatím bez přehledu — klikni na „Vygenerovat" a dostaneš shrnutí z reálných dat.</p>
      )}
      {review && !loading && (
        <>
          {at && (
            <p className="text-[11px] mb-2" style={{ color: "oklch(0.55 0.005 222)" }}>
              Připraveno {new Date(at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })} · klikni „Aktualizovat" pro čerstvá čísla
            </p>
          )}
          <ReviewBody text={review} />
        </>
      )}
    </div>
  );
}
