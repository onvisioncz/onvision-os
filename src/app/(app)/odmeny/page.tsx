"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, Trash2, Mail, ChevronLeft, ChevronRight,
  Download, Check, Send, Wallet, Users as UsersIcon,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DEFAULT_USERS } from "@/lib/roles";
import {
  ODMENY_KEY, castkaZaMesic, celkemZaMesic, fmtKc, monthKey, monthLabel,
  type OdmenaPerson, type OdmenaModel, type OdmenaTyp, type OdmenaProjekt,
} from "@/lib/odmeny";

const PRIMARY = "oklch(0.62 0.27 265)";
const TYP_COLOR: Record<OdmenaTyp, string> = {
  "OSVČ": "oklch(0.67 0.155 155)",
  "DPP": "oklch(0.75 0.19 48)",
};

/* ── CSV export ─────────────────────────────────────────────────────────── */
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => {
      const v = String(r[h] ?? "").replace(/"/g, '""');
      return v.includes(";") || v.includes("\n") ? `"${v}"` : v;
    }).join(";")),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function emptyPerson(id: number): OdmenaPerson {
  return { id, jmeno: "", email: "", typ: "OSVČ", model: "Paušál", pausal: 0, aktivni: true, mesice: {} };
}

const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] outline-none transition-all";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" };

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: React.ElementType }) {
  return (
    <div className="flex-1 min-w-[150px] p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[11px] font-semibold tracking-[0.04em] uppercase text-[--muted-foreground]">{label}</span>
      </div>
      <div className="text-[22px] font-bold" style={{ color, fontFamily: "var(--font-outfit)" }}>{value}</div>
    </div>
  );
}

export default function OdmenyPage() {
  const { user, loading: roleLoading } = useUserRole();
  const [lidi, setLidi] = useSupabaseData<OdmenaPerson[]>(ODMENY_KEY, () => []);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [editing, setEditing] = useState<OdmenaPerson | null>(null);
  const [sending, setSending] = useState<number | "summary" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mKey = monthKey(cursor);
  const flash = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); }, []);

  const canEdit = !!user && (user.roles.includes("admin") || user.roles.includes("fakturace"));

  const aktivni = useMemo(() => lidi.filter((p) => p.aktivni), [lidi]);
  const celkem = useMemo(() => celkemZaMesic(lidi, mKey), [lidi, mKey]);
  const pocetOSVC = aktivni.filter((p) => p.typ === "OSVČ").length;
  const pocetDPP = aktivni.filter((p) => p.typ === "DPP").length;

  const summaryRecipients = useMemo(
    () => DEFAULT_USERS.filter((u) => u.aktivni && (u.roles.includes("admin") || u.roles.includes("ucetni"))).map((u) => u.email),
    []
  );

  /* ── Akce ─────────────────────────────────────────────────────────────── */
  const savePerson = (p: OdmenaPerson) => {
    setLidi((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
    setEditing(null);
  };
  const removePerson = (id: number) => setLidi((prev) => prev.filter((p) => p.id !== id));

  const sendPerson = async (p: OdmenaPerson) => {
    setSending(p.id);
    try {
      const res = await fetch("/api/odmeny/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: mKey, kind: "person", personId: p.id }),
      });
      const j = await res.json();
      if (j.ok) {
        setLidi((prev) => prev.map((x) => x.id === p.id
          ? { ...x, mesice: { ...x.mesice, [mKey]: { ...x.mesice?.[mKey], mailOdeslan: true } } } : x));
        flash(`E-mail odeslán: ${p.jmeno}`);
      } else flash(`Chyba: ${j.error ?? "nepodařilo se odeslat"}`);
    } catch { flash("Chyba sítě při odesílání."); }
    finally { setSending(null); }
  };

  const sendSummary = async () => {
    setSending("summary");
    try {
      const res = await fetch("/api/odmeny/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: mKey, kind: "summary", to: summaryRecipients }),
      });
      const j = await res.json();
      flash(j.ok ? `Souhrn odeslán (${j.sent} příjemců)` : `Chyba: ${j.error ?? "nepodařilo se"}`);
    } catch { flash("Chyba sítě při odesílání."); }
    finally { setSending(null); }
  };

  const doExport = () => {
    const rows = aktivni.map((p) => ({
      Jmeno: p.jmeno, Email: p.email, Typ: p.typ, Model: p.model,
      Obdobi: monthLabel(mKey), Castka_Kc: castkaZaMesic(p, mKey),
      Vyplaceno: p.mesice?.[mKey]?.vyplaceno ? "ano" : "ne",
    }));
    exportCSV(rows, `odmeny-${mKey}.csv`);
  };

  /* ── Guard ────────────────────────────────────────────────────────────── */
  if (roleLoading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !(user.roles.includes("admin") || user.roles.includes("fakturace") || user.roles.includes("ucetni"))) {
    return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;
  }

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Odměny</h1>
          <p className="text-[13px] text-[--muted-foreground]">Spolupracovníci na IČO a DPP — kolik komu za měsíc odejde</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={doExport} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          {canEdit && (
            <button onClick={() => setEditing(emptyPerson(Date.now()))} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold"
              style={{ background: PRIMARY, color: "white" }}>
              <Plus className="w-4 h-4" /> Přidat osobu
            </button>
          )}
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="btn-tactile p-1.5 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-[14px] font-semibold min-w-[150px] text-center capitalize" style={{ fontFamily: "var(--font-heading)" }}>{monthLabel(mKey)}</span>
        <button onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="btn-tactile p-1.5 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatCard label="Celkem odejde" value={fmtKc(celkem)} color={PRIMARY} icon={Wallet} />
        <StatCard label="Spolupracovníci" value={String(aktivni.length)} color="oklch(0.70 0.14 195)" icon={UsersIcon} />
        <StatCard label="Na IČO" value={String(pocetOSVC)} color={TYP_COLOR["OSVČ"]} icon={UsersIcon} />
        <StatCard label="Na DPP" value={String(pocetDPP)} color={TYP_COLOR["DPP"]} icon={UsersIcon} />
      </div>

      {/* Table */}
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.04em] text-[--muted-foreground]" style={{ background: "var(--card)" }}>
              <th className="px-4 py-3 font-semibold">Jméno</th>
              <th className="px-4 py-3 font-semibold">Typ</th>
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold text-right">Částka</th>
              <th className="px-4 py-3 font-semibold text-center">Stav</th>
              <th className="px-4 py-3 font-semibold text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {aktivni.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[--muted-foreground]">
                Zatím žádní spolupracovníci. {canEdit && "Přidej prvního tlačítkem nahoře."}
              </td></tr>
            )}
            {aktivni.map((p) => {
              const castka = castkaZaMesic(p, mKey);
              const m = p.mesice?.[mKey];
              return (
                <tr key={p.id} className="border-t text-[13px]" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium">{p.jmeno || <span className="text-[--muted-foreground]">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-semibold" style={{ color: TYP_COLOR[p.typ], background: `${TYP_COLOR[p.typ]} / 0.1` }}>{p.typ}</span>
                  </td>
                  <td className="px-4 py-3 text-[--muted-foreground]">{p.model}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: "var(--font-outfit)", color: castka > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>{fmtKc(castka)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {m?.vyplaceno && <span title="Vyplaceno" className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold" style={{ color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.1)" }}><Check className="w-3 h-3" />Vypl.</span>}
                      {m?.mailOdeslan && <span title="Mail odeslán" className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold" style={{ color: PRIMARY, background: "oklch(0.62 0.27 265 / 0.1)" }}><Mail className="w-3 h-3" /></span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => sendPerson(p)} disabled={sending === p.id || !p.email || castka <= 0 || p.typ === "DPP"}
                          title={p.typ === "DPP" ? "DPP — nefakturuje se, jen evidence" : !p.email ? "Chybí e-mail" : castka <= 0 ? "Nulová částka" : "Poslat výzvu k fakturaci"}
                          className="btn-tactile p-1.5 rounded-[6px] disabled:opacity-30" style={{ border: "1px solid var(--border)" }}>
                          <Send className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
                        </button>
                      )}
                      {canEdit && <button onClick={() => setEditing({ ...p, mesice: { ...p.mesice } })} className="btn-tactile p-1.5 rounded-[6px]" style={{ border: "1px solid var(--border)" }}><Edit2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary send */}
      {canEdit && aktivni.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 mt-4 p-4 rounded-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-[12px] text-[--muted-foreground]">
            Souhrn odejde na: <span className="text-[--foreground] font-medium">{summaryRecipients.join(", ") || "— (přidej účetní/admina)"}</span>
          </div>
          <button onClick={sendSummary} disabled={sending === "summary" || summaryRecipients.length === 0}
            className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40"
            style={{ background: "oklch(0.70 0.14 195)", color: "white" }}>
            <Mail className="w-4 h-4" /> Poslat souhrn účetní
          </button>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[8px] text-[13px] font-medium shadow-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <EditModal person={editing} mKey={mKey} onClose={() => setEditing(null)} onSave={savePerson} onDelete={removePerson} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────────── */
function EditModal({ person, mKey, onClose, onSave, onDelete }: {
  person: OdmenaPerson; mKey: string; onClose: () => void;
  onSave: (p: OdmenaPerson) => void; onDelete: (id: number) => void;
}) {
  const [p, setP] = useState<OdmenaPerson>(person);
  const m = p.mesice?.[mKey] ?? {};
  const isNew = !person.jmeno;

  const setMonth = (patch: Partial<typeof m>) => setP((prev) => ({ ...prev, mesice: { ...prev.mesice, [mKey]: { ...prev.mesice?.[mKey], ...patch } } }));
  const projekty: OdmenaProjekt[] = m.projekty ?? [];
  const setProjekty = (next: OdmenaProjekt[]) => setMonth({ projekty: next });

  const iCls2 = iCls; const iStyle2 = iStyle;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto rounded-[14px] p-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-heading)" }}>{isNew ? "Nový spolupracovník" : p.jmeno}</h2>
          <button onClick={onClose} className="btn-tactile p-1 rounded-[6px]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Jméno</label>
              <input className={iCls2} style={iStyle2} value={p.jmeno} onChange={(e) => setP({ ...p, jmeno: e.target.value })} placeholder="Jméno a příjmení" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">E-mail</label>
              <input className={iCls2} style={iStyle2} value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} placeholder="email@…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Typ</label>
              <select className={iCls2} style={iStyle2} value={p.typ} onChange={(e) => setP({ ...p, typ: e.target.value as OdmenaTyp })}>
                <option value="OSVČ">OSVČ (IČO)</option>
                <option value="DPP">DPP</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Model odměny</label>
              <select className={iCls2} style={iStyle2} value={p.model} onChange={(e) => setP({ ...p, model: e.target.value as OdmenaModel })}>
                <option value="Paušál">Paušál</option>
                <option value="Projekty">Podle projektů</option>
                <option value="Ruční">Ruční částka</option>
              </select>
            </div>
          </div>

          {p.model === "Paušál" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Paušál (Kč/měsíc)</label>
                <input type="number" className={iCls2} style={iStyle2} value={p.pausal || ""} onChange={(e) => setP({ ...p, pausal: Number(e.target.value) })} placeholder="0" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Tento měsíc (přepis)</label>
                <input type="number" className={iCls2} style={iStyle2} value={m.pausalOverride ?? ""} onChange={(e) => setMonth({ pausalOverride: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={`${p.pausal || 0}`} />
              </div>
            </div>
          )}

          {p.model === "Ruční" && (
            <div>
              <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Částka za {monthLabel(mKey)} (Kč)</label>
              <input type="number" className={iCls2} style={iStyle2} value={m.rucni ?? ""} onChange={(e) => setMonth({ rucni: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="0" />
            </div>
          )}

          {p.model === "Projekty" && (
            <div>
              <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Projekty za {monthLabel(mKey)}</label>
              <div className="space-y-2 mt-1">
                {projekty.map((proj, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={iCls2} style={iStyle2} value={proj.nazev} placeholder="Název projektu"
                      onChange={(e) => setProjekty(projekty.map((x, j) => j === i ? { ...x, nazev: e.target.value } : x))} />
                    <input type="number" className="w-32 px-3 py-2 rounded-[7px] text-[13px] outline-none" style={iStyle2} value={proj.castka || ""} placeholder="Kč"
                      onChange={(e) => setProjekty(projekty.map((x, j) => j === i ? { ...x, castka: Number(e.target.value) } : x))} />
                    <button onClick={() => setProjekty(projekty.filter((_, j) => j !== i))} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setProjekty([...projekty, { nazev: "", castka: 0 }])} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium" style={{ border: "1px solid var(--border)" }}>
                  <Plus className="w-3.5 h-3.5" /> Přidat projekt
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">Poznámka</label>
            <input className={iCls2} style={iStyle2} value={m.poznamka ?? ""} onChange={(e) => setMonth({ poznamka: e.target.value })} placeholder="nepovinné" />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={!!m.vyplaceno} onChange={(e) => setMonth({ vyplaceno: e.target.checked })} /> Vyplaceno
            </label>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={p.aktivni} onChange={(e) => setP({ ...p, aktivni: e.target.checked })} /> Aktivní
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          {!isNew ? (
            <button onClick={() => { onDelete(p.id); onClose(); }} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}>
              <Trash2 className="w-3.5 h-3.5" /> Smazat
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-semibold" style={{ border: "1px solid var(--border)" }}>Zrušit</button>
            <button onClick={() => onSave(p)} disabled={!p.jmeno.trim()} className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Uložit</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
