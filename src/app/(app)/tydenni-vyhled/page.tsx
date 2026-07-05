"use client";

import { useState, useMemo } from "react";
import { CalendarRange, Plus, Trash2, Check, Send, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DEFAULT_USERS } from "@/lib/roles";
import {
  isoWeekKey, weekRange, outlookStatus, submitKey, POST_TYPY, OUTLOOK_AUTHORS,
  type OutlookEntry, type OutlookSubmits, type PostTyp,
} from "@/lib/weekly-outlook";

const iCls = "px-2.5 py-1.5 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)" } as const;
const GREEN = "oklch(0.7 0.17 155)";
const AMBER = "oklch(0.78 0.165 75)";
const PRIMARY = "oklch(0.62 0.27 265)";

const nameOf = (email: string) => DEFAULT_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())?.displayName ?? email;
const clientsOf = (email: string) => DEFAULT_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())?.clients ?? [];

function fmtRange(weekKey: string): string {
  const r = weekRange(weekKey);
  if (!r) return weekKey;
  const f = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  return `${f(r.from)} – ${f(r.to)}`;
}

export default function TydenniVyhledPage() {
  const { user, email, loading } = useUserRole();
  const [entries, setEntries] = useSupabaseData<OutlookEntry[]>("ov-weekly-outlook", () => []);
  const [submits, setSubmits] = useSupabaseData<OutlookSubmits>("ov-weekly-outlook-submits", () => ({}));
  const [allClients] = useSupabaseData<{ name: string; aktivni?: boolean }[]>("ov-monthly-clients", () => []);

  // Výchozí = příští týden (výhled se plánuje dopředu). Offset 0 = tento, 1 = příští.
  const [offset, setOffset] = useState(1);
  const weekKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    return isoWeekKey(d);
  }, [offset]);

  const isAdmin = !!user?.roles.includes("admin");
  const isAuthor = !!email && OUTLOOK_AUTHORS.some((a) => a.toLowerCase() === email.toLowerCase());

  const status = useMemo(() => outlookStatus(entries, submits, weekKey), [entries, submits, weekKey]);

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user) return <div className="p-8 text-[14px] text-[--muted-foreground]">Nemáš oprávnění.</div>;

  // Kdo se zobrazí: admin vidí všechny autory; autor jen sebe.
  const visibleAuthors = isAdmin ? OUTLOOK_AUTHORS : (isAuthor ? [email!] : []);
  const canEdit = (autorEmail: string) => isAdmin || autorEmail.toLowerCase() === (email ?? "").toLowerCase();

  const addRow = (autorEmail: string) => {
    const cs = clientsOf(autorEmail);
    setEntries((prev) => [...prev, {
      id: Date.now() + Math.floor(performance.now()),
      weekKey, autorEmail, autorName: nameOf(autorEmail),
      klient: cs[0] ?? "", typ: "reels" as PostTyp, popis: "", createdAt: new Date().toISOString(),
    }]);
  };
  const patchRow = (id: number, patch: Partial<OutlookEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeRow = (id: number) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const submit = (autorEmail: string) =>
    setSubmits((prev) => ({ ...prev, [submitKey(weekKey, autorEmail)]: new Date().toISOString() }));
  const unsubmit = (autorEmail: string) =>
    setSubmits((prev) => { const n = { ...prev }; delete n[submitKey(weekKey, autorEmail)]; return n; });

  const clientOptions = (autorEmail: string): string[] => {
    const own = clientsOf(autorEmail);
    const active = allClients.filter((c) => c.aktivni !== false).map((c) => c.name);
    // autorovi nabídneme jeho klienty první, pak zbytek (admin může přiřadit cokoli)
    const merged = [...new Set([...own, ...(isAdmin ? active : own)])].filter(Boolean);
    return merged.length ? merged : active;
  };

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <CalendarRange className="w-5 h-5" style={{ color: PRIMARY }} />
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Týdenní výhled</h1>
            <p className="text-[13px] text-[--muted-foreground]">Co je v plánu na sítě — odevzdat každou neděli do 18:00</p>
          </div>
        </div>
        {/* Přepínač týdne */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setOffset((o) => o - 1)} className="p-1.5 rounded-[7px]" style={iStyle} aria-label="Předchozí týden"><ChevronLeft className="w-4 h-4" /></button>
          <div className="px-3 py-1.5 rounded-[8px] text-center min-w-[150px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{fmtRange(weekKey)}</div>
            <div className="text-[10px] text-[--muted-foreground]">{weekKey}{offset === 0 ? " · tento týden" : offset === 1 ? " · příští týden" : ""}</div>
          </div>
          <button onClick={() => setOffset((o) => o + 1)} className="p-1.5 rounded-[7px]" style={iStyle} aria-label="Další týden"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Admin: přehled stavu odevzdání */}
      {isAdmin && (
        <div className="mb-5 flex flex-wrap gap-2">
          {status.map((s) => (
            <div key={s.email} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.04)", border: `1px solid ${s.submitted ? "oklch(0.7 0.17 155 / 0.3)" : "oklch(0.78 0.165 75 / 0.3)"}` }}>
              {s.submitted ? <Check className="w-3.5 h-3.5" style={{ color: GREEN }} /> : <AlertTriangle className="w-3.5 h-3.5" style={{ color: AMBER }} />}
              <span className="text-[13px] font-medium">{nameOf(s.email)}</span>
              <span className="text-[11px]" style={{ color: s.submitted ? GREEN : AMBER }}>{s.submitted ? "odevzdáno" : "chybí"} · {s.entryCount}</span>
            </div>
          ))}
        </div>
      )}

      {visibleAuthors.length === 0 && (
        <div className="p-8 text-center text-[13px] text-[--muted-foreground] rounded-[12px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          Týdenní výhled vyplňují správci sítí. Ty ho tu jen sleduješ, jakmile bude co.
        </div>
      )}

      {visibleAuthors.map((autorEmail) => {
        const rows = entries.filter((e) => e.weekKey === weekKey && e.autorEmail.toLowerCase() === autorEmail.toLowerCase());
        const submitted = !!submits[submitKey(weekKey, autorEmail)];
        const editable = canEdit(autorEmail);
        return (
          <div key={autorEmail} className="mb-5 rounded-[12px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold" style={{ fontFamily: "var(--font-heading)" }}>{nameOf(autorEmail)}</span>
                {submitted
                  ? <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "oklch(0.7 0.17 155 / 0.14)", color: GREEN }}>odevzdáno</span>
                  : <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "oklch(0.78 0.165 75 / 0.14)", color: AMBER }}>neodevzdáno</span>}
                <span className="text-[11px] text-[--muted-foreground]">{rows.length} {rows.length === 1 ? "příspěvek" : rows.length < 5 ? "příspěvky" : "příspěvků"}</span>
              </div>
              {editable && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => addRow(autorEmail)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[12px] font-semibold" style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)" }}><Plus className="w-3.5 h-3.5" /> Řádek</button>
                  {submitted
                    ? <button onClick={() => unsubmit(autorEmail)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[12px] font-semibold" style={{ color: AMBER, border: "1px solid oklch(0.78 0.165 75 / 0.3)" }}>Vzít zpět</button>
                    : <button onClick={() => submit(autorEmail)} disabled={rows.length === 0} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[12px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}><Send className="w-3.5 h-3.5" /> Odeslat</button>}
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[--muted-foreground]">{editable ? "Přidej řádky s tím, co plánuješ." : "Zatím nic nevyplněno."}</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-2.5">
                    {editable ? (
                      <>
                        <select className={iCls} style={{ ...iStyle, minWidth: 150 }} value={r.klient} onChange={(e) => patchRow(r.id, { klient: e.target.value })}>
                          {[...new Set([r.klient, ...clientOptions(autorEmail)])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className={iCls} style={{ ...iStyle, width: 130 }} value={r.typ} onChange={(e) => patchRow(r.id, { typ: e.target.value as PostTyp })}>
                          {POST_TYPY.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input className={`${iCls} flex-1`} style={iStyle} value={r.popis} placeholder="Co konkrétně… (téma, poznámka)" onChange={(e) => patchRow(r.id, { popis: e.target.value })} />
                        <button onClick={() => removeRow(r.id)} className="p-1.5 rounded-[6px] hover:bg-white/5 shrink-0" aria-label="Smazat"><Trash2 className="w-3.5 h-3.5 text-[--muted-foreground]" /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-[13px] font-medium min-w-[150px]">{r.klient || "—"}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: PRIMARY, width: "fit-content" }}>{r.typ}</span>
                        <span className="text-[13px] text-[--muted-foreground] flex-1">{r.popis || "—"}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
