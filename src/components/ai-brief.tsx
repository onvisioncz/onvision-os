"use client";

import { useState, useMemo } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { buildProfit, type InvoiceLite, type ClientCost } from "@/lib/ziskovost";
import { TIME_KEY, RATES_KEY, laborByClient, type TimeEntry } from "@/lib/vykazy";
import { parseDeadline } from "@/lib/dates";

interface Inv extends InvoiceLite { datumSplatnosti: string }
interface Task { status: string; deadline: string; nazev?: string; priorita?: string }
interface Approval { status: string }
interface Nps { score: number; createdAt: string }
interface MonthlyClient { name: string; pausal?: number; reklama?: number; aktivni?: boolean }

const PRIMARY = "#5B5EFF";

// Sdílený parser termínů (umí "8. 7." i ISO "2026-07-08") — viz lib/dates.
const parseCz = (s: string, _defYear: number) => parseDeadline(s || "");

/** Jednoduchý render briefu: ### nadpisy + odrážky. */
function BriefBody({ text }: { text: string }) {
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

export function AiBrief() {
  const [invoices] = useSupabaseData<Inv[]>("ov-issued-invoices", () => []);
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [approvals] = useSupabaseData<Approval[]>("ov-client-approvals", () => []);
  const [nps] = useSupabaseData<Nps[]>("ov-nps", () => []);
  const [costs] = useSupabaseData<ClientCost[]>("ov-client-costs", () => []);
  const [timeEntries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [rates] = useSupabaseData<Record<string, number>>(RATES_KEY, () => ({}));
  const [clients] = useSupabaseData<MonthlyClient[]>("ov-monthly-clients", () => []);

  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const snapshot = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const overdue = invoices.filter((i) => i.stav !== "Zaplacena").filter((i) => { const d = parseCz(i.datumSplatnosti, year); return d && d < now; });
    const late = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseCz(t.deadline, year); return d && d < now; });
    const open = tasks.filter((t) => t.status !== "Hotovo");
    const active = clients.filter((c) => c.aktivni !== false);
    const mrr = active.reduce((s, c) => s + (c.pausal || 0) + (c.reklama || 0), 0);
    const loss = buildProfit(invoices as InvoiceLite[], costs, year, false, laborByClient(timeEntries, rates, year)).filter((r) => r.zisk < 0);
    const ninety = new Date(now.getTime() - 90 * 86400000);
    const lowNps = nps.filter((n) => new Date(n.createdAt) >= ninety && n.score < 7).length;
    const pending = approvals.filter((a) => a.status === "Čeká").length;
    return {
      mrr,
      aktivnichKlientu: active.length,
      fakturyPoSplatnosti: { pocet: overdue.length, castka: overdue.reduce((s, i) => s + (i.castka || 0), 0) },
      ukolyPoTerminu: late.length,
      otevrenychUkolu: open.length,
      cekaNaSchvaleniKlientem: pending,
      ztratoviKlienti: loss.map((r) => r.klient).slice(0, 6),
      nizkeNPS: lowNps,
    };
  }, [invoices, tasks, approvals, nps, costs, timeEntries, rates, clients]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Nepodařilo se vygenerovat brief."); return; }
      setBrief(data.brief);
    } catch {
      setError("Chyba spojení.");
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true); setAnswer(null);
    try {
      const res = await fetch("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, snapshot }) });
      const data = await res.json();
      if (!res.ok) { setAnswer(data.error || "Nepodařilo se odpovědět."); return; }
      setAnswer(data.answer);
    } catch {
      setAnswer("Chyba spojení.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: PRIMARY }} />
          <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>AI týdenní brief</h3>
        </div>
        <button onClick={generate} disabled={loading}
          className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{ background: PRIMARY, color: "white" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : brief ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Píšu…" : brief ? "Znovu" : "Vygenerovat"}
        </button>
      </div>
      <p className="text-[12px] text-[--muted-foreground] mb-3">Claude přečte reálný stav firmy a napíše ti, co hoří a co rozhodnout.</p>

      {error && <p className="text-[12px]" style={{ color: "oklch(0.68 0.2 25)" }}>{error}</p>}
      {!brief && !loading && !error && (
        <p className="text-[12px] text-[--muted-foreground]">Klikni na „Vygenerovat" a dostaneš brief z aktuálních dat.</p>
      )}
      {loading && <p className="text-[12px] text-[--muted-foreground]">Čtu data firmy a píšu brief…</p>}
      {brief && !loading && <BriefBody text={brief} />}

      {/* Mini co-pilot: zeptej se na data */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
            placeholder="Zeptej se na data… např. kolik nám dluží klienti?"
            className="glass-input flex-1 px-3 py-2 text-[13px]"
          />
          <button onClick={ask} disabled={asking || !question.trim()}
            className="btn-tactile px-3 py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-50 shrink-0"
            style={{ background: "rgba(91,94,255,0.14)", border: "1px solid rgba(91,94,255,0.3)", color: PRIMARY }}>
            {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Zeptat se"}
          </button>
        </div>
        {answer && (
          <p className="text-[13px] leading-relaxed mt-3 px-3 py-2.5 rounded-[8px]"
            style={{ color: "var(--foreground)", background: "rgba(91,94,255,0.06)", border: "1px solid rgba(91,94,255,0.14)" }}>
            {answer}
          </p>
        )}
      </div>
    </div>
  );
}
