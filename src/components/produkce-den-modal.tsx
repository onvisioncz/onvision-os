"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, CalendarPlus, Check, Loader2, Users } from "lucide-react";
import { DEFAULT_USERS } from "@/lib/roles";
import { firstName } from "@/lib/task-owner";
import {
  tasksForDen, type ProdukcniDen, type DenPerson,
} from "@/lib/produkce-dny";

/** Tým k výběru — aktivní lidé z rosteru (křestní jméno + e-mail pro notifikaci). */
const TEAM = DEFAULT_USERS
  .filter((u) => u.aktivni !== false)
  .map((u) => ({ jmeno: firstName(u.displayName), display: u.displayName, email: u.email }));

const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ").format(n || 0) + ",- Kč";

/** Přečti aktuální hodnotu klíče (+ token pro optimistický zámek). */
async function readKey(key: string): Promise<{ value: unknown; token: string | null }> {
  try {
    const r = await fetch(`/api/sync?key=${key}`);
    const d = await r.json();
    return { value: d.value ?? null, token: d.token ?? null };
  } catch { return { value: null, token: null }; }
}
async function writeKey(key: string, value: unknown, baseToken: string | null) {
  await fetch("/api/sync", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, baseToken }),
  });
}

interface Props {
  zdroj: "monthly" | "oneoff";
  projekt: string;
  klient: string;
  onClose: () => void;
  onSaved?: () => void;
}

interface Draft { selected: boolean; ukol: string; odmena: string }

export function ProdukcniDenModal({ zdroj, projekt, klient, onClose, onSaved }: Props) {
  const [datum, setDatum] = useState("");
  const [popis, setPopis] = useState("");
  const [lokace, setLokace] = useState("");
  const [rows, setRows] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  // Portál do body — aby fixed overlay unikl transformovaným rodičům (karta má
  // animaci), jinak je modal oříznutý a nejde na něj klikat.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [error, setError] = useState<string | null>(null);

  const toggle = (jmeno: string) => setRows((p) => ({ ...p, [jmeno]: { selected: !p[jmeno]?.selected, ukol: p[jmeno]?.ukol ?? "", odmena: p[jmeno]?.odmena ?? "" } }));
  const setField = (jmeno: string, k: "ukol" | "odmena", v: string) => setRows((p) => ({ ...p, [jmeno]: { selected: p[jmeno]?.selected ?? true, ukol: p[jmeno]?.ukol ?? "", odmena: p[jmeno]?.odmena ?? "", [k]: v } }));

  const chosen = TEAM.filter((t) => rows[t.jmeno]?.selected);
  const canSave = !!datum.trim() && chosen.length > 0 && chosen.every((t) => rows[t.jmeno]?.ukol.trim());

  async function save() {
    if (!canSave || saving) return;
    setSaving(true); setError(null);
    try {
      const people: DenPerson[] = chosen.map((t) => ({
        jmeno: t.jmeno, email: t.email,
        ukol: rows[t.jmeno].ukol.trim(),
        odmena: parseInt((rows[t.jmeno].odmena || "0").replace(/\D/g, ""), 10) || 0,
      }));
      const den: ProdukcniDen = {
        id: Date.now(), zdroj, projekt, klient,
        datum: datum.trim(), popis: popis.trim(), lokace: lokace.trim() || undefined,
        people, createdAt: new Date().toISOString(),
      };

      // 1) Ulož produkční den (obsahuje odměny — čte jen admin/fakturace)
      const dnyCur = await readKey("ov-produkce-dny");
      const dny = Array.isArray(dnyCur.value) ? dnyCur.value : [];
      await writeKey("ov-produkce-dny", [den, ...dny], dnyCur.token);

      // 2) Úkoly pro lidi (BEZ ceny). Zápis úkolu na server sám pošle
      //    přiřazenému člověku push i notifikaci „task_assigned" — nemusíme
      //    notifikace psát ručně (jinak by chodily dvakrát).
      const tasksCur = await readKey("ov-ukoly-tasks");
      const tasks = Array.isArray(tasksCur.value) ? tasksCur.value : [];
      const newTasks = tasksForDen(den, Date.now() + 1);
      await writeKey("ov-ukoly-tasks", [...newTasks, ...tasks], tasksCur.token);

      setDone(true);
      onSaved?.();
      setTimeout(onClose, 900);
    } catch {
      setError("Uložení se nepodařilo. Zkus to prosím znovu.");
    } finally {
      setSaving(false);
    }
  }

  const iCls = "w-full rounded-[9px] px-3 py-2 text-[13px]";
  const iStyle: React.CSSProperties = { background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)", outline: "none" };

  if (!mounted) return null;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,6,14,0.6)", backdropFilter: "blur(3px)" }}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[16px] p-5 max-h-[88vh] overflow-y-auto"
        style={{ background: "oklch(0.16 0.012 265)", border: "1px solid oklch(1 0 0 / 0.1)" }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ fontFamily: "var(--font-outfit)" }}>
            <CalendarPlus className="w-4 h-4" style={{ color: "#5B5EFF" }} /> Zapsat produkční den
          </h3>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-[12px] mb-4" style={{ color: "var(--muted-foreground)" }}>{projekt}{klient && projekt !== klient ? ` · ${klient}` : ""}</p>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Datum</label>
              <input className={iCls} style={iStyle} value={datum} onChange={(e) => setDatum(e.target.value)} placeholder="12. 8. 2026" /></div>
            <div><label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Lokace</label>
              <input className={iCls} style={iStyle} value={lokace} onChange={(e) => setLokace(e.target.value)} placeholder="Místo natáčení" /></div>
          </div>
          <div><label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Co se natáčí / o co jde</label>
            <textarea className={iCls} style={{ ...iStyle, minHeight: 60, resize: "vertical" }} value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Stručný popis, scénář v kostce…" /></div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-2" style={{ color: "var(--muted-foreground)" }}>
              <Users className="w-3.5 h-3.5" /> Kdo se účastní · úkol · odměna
            </label>
            <div className="flex flex-col gap-1.5">
              {TEAM.map((t) => {
                const r = rows[t.jmeno];
                const sel = r?.selected;
                return (
                  <div key={t.email} className="rounded-[10px] p-2" style={{ background: sel ? "oklch(0.62 0.27 265 / 0.08)" : "oklch(1 0 0 / 0.03)", border: `1px solid ${sel ? "oklch(0.62 0.27 265 / 0.25)" : "oklch(1 0 0 / 0.07)"}` }}>
                    <button onClick={() => toggle(t.jmeno)} className="flex items-center gap-2 w-full text-left">
                      <span className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: sel ? "#5B5EFF" : "transparent", border: sel ? "none" : "1px solid oklch(1 0 0 / 0.2)" }}>{sel && <Check className="w-3 h-3 text-white" />}</span>
                      <span className="text-[13px] font-semibold">{t.display}</span>
                    </button>
                    {sel && (
                      <div className="grid grid-cols-[1fr_110px] gap-2 mt-2 pl-6">
                        <input className="rounded-[7px] px-2 py-1.5 text-[12px]" style={iStyle} value={r?.ukol ?? ""} onChange={(e) => setField(t.jmeno, "ukol", e.target.value)} placeholder="Úkol / role" />
                        <input className="rounded-[7px] px-2 py-1.5 text-[12px]" style={iStyle} inputMode="numeric" value={r?.odmena ?? ""} onChange={(e) => setField(t.jmeno, "odmena", e.target.value)} placeholder="Odměna Kč" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {chosen.length > 0 && (
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Přiřadím {chosen.length} {chosen.length === 1 ? "člověka" : "lidí"} · dostanou úkol + notifikaci. Odměny (celkem {fmtKc(chosen.reduce((s, t) => s + (parseInt((rows[t.jmeno]?.odmena || "0").replace(/\D/g, ""), 10) || 0), 0))}) se propíšou do Kreativy. <strong>Celkovou cenu zakázky nikdo z nich nevidí.</strong>
            </p>
          )}
          {error && <p className="text-[12px]" style={{ color: "oklch(0.68 0.2 25)" }}>{error}</p>}

          <button onClick={save} disabled={!canSave || saving || done}
            className="w-full py-2.5 rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: done ? "oklch(0.67 0.155 155)" : "#5B5EFF", color: "white" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
            {done ? "Zapsáno" : saving ? "Ukládám…" : "Zapsat produkční den"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
