"use client";

import { useState } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import { GitMerge, Plus, X, TrendingUp, DollarSign, CheckCircle, LayoutGrid, List } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type DealFaze = "Lead" | "Nabídka" | "Jednání" | "Podpis" | "Realizace" | "Dokončeno";

interface Deal {
  id: number;
  klient: string;
  kontakt: string;
  faze: DealFaze;
  hodnota: number;
  pravdepodobnost: number;
  poznamka: string;
  datum: string;
}

/* ── Faze config ────────────────────────────────────────────────────────────── */
const FAZES: { id: DealFaze; color: string; bg: string; border: string }[] = [
  { id: "Lead",      color: "oklch(0.50 0.005 222)", bg: "oklch(1 0 0 / 0.04)",          border: "oklch(1 0 0 / 0.1)" },
  { id: "Nabídka",   color: "oklch(0.82 0.16 85)",   bg: "oklch(0.82 0.16 85 / 0.1)",   border: "oklch(0.82 0.16 85 / 0.22)" },
  { id: "Jednání",   color: "oklch(0.62 0.27 265)",  bg: "oklch(0.62 0.27 265 / 0.12)", border: "oklch(0.62 0.27 265 / 0.22)" },
  { id: "Podpis",    color: "oklch(0.68 0.18 275)",  bg: "oklch(0.68 0.18 275 / 0.12)", border: "oklch(0.68 0.18 275 / 0.22)" },
  { id: "Realizace", color: "oklch(0.72 0.2 330)",   bg: "oklch(0.72 0.2 330 / 0.1)",   border: "oklch(0.72 0.2 330 / 0.2)" },
  { id: "Dokončeno", color: "oklch(0.67 0.155 155)", bg: "oklch(0.67 0.155 155 / 0.12)", border: "oklch(0.67 0.155 155 / 0.22)" },
];

const ACCENT = "oklch(0.68 0.18 275)";

function getFaze(id: DealFaze) {
  return FAZES.find(f => f.id === id)!;
}

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const SEED: Deal[] = [
  { id: 1,  klient: "EFFECT Clinic",            kontakt: "Mgr. Veronika Novotná",   faze: "Jednání",   hodnota: 85000,  pravdepodobnost: 70,  poznamka: "Nová spolupráce — foto+video+grafika",     datum: "12. 5." },
  { id: 2,  klient: "Restaurant JEAN PAUL",      kontakt: "Jean-Paul Dufour",         faze: "Nabídka",   hodnota: 45000,  pravdepodobnost: 50,  poznamka: "Rebrand + nové menu vizuály",               datum: "8. 5." },
  { id: 3,  klient: "YONEX Česká republika",     kontakt: "Ing. Martin Kelemen",      faze: "Podpis",    hodnota: 120000, pravdepodobnost: 90,  poznamka: "Roční content spolupráce",                  datum: "15. 5." },
  { id: 4,  klient: "Mo.one",                    kontakt: "Pavel Moravec",            faze: "Realizace", hodnota: 95000,  pravdepodobnost: 95,  poznamka: "Kompletní branding + web",                  datum: "1. 5." },
  { id: 5,  klient: "Wellness ZENIQ",            kontakt: "Bc. Jana Procházková",     faze: "Lead",      hodnota: 35000,  pravdepodobnost: 20,  poznamka: "Zájem o sociální sítě",                     datum: "14. 5." },
  { id: 6,  klient: "AUTO Centrum Brno",         kontakt: "Tomáš Kratochvíl",         faze: "Lead",      hodnota: 60000,  pravdepodobnost: 25,  poznamka: "Promo video pro showroom",                  datum: "13. 5." },
  { id: 7,  klient: "TEKMA s.r.o.",              kontakt: "Ing. Radek Buček",         faze: "Realizace", hodnota: 80000,  pravdepodobnost: 95,  poznamka: "Série promo videí Q2 2026",                 datum: "1. 4." },
  { id: 8,  klient: "BehejBrno",                 kontakt: "Ondřej Musil",             faze: "Dokončeno", hodnota: 55000,  pravdepodobnost: 100, poznamka: "Roční content spolupráce podepsána",        datum: "1. 3." },
  { id: 9,  klient: "SENIMED s.r.o.",            kontakt: "MUDr. Pavel Novák",        faze: "Dokončeno", hodnota: 190000, pravdepodobnost: 100, poznamka: "Aktivní klient — měsíční paušál",           datum: "1. 1." },
  { id: 10, klient: "Fitness Studio FLEX",       kontakt: "Mgr. Lucie Horáčková",     faze: "Nabídka",   hodnota: 28000,  pravdepodobnost: 40,  poznamka: "Focení + reels pro Instagram",              datum: "10. 5." },
];

/* ── Deal modal ─────────────────────────────────────────────────────────────── */
const EMPTY_DEAL: Omit<Deal, "id"> = {
  klient: "", kontakt: "", faze: "Lead", hodnota: 0, pravdepodobnost: 50, poznamka: "", datum: "",
};

function DealModal({ deal, onClose, onSave, onDelete }: {
  deal: Omit<Deal, "id"> & { id?: number };
  onClose: () => void;
  onSave: (d: Omit<Deal, "id"> & { id?: number }) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({ ...deal });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.6)" }} onClick={onClose} />
      <motion.div
        className="card relative w-full max-w-lg p-6 space-y-4"
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            {form.id ? "Upravit deal" : "Nový deal"}
          </h2>
          <button onClick={onClose} className="btn-tactile p-1.5 rounded-[6px]" style={{ color: "oklch(0.45 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["klient", "kontakt", "datum"] as const).map(field => (
            <div key={field} className={field === "klient" ? "col-span-2" : ""}>
              <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">
                {field === "klient" ? "Klient" : field === "kontakt" ? "Kontakt" : "Datum"}
              </label>
              <input
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">Hodnota (Kč)</label>
            <input type="number" value={form.hodnota}
              onChange={e => setForm(prev => ({ ...prev, hodnota: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-outfit)" }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">Pravděpodobnost %</label>
            <input type="number" value={form.pravdepodobnost} min={0} max={100}
              onChange={e => setForm(prev => ({ ...prev, pravdepodobnost: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-outfit)" }}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">Fáze</label>
            <select value={form.faze} onChange={e => setForm(prev => ({ ...prev, faze: e.target.value as DealFaze }))}
              className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}>
              {FAZES.map(f => <option key={f.id} value={f.id}>{f.id}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">Poznámka</label>
            <textarea value={form.poznamka}
              onChange={e => setForm(prev => ({ ...prev, poznamka: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none resize-none"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          {onDelete && (
            <button onClick={onDelete}
              className="btn-tactile px-3 py-2 rounded-[8px] text-[12px] font-medium mr-auto"
              style={{ color: "oklch(0.65 0.22 25)", background: "oklch(0.65 0.22 25 / 0.08)", border: "1px solid oklch(0.65 0.22 25 / 0.2)" }}>
              Smazat
            </button>
          )}
          <button onClick={onClose}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-medium"
            style={{ color: "oklch(0.45 0.005 222)", background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)" }}>
            Zrušit
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-semibold"
            style={{ background: ACCENT, color: "#fff" }}>
            Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Deal card (shared between list view and kanban) ──────────────────────── */
function DealCardInner({ deal, compact = false }: { deal: Deal; compact?: boolean }) {
  const faze = getFaze(deal.faze);
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] leading-snug"
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
          {deal.klient}
        </p>
        {compact && (
          <span className="text-[9px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[4px] shrink-0"
            style={{ color: faze.color, background: faze.bg, border: `1px solid ${faze.border}` }}>
            {deal.faze}
          </span>
        )}
      </div>
      <p className="text-[20px] font-bold leading-none mb-2"
        style={{ fontFamily: "var(--font-outfit)", color: faze.color, letterSpacing: "-0.03em" }}>
        {deal.hodnota.toLocaleString("cs-CZ")}
        <span className="text-[12px] font-normal ml-1" style={{ color: "oklch(0.40 0.005 222)" }}>Kč</span>
      </p>
      {!compact && <p className="text-[11px] text-[--muted-foreground] mb-3 leading-snug">{deal.poznamka}</p>}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[--muted-foreground] truncate">{deal.kontakt}</span>
        <span className="text-[11px] font-bold shrink-0 ml-2" style={{ color: faze.color }}>{deal.pravdepodobnost}%</span>
      </div>
      <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ background: faze.color, width: `${deal.pravdepodobnost}%` }} />
      </div>
      <p className="text-[10px] text-[--muted-foreground] mt-1.5">{deal.datum}</p>
    </>
  );
}

/* ── Draggable card ────────────────────────────────────────────────────────── */
function DraggableCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        className="card p-3.5 select-none"
        whileHover={!isDragging ? { y: -1 } : {}}
        transition={{ duration: 0.15 }}
        onPointerUp={e => {
          // Only fire onClick if not dragging (no significant movement)
          if (!transform || (Math.abs(transform.x) < 4 && Math.abs(transform.y) < 4)) {
            onClick();
          }
        }}
      >
        <DealCardInner deal={deal} compact />
      </motion.div>
    </div>
  );
}

/* ── Droppable column ──────────────────────────────────────────────────────── */
function KanbanColumn({
  faze,
  deals,
  onCardClick,
  onAddDeal,
  isOver,
}: {
  faze: typeof FAZES[0];
  deals: Deal[];
  onCardClick: (d: Deal) => void;
  onAddDeal: (faze: DealFaze) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: faze.id });
  const total = deals.reduce((s, d) => s + d.hodnota, 0);

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-2 min-h-[300px] min-w-[230px] flex-shrink-0 w-[230px] rounded-[12px] p-2.5 transition-colors"
      style={{
        background: isOver
          ? `${faze.bg.replace("0.12)", "0.2)")}`
          : "oklch(1 0 0 / 0.025)",
        border: `1px solid ${isOver ? faze.border : "oklch(1 0 0 / 0.07)"}`,
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em]"
            style={{ color: faze.color }}>{faze.id}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: faze.bg, color: faze.color }}>{deals.length}</span>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-semibold" style={{ color: "oklch(0.42 0.005 222)" }}>
            {(total / 1000).toFixed(0)}k
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {deals.map(d => (
          <DraggableCard key={d.id} deal={d} onClick={() => onCardClick(d)} />
        ))}
      </div>

      {/* Add deal button */}
      <button
        onClick={() => onAddDeal(faze.id)}
        className="w-full py-1.5 rounded-[7px] text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100"
        style={{ color: faze.color, border: `1px dashed ${faze.border}` }}
      >
        <Plus className="w-3 h-3" /> Přidat
      </button>
    </div>
  );
}

/* ── List view deal card ───────────────────────────────────────────────────── */
function ListDealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  return (
    <motion.div className="card p-4 cursor-pointer"
      whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}>
      <DealCardInner deal={deal} />
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function PipelinePage() {
  const [deals, setDeals] = useSupabaseData<Deal[]>("ov-pipeline-deals", () => SEED);
  const [fazFilter, setFazFilter] = useState<DealFaze | "Vše">("Vše");
  const [editing, setEditing] = useState<Deal | null>(null);
  const [adding, setAdding] = useState<DealFaze | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState<DealFaze | null>(null);

  let nextId = Math.max(0, ...deals.map(d => d.id)) + 1;

  const addDeal = (d: Omit<Deal, "id"> & { id?: number }) => {
    setDeals(prev => [...prev, { ...d, id: nextId++ } as Deal]);
  };

  const saveDeal = (d: Omit<Deal, "id"> & { id?: number }) => {
    if (d.id) setDeals(prev => prev.map(x => x.id === d.id ? d as Deal : x));
  };

  const deleteDeal = (id: number) => {
    setDeals(prev => prev.filter(d => d.id !== id));
    setEditing(null);
  };

  const weighted = deals.reduce((s, d) => s + d.hodnota * d.pravdepodobnost / 100, 0);
  const total = deals.reduce((s, d) => s + d.hodnota, 0);
  const closed = deals.filter(d => d.faze === "Dokončeno").reduce((s, d) => s + d.hodnota, 0);

  const filtered = fazFilter === "Vše" ? deals : deals.filter(d => d.faze === fazFilter);

  const grouped = FAZES.map(f => ({
    faze: f,
    items: filtered.filter(d => d.faze === f.id),
  }));

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const activeDeal = activeId !== null ? deals.find(d => d.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragOver(event: { over: { id: string } | null }) {
    const overId = event.over?.id as DealFaze | undefined;
    setOverColumn(overId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);
    if (!over) return;
    const dealId = active.id as number;
    const newFaze = over.id as DealFaze;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, faze: newFaze } : d));
  }

  return (
    <div
      className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{ background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.68 0.18 275 / 0.04) 0%, transparent 70%), var(--background)` }}
    >
      {/* Header */}
      <motion.div className="flex items-start justify-between"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div>
          <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
            style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}>
            Pipeline
          </h1>
          <p className="text-[12px] md:text-[13px] text-[--muted-foreground] mt-1.5">
            OnVision s.r.o. · CRM & obchodní příležitosti
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-1 rounded-[8px]"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
            <button onClick={() => setView("kanban")}
              className="p-1.5 rounded-[6px] transition-all"
              title="Kanban"
              style={view === "kanban"
                ? { background: ACCENT, color: "#fff" }
                : { color: "oklch(0.42 0.005 222)" }}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView("list")}
              className="p-1.5 rounded-[6px] transition-all"
              title="Seznam"
              style={view === "list"
                ? { background: ACCENT, color: "#fff" }
                : { color: "oklch(0.42 0.005 222)" }}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <motion.button
            onClick={() => setAdding("Lead")}
            className="btn-tactile flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-semibold"
            style={{ background: ACCENT, color: "#fff" }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Plus className="w-4 h-4" /> Nový deal
          </motion.button>
        </div>
      </motion.div>

      {/* KPI stats */}
      <motion.div
        className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}>
        {[
          { label: "Pipeline (vážená)", value: Math.round(weighted).toLocaleString("cs-CZ"), unit: "Kč", icon: TrendingUp, color: ACCENT },
          { label: "Potenciál celkem",  value: total.toLocaleString("cs-CZ"),                unit: "Kč", icon: DollarSign, color: "oklch(0.62 0.27 265)" },
          { label: "Uzavřeno",          value: closed.toLocaleString("cs-CZ"),               unit: "Kč", icon: CheckCircle, color: "oklch(0.67 0.155 155)" },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="px-5 py-4 flex items-center gap-3" style={{ background: "var(--card)" }}>
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.2)")}` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium mb-0.5">{label}</p>
              <p className="leading-none" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 20, color, letterSpacing: "-0.02em" }}>
                {value} <span style={{ fontSize: 12, fontWeight: 400, color: "oklch(0.40 0.005 222)" }}>{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Faze filter (list view only) */}
      {view === "list" && (
        <motion.div className="flex items-center gap-1.5 flex-wrap"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
          {(["Vše", ...FAZES.map(f => f.id)] as (DealFaze | "Vše")[]).map(f => {
            const isActive = fazFilter === f;
            const faze = f !== "Vše" ? getFaze(f) : null;
            return (
              <button key={f} onClick={() => setFazFilter(f)}
                className="btn-tactile px-3 py-1 rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background: isActive ? (faze ? faze.bg : "oklch(1 0 0 / 0.08)") : "oklch(1 0 0 / 0.04)",
                  color: isActive ? (faze ? faze.color : "var(--foreground)") : "oklch(0.45 0.005 222)",
                  border: `1px solid ${isActive ? (faze ? faze.border : "oklch(1 0 0 / 0.15)") : "oklch(1 0 0 / 0.08)"}`,
                }}>
                {f}
              </button>
            );
          })}
        </motion.div>
      )}

      {/* ── KANBAN VIEW ─────────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver as never}
          onDragEnd={handleDragEnd}
        >
          <motion.div
            className="flex gap-3 overflow-x-auto pb-4"
            style={{ scrollbarWidth: "thin" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            {grouped.map(({ faze, items }) => (
              <KanbanColumn
                key={faze.id}
                faze={faze}
                deals={items}
                onCardClick={setEditing}
                onAddDeal={(f) => setAdding(f)}
                isOver={overColumn === faze.id}
              />
            ))}
          </motion.div>

          {/* Drag overlay — ghost card following cursor */}
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeDeal && (
              <div className="card p-3.5 w-[230px] rotate-2 shadow-2xl opacity-95"
                style={{ boxShadow: `0 20px 40px -8px oklch(0 0 0 / 0.5)` }}>
                <DealCardInner deal={activeDeal} compact />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── LIST VIEW ────────────────────────────────────────────────────────── */}
      {view === "list" && (
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {fazFilter === "Vše" ? (
            grouped.filter(g => g.items.length > 0).map(({ faze, items }) => (
              <div key={faze.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[4px]"
                    style={{ color: faze.color, background: faze.bg, border: `1px solid ${faze.border}` }}>
                    {faze.id}
                  </span>
                  <span className="text-[11px] text-[--muted-foreground]">{items.length} dealů</span>
                  <span className="text-[11px] font-semibold" style={{ color: faze.color }}>
                    {items.reduce((s, d) => s + d.hodnota, 0).toLocaleString("cs-CZ")} Kč
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(d => <ListDealCard key={d.id} deal={d} onClick={() => setEditing(d)} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(d => <ListDealCard key={d.id} deal={d} onClick={() => setEditing(d)} />)}
              {filtered.length === 0 && (
                <div className="col-span-3 card py-12 flex flex-col items-center text-[--muted-foreground]">
                  <GitMerge className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-[14px] font-medium">Žádné dealy v této fázi</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {editing && (
          <DealModal
            key="edit"
            deal={editing}
            onClose={() => setEditing(null)}
            onSave={saveDeal}
            onDelete={() => deleteDeal(editing.id)}
          />
        )}
        {adding !== null && (
          <DealModal
            key="add"
            deal={{ ...EMPTY_DEAL, faze: adding }}
            onClose={() => setAdding(null)}
            onSave={addDeal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
