"use client";

import { useState, useEffect, useRef } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, X, Calendar, User, RefreshCw, ChevronDown, ChevronRight,
  MessageSquare, Send, Search,
} from "lucide-react";
import { parseDeadline, daysUntil, fmtDeadline } from "@/lib/dates";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { canSeeAllTasks, isMine, firstName } from "@/lib/task-owner";

/* ── Czech month helper ─────────────────────────────────────────────────────── */
function currentMonthDeadline(den: number): string {
  const now = new Date();
  return `${den}. ${now.getMonth() + 1}.`;
}

function DeadlineChip({ deadline, done }: { deadline: string; done: boolean }) {
  if (done) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[--muted-foreground]">
        <Calendar className="w-3 h-3" />
        {fmtDeadline(deadline)}
      </span>
    );
  }
  const d = parseDeadline(deadline);
  if (!d) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[--muted-foreground]">
        <Calendar className="w-3 h-3" />
        {deadline}
      </span>
    );
  }
  const days = daysUntil(d);

  let color: string, bg: string, border: string, label: string;
  if (days < 0) {
    color = "oklch(0.65 0.22 25)"; bg = "oklch(0.65 0.22 25 / 0.13)"; border = "oklch(0.65 0.22 25 / 0.30)";
    label = `${Math.abs(days)}d po deadline`;
  } else if (days === 0) {
    color = "oklch(0.65 0.22 25)"; bg = "oklch(0.65 0.22 25 / 0.13)"; border = "oklch(0.65 0.22 25 / 0.30)";
    label = "Dnes!";
  } else if (days === 1) {
    color = "oklch(0.76 0.16 45)"; bg = "oklch(0.74 0.18 45 / 0.11)"; border = "oklch(0.74 0.18 45 / 0.28)";
    label = "Zítra";
  } else if (days <= 3) {
    color = "oklch(0.80 0.14 65)"; bg = "oklch(0.80 0.14 65 / 0.09)"; border = "oklch(0.80 0.14 65 / 0.22)";
    label = `za ${days} dny`;
  } else {
    color = "oklch(0.42 0.005 222)"; bg = "transparent"; border = "transparent";
    label = fmtDeadline(deadline);
    return (
      <span className="flex items-center gap-1 text-[11px]" style={{ color }}>
        <Calendar className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]"
      style={{ color, background: bg, border: `1px solid ${border}`, letterSpacing: "0.02em", fontFamily: "var(--font-outfit)" }}
    >
      <Calendar className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Priorita = "Nízká" | "Střední" | "Vysoká" | "Urgentní";
type TStatus = "Nové" | "Probíhá" | "Review" | "Hotovo";

interface TaskComment { autor: string; text: string; cas: string }

interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: Priorita;
  status: TStatus;
  deadline: string;
  popis?: string;
  opakujeSe?: boolean;
  opakovaniDen?: number;
  opakovaniSablona?: boolean;
  komentare?: TaskComment[];
}

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const SEED: Task[] = [
  { id: 1,  nazev: "Finalizovat Mo.one úvodní zadání",          projekt: "Mo.one",              prirazeno: "Monika", priorita: "Urgentní", status: "Probíhá", deadline: "15. 5." },
  { id: 2,  nazev: "Facelift loga REMATECH (IMTOS)",            projekt: "IMTOS",               prirazeno: "Monika", priorita: "Urgentní", status: "Probíhá", deadline: "18. 5." },
  { id: 3,  nazev: "Editace: TEKMA promo video v2",             projekt: "TEKMA",               prirazeno: "Zdeněk", priorita: "Vysoká",   status: "Probíhá", deadline: "20. 5." },
  { id: 4,  nazev: "Review: SK Brno FINAL 4 dokumenty",         projekt: "SK Brno Extraliga",   prirazeno: "Adam",   priorita: "Vysoká",   status: "Review",  deadline: "16. 5." },
  { id: 5,  nazev: "Schválit nabídku pro EFFECT Clinic",        projekt: "EFFECT Clinic",       prirazeno: "Adam",   priorita: "Střední",  status: "Review",  deadline: "19. 5.", popis: "Hodnota 85 000 Kč" },
  { id: 6,  nazev: "Připravit fakturu FV-2026-016",             projekt: "SENIMED",             prirazeno: "Adam",   priorita: "Střední",  status: "Nové",    deadline: "21. 5." },
  { id: 7,  nazev: "BehejBrno — grafika červen",                projekt: "BehejBrno",           prirazeno: "Patrik", priorita: "Střední",  status: "Nové",    deadline: "25. 5." },
  { id: 8,  nazev: "EASTGATE aktualizace — Květen",             projekt: "EASTGATE Brno",       prirazeno: "Monika", priorita: "Střední",  status: "Nové",    deadline: "28. 5." },
  { id: 9,  nazev: "Plán natáčení červen — Zdeněk",            projekt: "Interní",             prirazeno: "Adam",   priorita: "Nízká",    status: "Nové",    deadline: "30. 5." },
  { id: 10, nazev: "SK Brno Extraliga — náborový leták",        projekt: "SK Brno Extraliga",   prirazeno: "Patrik", priorita: "Střední",  status: "Hotovo",  deadline: "14. 5." },
  { id: 11, nazev: "IMTOS OPENHOUSE grafika",                   projekt: "IMTOS",               prirazeno: "Monika", priorita: "Vysoká",   status: "Hotovo",  deadline: "12. 5." },
  { id: 12, nazev: "Fakturace FIRESTA duben",                   projekt: "FIRESTA",             prirazeno: "Adam",   priorita: "Střední",  status: "Hotovo",  deadline: "10. 5." },
  { id: 9001, nazev: "Vystavit faktury klientům", projekt: "Fakturace", prirazeno: "Adam",
    priorita: "Vysoká", status: "Nové", deadline: "1. 6.",
    opakujeSe: true, opakovaniDen: 1, opakovaniSablona: true },
  { id: 9002, nazev: "Měsíční report klientům", projekt: "Interní", prirazeno: "Adam",
    priorita: "Střední", status: "Nové", deadline: "5. 6.",
    opakujeSe: true, opakovaniDen: 5, opakovaniSablona: true },
];

const STATUSES: TStatus[] = ["Nové", "Probíhá", "Review", "Hotovo"];
const ASSIGNEES = ["Vše", "Adam", "Zdeněk", "Matěj", "Monika", "Patrik"];
const STATUS_FILTER: (TStatus | "Vše")[] = ["Vše", "Nové", "Probíhá", "Review", "Hotovo"];

const ACCENT = "oklch(0.67 0.155 155)";
const PURPLE = "oklch(0.72 0.2 310)";

const PRIORITY_STYLE: Record<Priorita, { color: string; bg: string; border: string }> = {
  Urgentní: { color: "oklch(0.74 0.18 45)",   bg: "oklch(0.74 0.18 45 / 0.12)",  border: "oklch(0.74 0.18 45 / 0.25)" },
  Vysoká:   { color: "oklch(0.62 0.27 265)", bg: "oklch(0.62 0.27 265 / 0.12)", border: "oklch(0.62 0.27 265 / 0.22)" },
  Střední:  { color: "oklch(0.82 0.16 85)",   bg: "oklch(0.82 0.16 85 / 0.1)",   border: "oklch(0.82 0.16 85 / 0.22)" },
  Nízká:    { color: "oklch(0.45 0.005 222)", bg: "oklch(1 0 0 / 0.04)",          border: "oklch(1 0 0 / 0.1)" },
};

const STATUS_COLOR: Record<TStatus, string> = {
  Nové:    "oklch(0.45 0.005 222)",
  Probíhá: "oklch(0.62 0.27 265)",
  Review:  "oklch(0.82 0.16 85)",
  Hotovo:  "oklch(0.67 0.155 155)",
};

/* ── Priority badge ─────────────────────────────────────────────────────────── */
function PriorityBadge({ p }: { p: Priorita }) {
  const s = PRIORITY_STYLE[p];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[4px]"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {p}
    </span>
  );
}

/* ── Shared task form fields ────────────────────────────────────────────────── */
function TaskForm({
  form,
  setForm,
  isNew,
}: {
  form: Task;
  setForm: (fn: (prev: Task) => Task) => void;
  isNew?: boolean;
}) {
  void isNew;
  return (
    <>
      {(["nazev", "projekt"] as const).map(field => (
        <div key={field}>
          <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">
            {field === "nazev" ? "Název úkolu" : "Projekt / klient"}
          </label>
          <input
            value={form[field]}
            onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
            placeholder={field === "nazev" ? "Co je potřeba udělat?" : "Název projektu"}
            className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}
          />
        </div>
      ))}

      {/* Deadline — prominent (hidden when recurring template, auto-computed) */}
      {!form.opakovaniSablona && (
        <div>
          <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-[0.05em]"
            style={{ color: "oklch(0.74 0.18 45)" }}>
            Deadline (termín odevzdání)
          </label>
          <input
            value={form.deadline}
            onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
            placeholder="15. 5."
            className="w-full px-3 py-2 rounded-[8px] text-[13px] font-semibold outline-none"
            style={{
              background: "oklch(0.74 0.18 45 / 0.06)",
              border: "1px solid oklch(0.74 0.18 45 / 0.25)",
              color: "oklch(0.80 0.14 65)",
              fontFamily: "var(--font-outfit)",
            }}
          />
          <p className="text-[10px] mt-1" style={{ color: "oklch(0.40 0.005 222)" }}>
            Formát: den. měsíc. (např. 20. 5.)
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["prirazeno", "priorita", "status"] as const).map(field => (
          <div key={field}>
            <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">
              {field === "prirazeno" ? "Přiřazeno" : field === "priorita" ? "Priorita" : "Stav"}
            </label>
            <select
              value={form[field]}
              onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value as never }))}
              className="w-full px-2 py-2 rounded-[8px] text-[12px] text-[--foreground] outline-none"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}
            >
              {field === "prirazeno" && ["Adam", "Zdeněk", "Matěj", "Monika", "Patrik"].map(v => <option key={v}>{v}</option>)}
              {field === "priorita" && (["Nízká", "Střední", "Vysoká", "Urgentní"] as Priorita[]).map(v => <option key={v}>{v}</option>)}
              {field === "status" && STATUSES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Recurrence fields */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.opakujeSe}
            onChange={e => {
              const checked = e.target.checked;
              setForm(prev => ({
                ...prev,
                opakujeSe: checked,
                opakovaniSablona: checked ? true : undefined,
                opakovaniDen: checked ? (prev.opakovaniDen ?? 1) : undefined,
                deadline: checked ? currentMonthDeadline(prev.opakovaniDen ?? 1) : prev.deadline,
              }));
            }}
            className="w-3.5 h-3.5 rounded accent-purple-500"
            style={{ accentColor: PURPLE }}
          />
          <span className="text-[12px] font-semibold" style={{ color: PURPLE, fontFamily: "var(--font-outfit)" }}>
            Opakující se úkol
          </span>
          <RefreshCw className="w-3 h-3" style={{ color: PURPLE }} />
        </label>

        <AnimatePresence>
          {form.opakujeSe && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="p-3 rounded-[8px] space-y-2"
                style={{ background: `${PURPLE.replace(")", " / 0.07)")}`, border: `1px solid ${PURPLE.replace(")", " / 0.18)")}` }}
              >
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: PURPLE }}>
                    Den v měsíci (1–28)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={form.opakovaniDen ?? 1}
                    onChange={e => {
                      const den = Math.min(28, Math.max(1, parseInt(e.target.value) || 1));
                      setForm(prev => ({
                        ...prev,
                        opakovaniDen: den,
                        deadline: currentMonthDeadline(den),
                      }));
                    }}
                    className="w-24 px-3 py-2 rounded-[8px] text-[13px] font-semibold outline-none"
                    style={{
                      background: "oklch(1 0 0 / 0.04)",
                      border: `1px solid ${PURPLE.replace(")", " / 0.25)")}`,
                      color: PURPLE,
                      fontFamily: "var(--font-outfit)",
                    }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "oklch(0.40 0.005 222)" }}>
                    Deadline se automaticky nastaví na {currentMonthDeadline(form.opakovaniDen ?? 1)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">Poznámka</label>
        <textarea
          value={form.popis ?? ""}
          onChange={e => setForm(prev => ({ ...prev, popis: e.target.value }))}
          rows={2}
          placeholder="Volitelný popis, hodnota zakázky apod."
          className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none resize-none"
          style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}
        />
      </div>
    </>
  );
}

/* ── Add modal ──────────────────────────────────────────────────────────────── */
const EMPTY_TASK: Omit<Task, "id"> = {
  nazev: "", projekt: "", prirazeno: "Adam",
  priorita: "Střední", status: "Nové", deadline: "", popis: "",
};

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Task, "id">) => void }) {
  const [form, setForm] = useState<Task>({ id: 0, ...EMPTY_TASK });

  const canSave = form.nazev.trim().length > 0 && (form.opakovaniSablona || form.deadline.trim().length > 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.65)" }} onClick={onClose} />
      <motion.div
        className="card relative w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            Nový úkol
          </h2>
          <button onClick={onClose} className="btn-tactile p-1.5 rounded-[6px]" style={{ color: "oklch(0.45 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <TaskForm form={form} setForm={setForm} isNew />

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-medium"
            style={{ color: "oklch(0.45 0.005 222)", background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)" }}
          >
            Zrušit
          </button>
          <button
            onClick={() => { if (canSave) { onAdd(form); onClose(); } }}
            disabled={!canSave}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-semibold"
            style={{
              background: canSave ? ACCENT : "oklch(1 0 0 / 0.06)",
              color: canSave ? "oklch(0.09 0.008 222)" : "oklch(0.40 0.005 222)",
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            Přidat úkol
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────────────── */
function EditModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (t: Task) => void }) {
  const [form, setForm] = useState<Task>({ ...task });
  const { user } = useUserRole();
  const [novyKomentar, setNovyKomentar] = useState("");

  const komentare = form.komentare ?? [];
  const addKomentar = () => {
    const text = novyKomentar.trim();
    if (!text) return;
    const k: TaskComment = {
      autor: user?.displayName ?? "—",
      text,
      cas: new Date().toISOString(),
    };
    const updated = { ...form, komentare: [...komentare, k] };
    setForm(updated);
    onSave(updated);   // ulož hned, ať se komentář neztratí při zavření
    setNovyKomentar("");
  };
  const komentarCas = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "teď";
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${Math.floor(mins / 60)} h`;
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.6)" }} onClick={onClose} />
      <motion.div
        className="card relative w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            Upravit úkol
          </h2>
          <button onClick={onClose} className="btn-tactile p-1.5 rounded-[6px]" style={{ color: "oklch(0.45 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <TaskForm form={form} setForm={setForm} />

        {/* ── Komentáře / diskuze k úkolu ── */}
        <div className="pt-2" style={{ borderTop: "1px solid oklch(1 0 0 / 0.08)" }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5" style={{ color: "oklch(0.55 0.008 265)" }}>
            <MessageSquare className="w-3 h-3" /> Diskuze{komentare.length > 0 ? ` (${komentare.length})` : ""}
          </p>
          {komentare.length > 0 && (
            <div className="space-y-2 mb-2 max-h-[180px] overflow-y-auto pr-1">
              {komentare.map((k, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
                    style={{ background: "rgba(91,94,255,0.14)", color: "#5B5EFF" }}>
                    {(k.autor || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px]" style={{ color: "var(--foreground)" }}>
                      <span className="font-semibold">{k.autor}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: "oklch(0.5 0.008 265)" }}>{komentarCas(k.cas)}</span>
                    </p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: "oklch(0.78 0.008 265)" }}>{k.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input value={novyKomentar} onChange={(e) => setNovyKomentar(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKomentar(); } }}
              placeholder="Napsat komentář…"
              className="glass-input flex-1 px-3 py-2 text-[13px]" />
            <button onClick={addKomentar} disabled={!novyKomentar.trim()}
              className="btn-tactile w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 disabled:opacity-40"
              style={{ background: "#5B5EFF", color: "white" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-medium"
            style={{ color: "oklch(0.45 0.005 222)", background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)" }}
          >
            Zrušit
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-semibold"
            style={{ background: ACCENT, color: "oklch(0.09 0.008 222)" }}
          >
            Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Task row ───────────────────────────────────────────────────────────────── */
function TaskRow({ task, onToggle, onEdit }: { task: Task; onToggle: () => void; onEdit: () => void }) {
  const done = task.status === "Hotovo";
  const isRecurringInstance = task.opakujeSe === true && !task.opakovaniSablona;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group flex items-center gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-[oklch(1_0_0/0.02)] transition-colors"
      style={{ borderColor: "var(--border)" }}
      onClick={onEdit}
    >
      <button
        className="shrink-0 btn-tactile"
        onClick={e => { e.stopPropagation(); onToggle(); }}
        style={{ color: done ? ACCENT : "oklch(0.35 0.005 222)" }}
      >
        {done
          ? <CheckSquare className="w-4 h-4" />
          : <Square className="w-4 h-4" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] leading-snug truncate flex items-center gap-1.5"
          style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            color: done ? "oklch(0.40 0.005 222)" : "var(--foreground)",
            textDecoration: done ? "line-through" : "none",
            letterSpacing: "-0.01em",
          }}
        >
          {task.nazev}
          {isRecurringInstance && (
            <RefreshCw
              className="shrink-0 inline-block"
              style={{ width: 12, height: 12, color: PURPLE, opacity: 0.85 }}
            />
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-[--muted-foreground]">{task.projekt}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[oklch(0.35_0.005_222)]" />
          <User className="w-3 h-3 text-[oklch(0.40_0.005_222)]" />
          <span className="text-[11px] text-[--muted-foreground]">{task.prirazeno}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[oklch(0.35_0.005_222)]" />
          <DeadlineChip deadline={task.deadline} done={done} />
          {task.popis && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-[oklch(0.35_0.005_222)]" />
              <span className="text-[11px] text-[--muted-foreground] truncate max-w-[120px]">{task.popis}</span>
            </>
          )}
          {(task.komentare?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#7C7FFF" }}>
              <MessageSquare className="w-3 h-3" />{task.komentare!.length}
            </span>
          )}
        </div>
      </div>

      <PriorityBadge p={task.priorita} />
    </motion.div>
  );
}

/* ── Recurring templates section ────────────────────────────────────────────── */
function RecurringSablony({ templates, onEdit }: { templates: Task[]; onEdit: (t: Task) => void }) {
  const [open, setOpen] = useState(false);

  if (templates.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        className="flex items-center gap-2 mb-2 w-full text-left btn-tactile"
        onClick={() => setOpen(v => !v)}
      >
        <span
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[4px]"
          style={{
            color: PURPLE,
            background: `${PURPLE.replace(")", " / 0.12)")}`,
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Šablony opakujících se úkolů
        </span>
        <span className="text-[11px] text-[--muted-foreground]">{templates.length} šablon</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 ml-auto" style={{ color: PURPLE }} />
          : <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: PURPLE }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="card overflow-hidden mb-4"
              style={{ border: `1px solid ${PURPLE.replace(")", " / 0.2)")}` }}
            >
              {templates.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[oklch(1_0_0/0.02)] transition-colors"
                  style={{ borderBottom: i < templates.length - 1 ? "1px solid var(--border)" : "none" }}
                  onClick={() => onEdit(t)}
                >
                  <RefreshCw className="w-4 h-4 shrink-0" style={{ color: PURPLE }} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] leading-snug truncate"
                      style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.01em" }}
                    >
                      {t.nazev}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-[--muted-foreground]">{t.projekt}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-[oklch(0.35_0.005_222)]" />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: PURPLE }}
                      >
                        Každý {t.opakovaniDen}. v měsíci
                      </span>
                    </div>
                  </div>
                  <PriorityBadge p={t.priorita} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function UkolyPage() {
  const [tasks, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => SEED);
  const { user } = useUserRole();
  const seeAll = canSeeAllTasks(user?.roles);
  const myFirst = firstName(user?.displayName ?? "");
  const [assigneeFilter, setAssigneeFilter] = useState("Vše");
  const [statusFilter, setStatusFilter] = useState<TStatus | "Vše">("Vše");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const autoGenRan = useRef(false);

  /* ── Auto-generate recurring task instances ─────────────────────────────── */
  useEffect(() => {
    if (autoGenRan.current) return;
    if (!tasks || tasks.length === 0) return;
    autoGenRan.current = true;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const templates = tasks.filter(t => t.opakujeSe === true && t.opakovaniSablona === true);
    if (templates.length === 0) return;

    const newInstances: Task[] = [];

    for (const template of templates) {
      const den = template.opakovaniDen ?? 1;
      const targetDeadline = currentMonthDeadline(den);

      const alreadyExists = tasks.some(
        t =>
          !t.opakovaniSablona &&
          t.nazev === template.nazev &&
          t.deadline.includes(`${currentMonth}.`)
      );

      if (!alreadyExists) {
        const instance: Task = {
          ...template,
          id: Math.floor(Date.now() + Math.random() * 10000),
          opakovaniSablona: false,
          status: "Nové",
          deadline: targetDeadline,
        };
        newInstances.push(instance);
      }
    }

    if (newInstances.length > 0) {
      setTasks(prev => [...prev, ...newInstances]);
    }
  }, [tasks, setTasks]);

  const toggle = (id: number) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === "Hotovo" ? "Nové" : "Hotovo" } : t
    ));
  };

  const save = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const addTask = (t: Omit<Task, "id">) => {
    const newId = Math.max(0, ...tasks.map(x => x.id)) + 1;
    setTasks(prev => [{ id: newId, ...t }, ...prev]);
  };

  /* Zaměstnanec vidí jen svoje přiřazené úkoly; admin a PM vidí vše. */
  const scoped = seeAll ? tasks : tasks.filter(t => isMine(t.prirazeno, myFirst));

  /* Templates are excluded from the regular filtered list */
  const nonTemplates = scoped.filter(t => !t.opakovaniSablona);
  const templates = scoped.filter(t => t.opakovaniSablona === true);

  const needle = q.trim().toLowerCase();
  const filtered = nonTemplates.filter(t => {
    if (assigneeFilter !== "Vše" && t.prirazeno !== assigneeFilter) return false;
    if (statusFilter !== "Vše" && t.status !== statusFilter) return false;
    if (needle) {
      const hay = `${t.nazev} ${t.projekt} ${t.prirazeno} ${t.popis ?? ""} ${t.priorita}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const byStatus = STATUSES.map(s => ({
    status: s,
    items: filtered.filter(t => t.status === s).sort((a, b) => b.id - a.id),
  })).filter(g => g.items.length > 0);

  const active = nonTemplates.filter(t => t.status !== "Hotovo").length;
  const urgent = nonTemplates.filter(t => t.priorita === "Urgentní" && t.status !== "Hotovo").length;
  const done = nonTemplates.filter(t => t.status === "Hotovo").length;

  const filterChip = (
    label: string,
    active: boolean,
    onClick: () => void,
    color = ACCENT
  ) => (
    <button
      key={label}
      onClick={onClick}
      className="btn-tactile px-3 py-1 rounded-full text-[12px] font-semibold transition-all"
      style={{
        background: active ? `${color.replace(")", " / 0.15)")}` : "oklch(1 0 0 / 0.04)",
        color: active ? color : "oklch(0.45 0.005 222)",
        border: `1px solid ${active ? color.replace(")", " / 0.3)") : "oklch(1 0 0 / 0.08)"}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{
        background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.67 0.155 155 / 0.04) 0%, transparent 70%), var(--background)`,
      }}
    >
      {/* Header */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <div>
          <h1
            className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
            style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            Úkoly
          </h1>
          <p className="text-[12px] md:text-[13px] text-[--muted-foreground] mt-1.5">
            OnVision s.r.o. · Správa úkolů týmu
          </p>
        </div>
        <motion.button
          onClick={() => setAdding(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-semibold"
          style={{
            background: ACCENT,
            color: "oklch(0.09 0.008 222)",
            fontFamily: "var(--font-jakarta)",
            boxShadow: `0 0 16px oklch(0.67 0.155 155 / 0.2)`,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
          Nový úkol
        </motion.button>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
      >
        {[
          { label: "Aktivní", value: active, color: "oklch(0.62 0.27 265)" },
          { label: "Urgentní", value: urgent, color: "oklch(0.74 0.18 45)" },
          { label: "Dokončeno", value: done, color: ACCENT },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-5 py-4" style={{ background: "var(--card)" }}>
            <p className="text-[11px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium mb-1">{label}</p>
            <p className="text-[28px] font-bold leading-none" style={{ fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.03em" }}>
              {value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat úkol… (název, projekt, přiřazený)"
            className="w-full md:max-w-[360px] pl-9 pr-8 py-2 rounded-[8px] text-[13px] outline-none"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--muted-foreground]" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--muted-foreground]" title="Zrušit hledání">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.06em]">Člen:</span>
          {ASSIGNEES.map(a => filterChip(a, assigneeFilter === a, () => setAssigneeFilter(a)))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.06em]">Stav:&nbsp;&nbsp;</span>
          {STATUS_FILTER.map(s => filterChip(
            s,
            statusFilter === s,
            () => setStatusFilter(s),
            s === "Vše" ? ACCENT : STATUS_COLOR[s as TStatus] ?? ACCENT
          ))}
        </div>
      </motion.div>

      {/* Recurring templates section */}
      <RecurringSablony templates={templates} onEdit={t => setEditing(t)} />

      {/* Grouped tasks */}
      <div className="space-y-4">
        {byStatus.map(({ status, items }) => (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[4px]"
                style={{
                  color: STATUS_COLOR[status],
                  background: `${STATUS_COLOR[status].replace(")", " / 0.12)")}`,
                }}
              >
                {status}
              </span>
              <span className="text-[11px] text-[--muted-foreground]">{items.length} úkolů</span>
            </div>
            <div className="card overflow-hidden">
              <AnimatePresence>
                {items.map(t => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggle(t.id)}
                    onEdit={() => setEditing(t)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
        {byStatus.length === 0 && (
          <div className="card py-12 flex flex-col items-center text-[--muted-foreground]">
            <CheckSquare className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-[14px] font-medium">Žádné úkoly odpovídají filtru</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editing && (
          <EditModal task={editing} onClose={() => setEditing(null)} onSave={save} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {adding && (
          <AddModal onClose={() => setAdding(false)} onAdd={addTask} />
        )}
      </AnimatePresence>
    </div>
  );
}
