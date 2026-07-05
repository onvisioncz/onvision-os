"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, TrendingUp, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { parseDeadline, daysUntil } from "@/lib/dates";
import { clientHealth } from "@/lib/client-health";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ClientAvatar } from "@/components/ui/client-avatar";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Deliverable { id: number; text: string; done: boolean; category: string; }

interface RetainerClient {
  id: number;
  name: string;
  logo: string;
  color: string;
  pausal: number;
  reklama?: number;
  fakturace: "s.r.o." | "IČO";
  zodpovedna?: string;
  aktivni: boolean;
  mesic: string;
  deliverables: Deliverable[];
  poznamka: string;
  kontakt: string;
  zacatek: string;
  hodinMesic?: number;        // alokované hodiny (z /projects/monthly)
  hodinOdpracovano?: number;  // odpracované hodiny
}

interface IssuedInvoice {
  id: number;
  klient: string;
  klientNazev?: string;
  castka: number;
  stav: "Zaplacena" | "Čeká na platbu";
  datumVystaveni: string;
  datumSplatnosti?: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + " M Kč";
  if (n >= 1_000)     return Math.round(n / 1_000) + " k Kč";
  return n.toLocaleString("cs-CZ") + " Kč";
}

function clientMatch(invoiceName: string, clientName: string): boolean {
  const a = (invoiceName ?? "").toLowerCase().trim();
  const b = (clientName  ?? "").toLowerCase().trim();
  return a.includes(b) || b.includes(a);
}

/* ── KPI tile ───────────────────────────────────────────────────────────────── */
function KpiTile({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="rounded-[12px] px-5 py-4 flex-1 min-w-0"
      style={{ background: `${color} / 0.07`, border: `1px solid ${color} / 0.2` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: `${color}` }}>
        {label}
      </p>
      <p className="text-[22px] font-bold tracking-tight" style={{ color: "oklch(0.94 0.005 265)", fontFamily: "var(--font-outfit)" }}>
        {value}
      </p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.42 0.005 222)" }}>{sub}</p>}
    </div>
  );
}

/* ── Invoice status badge ───────────────────────────────────────────────────── */
function InvBadge({ stav }: { stav: "Zaplacena" | "Čeká na platbu" }) {
  const paid = stav === "Zaplacena";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: paid ? "oklch(0.68 0.18 155 / 0.12)" : "oklch(0.75 0.19 48 / 0.12)",
        color:      paid ? "oklch(0.68 0.18 155)"         : "oklch(0.75 0.19 48)",
      }}
    >
      {paid ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {paid ? "Zaplaceno" : "Čeká"}
    </span>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function KlientiPage() {
  const [clients,  , loadingClients]  = useSupabaseData<RetainerClient[]>("ov-monthly-clients",  () => []);
  const [invoices, , loadingInvoices] = useSupabaseData<IssuedInvoice[]>("ov-issued-invoices",   () => []);

  const loading = loadingClients || loadingInvoices;

  /* ── Per-client invoice aggregates ── */
  const clientStats = useMemo(() => {
    return clients.map(c => {
      const myInvoices = invoices.filter(inv =>
        clientMatch(inv.klientNazev ?? inv.klient, c.name)
      );
      const totalFakturovano = myInvoices.reduce((s, i) => s + i.castka, 0);
      const totalZaplaceno   = myInvoices.filter(i => i.stav === "Zaplacena").reduce((s, i) => s + i.castka, 0);
      const totalCeka        = myInvoices.filter(i => i.stav === "Čeká na platbu").reduce((s, i) => s + i.castka, 0);
      // Po splatnosti: nezaplacené s termínem v minulosti — delikvence svítí
      // červeně. Stejný fallback jako overdue.ts: bez čitelné splatnosti se
      // bere vystavení + 14 dní (chytí i rozbitá data typu "31.6.").
      const overdueSum = myInvoices
        .filter(i => i.stav === "Čeká na platbu")
        .filter(i => {
          let d = parseDeadline(i.datumSplatnosti ?? "");
          if (!d) {
            const vyst = parseDeadline(i.datumVystaveni ?? "");
            if (vyst) d = new Date(vyst.getTime() + 14 * 86_400_000);
          }
          return d ? daysUntil(d) < 0 : false;
        })
        .reduce((s, i) => s + i.castka, 0);
      const pocetFaktur      = myInvoices.length;
      const mrr              = c.pausal + (c.reklama ?? 0);
      const health           = clientHealth(c, overdueSum);
      return { ...c, totalFakturovano, totalZaplaceno, totalCeka, overdueSum, pocetFaktur, mrr, health };
    });
  }, [clients, invoices]);

  /* ── Export pro vedení: CSV všech klientů s finančním přehledem ── */
  const exportCsv = () => {
    const esc = (v: string | number) => { const s = String(v ?? ""); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const header = ["Klient", "Aktivní", "MRR", "Fakturováno", "Zaplaceno", "Čeká", "Po splatnosti"];
    const lines = [header.join(";")].concat(
      [...clientStats]
        .sort((a, b) => b.mrr - a.mrr)
        .map(c => [esc(c.name), c.aktivni ? "ano" : "ne", c.mrr, c.totalFakturovano, c.totalZaplaceno, c.totalCeka, c.overdueSum].join(";"))
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `onvision-klienti-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  /* ── Sorted: active first, then by MRR ── */
  const sorted = useMemo(() =>
    [...clientStats].sort((a, b) => {
      if (a.aktivni !== b.aktivni) return a.aktivni ? -1 : 1;
      return b.mrr - a.mrr;
    }),
    [clientStats]
  );

  /* ── Summary KPIs ── */
  const summary = useMemo(() => {
    const active = clientStats.filter(c => c.aktivni);
    const totalMrr         = active.reduce((s, c) => s + c.mrr, 0);
    const totalFakturovano = clientStats.reduce((s, c) => s + c.totalFakturovano, 0);
    const totalCeka        = clientStats.reduce((s, c) => s + c.totalCeka, 0);
    const atRisk           = active.filter(c => c.health.band === "riziko").length;
    return { totalMrr, totalFakturovano, totalCeka, activeCount: active.length, atRisk };
  }, [clientStats]);

  return (
    <div
      className="min-h-screen"
      style={{ background: "transparent", fontFamily: "var(--font-jakarta)" }}
    >
      {/* ── Header ── */}
      <div
        className="px-4 md:px-6 py-4 md:py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.62 0.27 265 / 0.14)", border: "1px solid oklch(0.62 0.27 265 / 0.25)" }}
          >
            <Building2 className="w-4 h-4" style={{ color: "oklch(0.72 0.18 265)" }} />
          </div>
          <div>
            <h1
              className="text-[20px] font-bold tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.96 0.005 265)" }}
            >
              Klienti
            </h1>
            <p className="text-[11px]" style={{ color: "oklch(0.38 0.005 222)" }}>
              Finanční přehled retainer klientů
            </p>
          </div>
        </div>
        <button onClick={exportCsv}
          className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
          style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.3)", color: "oklch(0.72 0.18 265)" }}
          title="Stáhne přehled klientů (MRR, fakturováno, čeká, po splatnosti) jako CSV">
          ↓ Export CSV
        </button>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">

        {/* ── KPI strip ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          style={{
            // workaround: oklch with "/" in JSX style
            ['--c1' as string]: "oklch(0.62 0.27 265)",
            ['--c2' as string]: "oklch(0.68 0.18 155)",
            ['--c3' as string]: "oklch(0.65 0.22 25)",
          }}
        >
          <div
            className="rounded-[12px] px-5 py-4 flex-1"
            style={{ background: "oklch(0.62 0.27 265 / 0.08)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.72 0.18 265)" }}>
              MRR · {summary.activeCount} aktivních
            </p>
            <p className="text-[22px] font-bold tracking-tight" style={{ color: "oklch(0.94 0.005 265)", fontFamily: "var(--font-outfit)" }}>
              {fmt(summary.totalMrr)}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: summary.atRisk > 0 ? "oklch(0.62 0.24 25)" : "oklch(0.42 0.005 222)" }}>
              měsíčně{summary.atRisk > 0 ? ` · ${summary.atRisk} v riziku` : ""}
            </p>
          </div>

          <div
            className="rounded-[12px] px-5 py-4 flex-1"
            style={{ background: "oklch(0.68 0.18 155 / 0.08)", border: "1px solid oklch(0.68 0.18 155 / 0.2)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.68 0.18 155)" }}>
              Celkem fakturováno
            </p>
            <p className="text-[22px] font-bold tracking-tight" style={{ color: "oklch(0.94 0.005 265)", fontFamily: "var(--font-outfit)" }}>
              {loading ? "..." : fmt(summary.totalFakturovano)}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.42 0.005 222)" }}>celkem od začátku</p>
          </div>

          <div
            className="rounded-[12px] px-5 py-4 flex-1"
            style={{
              background: summary.totalCeka > 0 ? "oklch(0.65 0.22 25 / 0.08)" : "oklch(1 0 0 / 0.03)",
              border: summary.totalCeka > 0 ? "1px solid oklch(0.65 0.22 25 / 0.25)" : "1px solid oklch(1 0 0 / 0.07)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: summary.totalCeka > 0 ? "oklch(0.75 0.19 48)" : "oklch(0.45 0.005 222)" }}>
              Čeká na platbu
            </p>
            <p className="text-[22px] font-bold tracking-tight" style={{ color: "oklch(0.94 0.005 265)", fontFamily: "var(--font-outfit)" }}>
              {loading ? "..." : summary.totalCeka > 0 ? fmt(summary.totalCeka) : "—"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.42 0.005 222)" }}>
              {summary.totalCeka > 0 ? "nezaplacené faktury" : "vše zaplaceno"}
            </p>
          </div>
        </motion.div>

        {/* ── Table (desktop) / Cards (mobile) ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          {/* ── Desktop table ── */}
          <div
            className="hidden md:block rounded-[14px] overflow-hidden"
            style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}
          >
            {/* Table header */}
            <div
              className="grid items-center px-5 py-3"
              style={{
                background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)",
                borderBottom: "1px solid oklch(1 0 0 / 0.08)",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
                gap: "12px",
              }}
            >
              {["Klient", "Paušál", "Reklama", "Celkem MRR", "Fakturováno", "Čeká", ""].map((h, i) => (
                <span key={i} className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "oklch(0.38 0.005 222)" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <SkeletonRows rows={6} className="px-4 py-4" />
            ) : sorted.length === 0 ? (
              <EmptyState icon={Building2} title="Zatím žádní klienti"
                hint="Klienti se sem načtou z Měsíčních klientů a Jednorázovek. Přidej prvního tam a objeví se tu s přehledem MRR a fakturace." />
            ) : (
              sorted.map((client, idx) => (
                <Link key={client.id} href={`/klienti/${client.id}`} className="block group">
                  <div
                    className="grid items-center px-5 py-4 transition-colors"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
                      gap: "12px",
                      borderBottom: idx < sorted.length - 1 ? "1px solid oklch(1 0 0 / 0.05)" : "none",
                      background: "transparent",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "oklch(1 0 0 / 0.025)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Klient */}
                    <div className="flex items-center gap-3 min-w-0">
                      <ClientAvatar name={client.name} fallback={client.logo} color={client.color} aktivni={client.aktivni} boxClass="w-12 h-12 rounded-[11px]" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[13px] font-semibold truncate"
                            style={{ color: client.aktivni ? "oklch(0.92 0.005 265)" : "oklch(0.42 0.005 222)" }}
                          >
                            {client.name}
                          </span>
                          {!client.aktivni && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.38 0.005 222)" }}>
                              Neaktivní
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {client.aktivni && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              title={`Health ${client.health.score}/100 · ${client.health.factors.map(f => `${f.label} ${f.score}`).join(" · ")}`}
                              style={{ background: `color-mix(in oklch, ${client.health.color} 16%, transparent)`, color: client.health.color }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: client.health.color }} />
                              {client.health.score}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: "oklch(0.36 0.005 222)" }}>
                            {client.fakturace} · od {client.zacatek || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Paušál */}
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: "oklch(0.80 0.005 265)" }}>
                      {client.pausal > 0 ? fmt(client.pausal) : "—"}
                    </span>

                    {/* Reklama */}
                    <span className="text-[13px] tabular-nums" style={{ color: "oklch(0.50 0.005 222)" }}>
                      {client.reklama ? fmt(client.reklama) : "—"}
                    </span>

                    {/* Celkem MRR */}
                    <span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: client.aktivni ? "oklch(0.68 0.18 155)" : "oklch(0.42 0.005 222)" }}
                    >
                      {fmt(client.mrr)}
                    </span>

                    {/* Fakturováno */}
                    <span className="text-[13px] tabular-nums" style={{ color: "oklch(0.60 0.005 222)" }}>
                      {client.pocetFaktur > 0 ? fmt(client.totalFakturovano) : "—"}
                    </span>

                    {/* Čeká (červeně, když je část po splatnosti) */}
                    <span className="text-[13px] tabular-nums font-semibold"
                      title={client.overdueSum > 0 ? `Po splatnosti: ${fmt(client.overdueSum)}` : undefined}
                      style={{ color: client.overdueSum > 0 ? "oklch(0.62 0.24 25)" : client.totalCeka > 0 ? "oklch(0.75 0.19 48)" : "oklch(0.40 0.005 222)" }}>
                      {client.totalCeka > 0 ? fmt(client.totalCeka) : "—"}
                      {client.overdueSum > 0 && <span className="block text-[9px] font-bold uppercase tracking-wide">po splatnosti</span>}
                    </span>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: "oklch(0.50 0.005 222)" }} />
                  </div>
                </Link>
              ))
            )}

            {/* Footer total row */}
            {!loading && sorted.length > 0 && (
              <div
                className="grid items-center px-5 py-3"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
                  gap: "12px",
                  borderTop: "1px solid oklch(1 0 0 / 0.1)",
                  background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)",
                }}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.40 0.005 222)" }}>
                  Celkem aktivní
                </span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: "oklch(0.72 0.18 265)" }}>
                  {fmt(sorted.filter(c => c.aktivni).reduce((s, c) => s + c.pausal, 0))}
                </span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: "oklch(0.72 0.18 265)" }}>
                  {fmt(sorted.filter(c => c.aktivni).reduce((s, c) => s + (c.reklama ?? 0), 0))}
                </span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: "oklch(0.68 0.18 155)" }}>
                  {fmt(summary.totalMrr)}
                </span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: "oklch(0.60 0.005 222)" }}>
                  {fmt(summary.totalFakturovano)}
                </span>
                <span className="text-[12px] font-bold tabular-nums"
                  style={{ color: summary.totalCeka > 0 ? "oklch(0.75 0.19 48)" : "oklch(0.40 0.005 222)" }}>
                  {summary.totalCeka > 0 ? fmt(summary.totalCeka) : "—"}
                </span>
                <span />
              </div>
            )}
          </div>

          {/* ── Mobile card list ── */}
          <div className="md:hidden flex flex-col gap-2">
            {loading ? (
              <SkeletonRows rows={5} className="px-4 py-4" />
            ) : sorted.length === 0 ? (
              <EmptyState icon={Building2} title="Zatím žádní klienti"
                hint="Přidej klienty v Měsíčních klientech nebo Jednorázovkách." />
            ) : (
              sorted.map(client => (
                <Link key={client.id} href={`/klienti/${client.id}`}>
                  <div
                    className="rounded-[12px] p-4 flex flex-col gap-3"
                    style={{
                      background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderLeft: `3px solid ${client.color}`,
                    }}
                  >
                    {/* Top row: avatar + name + arrow */}
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.name} fallback={client.logo} color={client.color} aktivni={client.aktivni} boxClass="w-12 h-12 rounded-[11px]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[14px] font-bold"
                            style={{ fontFamily: "var(--font-outfit)", color: client.aktivni ? "oklch(0.92 0.005 265)" : "oklch(0.42 0.005 222)", letterSpacing: "-0.01em" }}
                          >
                            {client.name}
                          </span>
                          {!client.aktivni && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.38 0.005 222)" }}>
                              Neaktivní
                            </span>
                          )}
                          {client.aktivni && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `color-mix(in oklch, ${client.health.color} 16%, transparent)`, color: client.health.color }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: client.health.color }} />
                              {client.health.score}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px]" style={{ color: "oklch(0.40 0.005 222)" }}>
                          {client.fakturace} · od {client.zacatek || "—"}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "oklch(0.35 0.005 222)" }} />
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.38 0.005 222)" }}>MRR</p>
                        <p className="text-[13px] font-bold tabular-nums" style={{ fontFamily: "var(--font-outfit)", color: client.aktivni ? "oklch(0.68 0.18 155)" : "oklch(0.42 0.005 222)" }}>
                          {fmt(client.mrr)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.38 0.005 222)" }}>Fakt.</p>
                        <p className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.60 0.005 222)" }}>
                          {client.pocetFaktur > 0 ? fmt(client.totalFakturovano) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.38 0.005 222)" }}>
                          {client.overdueSum > 0 ? "Po splatnosti" : "Čeká"}
                        </p>
                        <p className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-outfit)", color: client.overdueSum > 0 ? "oklch(0.62 0.24 25)" : client.totalCeka > 0 ? "oklch(0.75 0.19 48)" : "oklch(0.40 0.005 222)" }}>
                          {client.totalCeka > 0 ? fmt(client.totalCeka) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
