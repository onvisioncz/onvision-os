"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Download, Plus, Trash2,
  ChevronDown, ChevronRight, Percent,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  CLIENT_COSTS_KEY, COST_TYPY, buildProfit, invoiceYear, fmtKc,
  type ClientCost, type CostTyp, type InvoiceLite,
} from "@/lib/ziskovost";

interface RetainerLite { name: string }

const GREEN = "oklch(0.67 0.155 155)";
const RED = "oklch(0.65 0.22 25)";
const PRIMARY = "oklch(0.62 0.27 265)";

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join(";"))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: React.ElementType }) {
  return (
    <div className="flex-1 min-w-[150px] p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[11px] font-semibold tracking-[0.04em] uppercase text-[--muted-foreground]">{label}</span>
      </div>
      <div className="text-[22px] font-bold" style={{ color, fontFamily: "var(--font-heading)" }}>{value}</div>
    </div>
  );
}

const iCls = "px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

export default function ZiskovostPage() {
  const { user, loading: roleLoading } = useUserRole();
  const [invoices] = useSupabaseData<InvoiceLite[]>("ov-issued-invoices", () => []);
  const [costs, setCosts] = useSupabaseData<ClientCost[]>(CLIENT_COSTS_KEY, () => []);
  const [retainers] = useSupabaseData<RetainerLite[]>("ov-monthly-clients", () => []);

  const nowYear = new Date().getFullYear();
  const [rok, setRok] = useState(nowYear);
  const [jenZaplacene, setJenZaplacene] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCost, setNewCost] = useState<{ klient: string; typ: CostTyp; popis: string; castka: string }>({ klient: "", typ: "Odměny", popis: "", castka: "" });

  const years = useMemo(() => {
    const s = new Set<number>([nowYear]);
    invoices.forEach((i) => { const y = invoiceYear(i); if (y) s.add(y); });
    return [...s].sort((a, b) => b - a);
  }, [invoices, nowYear]);

  const rows = useMemo(() => buildProfit(invoices, costs, rok, jenZaplacene), [invoices, costs, rok, jenZaplacene]);
  const totals = useMemo(() => rows.reduce((a, r) => ({ p: a.p + r.prijmy, n: a.n + r.naklady, z: a.z + r.zisk }), { p: 0, n: 0, z: 0 }), [rows]);
  const avgMarze = totals.p > 0 ? Math.round((totals.z / totals.p) * 100) : 0;

  const clientNames = useMemo(() => {
    const s = new Set<string>();
    invoices.forEach((i) => i.klient && s.add(i.klient));
    retainers.forEach((r) => r.name && s.add(r.name));
    costs.forEach((c) => c.klient && s.add(c.klient));
    return [...s].sort();
  }, [invoices, retainers, costs]);

  const canEdit = !!user && (user.roles.includes("admin") || user.roles.includes("fakturace"));

  const addCost = () => {
    if (!newCost.klient.trim() || !newCost.castka) return;
    setCosts((prev) => [...prev, { id: Date.now(), klient: newCost.klient.trim(), rok, typ: newCost.typ, popis: newCost.popis.trim(), castka: Number(newCost.castka) }]);
    setNewCost({ klient: "", typ: "Odměny", popis: "", castka: "" });
    setAdding(false);
  };
  const delCost = (id: number) => setCosts((prev) => prev.filter((c) => c.id !== id));

  const doExport = () => exportCSV(rows.map((r) => ({ Klient: r.klient, Prijmy: r.prijmy, Naklady: r.naklady, Zisk: r.zisk, Marze_pct: Math.round(r.marze) })), `ziskovost-${rok}.csv`);

  if (roleLoading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !(user.roles.includes("admin") || user.roles.includes("fakturace"))) {
    return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;
  }

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Ziskovost na klienta</h1>
          <p className="text-[13px] text-[--muted-foreground]">Příjmy (z faktur) minus náklady — kdo vydělává a kdo nás stojí</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className={iCls} style={iStyle} value={rok} onChange={(e) => setRok(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-[--muted-foreground] cursor-pointer">
            <input type="checkbox" checked={jenZaplacene} onChange={(e) => setJenZaplacene(e.target.checked)} /> jen zaplacené
          </label>
          <button onClick={doExport} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Stat label="Příjmy" value={fmtKc(totals.p)} color={PRIMARY} icon={Wallet} />
        <Stat label="Náklady" value={fmtKc(totals.n)} color={RED} icon={TrendingDown} />
        <Stat label="Zisk" value={fmtKc(totals.z)} color={totals.z >= 0 ? GREEN : RED} icon={TrendingUp} />
        <Stat label="Průměrná marže" value={`${avgMarze} %`} color={avgMarze >= 0 ? GREEN : RED} icon={Percent} />
      </div>

      {/* Add cost */}
      {canEdit && (
        <div className="mb-4">
          {adding ? (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <input list="zk-clients" className={iCls} style={{ ...iStyle, flex: 1, minWidth: 140 }} placeholder="Klient" value={newCost.klient} onChange={(e) => setNewCost({ ...newCost, klient: e.target.value })} />
              <datalist id="zk-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist>
              <select className={iCls} style={iStyle} value={newCost.typ} onChange={(e) => setNewCost({ ...newCost, typ: e.target.value as CostTyp })}>{COST_TYPY.map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <input className={iCls} style={{ ...iStyle, flex: 1, minWidth: 120 }} placeholder="Popis" value={newCost.popis} onChange={(e) => setNewCost({ ...newCost, popis: e.target.value })} />
              <input type="number" className={iCls} style={{ ...iStyle, width: 120 }} placeholder="Kč" value={newCost.castka} onChange={(e) => setNewCost({ ...newCost, castka: e.target.value })} />
              <button onClick={addCost} disabled={!newCost.klient.trim() || !newCost.castka} className="btn-tactile px-3 py-2 rounded-[7px] text-[12px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Přidat</button>
              <button onClick={() => setAdding(false)} className="btn-tactile px-3 py-2 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}>Zrušit</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
              <Plus className="w-3.5 h-3.5" /> Přidat náklad
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.04em] text-[--muted-foreground]" style={{ background: "var(--card)" }}>
              <th className="px-4 py-3 font-semibold">Klient</th>
              <th className="px-4 py-3 font-semibold text-right">Příjmy</th>
              <th className="px-4 py-3 font-semibold text-right">Náklady</th>
              <th className="px-4 py-3 font-semibold text-right">Zisk</th>
              <th className="px-4 py-3 font-semibold text-right">Marže</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[--muted-foreground]">Za rok {rok} zatím nejsou žádná data. Příjmy se načtou z faktur, náklady přidej tlačítkem výše.</td></tr>
            )}
            {rows.map((r) => {
              const isOpen = expanded === r.klient;
              const clientCosts = costs.filter((c) => c.klient === r.klient && c.rok === rok);
              return (
                <Fragment key={r.klient}>
                  <tr className="border-t text-[13px] cursor-pointer" style={{ borderColor: "var(--border)" }} onClick={() => setExpanded(isOpen ? null : r.klient)}>
                    <td className="px-4 py-3 font-medium flex items-center gap-1.5">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[--muted-foreground]" /> : <ChevronRight className="w-3.5 h-3.5 text-[--muted-foreground]" />}
                      {r.klient}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{fmtKc(r.prijmy)}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "var(--font-heading)", color: RED }}>{r.naklady ? fmtKc(r.naklady) : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: "var(--font-heading)", color: r.zisk >= 0 ? GREEN : RED }}>{fmtKc(r.zisk)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: r.marze >= 0 ? GREEN : RED }}>{Math.round(r.marze)} %</td>
                    <td className="px-4 py-3" />
                  </tr>
                  {isOpen && (
                    <tr style={{ borderColor: "var(--border)" }}>
                      <td colSpan={6} className="px-4 py-3" style={{ background: "var(--background)" }}>
                        {clientCosts.length === 0 ? (
                          <p className="text-[12px] text-[--muted-foreground]">Žádné evidované náklady. Přidej je tlačítkem „Přidat náklad" nahoře.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {clientCosts.map((c) => (
                              <div key={c.id} className="flex items-center gap-3 text-[12px]">
                                <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold" style={{ color: PRIMARY, background: "oklch(0.62 0.27 265 / 0.1)" }}>{c.typ}</span>
                                <span className="text-[--muted-foreground] flex-1">{c.popis || "—"}</span>
                                <span className="font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{fmtKc(c.castka)}</span>
                                {canEdit && <button onClick={(e) => { e.stopPropagation(); delCost(c.id); }} className="btn-tactile p-1 rounded-[5px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3 h-3" /></button>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[--muted-foreground] mt-3">
        Příjmy se počítají automaticky z vydaných faktur za rok {rok}. Náklady (odměny, subdodávky, technika…) eviduješ ručně per klient.
      </p>
    </div>
  );
}
