"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, FileWarning, CheckSquare, ClipboardCheck, TrendingDown, Star, Camera, ShieldCheck, ArrowRight,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { buildProfit, type InvoiceLite, type ClientCost } from "@/lib/ziskovost";
import { overlaps, type GearReservation } from "@/lib/gear";
import { TIME_KEY, RATES_KEY, laborByClient, type TimeEntry } from "@/lib/vykazy";

interface Inv extends InvoiceLite { datumSplatnosti: string }
interface Task { status: string; deadline: string }
interface Approval { status: string }
interface Nps { score: number; createdAt: string }

const RED = "oklch(0.65 0.22 25)";
const AMBER = "oklch(0.74 0.165 75)";
const GREEN = "oklch(0.67 0.155 155)";

function parseCz(s: string, defYear: number): Date | null {
  const m = (s || "").match(/(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(\d{4}))?/);
  if (!m) return null;
  const d = new Date(m[3] ? +m[3] : defYear, +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}
const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);

interface Signal { key: string; count: number; label: string; detail?: string; href: string; color: string; icon: React.ElementType }

export function NerveCenter() {
  const [invoices] = useSupabaseData<Inv[]>("ov-issued-invoices", () => []);
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [approvals] = useSupabaseData<Approval[]>("ov-client-approvals", () => []);
  const [nps] = useSupabaseData<Nps[]>("ov-nps", () => []);
  const [reservations] = useSupabaseData<GearReservation[]>("ov-gear-reservations", () => []);
  const [costs] = useSupabaseData<ClientCost[]>("ov-client-costs", () => []);
  const [timeEntries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [rates] = useSupabaseData<Record<string, number>>(RATES_KEY, () => ({}));

  const signals = useMemo<Signal[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const out: Signal[] = [];

    // Faktury po splatnosti
    const overdue = invoices.filter((i) => i.stav !== "Zaplacena").filter((i) => { const d = parseCz(i.datumSplatnosti, year); return d && d < now; });
    if (overdue.length) out.push({ key: "inv", count: overdue.length, label: "faktur po splatnosti", detail: fmtKc(overdue.reduce((s, i) => s + (i.castka || 0), 0)), href: "/fakturace", color: RED, icon: FileWarning });

    // Úkoly po termínu
    const late = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseCz(t.deadline, year); return d && d < now; });
    if (late.length) out.push({ key: "task", count: late.length, label: "úkolů po termínu", href: "/ukoly", color: AMBER, icon: CheckSquare });

    // Čekající schválení klientů
    const pending = approvals.filter((a) => a.status === "Čeká").length;
    if (pending) out.push({ key: "appr", count: pending, label: "čeká na schválení klientem", href: "/klient-share", color: "oklch(0.62 0.27 265)", icon: ClipboardCheck });

    // Ztrátoví klienti (letos)
    const loss = buildProfit(invoices, costs, year, false, laborByClient(timeEntries, rates, year)).filter((r) => r.zisk < 0);
    if (loss.length) out.push({ key: "loss", count: loss.length, label: "ztrátových klientů", href: "/ziskovost", color: RED, icon: TrendingDown });

    // NPS pod 7 (posl. 90 dní)
    const ninety = new Date(now.getTime() - 90 * 86400000);
    const lowNps = nps.filter((n) => new Date(n.createdAt) >= ninety && n.score < 7).length;
    if (lowNps) out.push({ key: "nps", count: lowNps, label: "nízkých hodnocení klientů", href: "/klient-share", color: AMBER, icon: Star });

    // Kolize techniky
    let conflicts = 0;
    for (let i = 0; i < reservations.length; i++)
      for (let j = i + 1; j < reservations.length; j++)
        if (reservations[i].gearId === reservations[j].gearId && overlaps(reservations[i].od, reservations[i].do, reservations[j].od, reservations[j].do)) conflicts++;
    if (conflicts) out.push({ key: "gear", count: conflicts, label: "kolizí rezervací techniky", href: "/technika", color: RED, icon: Camera });

    return out;
  }, [invoices, tasks, approvals, nps, reservations, costs, timeEntries, rates]);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        <AlertTriangle className="w-3.5 h-3.5" style={{ color: signals.length ? AMBER : GREEN }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[--muted-foreground]">Nervové centrum</span>
      </div>
      {signals.length === 0 ? (
        <div className="glass-panel flex items-center gap-2 px-4 py-3 text-[13px]" style={{ color: GREEN }}>
          <ShieldCheck className="w-4 h-4" /> Vše v klidu — nic nehoří. 🎉
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => (
            <Link key={s.key} href={s.href} className="glass-panel group flex items-center gap-3 px-4 py-3" style={{ borderColor: `${s.color.replace(")", " / 0.35)")}` }}>
              <s.icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold leading-none" style={{ color: s.color, fontFamily: "var(--font-heading)" }}>
                  {s.count}{s.detail ? <span className="text-[12px] font-medium text-[--muted-foreground]"> · {s.detail}</span> : null}
                </div>
                <div className="text-[12px] text-[--muted-foreground] truncate">{s.label}</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[--muted-foreground] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
