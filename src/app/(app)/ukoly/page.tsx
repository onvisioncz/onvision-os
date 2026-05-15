"use client";

import { useState } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, X, Calendar, User,
} from "lucide-react";

/* ── Deadline helpers ───────────────────────────────────────────────────────── */
function parseDeadline(str: string): Date | null {
  const m = str.match(/(\d+)\.\s*(\d+)\.?(?:\s*(\d{4}))?/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const month = parseInt(m[2]) - 1;
  const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

function DeadlineChip({ deadline, done }: { deadline: string; done: boolean }) {
  if (done) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[--muted-foreground]">
        <Calendar className="w-3 h-3" />
        {deadline}
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
    label = deadline;
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

interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: Priorita;
  status: TStatus;
  deadline: string;
  popis?: string;
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
];

const STATUSES: TStatus[] = ["Nové", "Probíhá", "Review", "Hotovo"];
const ASSIGNEES = ["Vše", "Adam", "Zdeněk", "Matěj", "Monika", "Patrik"];
const STATUS_FILTER: (TStatus | "Vše")[] = ["Vše", "Nové", "Probíhá", "Review", "Hotovo"];

const ACCENT = "oklch(0.67 0.155 155)";

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

      {/* Deadline — prominent */}
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

      <div className="grid grid-cols-3 gap-3">
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

  const canSave = form.nazev.trim().length > 0 && form.deadline.trim().length > 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.65)" }} onClick={onClose} />
      <motion.div
        className="card relative w-full max-w-md p-6 space-y-4"
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

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.6)" }} onClick={onClose} />
      <motion.div
        className="card relative w-full max-w-md p-6 space-y-4"
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
          className="text-[13px] leading-snug truncate"
          style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            color: done ? "oklch(0.40 0.005 222)" : "var(--foreground)",
            textDecoration: done ? "line-through" : "none",
            letterSpacing: "-0.01em",
          }}
        >
          {task.nazev}
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
        </div>
      </div>

      <PriorityBadge p={task.priorita} />
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function UkolyPage() {
  const [tasks, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => SEED);
  const [assigneeFilter, setAssigneeFilter] = useState("Vše");
  const [statusFilter, setStatusFilter] = useState<TStatus | "Vše">("Vše");
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);

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

  const filtered = tasks.filter(t => {
    if (assigneeFilter !== "Vše" && t.prirazeno !== assigneeFilter) return false;
    if (statusFilter !== "Vše" && t.status !== statusFilter) return false;
    return true;
  });

  const byStatus = STATUSES.map(s => ({
    status: s,
    items: filtered.filter(t => t.status === s),
  })).filter(g => g.items.length > 0);

  const active = tasks.filter(t => t.status !== "Hotovo").length;
  const urgent = tasks.filter(t => t.priorita === "Urgentní" && t.status !== "Hotovo").length;
  const done = tasks.filter(t => t.status === "Hotovo").length;

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
