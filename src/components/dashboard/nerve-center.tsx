"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, FileWarning, CheckSquare, ClipboardCheck, TrendingDown, Star, Camera, ShieldCheck,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { buildProfit, type InvoiceLite, type ClientCost } from "@/lib/ziskovost";
import { overlaps, type GearReservation } from "@/lib/gear";
import { TIME_KEY, RATES_KEY, laborByClient, type TimeEntry } from "@/lib/vykazy";
import { parseDeadline } from "@/lib/dates";
import { overdueInvoices, type AnyInvoice } from "@/lib/overdue";

interface Inv extends InvoiceLite { datumSplatnosti: string }
interface Task { status: string; deadline: string }
interface Approval { status: string }
interface Nps { score: number; createdAt: string }

const RED = "oklch(0.65 0.22 25)";
const AMBER = "oklch(0.74 0.165 75)";
const GREEN = "oklch(0.67 0.155 155)";

// Sdílený parser termínů (umí "8. 7." i ISO "2026-07-08") — viz lib/dates.
const parseCz = (s: string, _defYear: number) => parseDeadline(s || "");
const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);

interface Signal { key: string; count: number; label: string; detail?: string; href: string; color: string; icon: React.ElementType }

export function NerveCenter() {
  const [invoices] = useSupabaseData<Inv[]>("ov-issued-invoices", () => []);
  const [financeFaktury] = useSupabaseData<AnyInvoice[]>("ov-finance-faktury", () => []);
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

    // Faktury po splatnosti — sloučené oba sklady (Fakturace + Finance), dedup dle čísla
    const overdue = overdueInvoices(invoices as AnyInvoice[], financeFaktury);
    if (overdue.count) out.push({ key: "inv", count: overdue.count, label: overdue.count === 1 ? "faktura po splatnosti" : "faktur po splatnosti", detail: fmtKc(overdue.total), href: "/fakturace", color: RED, icon: FileWarning });

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

    // Reference radar: nadšení klienti (NPS ≥ 9) = zralí na recenzi / case study
    const promoters = nps.filter((n) => new Date(n.createdAt) >= ninety && n.score >= 9).length;
    if (promoters) out.push({ key: "ref", count: promoters, label: promoters === 1 ? "klient zralý na referenci" : "klientů zralých na referenci", href: "/klient-share", color: GREEN, icon: Star });

    // Kolize techniky
    let conflicts = 0;
    for (let i = 0; i < reservations.length; i++)
      for (let j = i + 1; j < reservations.length; j++)
        if (reservations[i].gearId === reservations[j].gearId && overlaps(reservations[i].od, reservations[i].do, reservations[j].od, reservations[j].do)) conflicts++;
    if (conflicts) out.push({ key: "gear", count: conflicts, label: "kolizí rezervací techniky", href: "/technika", color: RED, icon: Camera });

    return out;
  }, [invoices, financeFaktury, tasks, approvals, nps, reservations, costs, timeEntries, rates]);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[--muted-foreground] mr-1 flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" style={{ color: signals.length ? AMBER : GREEN }} /> Nervové centrum
      </span>
      {signals.length === 0 ? (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold" style={{ color: GREEN, background: "oklch(0.67 0.155 155 / 0.12)" }}>
          <ShieldCheck className="w-3.5 h-3.5" /> Vše v klidu 🎉
        </span>
      ) : signals.map((s) => (
        <Link key={s.key} href={s.href} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] transition-transform hover:-translate-y-0.5"
          style={{ color: s.color, background: s.color.replace(")", " / 0.12)"), border: `1px solid ${s.color.replace(")", " / 0.28)")}` }}>
          <s.icon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold" style={{ fontFamily: "var(--font-heading)" }}>{s.count}</span>
          <span className="font-medium opacity-90">{s.label}{s.detail ? ` · ${s.detail}` : ""}</span>
        </Link>
      ))}
    </div>
  );
}
