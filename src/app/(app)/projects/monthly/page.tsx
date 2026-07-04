"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, ChevronDown, RefreshCw, Users,
  Share2, Film, Camera, Mail, Megaphone, LayoutGrid,
  CheckCircle2, Circle, Trash2, AlertTriangle, CalendarDays,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
type DeliverableCategory =
  | "sociální sítě"
  | "video"
  | "foto"
  | "newsletter"
  | "reklama"
  | "jiné";

interface Deliverable {
  id: number;
  text: string;
  done: boolean;
  category: DeliverableCategory;
  deadline?: string;      // Czech format: "18. 5."
  prirazeno?: string;     // "Adam" | "Honza" | "Dominika"
  linkedTaskId?: number;  // id in ov-ukoly-tasks (set after sync)
}

interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: "Nízká" | "Střední" | "Vysoká" | "Urgentní";
  status: "Nové" | "Probíhá" | "Review" | "Hotovo";
  deadline: string;
}

interface RetainerClient {
  id: number;
  name: string;
  logo: string;
  color: string;
  pausal: number;
  reklama?: number;           // separate ad management fee (e.g. SENIMED)
  fakturace: "s.r.o." | "IČO";
  zodpovedna?: string;        // who is responsible (for IČO clients)
  aktivni: boolean;
  mesic: string;
  deliverables: Deliverable[];
  poznamka: string;
  kontakt: string;
  zacatek: string;
  hodinMesic?: number;        // allocated hours per month
  hodinOdpracovano?: number;  // hours logged this month
}

/* ── Stagger ────────────────────────────────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.23, 1, 0.32, 1] as const } },
  },
};

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const MONTHS_ALL_CZ = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];
/** Aktuální měsíc + dva předchozí — ať výběr žije s kalendářem. */
const CURRENT_MONTH_CZ = MONTHS_ALL_CZ[new Date().getMonth()];
const MONTHS_LIST = [-2, -1, 0].map((d) => MONTHS_ALL_CZ[(new Date().getMonth() + d + 12) % 12]);

function makeSeed(): RetainerClient[] {
  // Sorted largest → smallest paušál
  return [
    {
      id: 1,
      name: "SENIMED",
      logo: "SE",
      color: "oklch(0.62 0.27 265)",
      pausal: 45000,
      reklama: 5000,
      fakturace: "s.r.o.",
      aktivni: true,
      mesic: "Květen",
      poznamka: "Zdravotnické centrum + lékárny. Obsah na soc. sítě, reklamy a edukace.",
      kontakt: "",
      zacatek: "Únor 2026",
      deliverables: [],
    },
    {
      id: 2,
      name: "IMTOS",
      logo: "IM",
      color: "oklch(0.67 0.155 155)",
      pausal: 35000,
      fakturace: "s.r.o.",
      aktivni: true,
      mesic: "Květen",
      poznamka: "Dceřiná firma Rematech — webový portál + logo.",
      kontakt: "",
      zacatek: "Leden 2026",
      deliverables: [
        { id: 20001, text: "Logo Rematech", done: false, category: "jiné" as DeliverableCategory, deadline: "18. 5.", prirazeno: "Adam" },
        { id: 20002, text: "Webový portál Rematech", done: false, category: "jiné" as DeliverableCategory, deadline: "25. 5.", prirazeno: "Adam" },
      ],
    },
    {
      id: 3,
      name: "EASTGATE BRNO",
      logo: "EG",
      color: "oklch(0.65 0.22 25)",
      pausal: 30000,
      fakturace: "s.r.o.",
      aktivni: true,
      mesic: "Květen",
      poznamka: "Bytový komplex v Brně. Průběh stavby a propagace prodeje.",
      kontakt: "",
      zacatek: "Červen 2025",
      deliverables: [],
    },
    {
      id: 4,
      name: "MTBCZ",
      logo: "MB",
      color: "oklch(0.74 0.18 55)",
      pausal: 30000,
      fakturace: "IČO",
      zodpovedna: "Adam",
      aktivni: true,
      mesic: "Květen",
      poznamka: "",
      kontakt: "",
      zacatek: "Červen 2025",
      deliverables: [],
    },
    {
      id: 5,
      name: "TOFFI",
      logo: "TO",
      color: "oklch(0.70 0.18 290)",
      pausal: 30000,
      fakturace: "IČO",
      zodpovedna: "Honza",
      aktivni: true,
      mesic: "Květen",
      poznamka: "",
      kontakt: "",
      zacatek: "Červen 2025",
      deliverables: [],
    },
    {
      id: 6,
      name: "FIRESTA",
      logo: "FI",
      color: "oklch(0.72 0.18 310)",
      pausal: 28500,
      fakturace: "s.r.o.",
      aktivni: true,
      mesic: "Květen",
      poznamka: "",
      kontakt: "",
      zacatek: "Duben 2025",
      deliverables: [],
    },
    {
      id: 7,
      name: "BEHEJ BRNO",
      logo: "BB",
      color: "oklch(0.67 0.20 175)",
      pausal: 18000,
      fakturace: "IČO",
      zodpovedna: "Honza",
      aktivni: true,
      mesic: "Květen",
      poznamka: "Organizátor běžeckých závodů v Brně a okolí.",
      kontakt: "",
      zacatek: "Duben 2025",
      deliverables: [],
    },
    {
      id: 8,
      name: "POWERPLATE",
      logo: "PP",
      color: "oklch(0.78 0.165 75)",
      pausal: 12000,
      fakturace: "IČO",
      zodpovedna: "Adam",
      aktivni: true,
      mesic: "Květen",
      poznamka: "Vibrační fitness technologie.",
      kontakt: "",
      zacatek: "Únor 2025",
      deliverables: [],
    },
    {
      id: 9,
      name: "SK STAVOS BRNO SLATINA",
      logo: "SK",
      color: "oklch(0.65 0.18 240)",
      pausal: 12000,
      fakturace: "IČO",
      zodpovedna: "Adam",
      aktivni: true,
      mesic: "Květen",
      poznamka: "",
      kontakt: "",
      zacatek: "Říjen 2024",
      deliverables: [],
    },
  ];
}

/* ── Category metadata ──────────────────────────────────────────────────────── */
const CAT_META: Record<
  DeliverableCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  "sociální sítě": {
    label: "Soc. sítě",
    icon: <Share2 className="w-3 h-3" />,
    color: "oklch(0.62 0.27 265)",
    bg: "oklch(0.62 0.27 265 / 0.1)",
    border: "oklch(0.62 0.27 265 / 0.2)",
  },
  video: {
    label: "Video",
    icon: <Film className="w-3 h-3" />,
    color: "oklch(0.72 0.18 290)",
    bg: "oklch(0.64 0.21 290 / 0.1)",
    border: "oklch(0.64 0.21 290 / 0.2)",
  },
  foto: {
    label: "Foto",
    icon: <Camera className="w-3 h-3" />,
    color: "oklch(0.78 0.165 75)",
    bg: "oklch(0.74 0.165 75 / 0.1)",
    border: "oklch(0.74 0.165 75 / 0.2)",
  },
  newsletter: {
    label: "Newsletter",
    icon: <Mail className="w-3 h-3" />,
    color: "oklch(0.67 0.155 155)",
    bg: "oklch(0.67 0.155 155 / 0.1)",
    border: "oklch(0.67 0.155 155 / 0.2)",
  },
  reklama: {
    label: "Reklama",
    icon: <Megaphone className="w-3 h-3" />,
    color: "oklch(0.74 0.165 75)",
    bg: "oklch(0.74 0.165 75 / 0.08)",
    border: "oklch(0.74 0.165 75 / 0.18)",
  },
  jiné: {
    label: "Jiné",
    icon: <LayoutGrid className="w-3 h-3" />,
    color: "oklch(0.45 0.005 222)",
    bg: "oklch(1 0 0 / 0.05)",
    border: "oklch(1 0 0 / 0.09)",
  },
};

const ALL_CATEGORIES: DeliverableCategory[] = [
  "sociální sítě",
  "video",
  "foto",
  "newsletter",
  "reklama",
  "jiné",
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fKc(n: number): string {
  return n.toLocaleString("cs-CZ") + " Kč";
}

/** ISO "2026-05-18" → Czech "18. 5." */
function dateToCs(iso: string): string {
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  return `${parseInt(parts[2])}. ${parseInt(parts[1])}.`;
}

/** Czech "18. 5." → days until (negative = overdue) */
function daysUntilCs(cs: string): number | null {
  const m = cs.match(/(\d+)\.\s*(\d+)\.?/);
  if (!m) return null;
  const d = new Date(new Date().getFullYear(), parseInt(m[2]) - 1, parseInt(m[1]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function DeadlineChip({ deadline }: { deadline: string }) {
  const days = daysUntilCs(deadline);
  let color = "oklch(0.55 0.005 222)";
  let bg = "oklch(1 0 0 / 0.05)";
  let border = "oklch(1 0 0 / 0.09)";
  if (days !== null) {
    if (days < 0)      { color = "oklch(0.72 0.22 25)";  bg = "oklch(0.55 0.22 25 / 0.18)";  border = "oklch(0.65 0.22 25 / 0.4)"; }
    else if (days <= 1){ color = "oklch(0.82 0.16 45)";  bg = "oklch(0.74 0.18 45 / 0.16)";  border = "oklch(0.74 0.18 45 / 0.35)"; }
    else if (days <= 4){ color = "oklch(0.84 0.14 75)";  bg = "oklch(0.80 0.14 75 / 0.10)";  border = "oklch(0.80 0.14 75 / 0.25)"; }
    else if (days <= 10){ color = "oklch(0.70 0.12 222)"; bg = "oklch(0.62 0.27 265 / 0.08)"; border = "oklch(0.62 0.27 265 / 0.18)"; }
  }
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
        color, background: bg, border: `1px solid ${border}`,
        whiteSpace: "nowrap", fontFamily: "var(--font-outfit)",
      }}
    >
      <CalendarDays style={{ width: 9, height: 9 }} />
      {deadline}
    </span>
  );
}

function progressColor(pct: number): string {
  if (pct === 100) return "oklch(0.67 0.155 155)";
  if (pct >= 60)   return "oklch(0.62 0.27 265)";
  if (pct >= 30)   return "oklch(0.78 0.165 75)";
  return "oklch(0.65 0.22 25)";
}

/* ── Shared form components ─────────────────────────────────────────────────── */
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
const iSty: React.CSSProperties = {
  background: "oklch(1 0 0 / 0.04)",
  border: "1px solid oklch(1 0 0 / 0.09)",
  fontFamily: "var(--font-jakarta)",
};

function FInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={iCls}
      style={iSty}
      onFocus={(e) => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
      onBlur={(e) => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
    />
  );
}

function FTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className={`${iCls} resize-none`}
      style={iSty}
      onFocus={(e) => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
      onBlur={(e) => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
    />
  );
}

function FSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${iCls} appearance-none pr-8 cursor-pointer`}
        style={{ ...iSty, color: "var(--foreground)" }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ background: "oklch(0.12 0.008 222)" }}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Modal wrapper ──────────────────────────────────────────────────────────── */
function ModalWrap({
  title,
  onClose,
  onSave,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        className={`relative w-full ${wide ? "md:max-w-3xl" : "md:max-w-2xl"} max-h-[92vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]`}
        style={{
          background: "oklch(0.11 0.008 222)",
          border: "1px solid oklch(1 0 0 / 0.09)",
        }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0"
          style={{
            borderColor: "oklch(1 0 0 / 0.08)",
            background: "oklch(0.11 0.008 222)",
            zIndex: 2,
          }}
        >
          <h2
            className="text-[15px] font-bold text-[--foreground]"
            style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
        <div
          className="flex items-center justify-end gap-2.5 px-5 py-4 border-t"
          style={{ borderColor: "oklch(1 0 0 / 0.08)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
          >
            Zrušit
          </button>
          <motion.button
            onClick={onSave}
            whileHover={{ filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
            style={{
              background: "oklch(0.62 0.27 265)",
              color: "oklch(0.97 0.004 265)",
              fontFamily: "var(--font-outfit)",
            }}
          >
            Uložit
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Confirm dialog ─────────────────────────────────────────────────────────── */
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.7)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-sm rounded-[14px] p-6"
        style={{
          background: "oklch(0.13 0.008 222)",
          border: "1px solid oklch(1 0 0 / 0.1)",
        }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.74 0.165 75 / 0.12)", border: "1px solid oklch(0.74 0.165 75 / 0.2)" }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.74 0.165 75)" }} />
          </div>
          <div>
            <p
              className="text-[14px] font-bold text-[--foreground] mb-1"
              style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}
            >
              {title}
            </p>
            <p className="text-[12px] text-[--muted-foreground] leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-[7px] text-[12px] font-medium text-[--muted-foreground] btn-tactile"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
          >
            Zrušit
          </button>
          <motion.button
            onClick={onConfirm}
            whileTap={{ scale: 0.95 }}
            className="px-3.5 py-2 rounded-[7px] text-[12px] font-semibold btn-tactile"
            style={{ background: confirmColor, color: "oklch(0.09 0.008 222)", fontFamily: "var(--font-outfit)" }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Progress bar ───────────────────────────────────────────────────────────── */
function ProgressBar({
  pct,
  color,
  height = 5,
  delay = 0,
}: {
  pct: number;
  color: string;
  height?: number;
  delay?: number;
}) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: "oklch(1 0 0 / 0.07)" }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.65, delay, ease: [0.23, 1, 0.32, 1] }}
      />
    </div>
  );
}

/* ── Category badge ─────────────────────────────────────────────────────────── */
function CatBadge({
  cat,
  done,
  total,
}: {
  cat: DeliverableCategory;
  done: number;
  total: number;
}) {
  // Neznámá kategorie (překlep v datech, import…) nesmí shodit celou stránku.
  const m = CAT_META[cat] ?? CAT_META["jiné"];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold whitespace-nowrap"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {m.icon}
      {m.label} {done}/{total}
    </span>
  );
}

/* ── Client card ────────────────────────────────────────────────────────────── */
const TEAM_MEMBERS = ["—", "Adam", "Honza", "Dominika"] as const;

function ClientCard({
  client,
  catFilter,
  onToggle,
  onAddDeliverable,
  onDeleteDeliverable,
  onEdit,
  onNewMonth,
}: {
  client: RetainerClient;
  catFilter: DeliverableCategory | "vše";
  onToggle: (clientId: number, delivId: number) => void;
  onAddDeliverable: (clientId: number, text: string, cat: DeliverableCategory, deadline?: string, prirazeno?: string) => void;
  onDeleteDeliverable: (clientId: number, delivId: number) => void;
  onEdit: (client: RetainerClient) => void;
  onNewMonth: (clientId: number) => void;
}) {
  const [addText, setAddText] = useState("");
  const [addCat, setAddCat] = useState<DeliverableCategory>("sociální sítě");
  const [addDeadline, setAddDeadline] = useState("");
  const [addPrirazeno, setAddPrirazeno] = useState<string>("—");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () =>
      catFilter === "vše"
        ? client.deliverables
        : client.deliverables.filter((d) => d.category === catFilter),
    [client.deliverables, catFilter]
  );

  const total = client.deliverables.length;
  const done = client.deliverables.filter((d) => d.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = pct === 100 && total > 0;

  const pColor = progressColor(pct);

  const catBreakdown = useMemo(() => {
    const map: Partial<Record<DeliverableCategory, { done: number; total: number }>> = {};
    client.deliverables.forEach((d) => {
      if (!map[d.category]) map[d.category] = { done: 0, total: 0 };
      map[d.category]!.total++;
      if (d.done) map[d.category]!.done++;
    });
    return map;
  }, [client.deliverables]);

  function submitAdd() {
    if (!addText.trim()) return;
    const dl = addDeadline ? dateToCs(addDeadline) : undefined;
    const pr = addPrirazeno !== "—" ? addPrirazeno : undefined;
    onAddDeliverable(client.id, addText.trim(), addCat, dl, pr);
    setAddText("");
    setAddDeadline("");
    setAddPrirazeno("—");
    setShowAdd(false);
  }

  return (
    <motion.div
      layout
      className="card flex flex-col overflow-hidden"
      style={{
        boxShadow: isComplete
          ? `0 0 0 1px oklch(0.67 0.155 155 / 0.35), 0 0 24px oklch(0.67 0.155 155 / 0.08)`
          : undefined,
        borderColor: isComplete ? "oklch(0.67 0.155 155 / 0.3)" : undefined,
      }}
    >
      {/* Card accent stripe */}
      <div className="h-[3px] w-full" style={{ background: client.color }} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar — logo klienta, fallback na iniciály */}
          <ClientAvatar name={client.name} fallback={client.logo} color={client.color} boxClass="w-10 h-10 rounded-[10px]" />
          <div className="min-w-0">
            <p
              className="text-[14px] font-bold text-[--foreground] leading-snug truncate"
              style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}
            >
              {client.name}
            </p>
            <p className="text-[11px] text-[--muted-foreground] truncate">{client.kontakt}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isComplete && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold"
              style={{
                color: "oklch(0.67 0.155 155)",
                background: "oklch(0.67 0.155 155 / 0.1)",
                border: "1px solid oklch(0.67 0.155 155 / 0.22)",
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              100%
            </span>
          )}
          <motion.button
            onClick={() => onEdit(client)}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground] hover:text-[--foreground] transition-colors"
            style={{ border: "1px solid oklch(1 0 0 / 0.07)" }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Paušál + progress */}
      <div className="px-4 pb-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium mb-0.5">
              Paušál / měsíc
            </p>
            <p
              className="num leading-none"
              style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 700,
                fontSize: "22px",
                letterSpacing: "-0.025em",
                color: client.color,
              }}
            >
              {fKc(client.pausal)}
            </p>
            {client.reklama && (
              <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.75 0.16 55)" }}>
                + {fKc(client.reklama)} reklama
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[--muted-foreground] mb-0.5">Splněno</p>
            <p
              className="num text-[18px] font-bold leading-none"
              style={{ fontFamily: "var(--font-outfit)", color: pColor }}
            >
              {done}
              <span className="text-[12px] font-medium text-[--muted-foreground]">/{total}</span>
            </p>
          </div>
        </div>
        <ProgressBar pct={pct} color={pColor} delay={0.1} />
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[10px] text-[--muted-foreground]">
              {client.mesic} · od {client.zacatek}
            </p>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px]"
              style={
                client.fakturace === "s.r.o."
                  ? { background: "oklch(0.62 0.27 265 / 0.1)", color: "oklch(0.70 0.20 265)" }
                  : { background: "oklch(0.67 0.155 155 / 0.1)", color: "oklch(0.67 0.155 155)" }
              }
            >
              {client.fakturace === "s.r.o." ? "OnVision s.r.o." : `IČO · ${client.zodpovedna ?? ""}`}
            </span>
          </div>
          <p
            className="num text-[11px] font-semibold"
            style={{ fontFamily: "var(--font-outfit)", color: pColor }}
          >
            {pct}%
          </p>
        </div>
      </div>

      {/* Retainer health — hours utilization */}
      {client.hodinMesic && client.hodinMesic > 0 && (
        <div className="px-4 pb-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
          {(() => {
            const spent  = client.hodinOdpracovano ?? 0;
            const alloc  = client.hodinMesic!;
            const pct    = Math.round((spent / alloc) * 100);
            const over   = pct > 100;
            const barClr = over
              ? "oklch(0.62 0.22 25)"
              : pct >= 80
              ? "oklch(0.74 0.18 55)"
              : "oklch(0.67 0.155 155)";
            return (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium">
                    Hodinová kapacita
                  </p>
                  <span className="text-[11px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: barClr }}>
                    {spent}h / {alloc}h
                    {over && <span className="ml-1 text-[9px]">⚠ přetaženo</span>}
                  </span>
                </div>
                <ProgressBar pct={Math.min(pct, 100)} color={barClr} height={3} />
              </>
            );
          })()}
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(catBreakdown).length > 0 && (
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-b" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
          {(Object.keys(catBreakdown) as DeliverableCategory[]).map((cat) => (
            <CatBadge
              key={cat}
              cat={cat}
              done={catBreakdown[cat]!.done}
              total={catBreakdown[cat]!.total}
            />
          ))}
        </div>
      )}

      {/* Checklist */}
      <div className="flex-1 px-4 py-3 space-y-1">
        <AnimatePresence initial={false}>
          {visible.map((d) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="group flex items-center gap-2.5 py-1.5 rounded-[6px] -mx-1 px-1 cursor-pointer select-none"
              onContextMenu={(e) => {
                e.preventDefault();
                onDeleteDeliverable(client.id, d.id);
              }}
              onPointerDown={(e) => {
                if (e.pointerType === "touch") {
                  const timer = window.setTimeout(() => {
                    onDeleteDeliverable(client.id, d.id);
                  }, 600);
                  const up = () => {
                    clearTimeout(timer);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointerup", up);
                }
              }}
            >
              <motion.button
                onClick={() => onToggle(client.id, d.id)}
                className="shrink-0 btn-tactile"
                whileTap={{ scale: 0.85 }}
                transition={{ duration: 0.12 }}
              >
                <AnimatePresence mode="wait">
                  {d.done ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <CheckCircle2 className="w-[15px] h-[15px]" style={{ color: client.color }} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="undone"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Circle className="w-[15px] h-[15px] text-[--muted-foreground]" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onToggle(client.id, d.id)}
              >
                <span
                  className="block text-[13px] leading-snug transition-all duration-200 truncate"
                  style={{
                    color: d.done ? "oklch(0.35 0.005 222)" : "var(--foreground)",
                    textDecoration: d.done ? "line-through" : "none",
                    textDecorationColor: d.done ? "oklch(0.35 0.005 222)" : undefined,
                  }}
                >
                  {d.text}
                </span>
                {(d.deadline || d.prirazeno) && !d.done && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {d.deadline && <DeadlineChip deadline={d.deadline} />}
                    {d.prirazeno && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: "oklch(0.42 0.005 222)",
                        fontFamily: "var(--font-jakarta)",
                      }}>
                        {d.prirazeno}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <motion.button
                onClick={() => onDeleteDeliverable(client.id, d.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-[4px] btn-tactile transition-opacity"
                style={{ color: "oklch(0.65 0.22 25)" }}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 className="w-3 h-3" />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add deliverable inline */}
        <AnimatePresence>
          {showAdd ? (
            <motion.div
              key="addinput"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                {/* Row 1: text + add + close */}
                <div className="flex gap-2">
                  <input
                    ref={addRef}
                    value={addText}
                    onChange={(e) => setAddText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitAdd();
                      if (e.key === "Escape") setShowAdd(false);
                    }}
                    placeholder="Název úkolu..."
                    className="flex-1 px-2.5 py-1.5 rounded-[6px] text-[12px] text-[--foreground] outline-none"
                    style={{
                      background: "oklch(1 0 0 / 0.04)",
                      border: "1px solid oklch(1 0 0 / 0.09)",
                      fontFamily: "var(--font-jakarta)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = `${client.color.replace(")", " / 0.4)")}`)}
                    onBlur={(e) => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
                    autoFocus
                  />
                  <motion.button
                    onClick={submitAdd}
                    whileTap={{ scale: 0.95 }}
                    className="px-2.5 py-1.5 rounded-[6px] text-[12px] font-semibold btn-tactile shrink-0"
                    style={{
                      background: client.color,
                      color: "oklch(0.09 0.008 222)",
                      fontFamily: "var(--font-outfit)",
                    }}
                  >
                    Přidat
                  </motion.button>
                  <motion.button
                    onClick={() => { setShowAdd(false); setAddDeadline(""); setAddPrirazeno("—"); }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground]"
                    style={{ border: "1px solid oklch(1 0 0 / 0.07)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
                {/* Row 2: deadline + assignee */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: addDeadline ? client.color : "oklch(0.38 0.005 222)" }} />
                    <input
                      type="date"
                      value={addDeadline}
                      onChange={(e) => setAddDeadline(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-[6px] text-[11px] text-[--foreground] outline-none"
                      style={{
                        background: "oklch(1 0 0 / 0.04)",
                        border: `1px solid ${addDeadline ? client.color.replace(")", " / 0.3)") : "oklch(1 0 0 / 0.09)"}`,
                        fontFamily: "var(--font-jakarta)",
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={addPrirazeno}
                      onChange={(e) => setAddPrirazeno(e.target.value)}
                      className="appearance-none px-2.5 pr-6 py-1.5 rounded-[6px] text-[11px] text-[--foreground] outline-none cursor-pointer"
                      style={{
                        background: "oklch(1 0 0 / 0.04)",
                        border: `1px solid ${addPrirazeno !== "—" ? client.color.replace(")", " / 0.3)") : "oklch(1 0 0 / 0.09)"}`,
                        fontFamily: "var(--font-jakarta)",
                      }}
                    >
                      {TEAM_MEMBERS.map((m) => (
                        <option key={m} value={m} style={{ background: "oklch(0.12 0.008 222)" }}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[--muted-foreground]" />
                  </div>
                </div>
                {/* Row 3: category */}
                <div className="flex flex-wrap gap-1">
                  {ALL_CATEGORIES.map((c) => {
                    const m = CAT_META[c];
                    const active = addCat === c;
                    return (
                      <button
                        key={c}
                        onClick={() => setAddCat(c)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold btn-tactile"
                        style={
                          active
                            ? { color: m.color, background: m.bg, border: `1px solid ${m.border}` }
                            : {
                                color: "oklch(0.35 0.005 222)",
                                background: "transparent",
                                border: "1px solid oklch(1 0 0 / 0.06)",
                              }
                        }
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="addbutton"
              onClick={() => {
                setShowAdd(true);
                setTimeout(() => addRef.current?.focus(), 50);
              }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-1.5 mt-1 py-1.5 px-1 rounded-[6px] text-[12px] btn-tactile transition-colors"
              style={{ color: "oklch(0.38 0.005 222)" }}
              whileHover={{ color: client.color }}
            >
              <Plus className="w-3.5 h-3.5" />
              Přidat úkol
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Poznámka */}
      {client.poznamka && (
        <div
          className="px-4 pb-3 text-[11px] text-[--muted-foreground] leading-relaxed"
          style={{ borderTop: "1px solid oklch(1 0 0 / 0.05)", paddingTop: "10px" }}
        >
          {client.poznamka}
        </div>
      )}

      {/* Footer: Nový měsíc */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
        <motion.button
          onClick={() => setConfirmReset(true)}
          whileTap={{ scale: 0.97 }}
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5 text-[11px] font-semibold btn-tactile"
          style={{ color: "oklch(0.38 0.005 222)" }}
        >
          <RefreshCw className="w-3 h-3" />
          Nový měsíc →
        </motion.button>
      </div>

      {/* Confirm reset */}
      <AnimatePresence>
        {confirmReset && (
          <ConfirmDialog
            title={`Nový měsíc — ${client.name}`}
            body={`Resetovat všechny úkoly klienta ${client.name} na nesplněné? Akci nelze vzít zpět.`}
            confirmLabel="Resetovat"
            confirmColor="oklch(0.74 0.165 75)"
            onConfirm={() => {
              setConfirmReset(false);
              onNewMonth(client.id);
            }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Edit / Add client modal ────────────────────────────────────────────────── */
type ClientFormState = Omit<RetainerClient, "id" | "deliverables"> & { id?: number };

const EMPTY_CLIENT: ClientFormState = {
  name: "",
  logo: "",
  color: "oklch(0.62 0.27 265)",
  pausal: 0,
  reklama: undefined,
  fakturace: "s.r.o.",
  zodpovedna: "",
  aktivni: true,
  mesic: "Květen",
  poznamka: "",
  kontakt: "",
  zacatek: "",
  hodinMesic: undefined,
  hodinOdpracovano: undefined,
};

const PRESET_COLORS = [
  "oklch(0.62 0.27 265)",
  "oklch(0.67 0.155 155)",
  "oklch(0.78 0.165 75)",
  "oklch(0.72 0.18 290)",
  "oklch(0.64 0.21 290)",
  "oklch(0.65 0.22 25)",
];

function ClientModal({
  client,
  onClose,
  onSave,
}: {
  client: RetainerClient | null;
  onClose: () => void;
  onSave: (data: ClientFormState) => void;
}) {
  const [f, setF] = useState<ClientFormState>(
    client
      ? {
          id: client.id,
          name: client.name,
          logo: client.logo,
          color: client.color,
          pausal: client.pausal,
          reklama: client.reklama,
          fakturace: client.fakturace ?? "s.r.o.",
          zodpovedna: client.zodpovedna ?? "",
          aktivni: client.aktivni,
          mesic: client.mesic,
          poznamka: client.poznamka,
          kontakt: client.kontakt,
          zacatek: client.zacatek,
          hodinMesic: client.hodinMesic,
          hodinOdpracovano: client.hodinOdpracovano,
        }
      : { ...EMPTY_CLIENT }
  );

  const set =
    (k: keyof ClientFormState) =>
    (v: string | boolean | number) =>
      setF((p) => ({ ...p, [k]: v }));

  return (
    <ModalWrap
      title={client ? `Upravit klienta — ${client.name}` : "Nový klient"}
      onClose={onClose}
      onSave={() => onSave(f)}
      wide
    >
      <Field label="Název klienta">
        <FInput value={f.name} onChange={set("name")} placeholder="SENIMED s.r.o." />
      </Field>
      <Field label="Kontaktní osoba">
        <FInput value={f.kontakt} onChange={set("kontakt")} placeholder="Jana Nováková" />
      </Field>
      <Field label="Iniciály (logo)">
        <FInput value={f.logo} onChange={set("logo")} placeholder="SE" />
      </Field>
      <Field label="Paušál (Kč/měsíc)">
        <FInput
          value={f.pausal ? String(f.pausal) : ""}
          onChange={(v) => set("pausal")(Number(v.replace(/\D/g, "")) || 0)}
          placeholder="25000"
        />
      </Field>
      <Field label="Začátek smlouvy">
        <FInput value={f.zacatek} onChange={set("zacatek")} placeholder="Leden 2026" />
      </Field>
      <Field label="Hodin v paušálu / měsíc">
        <FInput
          value={f.hodinMesic ? String(f.hodinMesic) : ""}
          onChange={(v) => set("hodinMesic")(v ? Number(v.replace(/\D/g, "")) || 0 : undefined as unknown as number)}
          placeholder="20 (volitelné)"
        />
      </Field>
      <Field label="Hodiny odpracováno tento měsíc">
        <FInput
          value={f.hodinOdpracovano ? String(f.hodinOdpracovano) : ""}
          onChange={(v) => set("hodinOdpracovano")(v ? Number(v.replace(/\D/g, "")) || 0 : undefined as unknown as number)}
          placeholder="0"
        />
      </Field>
      <Field label="Reklama / správa (Kč/měsíc)">
        <FInput
          value={f.reklama ? String(f.reklama) : ""}
          onChange={(v) => set("reklama")(v ? Number(v.replace(/\D/g, "")) || 0 : undefined as unknown as number)}
          placeholder="5000 (volitelné)"
        />
      </Field>
      <Field label="Fakturace">
        <FSelect
          value={f.fakturace}
          onChange={(v) => set("fakturace")(v as "s.r.o." | "IČO")}
          options={["s.r.o.", "IČO"]}
        />
      </Field>
      <Field label="Zodpovídá (pro IČO)">
        <FSelect
          value={f.zodpovedna ?? ""}
          onChange={set("zodpovedna")}
          options={["", "Adam", "Honza", "Dominika"]}
        />
      </Field>
      <Field label="Aktuální měsíc">
        <FSelect
          value={f.mesic}
          onChange={set("mesic")}
          options={["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"]}
        />
      </Field>
      <Field label="Barva akcentu">
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => set("color")(c)}
              className="w-7 h-7 rounded-full btn-tactile shrink-0 transition-all"
              style={{
                background: c,
                outline: f.color === c ? `2px solid ${c}` : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </Field>
      <Field label="Stav">
        <div className="flex items-center gap-3">
          <button
            onClick={() => set("aktivni")(true)}
            className="flex-1 py-2 rounded-[7px] text-[12px] font-semibold btn-tactile"
            style={
              f.aktivni
                ? {
                    background: "oklch(0.67 0.155 155 / 0.12)",
                    color: "oklch(0.67 0.155 155)",
                    border: "1px solid oklch(0.67 0.155 155 / 0.25)",
                  }
                : { background: "oklch(1 0 0 / 0.03)", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.07)" }
            }
          >
            Aktivní
          </button>
          <button
            onClick={() => set("aktivni")(false)}
            className="flex-1 py-2 rounded-[7px] text-[12px] font-semibold btn-tactile"
            style={
              !f.aktivni
                ? {
                    background: "oklch(0.65 0.22 25 / 0.1)",
                    color: "oklch(0.65 0.22 25)",
                    border: "1px solid oklch(0.65 0.22 25 / 0.2)",
                  }
                : { background: "oklch(1 0 0 / 0.03)", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.07)" }
            }
          >
            Neaktivní
          </button>
        </div>
      </Field>
      <div className="md:col-span-2">
        <Field label="Poznámka / popis">
          <FTextarea value={f.poznamka} onChange={set("poznamka")} placeholder="Stručný popis klienta..." />
        </Field>
      </div>
    </ModalWrap>
  );
}

/* ── Sidebar summary ────────────────────────────────────────────────────────── */
function SidebarSummary({ clients }: { clients: RetainerClient[] }) {
  const active = clients.filter((c) => c.aktivni);
  const totalPausal = active.reduce((s, c) => s + c.pausal, 0);
  const totalDel = active.reduce((s, c) => s + c.deliverables.length, 0);
  const doneDel = active.reduce((s, c) => s + c.deliverables.filter((d) => d.done).length, 0);
  const overallPct = totalDel > 0 ? Math.round((doneDel / totalDel) * 100) : 0;

  return (
    <aside className="hidden md:flex flex-col gap-4 w-[260px] shrink-0">
      {/* Total contracted */}
      <div className="card p-4">
        <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.07em] font-medium mb-2">
          Celkem paušály
        </p>
        <p
          className="num leading-none"
          style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 700,
            fontSize: "26px",
            letterSpacing: "-0.025em",
            color: "oklch(0.62 0.27 265)",
          }}
        >
          {fKc(totalPausal)}
        </p>
        <p className="text-[11px] text-[--muted-foreground] mt-1.5">
          {active.length} aktivních klientů
        </p>
      </div>

      {/* Overall progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.07em] font-medium">
            Tento měsíc
          </p>
          <span
            className="num text-[14px] font-bold"
            style={{ fontFamily: "var(--font-outfit)", color: progressColor(overallPct) }}
          >
            {overallPct}%
          </span>
        </div>
        <ProgressBar pct={overallPct} color={progressColor(overallPct)} />
        <p className="text-[11px] text-[--muted-foreground] mt-1.5">
          {doneDel}/{totalDel} úkolů splněno
        </p>
      </div>

      {/* Per-client mini bars */}
      <div className="card p-4">
        <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.07em] font-medium mb-3">
          Klienti
        </p>
        <div className="space-y-3">
          {active.map((c) => {
            const tot = c.deliverables.length;
            const dn = c.deliverables.filter((d) => d.done).length;
            const pct = tot > 0 ? Math.round((dn / tot) * 100) : 0;
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{
                        background: `${c.color.replace(")", " / 0.15)")}`,
                        color: c.color,
                        fontFamily: "var(--font-outfit)",
                      }}
                    >
                      {c.logo}
                    </span>
                    <span className="text-[11px] text-[--foreground] truncate font-medium">{c.name}</span>
                  </div>
                  <span
                    className="num text-[11px] font-bold shrink-0 ml-2"
                    style={{ fontFamily: "var(--font-outfit)", color: c.color }}
                  >
                    {pct}%
                  </span>
                </div>
                <ProgressBar pct={pct} color={c.color} height={3} delay={0.1} />
              </div>
            );
          })}
        </div>
      </div>

      {/* MRR note */}
      <div
        className="card p-4"
        style={{
          background: "oklch(0.62 0.27 265 / 0.05)",
          borderColor: "oklch(0.62 0.27 265 / 0.15)",
        }}
      >
        <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.07em] font-medium mb-1.5">
          MRR
        </p>
        <p
          className="num text-[18px] font-bold leading-none"
          style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.62 0.27 265)" }}
        >
          {fKc(totalPausal)}
        </p>
        <p className="text-[10px] text-[--muted-foreground] mt-1.5">
          ARR: {fKc(totalPausal * 12)}
        </p>
      </div>
    </aside>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function MonthlyPage() {
  const [clients, setClients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", makeSeed);
  const [tasks, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_CZ);
  const [confirmAllMonth, setConfirmAllMonth] = useState(false);
  const [catFilter, setCatFilter] = useState<DeliverableCategory | "vše">("vše");
  const [editClient, setEditClient] = useState<RetainerClient | null | "new">(null);

  /* ── Sync úkol → deliverable ──────────────────────────────────────────────
   * Když někdo dokončí propojený úkol v /ukoly (status "Hotovo"), označ i
   * deliverable jako hotový. Opačný směr řeší handleToggle. Zapisuje se jen
   * při skutečné změně, takže nehrozí smyčka.
   */
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const doneTaskIds = new Set(tasks.filter((t) => t.status === "Hotovo").map((t) => t.id));
    if (doneTaskIds.size === 0) return;
    setClients((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (!c.deliverables.some((d) => !d.done && d.linkedTaskId && doneTaskIds.has(d.linkedTaskId))) return c;
        changed = true;
        return {
          ...c,
          deliverables: c.deliverables.map((d) =>
            !d.done && d.linkedTaskId && doneTaskIds.has(d.linkedTaskId) ? { ...d, done: true } : d
          ),
        };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  /* ── Derived ── */
  const activeClients = useMemo(
    () => clients.filter((c) => c.aktivni),
    [clients]
  );

  const totalMRR = useMemo(
    () => activeClients.reduce((s, c) => s + c.pausal, 0),
    [activeClients]
  );

  /* ── Handlers ── */
  const handleToggle = useCallback((clientId: number, delivId: number) => {
    // Sync deliverable → úkol: odškrtnutí zavře i propojený úkol,
    // vrácení zpět ho vrátí do "Probíhá" (ať neleží hotový na dashboardu).
    const deliv = clients.find((c) => c.id === clientId)?.deliverables.find((d) => d.id === delivId);
    setClients((prev) =>
      prev.map((c) =>
        c.id !== clientId
          ? c
          : {
              ...c,
              deliverables: c.deliverables.map((d) =>
                d.id === delivId ? { ...d, done: !d.done } : d
              ),
            }
      )
    );
    if (deliv?.linkedTaskId !== undefined) {
      const linkedId = deliv.linkedTaskId;
      const targetStatus = !deliv.done ? "Hotovo" : "Probíhá";
      setTasks((prev) =>
        prev.map((t) => (t.id === linkedId && t.status !== targetStatus ? { ...t, status: targetStatus as Task["status"] } : t))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const handleAddDeliverable = useCallback(
    (clientId: number, text: string, cat: DeliverableCategory, deadline?: string, prirazeno?: string) => {
      const newId = Date.now();
      const client = clients.find((c) => c.id === clientId);

      setClients((prev) =>
        prev.map((c) =>
          c.id !== clientId
            ? c
            : {
                ...c,
                deliverables: [
                  ...c.deliverables,
                  { id: newId, text, done: false, category: cat, deadline, prirazeno, linkedTaskId: deadline ? newId : undefined },
                ],
              }
        )
      );

      // If a deadline is set, also write to the global task list so it appears on the dashboard and calendar
      if (deadline && client) {
        const newTask: Task = {
          id: newId,
          nazev: text,
          projekt: client.name,
          prirazeno: prirazeno ?? "",
          priorita: "Střední",
          status: "Nové",
          deadline,
        };
        setTasks((prev) => [...prev, newTask]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients]
  );

  const handleDeleteDeliverable = useCallback((clientId: number, delivId: number) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id !== clientId
          ? c
          : { ...c, deliverables: c.deliverables.filter((d) => d.id !== delivId) }
      )
    );
  }, []);

  const handleNewMonth = useCallback((clientId: number) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const idx = MONTHS_ALL_CZ.indexOf(c.mesic);
        const next = MONTHS_ALL_CZ[(idx + 1) % 12];
        return {
          ...c,
          mesic: next,
          deliverables: c.deliverables.map((d) => ({ ...d, done: false })),
        };
      })
    );
  }, []);

  /** Hromadně posune všechny aktivní klienty do dalšího cyklu a odškrtne checklisty. */
  const handleNewMonthAll = useCallback(() => {
    setClients((prev) =>
      prev.map((c) => {
        if (!c.aktivni) return c;
        const idx = MONTHS_ALL_CZ.indexOf(c.mesic);
        return {
          ...c,
          mesic: MONTHS_ALL_CZ[(idx + 1) % 12],
          deliverables: c.deliverables.map((d) => ({ ...d, done: false })),
        };
      })
    );
    setConfirmAllMonth(false);
  }, [setClients]);

  const handleSaveClient = useCallback(
    (data: ClientFormState) => {
      if (data.id !== undefined) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === data.id
              ? {
                  ...c,
                  name: data.name,
                  logo: data.logo,
                  color: data.color,
                  pausal: data.pausal,
                  reklama: data.reklama,
                  fakturace: data.fakturace,
                  zodpovedna: data.zodpovedna,
                  aktivni: data.aktivni,
                  mesic: data.mesic,
                  poznamka: data.poznamka,
                  kontakt: data.kontakt,
                  zacatek: data.zacatek,
                  hodinMesic: data.hodinMesic,
                  hodinOdpracovano: data.hodinOdpracovano,
                }
              : c
          )
        );
      } else {
        setClients((prev) => [
          ...prev,
          {
            id: Date.now(),
            name: data.name,
            logo: data.logo,
            color: data.color,
            pausal: data.pausal,
            reklama: data.reklama,
            fakturace: data.fakturace,
            zodpovedna: data.zodpovedna,
            aktivni: data.aktivni,
            mesic: data.mesic,
            poznamka: data.poznamka,
            kontakt: data.kontakt,
            zacatek: data.zacatek,
            deliverables: [],
          },
        ]);
      }
      setEditClient(null);
    },
    []
  );

  return (
    <div
      className="p-4 md:p-7 min-h-screen"
      style={{
        background: `radial-gradient(ellipse 55% 40% at 100% 0%, oklch(0.62 0.27 265 / 0.04) 0%, transparent 70%), var(--background)`,
      }}
    >
      {/* ── Page header ── */}
      <motion.div
        className="flex items-start justify-between gap-4 mb-5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.62 0.27 265 / 0.12)",
              border: "1px solid oklch(0.62 0.27 265 / 0.2)",
            }}
          >
            <Users className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} />
          </div>
          <div>
            <h1
              className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
            >
              Měsíční klienti
            </h1>
            <p className="text-[12px] text-[--muted-foreground] mt-1">
              Retainer checklist · {selectedMonth} {new Date().getFullYear()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* MRR chip */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{
              background: "oklch(0.62 0.27 265 / 0.09)",
              border: "1px solid oklch(0.62 0.27 265 / 0.2)",
              color: "oklch(0.62 0.27 265)",
            }}
          >
            <span className="pulse w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
            MRR {fKc(totalMRR)}
          </div>

          {/* Bulk: nový měsíc pro všechny (s potvrzením) */}
          <motion.button
            onClick={() => (confirmAllMonth ? handleNewMonthAll() : setConfirmAllMonth(true))}
            onBlur={() => setConfirmAllMonth(false)}
            whileTap={{ scale: 0.95 }}
            className="btn-tactile hidden md:flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold"
            style={
              confirmAllMonth
                ? { background: "oklch(0.74 0.165 75 / 0.15)", border: "1px solid oklch(0.74 0.165 75 / 0.4)", color: "oklch(0.8 0.155 75)" }
                : { background: "transparent", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--muted-foreground)" }
            }
            title="Posune všechny aktivní klienty do dalšího měsíce a odškrtne checklisty"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {confirmAllMonth ? "Opravdu? Odškrtne checklisty" : "Nový měsíc (všichni)"}
          </motion.button>

          {/* Add client button */}
          <motion.button
            onClick={() => setEditClient("new")}
            whileTap={{ scale: 0.95 }}
            className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold"
            style={{
              background: "oklch(0.62 0.27 265)",
              color: "oklch(0.97 0.004 265)",
              fontFamily: "var(--font-outfit)",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nový klient</span>
            <span className="sm:hidden">Nový</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Month selector + category filter ── */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Month pills */}
        <div className="flex items-center gap-1">
          {MONTHS_LIST.map((m) => {
            const active = selectedMonth === m;
            return (
              <motion.button
                key={m}
                onClick={() => setSelectedMonth(m)}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-[7px] text-[12px] font-semibold btn-tactile whitespace-nowrap"
                style={
                  active
                    ? {
                        background: "oklch(0.62 0.27 265 / 0.1)",
                        color: "oklch(0.62 0.27 265)",
                        border: "1px solid oklch(0.62 0.27 265 / 0.25)",
                      }
                    : {
                        background: "transparent",
                        color: "oklch(0.40 0.005 222)",
                        border: "1px solid oklch(1 0 0 / 0.06)",
                      }
                }
              >
                {m}
                {m === "Květen" && (
                  <span
                    className="ml-1.5 inline-flex items-center px-1 py-0 rounded text-[9px] font-bold"
                    style={{
                      background: "oklch(0.62 0.27 265 / 0.15)",
                      color: "oklch(0.62 0.27 265)",
                    }}
                  >
                    aktuální
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Category filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setCatFilter("vše")}
            className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
            style={
              catFilter === "vše"
                ? {
                    background: "oklch(1 0 0 / 0.07)",
                    color: "var(--foreground)",
                    border: "1px solid oklch(1 0 0 / 0.12)",
                  }
                : {
                    background: "transparent",
                    color: "oklch(0.38 0.005 222)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                  }
            }
          >
            Vše
          </button>
          {ALL_CATEGORIES.map((c) => {
            const m = CAT_META[c];
            const active = catFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCatFilter(active ? "vše" : c)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
                style={
                  active
                    ? { color: m.color, background: m.bg, border: `1px solid ${m.border}` }
                    : {
                        color: "oklch(0.38 0.005 222)",
                        background: "transparent",
                        border: "1px solid oklch(1 0 0 / 0.06)",
                      }
                }
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Main layout: grid + sidebar ── */}
      <div className="flex gap-5 items-start">
        {/* Cards grid */}
        <motion.div
          className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0"
          variants={stagger.container}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {activeClients.map((client) => (
              <motion.div key={client.id} variants={stagger.item} layout>
                <ClientCard
                  client={client}
                  catFilter={catFilter}
                  onToggle={handleToggle}
                  onAddDeliverable={handleAddDeliverable}
                  onDeleteDeliverable={handleDeleteDeliverable}
                  onEdit={(c) => setEditClient(c)}
                  onNewMonth={handleNewMonth}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add client card */}
          <motion.div variants={stagger.item}>
            <motion.button
              onClick={() => setEditClient("new")}
              whileHover={{ borderColor: "oklch(0.62 0.27 265 / 0.3)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="card w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-3 btn-tactile"
              style={{ borderStyle: "dashed" }}
            >
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
              >
                <Plus className="w-5 h-5 text-[--muted-foreground]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[--muted-foreground]" style={{ fontFamily: "var(--font-outfit)" }}>
                  Přidat klienta
                </p>
                <p className="text-[11px] text-[--muted-foreground] opacity-70 mt-0.5">Nová retainer smlouva</p>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Sidebar */}
        <SidebarSummary clients={clients} />
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {editClient !== null && (
          <ClientModal
            key="client-modal"
            client={editClient === "new" ? null : editClient}
            onClose={() => setEditClient(null)}
            onSave={handleSaveClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
