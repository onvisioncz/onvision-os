"use client";

import { useState, useMemo } from "react";
import { FileSignature, Plus, Trash2, AlertTriangle, Clock, Check, ExternalLink } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DEFAULT_USERS } from "@/lib/roles";
import { fmtKc } from "@/lib/format";
import {
  expiryInfo, contractSummary, CONTRACT_TYPY, CONTRACT_STRANY,
  type Contract, type ContractStrana, type ContractTyp, type ContractStav, type ExpiryBand,
} from "@/lib/contracts";

const iCls = "px-2.5 py-1.5 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)" } as const;
const todayISO = () => new Date().toISOString().slice(0, 10);

const BAND_COLOR: Record<ExpiryBand, string> = {
  "platná": "oklch(0.7 0.17 155)", "brzy": "oklch(0.78 0.165 75)", "vypršela": "oklch(0.65 0.22 25)",
  "neurčito": "oklch(0.6 0.02 265)", "neaktivní": "oklch(0.5 0.01 265)",
};
const fmtCz = (iso?: string) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "—";

export default function SmlouvyPage() {
  const { user, loading } = useUserRole();
  const [contracts, setContracts] = useSupabaseData<Contract[]>("ov-contracts", () => []);
  const [monthlyClients] = useSupabaseData<{ name: string; aktivni?: boolean }[]>("ov-monthly-clients", () => []);
  const [filter, setFilter] = useState<"vše" | ContractStrana>("vše");

  const today = useMemo(() => new Date(), []);
  const form0 = { strana: "klient" as ContractStrana, nazev: "", typ: "Rámcová smlouva" as ContractTyp, od: todayISO(), do: "", castka: "", stav: "aktivní" as ContractStav, soubor: "", poznamka: "" };
  const [form, setForm] = useState(form0);
  const [adding, setAdding] = useState(false);

  const sum = useMemo(() => contractSummary(contracts, today), [contracts, today]);

  const rows = useMemo(() => {
    const list = filter === "vše" ? contracts : contracts.filter((c) => c.strana === filter);
    return list
      .map((c) => ({ c, e: expiryInfo(c, today) }))
      .sort((a, b) => {
        const rank: Record<ExpiryBand, number> = { vypršela: 0, brzy: 1, platná: 2, neurčito: 3, neaktivní: 4 };
        return rank[a.e.band] - rank[b.e.band] || (a.e.daysLeft ?? 9e9) - (b.e.daysLeft ?? 9e9);
      });
  }, [contracts, filter, today]);

  // Našeptávač stran: měsíční klienti + tým
  const nazvyList = useMemo(() => {
    const clients = monthlyClients.filter((c) => c.aktivni !== false).map((c) => c.name);
    const team = DEFAULT_USERS.filter((u) => u.aktivni).map((u) => u.displayName);
    return [...new Set([...clients, ...team])].filter(Boolean);
  }, [monthlyClients]);

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !(user.roles.includes("admin") || user.roles.includes("fakturace"))) {
    return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;
  }

  const add = () => {
    if (!form.nazev.trim() || !form.od) return;
    setContracts((prev) => [...prev, {
      id: Date.now(), strana: form.strana, nazev: form.nazev.trim(), typ: form.typ,
      od: form.od, do: form.do || undefined, castka: form.castka ? Number(form.castka) : undefined,
      stav: form.stav, soubor: form.soubor.trim() || undefined, poznamka: form.poznamka.trim() || undefined,
      createdAt: new Date().toISOString(),
    }]);
    setForm(form0); setAdding(false);
  };
  const remove = (id: number) => setContracts((prev) => prev.filter((c) => c.id !== id));

  const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex-1 min-w-[120px] p-4 rounded-[12px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">{label}</p>
      <p className="text-[24px] font-bold mt-1" style={{ fontFamily: "var(--font-heading)", color }}>{value}</p>
    </div>
  );

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <FileSignature className="w-5 h-5" style={{ color: "oklch(0.62 0.27 265)" }} />
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Smlouvy &amp; dohody</h1>
            <p className="text-[13px] text-[--muted-foreground]">Evidence smluv, DPP/DPČ a NDA — s hlídáním platnosti</p>
          </div>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: "oklch(0.62 0.27 265)", color: "white" }}>
          <Plus className="w-3.5 h-3.5" /> Přidat smlouvu
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <Stat label="Celkem" value={sum.celkem} color="var(--foreground)" />
        <Stat label="Aktivních" value={sum.aktivnich} color="oklch(0.7 0.17 155)" />
        <Stat label="Brzy vyprší" value={sum.brzy} color="oklch(0.78 0.165 75)" />
        <Stat label="Vypršelé" value={sum.vyprsele} color="oklch(0.65 0.22 25)" />
      </div>

      {adding && (
        <div className="mb-5 p-4 rounded-[12px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Strana</span>
              <select className={iCls} style={iStyle} value={form.strana} onChange={(e) => setForm((f) => ({ ...f, strana: e.target.value as ContractStrana }))}>{CONTRACT_STRANY.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <label className="flex flex-col gap-1 md:col-span-2"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Koho se týká</span>
              <input list="smlouvy-nazvy" className={iCls} style={iStyle} value={form.nazev} placeholder="Klient / freelancer / dodavatel" onChange={(e) => setForm((f) => ({ ...f, nazev: e.target.value }))} />
              <datalist id="smlouvy-nazvy">{nazvyList.map((n) => <option key={n} value={n} />)}</datalist></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Typ</span>
              <select className={iCls} style={iStyle} value={form.typ} onChange={(e) => setForm((f) => ({ ...f, typ: e.target.value as ContractTyp }))}>{CONTRACT_TYPY.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Platnost od</span>
              <input type="date" className={iCls} style={iStyle} value={form.od} onChange={(e) => setForm((f) => ({ ...f, od: e.target.value }))} /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Platnost do <span className="normal-case opacity-60">(prázdné = neurčito)</span></span>
              <input type="date" className={iCls} style={iStyle} value={form.do} onChange={(e) => setForm((f) => ({ ...f, do: e.target.value }))} /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Částka / sazba (Kč)</span>
              <input type="number" className={iCls} style={iStyle} value={form.castka} placeholder="volitelné" onChange={(e) => setForm((f) => ({ ...f, castka: e.target.value }))} /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Stav</span>
              <select className={iCls} style={iStyle} value={form.stav} onChange={(e) => setForm((f) => ({ ...f, stav: e.target.value as ContractStav }))}>{(["aktivní", "návrh", "ukončená"] as ContractStav[]).map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <label className="flex flex-col gap-1 md:col-span-2"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Odkaz na PDF</span>
              <input className={iCls} style={iStyle} value={form.soubor} placeholder="https://… (volitelné)" onChange={(e) => setForm((f) => ({ ...f, soubor: e.target.value }))} /></label>
            <label className="flex flex-col gap-1 md:col-span-3"><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Poznámka</span>
              <input className={iCls} style={iStyle} value={form.poznamka} placeholder="volitelné" onChange={(e) => setForm((f) => ({ ...f, poznamka: e.target.value }))} /></label>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-[--muted-foreground]" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)" }}>Zrušit</button>
            <button onClick={add} disabled={!form.nazev.trim()} className="px-4 py-1.5 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: "oklch(0.62 0.27 265)", color: "white" }}>Uložit</button>
          </div>
        </div>
      )}

      {/* Filtr strany */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {(["vše", ...CONTRACT_STRANY] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="px-3 py-1.5 rounded-[7px] text-[12px] font-semibold capitalize"
            style={filter === s ? { background: "oklch(0.62 0.27 265 / 0.15)", color: "oklch(0.78 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.3)" } : { color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-[12px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {rows.length === 0 && <div className="px-4 py-10 text-center text-[13px] text-[--muted-foreground]">Zatím žádné smlouvy. Přidej první přes „Přidat smlouvu".</div>}
        {rows.map(({ c, e }) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--border)" }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold">{c.nazev}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--muted-foreground)" }}>{c.typ}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: "oklch(0.62 0.27 265 / 0.1)", color: "oklch(0.72 0.18 265)" }}>{c.strana}</span>
              </div>
              <div className="text-[11px] text-[--muted-foreground] mt-0.5">
                {fmtCz(c.od)} – {c.do ? fmtCz(c.do) : "neurčito"}{c.castka ? ` · ${fmtKc(c.castka)}` : ""}{c.poznamka ? ` · ${c.poznamka}` : ""}
              </div>
            </div>
            {c.soubor && <a href={c.soubor} target="_blank" rel="noreferrer" className="p-1.5 rounded-[6px] hover:bg-white/5" title="Otevřít PDF"><ExternalLink className="w-3.5 h-3.5 text-[--muted-foreground]" /></a>}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full shrink-0" style={{ background: `${BAND_COLOR[e.band].replace(")", " / 0.14)")}`, color: BAND_COLOR[e.band] }}>
              {e.band === "vypršela" ? <AlertTriangle className="w-3 h-3" /> : e.band === "brzy" ? <Clock className="w-3 h-3" /> : e.band === "platná" ? <Check className="w-3 h-3" /> : null}
              {e.label}
            </span>
            <button onClick={() => remove(c.id)} className="p-1.5 rounded-[6px] hover:bg-white/5 shrink-0" aria-label="Smazat"><Trash2 className="w-3.5 h-3.5 text-[--muted-foreground]" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
