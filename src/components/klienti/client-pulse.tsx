"use client";

/**
 * Klientský puls — jedna časová osa všeho, co se s klientem děje:
 * faktury (vystavení/zaplacení), vykázané hodiny, úkoly, NPS, schválení.
 * Odpovídá na otázku „co se u tohohle klienta naposledy dělo?" bez klikání
 * po pěti modulech.
 */
import { useMemo } from "react";
import { Activity, FileText, CheckCircle2, Clock, Star, ClipboardCheck, CheckSquare } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { parseDeadline } from "@/lib/dates";
import { TIME_KEY, type TimeEntry } from "@/lib/vykazy";

interface Inv { klient?: string; klientNazev?: string; cislo?: string; castka?: number; stav?: string; datumVystaveni?: string; datumZaplaceni?: string }
interface Task { nazev: string; projekt: string; prirazeno: string; status: string; deadline: string }
interface Nps { klient: string; score: number; createdAt: string }
interface Approval { klient: string; nazev?: string; status: string; createdAt?: string }

interface PulseEvent { d: Date; icon: React.ElementType; color: string; text: string; sub?: string }

const match = (a?: string, b?: string) => {
  const x = (a || "").toLowerCase().trim(), y = (b || "").toLowerCase().trim();
  return !!x && !!y && (x.includes(y) || y.includes(x));
};
const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);
const fmtD = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

export function ClientPulse({ clientName }: { clientName: string }) {
  const [invoices] = useSupabaseData<Inv[]>("ov-issued-invoices", () => []);
  const [entries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [nps] = useSupabaseData<Nps[]>("ov-nps", () => []);
  const [approvals] = useSupabaseData<Approval[]>("ov-client-approvals", () => []);

  const events = useMemo<PulseEvent[]>(() => {
    const out: PulseEvent[] = [];

    invoices.filter((i) => match(i.klientNazev ?? i.klient, clientName)).forEach((i) => {
      const vyst = parseDeadline(i.datumVystaveni ?? "");
      if (vyst) out.push({ d: vyst, icon: FileText, color: "#5B5EFF", text: `Faktura ${i.cislo ?? ""} vystavena`, sub: fmtKc(i.castka ?? 0) });
      const zapl = parseDeadline(i.datumZaplaceni ?? "");
      if (zapl && i.stav === "Zaplacena") out.push({ d: zapl, icon: CheckCircle2, color: "oklch(0.67 0.155 155)", text: `Faktura ${i.cislo ?? ""} zaplacena`, sub: fmtKc(i.castka ?? 0) });
    });

    entries.filter((e) => match(e.klient, clientName)).forEach((e) => {
      const d = parseDeadline(e.datum);
      if (d) out.push({ d, icon: Clock, color: "oklch(0.7 0.14 195)", text: `${e.kdo}: ${e.hodiny} h`, sub: e.projekt || e.popis || undefined });
    });

    tasks.filter((t) => match(t.projekt, clientName)).forEach((t) => {
      const d = parseDeadline(t.deadline);
      if (d) out.push({ d, icon: CheckSquare, color: t.status === "Hotovo" ? "oklch(0.67 0.155 155)" : "oklch(0.74 0.165 75)", text: `${t.status === "Hotovo" ? "Hotovo" : "Úkol"}: ${t.nazev}`, sub: t.prirazeno || undefined });
    });

    nps.filter((n) => match(n.klient, clientName)).forEach((n) => {
      const d = new Date(n.createdAt);
      if (!isNaN(d.getTime())) out.push({ d, icon: Star, color: n.score >= 9 ? "oklch(0.67 0.155 155)" : n.score < 7 ? "oklch(0.65 0.22 25)" : "oklch(0.74 0.165 75)", text: `Hodnocení NPS: ${n.score}/10` });
    });

    approvals.filter((a) => match(a.klient, clientName)).forEach((a) => {
      const d = a.createdAt ? new Date(a.createdAt) : null;
      if (d && !isNaN(d.getTime())) out.push({ d, icon: ClipboardCheck, color: a.status === "Čeká" ? "#5B5EFF" : "oklch(0.67 0.155 155)", text: `Schválení: ${a.nazev ?? ""} · ${a.status}` });
    });

    return out.sort((a, b) => b.d.getTime() - a.d.getTime()).slice(0, 25);
  }, [invoices, entries, tasks, nps, approvals, clientName]);

  if (events.length === 0) return null;

  return (
    <div className="glass-card p-5 mt-4">
      <h2 className="text-[14px] font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
        <Activity className="w-4 h-4" style={{ color: "#5B5EFF" }} /> Puls klienta
      </h2>
      <p className="text-[12px] text-[--muted-foreground] mb-3">Vše, co se u klienta dělo — faktury, hodiny, úkoly, hodnocení</p>
      <div className="relative pl-4" style={{ borderLeft: "1px solid rgba(255,255,255,0.09)" }}>
        {events.map((e, i) => (
          <div key={i} className="relative pb-3 last:pb-0">
            <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full" style={{ background: e.color, boxShadow: `0 0 0 3px color-mix(in oklch, ${e.color} 20%, transparent)` }} />
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>{e.text}</p>
                {e.sub && <p className="text-[11px] text-[--muted-foreground] truncate">{e.sub}</p>}
              </div>
              <span className="text-[11px] text-[--muted-foreground] shrink-0">{fmtD(e.d)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
