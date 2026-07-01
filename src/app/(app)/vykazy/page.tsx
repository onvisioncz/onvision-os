"use client";

import { useState, useMemo } from "react";
import { Clock, Plus, Trash2, Download, User as UserIcon, Building2 } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DEFAULT_USERS } from "@/lib/roles";
import { TIME_KEY, monthPrefix, monthLabel, fmtHod, sumBy, type TimeEntry } from "@/lib/vykazy";

const PRIMARY = "oklch(0.62 0.27 265)";
const iCls = "glass-input px-3 py-2 text-[13px]";
const iStyle = {} as const;

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join(";"))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function VykazyPage() {
  const { user } = useUserRole();
  const [entries, setEntries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [clients] = useSupabaseData<{ name: string }[]>("ov-monthly-clients", () => []);

  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(monthPrefix(new Date()));
  const [onlyMe, setOnlyMe] = useState(false);
  const [form, setForm] = useState({ klient: "", projekt: "", datum: today, hodiny: "", popis: "" });

  const me = user?.displayName ?? "";
  const team = DEFAULT_USERS.filter((u) => u.aktivni).map((u) => u.displayName);
  const clientNames = useMemo(() => {
    const s = new Set<string>();
    clients.forEach((c) => c.name && s.add(c.name));
    entries.forEach((e) => e.klient && s.add(e.klient));
    return [...s].sort();
  }, [clients, entries]);

  const filtered = useMemo(() => entries.filter((e) => e.datum.startsWith(month) && (!onlyMe || e.kdo === me)), [entries, month, onlyMe, me]);
  const totalHod = filtered.reduce((s, e) => s + (e.hodiny || 0), 0);
  const byKlient = useMemo(() => sumBy(onlyMe ? filtered : entries, month, "klient").filter((x) => !onlyMe || filtered.some((e) => e.klient === x.name)), [entries, filtered, month, onlyMe]);
  const byOsoba = useMemo(() => sumBy(entries, month, "kdo"), [entries, month]);

  const months = useMemo(() => {
    const s = new Set<string>([monthPrefix(new Date())]);
    entries.forEach((e) => s.add(e.datum.slice(0, 7)));
    return [...s].sort().reverse();
  }, [entries]);

  const add = () => {
    if (!form.klient.trim() || !form.hodiny) return;
    setEntries((prev) => [...prev, { id: Date.now(), kdo: me, klient: form.klient.trim(), projekt: form.projekt.trim(), datum: form.datum, hodiny: Number(form.hodiny), popis: form.popis.trim() }]);
    setForm({ klient: "", projekt: "", datum: form.datum, hodiny: "", popis: "" });
  };
  const del = (id: number) => setEntries((prev) => prev.filter((e) => e.id !== id));

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Výkazy hodin</h1>
          <p className="text-[13px] text-[--muted-foreground]">Kolik hodin jde na kterého klienta a projekt</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className={iCls} style={iStyle} value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
          <label className="flex items-center gap-1.5 text-[12px] text-[--muted-foreground] cursor-pointer"><input type="checkbox" checked={onlyMe} onChange={(e) => setOnlyMe(e.target.checked)} /> jen moje</label>
          <button onClick={() => exportCSV(filtered.map((e) => ({ Kdo: e.kdo, Klient: e.klient, Projekt: e.projekt, Datum: e.datum, Hodiny: e.hodiny, Popis: e.popis })), `vykazy-${month}.csv`)} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}><Download className="w-3.5 h-3.5" /> Export</button>
        </div>
      </div>

      {/* Quick log */}
      <div className="glass-panel flex flex-wrap items-end gap-2 p-4 mb-5">
        <div><label className="text-[11px] text-[--muted-foreground]">Klient</label><input list="vk-clients" className={iCls} style={{ ...iStyle, minWidth: 150 }} value={form.klient} onChange={(e) => setForm({ ...form, klient: e.target.value })} placeholder="Klient" /><datalist id="vk-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist></div>
        <div className="flex-1"><label className="text-[11px] text-[--muted-foreground]">Projekt</label><input className={iCls} style={{ ...iStyle, width: "100%" }} value={form.projekt} onChange={(e) => setForm({ ...form, projekt: e.target.value })} placeholder="Na čem" /></div>
        <div><label className="text-[11px] text-[--muted-foreground]">Datum</label><input type="date" className={iCls} style={iStyle} value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} /></div>
        <div><label className="text-[11px] text-[--muted-foreground]">Hodiny</label><input type="number" step="0.5" className={iCls} style={{ ...iStyle, width: 90 }} value={form.hodiny} onChange={(e) => setForm({ ...form, hodiny: e.target.value })} placeholder="0" /></div>
        <button onClick={add} disabled={!form.klient.trim() || !form.hodiny} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}><Plus className="w-4 h-4" /> Zapsat</button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2"><Clock className="w-3.5 h-3.5" style={{ color: PRIMARY }} /><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Celkem {monthLabel(month)}</span></div>
          <div className="text-[22px] font-bold" style={{ color: PRIMARY, fontFamily: "var(--font-heading)" }}>{fmtHod(totalHod)}</div>
        </div>
        <SummaryList title="Podle klienta" icon={Building2} rows={byKlient} />
        <SummaryList title="Podle osoby" icon={UserIcon} rows={byOsoba} />
      </div>

      {/* Entries */}
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-left text-[13px]">
          <thead><tr className="text-[11px] uppercase tracking-[0.04em] text-[--muted-foreground]" style={{ background: "var(--card)" }}>
            <th className="px-4 py-3 font-semibold">Datum</th><th className="px-4 py-3 font-semibold">Kdo</th><th className="px-4 py-3 font-semibold">Klient</th><th className="px-4 py-3 font-semibold">Projekt</th><th className="px-4 py-3 font-semibold text-right">Hodiny</th><th className="px-4 py-3" />
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[--muted-foreground]">Za {monthLabel(month)} zatím žádné výkazy. Zapiš hodiny formulářem nahoře.</td></tr>}
            {[...filtered].sort((a, b) => b.datum.localeCompare(a.datum)).map((e) => (
              <tr key={e.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-2.5">{e.datum.split("-").reverse().join(". ")}</td>
                <td className="px-4 py-2.5 text-[--muted-foreground]">{e.kdo}</td>
                <td className="px-4 py-2.5 font-medium">{e.klient}</td>
                <td className="px-4 py-2.5 text-[--muted-foreground]">{e.projekt}{e.popis ? ` · ${e.popis}` : ""}</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ fontFamily: "var(--font-heading)" }}>{fmtHod(e.hodiny)}</td>
                <td className="px-4 py-2.5 text-right">{(user?.roles.includes("admin") || e.kdo === me) && <button onClick={() => del(e.id)} className="btn-tactile p-1 rounded-[5px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3 h-3" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[--muted-foreground] mt-3">Hodiny per klient jsou podklad pro Ziskovost a odměny „podle projektů" — vidíš, kam reálně teče čas týmu.</p>
    </div>
  );
}

function SummaryList({ title, icon: Icon, rows }: { title: string; icon: React.ElementType; rows: { name: string; hodiny: number }[] }) {
  return (
    <div className="p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2"><Icon className="w-3.5 h-3.5" style={{ color: PRIMARY }} /><span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">{title}</span></div>
      {rows.length === 0 ? <p className="text-[12px] text-[--muted-foreground]">—</p> : (
        <div className="space-y-1">
          {rows.slice(0, 5).map((r) => (
            <div key={r.name} className="flex items-center justify-between text-[12px]">
              <span className="truncate">{r.name}</span>
              <span className="font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{fmtHod(r.hodiny)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
