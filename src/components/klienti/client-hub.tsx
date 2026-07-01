"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Clock, Star, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { buildProfit, fmtKc, type ClientCost } from "@/lib/ziskovost";
import { laborByClient, type TimeEntry } from "@/lib/vykazy";

interface Inv { klient: string; castka: number; datumVystaveni: string; rokSluzby: number; stav: string }
interface Nps { klient: string; score: number; createdAt: string }
interface Share { klient: string; token: string }

const GREEN = "oklch(0.67 0.155 155)";
const RED = "oklch(0.65 0.22 25)";
const AMBER = "oklch(0.74 0.165 75)";
const PRIMARY = "oklch(0.62 0.27 265)";

export function ClientHub({ klientName }: { klientName: string }) {
  const [invoices] = useSupabaseData<Inv[]>("ov-issued-invoices", () => []);
  const [costs] = useSupabaseData<ClientCost[]>("ov-client-costs", () => []);
  const [entries] = useSupabaseData<TimeEntry[]>("ov-time-entries", () => []);
  const [rates] = useSupabaseData<Record<string, number>>("ov-team-rates", () => ({}));
  const [nps] = useSupabaseData<Nps[]>("ov-nps", () => []);
  const [shares] = useSupabaseData<Share[]>("ov-client-shares", () => []);
  const [copied, setCopied] = useState(false);

  const year = new Date().getFullYear();

  const profit = useMemo(() => {
    const rows = buildProfit(invoices, costs, year, false, laborByClient(entries, rates, year));
    return rows.find((r) => r.klient === klientName);
  }, [invoices, costs, entries, rates, year, klientName]);

  const hodiny = useMemo(() => entries.filter((e) => e.klient === klientName && e.datum.startsWith(String(year))).reduce((s, e) => s + (e.hodiny || 0), 0), [entries, klientName, year]);
  const latestNps = useMemo(() => nps.filter((n) => n.klient === klientName).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0], [nps, klientName]);
  const share = useMemo(() => shares.find((s) => s.klient === klientName), [shares, klientName]);

  const shareUrl = share ? (typeof window !== "undefined" ? `${window.location.origin}/k/${share.token}` : `/k/${share.token}`) : null;
  const copy = () => { if (shareUrl) { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  const zisk = profit?.zisk ?? 0;

  return (
    <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4 mb-5">
      <Stat label={`Zisk ${year}`} value={fmtKc(zisk)} color={zisk >= 0 ? GREEN : RED} icon={zisk >= 0 ? TrendingUp : TrendingDown} sub={profit ? `marže ${Math.round(profit.marze)} %` : "—"} href="/ziskovost" />
      <Stat label={`Hodiny ${year}`} value={`${hodiny.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} h`} color={PRIMARY} icon={Clock} href="/vykazy" />
      <Stat label="Spokojenost" value={latestNps ? `${latestNps.score}/10` : "—"} color={latestNps ? (latestNps.score >= 9 ? GREEN : latestNps.score >= 7 ? AMBER : RED) : "var(--muted-foreground)"} icon={Star} href="/klient-share" />
      {shareUrl ? (
        <div className="rounded-[10px] p-3 flex flex-col justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground] mb-1"><Share2 className="w-3 h-3" /> Klientský share</div>
          <div className="flex gap-1.5">
            <button onClick={copy} className="btn-tactile flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-[6px] text-[11px] font-semibold" style={{ background: PRIMARY, color: "white" }}>{copied ? <><Check className="w-3 h-3" /> OK</> : <><Copy className="w-3 h-3" /> Odkaz</>}</button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-tactile flex items-center px-2 py-1.5 rounded-[6px]" style={{ border: "1px solid var(--border)" }}><ExternalLink className="w-3.5 h-3.5" /></a>
          </div>
        </div>
      ) : (
        <Link href="/klient-share" className="rounded-[10px] p-3 flex flex-col justify-center items-center text-center" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
          <Share2 className="w-4 h-4 mb-1" style={{ color: PRIMARY }} />
          <span className="text-[11px] text-[--muted-foreground]">Vytvořit klientský share</span>
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, color, icon: Icon, sub, href }: { label: string; value: string; color: string; icon: React.ElementType; sub?: string; href: string }) {
  return (
    <Link href={href} className="rounded-[10px] p-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground] mb-1"><Icon className="w-3 h-3" style={{ color }} /> {label}</div>
      <div className="text-[18px] font-bold leading-none" style={{ color, fontFamily: "var(--font-heading)" }}>{value}</div>
      {sub && <div className="text-[11px] text-[--muted-foreground] mt-0.5">{sub}</div>}
    </Link>
  );
}
