"use client";

import { useState, useMemo } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  KanbanSquare, Plus, X, Edit2, Check, ChevronDown,
  ChevronLeft, ChevronRight, User, Calendar, Banknote, Tag,
} from "lucide-react";
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

/* ── Types ──────────────────────────────────────────────────────────────────── */
type ColumnId =
  | "poptavka"
  | "nabidka"
  | "potvrzeno"
  | "preprodukce"
  | "nataceni"
  | "postprodukce"
  | "schvaleni"
  | "dokonceno";

type Priorita = "vysoká" | "střední" | "nízká";
type Typ = "VIDEO" | "FOTO" | "VIDEO + FOTO" | "BTS" | "REKLAMA";

interface CheckItem { text: string; done: boolean }

interface Project {
  id: number;
  title: string;
  klient: string;
  column: ColumnId;
  priorita: Priorita;
  typ: Typ;
  datum: string;
  castka: number;
  clenove: string[];
  checklist: CheckItem[];
  poznamka: string;
}

/* ── Column definitions ─────────────────────────────────────────────────────── */
const COLUMNS: { id: ColumnId; label: string; tint: string; border: string }[] = [
  { id: "poptavka",     label: "Poptávka",      tint: "oklch(0.64 0.21 290 / 0.08)",  border: "oklch(0.64 0.21 290 / 0.22)" },
  { id: "nabidka",      label: "Nabídka",       tint: "oklch(0.62 0.27 265 / 0.08)", border: "oklch(0.62 0.27 265 / 0.22)" },
  { id: "potvrzeno",    label: "Potvrzeno",     tint: "oklch(0.67 0.155 155 / 0.08)", border: "oklch(0.67 0.155 155 / 0.22)" },
  { id: "preprodukce",  label: "Pre-produkce",  tint: "oklch(0.74 0.165 75 / 0.08)",  border: "oklch(0.74 0.165 75 / 0.22)" },
  { id: "nataceni",     label: "Natáčení",      tint: "oklch(0.65 0.22 25 / 0.08)",   border: "oklch(0.65 0.22 25 / 0.22)" },
  { id: "postprodukce", label: "Post-produkce", tint: "oklch(0.72 0.18 290 / 0.08)",  border: "oklch(0.72 0.18 290 / 0.22)" },
  { id: "schvaleni",    label: "Schválení",     tint: "oklch(0.74 0.165 75 / 0.08)",  border: "oklch(0.74 0.165 75 / 0.22)" },
  { id: "dokonceno",    label: "Dokončeno",     tint: "oklch(0.67 0.155 155 / 0.08)", border: "oklch(0.67 0.155 155 / 0.22)" },
];

const COLUMN_IDS = COLUMNS.map((c) => c.id);

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const SEED: Project[] = [
  {
    id: 1, title: "Průběh stavby", klient: "EASTGATE Brno", column: "potvrzeno",
    priorita: "vysoká", typ: "VIDEO", datum: "20. 5. 2026", castka: 35000,
    clenove: ["Adam", "Honza"],
    checklist: [
      { text: "Schůzka s klientem", done: true },
      { text: "Shooting schedule", done: true },
      { text: "Natáčecí den potvrzen", done: false },
    ],
    poznamka: "Pravidelný měsíční výjezd na stavbu.",
  },
  {
    id: 2, title: "Kampaňové video", klient: "SENIMED s.r.o.", column: "nataceni",
    priorita: "vysoká", typ: "VIDEO + FOTO", datum: "15. 5. 2026", castka: 28000,
    clenove: ["Adam"],
    checklist: [
      { text: "Scénář schválen", done: true },
      { text: "Herci domluveni", done: true },
      { text: "Střih — verze 1", done: false },
    ],
    poznamka: "Zdravotnická tématikas. Nutné schválení textu lékařem.",
  },
  {
    id: 3, title: "Produktový film", klient: "Power Plate Česko", column: "preprodukce",
    priorita: "střední", typ: "VIDEO", datum: "2. 6. 2026", castka: 45000,
    clenove: ["Honza"],
    checklist: [
      { text: "Brief potvrzen", done: true },
      { text: "Lokace průzkum", done: false },
      { text: "Equipment list", done: false },
    ],
    poznamka: "Sportovní vybavení, studio + exteriér.",
  },
  {
    id: 4, title: "Firemní akce", klient: "IMTOS s.r.o.", column: "postprodukce",
    priorita: "střední", typ: "VIDEO + FOTO", datum: "17. 4. 2026", castka: 22000,
    clenove: ["Adam", "Honza"],
    checklist: [
      { text: "Footage import", done: true },
      { text: "Selekce fotek", done: true },
      { text: "Střih v2", done: false },
      { text: "Export finální", done: false },
    ],
    poznamka: "ROSSO STEEL firemní event.",
  },
  {
    id: 5, title: "Race coverage", klient: "BehejBrno", column: "schvaleni",
    priorita: "nízká", typ: "VIDEO", datum: "19. 4. 2026", castka: 18000,
    clenove: ["Honza"],
    checklist: [
      { text: "Střih odevzdán", done: true },
      { text: "Klientské připomínky", done: false },
      { text: "Finální export", done: false },
    ],
    poznamka: "Půlmaraton coverage.",
  },
  {
    id: 6, title: "Brand fotky", klient: "Cukrárna TOFFI", column: "dokonceno",
    priorita: "nízká", typ: "FOTO", datum: "7. 5. 2026", castka: 12000,
    clenove: ["Adam"],
    checklist: [
      { text: "Focení", done: true },
      { text: "Retuš", done: true },
      { text: "Odevzdání klientovi", done: true },
    ],
    poznamka: "Šumavská pobočka. Dorty + interiér.",
  },
  {
    id: 7, title: "Promo video", klient: "TEKMA s.r.o.", column: "poptavka",
    priorita: "vysoká", typ: "VIDEO", datum: "TBD", castka: 60000,
    clenove: [],
    checklist: [
      { text: "Odpověď na poptávku", done: false },
      { text: "Schůzka", done: false },
      { text: "Nacenění", done: false },
    ],
    poznamka: "Odhad 60 000 Kč. Velký projekt.",
  },
  {
    id: 8, title: "Dvorecký most", klient: "FIRESTA", column: "nabidka",
    priorita: "střední", typ: "VIDEO", datum: "12. 6. 2026", castka: 38000,
    clenove: ["Honza"],
    checklist: [
      { text: "Nabídka odeslána", done: true },
      { text: "Čekání na odpověď", done: false },
    ],
    poznamka: "Dokumentace průběhu stavby mostu.",
  },
  {
    id: 9, title: "Social content", klient: "EFFECT Clinic", column: "preprodukce",
    priorita: "střední", typ: "FOTO", datum: "25. 5. 2026", castka: 15000,
    clenove: ["Adam"],
    checklist: [
      { text: "Moodboard schválen", done: true },
      { text: "Termín potvrzen", done: false },
    ],
    poznamka: "Instagram + Facebook obsah.",
  },
  {
    id: 10, title: "Sezóna 2026", klient: "SK Brno Slatina", column: "potvrzeno",
    priorita: "střední", typ: "VIDEO", datum: "16. 5. 2026", castka: 25000,
    clenove: ["Adam", "Honza"],
    checklist: [
      { text: "Smlouva podepsána", done: true },
      { text: "Plán natáčení", done: false },
      { text: "Akreditace hala", done: false },
    ],
    poznamka: "FINAL FOUR + play-off coverage.",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fKc(n: number) {
  return n.toLocaleString("cs-CZ") + " Kč";
}

function fmtStyleByTyp(typ: Typ) {
  if (typ === "VIDEO")        return { color: "oklch(0.62 0.27 265)", bg: "oklch(0.62 0.27 265 / 0.1)",  border: "oklch(0.62 0.27 265 / 0.25)" };
  if (typ === "FOTO")         return { color: "oklch(0.74 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.09)",  border: "oklch(0.74 0.165 75 / 0.22)" };
  if (typ === "VIDEO + FOTO") return { color: "oklch(0.72 0.18 290)",  bg: "oklch(0.64 0.21 290 / 0.1)",   border: "oklch(0.64 0.21 290 / 0.22)" };
  if (typ === "BTS")          return { color: "oklch(0.78 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.07)",  border: "oklch(0.74 0.165 75 / 0.18)" };
  /* REKLAMA */                return { color: "oklch(0.65 0.22 25)",   bg: "oklch(0.65 0.22 25 / 0.08)",   border: "oklch(0.65 0.22 25 / 0.2)" };
}

function prioritaStyle(p: Priorita) {
  if (p === "vysoká") return { color: "oklch(0.65 0.22 25)",  bg: "oklch(0.65 0.22 25 / 0.1)",  border: "oklch(0.65 0.22 25 / 0.25)" };
  if (p === "střední") return { color: "oklch(0.74 0.165 75)", bg: "oklch(0.74 0.165 75 / 0.09)", border: "oklch(0.74 0.165 75 / 0.22)" };
  return { color: "oklch(0.45 0.005 222)", bg: "oklch(1 0 0 / 0.05)", border: "oklch(1 0 0 / 0.1)" };
}

const AVATAR_COLORS: Record<string, string> = {
  Adam:  "oklch(0.62 0.27 265 / 0.85)",
  Honza: "oklch(0.67 0.155 155 / 0.85)",
};

function Avatar({ name }: { name: string }) {
  const bg = AVATAR_COLORS[name] ?? "oklch(0.64 0.21 290 / 0.85)";
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white"
      style={{ background: bg }}
      title={name}
    >
      {name[0]}
    </span>
  );
}

/* ── Stagger animation ───────────────────────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 12 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  },
};

/* ── Main page ────────────────────────────────────────────────────────────────── */
export default function OneoffsPage() {
  const [projects, setProjects] = useSupabaseData<Project[]>("ov-oneoffs-projects", () => SEED);
  const [filterTyp, setFilterTyp] = useState<Typ | "">("");
  const [filterClen, setFilterClen] = useState<string>("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Project | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(e.active.id as number);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;
    const projectId = active.id as number;
    const newCol = over.id as ColumnId;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, column: newCol } : p));
  }

  /* ── Filtered projects ──── */
  const visible = useMemo(() => {
    return projects.filter((p) => {
      if (filterTyp && p.typ !== filterTyp) return false;
      if (filterClen && !p.clenove.includes(filterClen)) return false;
      return true;
    });
  }, [projects, filterTyp, filterClen]);

  const totalValue = useMemo(() => projects.reduce((s, p) => s + p.castka, 0), [projects]);
  const visibleValue = useMemo(() => visible.reduce((s, p) => s + p.castka, 0), [visible]);

  /* ── Shooting days this month ──── */
  const shootingDays = useMemo(
    () => visible.filter((p) => p.column === "nataceni").length,
    [visible]
  );

  /* ── Move left / right ──── */
  function moveProject(id: number, dir: -1 | 1) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const idx = COLUMN_IDS.indexOf(p.column);
        const next = COLUMN_IDS[idx + dir];
        if (!next) return p;
        return { ...p, column: next };
      })
    );
    if (selected?.id === id) {
      setSelected((prev) => {
        if (!prev) return null;
        const idx = COLUMN_IDS.indexOf(prev.column);
        const next = COLUMN_IDS[idx + dir];
        return next ? { ...prev, column: next } : prev;
      });
    }
  }

  /* ── Toggle checklist item ──── */
  function toggleCheck(projectId: number, idx: number) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const checklist = p.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
        return { ...p, checklist };
      })
    );
    setSelected((prev) => {
      if (!prev || prev.id !== projectId) return prev;
      const checklist = prev.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
      return { ...prev, checklist };
    });
  }

  /* ── Save edit ──── */
  function saveEdit() {
    if (!editDraft) return;
    setProjects((prev) => prev.map((p) => (p.id === editDraft.id ? editDraft : p)));
    setSelected(editDraft);
    setEditing(false);
    setEditDraft(null);
  }

  /* ── Open modal ──── */
  function openModal(p: Project) {
    setSelected(p);
    setEditing(false);
    setEditDraft(null);
  }

  /* ── Close modal ──── */
  function closeModal() {
    setSelected(null);
    setEditing(false);
    setEditDraft(null);
  }

  /* ── Add new project (stub) ──── */
  function addToColumn(col: ColumnId) {
    const newProj: Project = {
      id: Date.now(),
      title: "Nový projekt",
      klient: "Klient",
      column: col,
      priorita: "střední",
      typ: "VIDEO",
      datum: "",
      castka: 0,
      clenove: [],
      checklist: [],
      poznamka: "",
    };
    setProjects((prev) => [newProj, ...prev]);
    openModal(newProj);
    setEditing(true);
    setEditDraft(newProj);
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 md:px-6 pt-5 md:pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <KanbanSquare className="w-6 h-6" style={{ color: "oklch(0.62 0.27 265)" }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.95 0.005 222)" }}>
            Jednorázovky
          </h1>
        </div>
        <button
          onClick={() => addToColumn("poptavka")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)" }}
        >
          <Plus className="w-4 h-4" />
          Nový projekt
        </button>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 md:px-6 pb-3 shrink-0 flex-wrap">
        {[
          { label: "Projektů celkem", value: String(projects.length) },
          { label: "Pipeline hodnota", value: fKc(totalValue) },
          { label: "Natáčení tento měsíc", value: String(shootingDays) + " dní" },
        ].map((s) => (
          <div key={s.label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <span style={{ color: "oklch(0.45 0.005 222)" }}>{s.label}</span>
            <span className="font-bold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.62 0.27 265)" }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 md:px-6 pb-4 shrink-0 flex-wrap">
        <Tag className="w-4 h-4" style={{ color: "oklch(0.45 0.005 222)" }} />
        {(["", "VIDEO", "FOTO", "VIDEO + FOTO", "BTS", "REKLAMA"] as (Typ | "")[]).map((t) => (
          <button
            key={t || "all-typ"}
            onClick={() => setFilterTyp(t)}
            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
            style={
              filterTyp === t
                ? { background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)" }
                : { background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", color: "oklch(0.55 0.005 222)", border: "1px solid rgba(255,255,255,0.09)" }
            }
          >
            {t || "Vše"}
          </button>
        ))}
        <span className="w-px h-4 mx-1" style={{ background: "oklch(1 0 0 / 0.1)" }} />
        <User className="w-4 h-4" style={{ color: "oklch(0.45 0.005 222)" }} />
        {(["", "Adam", "Honza"] as string[]).map((c) => (
          <button
            key={c || "all-clen"}
            onClick={() => setFilterClen(c)}
            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
            style={
              filterClen === c
                ? { background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)" }
                : { background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", color: "oklch(0.55 0.005 222)", border: "1px solid rgba(255,255,255,0.09)" }
            }
          >
            {c || "Všichni"}
          </button>
        ))}
        {(filterTyp || filterClen) && (
          <span className="ml-1 text-xs" style={{ color: "oklch(0.55 0.005 222)" }}>
            {fKc(visibleValue)} filtrováno
          </span>
        )}
      </div>

      {/* ── Kanban board ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className="flex gap-3 px-4 md:px-6 pb-6 h-full"
            style={{ minWidth: `${COLUMNS.length * 260}px` }}
          >
            {COLUMNS.map((col) => {
              const cards = visible.filter((p) => p.column === col.id);
              const colTotal = cards.reduce((s, p) => s + p.castka, 0);
              return (
                <DroppableColumn
                  key={col.id}
                  col={col}
                  cards={cards}
                  colTotal={colTotal}
                  draggingId={draggingId}
                  onOpen={openModal}
                  onMove={moveProject}
                  onAdd={addToColumn}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
            {draggingId != null && (() => {
              const p = projects.find(pr => pr.id === draggingId);
              if (!p) return null;
              return (
                <div className="rotate-2 opacity-95 pointer-events-none" style={{ width: 240 }}>
                  <KanbanCardInner project={p} />
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Detail modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <ProjectModal
            project={selected}
            editing={editing}
            editDraft={editDraft}
            onClose={closeModal}
            onEditStart={() => { setEditing(true); setEditDraft({ ...selected }); }}
            onEditCancel={() => { setEditing(false); setEditDraft(null); }}
            onEditSave={saveEdit}
            onEditDraftChange={setEditDraft}
            onToggleCheck={(idx) => toggleCheck(selected.id, idx)}
            onMove={(dir) => moveProject(selected.id, dir)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Droppable column ────────────────────────────────────────────────────────── */
function DroppableColumn({
  col, cards, colTotal, draggingId, onOpen, onMove, onAdd,
}: {
  col: typeof COLUMNS[0];
  cards: Project[];
  colTotal: number;
  draggingId: number | null;
  onOpen: (p: Project) => void;
  onMove: (id: number, dir: -1 | 1) => void;
  onAdd: (col: ColumnId) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-xl transition-colors"
      style={{
        width: 240,
        minWidth: 240,
        background: isOver ? col.tint.replace("0.08", "0.18") : col.tint,
        border: `1px solid ${isOver ? col.border.replace("0.22", "0.5") : col.border}`,
        boxShadow: isOver ? `0 0 0 2px ${col.border}` : "none",
        transition: "box-shadow 0.15s, border-color 0.15s, background 0.15s",
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "oklch(0.88 0.005 222)" }}>
            {col.label}
          </span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: col.border, color: "oklch(0.88 0.005 222)" }}
          >
            {cards.length}
          </span>
        </div>
        {colTotal > 0 && (
          <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.55 0.005 222)" }}>
            {(colTotal / 1000).toFixed(0)}k
          </span>
        )}
      </div>

      {/* Cards */}
      <motion.div
        className="flex-1 overflow-y-auto flex flex-col gap-2 px-2 pb-2"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {cards.map((p) => (
          <DraggableCard
            key={p.id}
            project={p}
            colIdx={COLUMN_IDS.indexOf(p.column)}
            totalCols={COLUMN_IDS.length}
            isDragging={draggingId === p.id}
            onOpen={() => onOpen(p)}
            onMove={(dir) => onMove(p.id, dir)}
          />
        ))}
      </motion.div>

      {/* Add button */}
      <button
        onClick={() => onAdd(col.id)}
        className="flex items-center gap-1 mx-2 mb-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70 shrink-0"
        style={{ color: "oklch(0.45 0.005 222)", border: "1px dashed oklch(1 0 0 / 0.1)" }}
      >
        <Plus className="w-3.5 h-3.5" /> Přidat
      </button>
    </div>
  );
}

/* ── Draggable card wrapper ──────────────────────────────────────────────────── */
function DraggableCard({
  project, colIdx, totalCols, isDragging, onOpen, onMove,
}: {
  project: Project;
  colIdx: number;
  totalCols: number;
  isDragging: boolean;
  onOpen: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: project.id });

  return (
    <motion.div
      ref={setNodeRef}
      variants={stagger.item}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
      {...listeners}
      {...attributes}
    >
      <KanbanCard
        project={project}
        colIdx={colIdx}
        totalCols={totalCols}
        onOpen={onOpen}
        onMove={onMove}
      />
    </motion.div>
  );
}

/* ── Card inner (shared between list and DragOverlay) ────────────────────────── */
function KanbanCardInner({ project: p }: { project: Project }) {
  const fmt = fmtStyleByTyp(p.typ);
  const pri = prioritaStyle(p.priorita);
  const done = p.checklist.filter((c) => c.done).length;
  const total = p.checklist.length;

  return (
    <div
      className="rounded-lg p-3 select-none"
      style={{ background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="inline-flex px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold" style={{ color: pri.color, background: pri.bg, border: `1px solid ${pri.border}` }}>
          {p.priorita}
        </span>
        <span className="inline-flex px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold" style={{ color: fmt.color, background: fmt.bg, border: `1px solid ${fmt.border}` }}>
          {p.typ}
        </span>
      </div>
      <div className="mb-1.5">
        <div className="text-sm font-semibold leading-snug" style={{ color: "oklch(0.92 0.005 222)" }}>{p.title}</div>
        <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.005 222)" }}>{p.klient}</div>
      </div>
      <div className="flex items-center gap-3 mb-2">
        {p.datum && <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.5 0.005 222)" }}><Calendar className="w-3 h-3" /> {p.datum}</span>}
        {p.castka > 0 && <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.67 0.155 155)" }}><Banknote className="w-3 h-3" /> {(p.castka / 1000).toFixed(0)}k</span>}
      </div>
      {total > 0 && (
        <div className="mb-2">
          <span className="text-[10px]" style={{ color: "oklch(0.45 0.005 222)" }}>{done}/{total}</span>
          <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: "oklch(1 0 0 / 0.07)" }}>
            <div className="h-full rounded-full" style={{ width: `${(done / total) * 100}%`, background: "oklch(0.67 0.155 155)" }} />
          </div>
        </div>
      )}
      <div className="flex -space-x-1">
        {p.clenove.map((c) => <Avatar key={c} name={c} />)}
      </div>
    </div>
  );
}

/* ── Kanban card ─────────────────────────────────────────────────────────────── */
function KanbanCard({
  project: p,
  colIdx,
  totalCols,
  onOpen,
  onMove,
}: {
  project: Project;
  colIdx: number;
  totalCols: number;
  onOpen: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const fmt = fmtStyleByTyp(p.typ);
  const pri = prioritaStyle(p.priorita);
  const done = p.checklist.filter((c) => c.done).length;
  const total = p.checklist.length;

  return (
    <motion.div
      variants={stagger.item}
      className="rounded-lg p-3 cursor-pointer select-none group"
      style={{ background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", border: "1px solid rgba(255,255,255,0.09)" }}
      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
      onClick={onOpen}
    >
      {/* Top row: priority + format */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="inline-flex px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold"
          style={{ color: pri.color, background: pri.bg, border: `1px solid ${pri.border}` }}
        >
          {p.priorita}
        </span>
        <span
          className="inline-flex px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold"
          style={{ color: fmt.color, background: fmt.bg, border: `1px solid ${fmt.border}` }}
        >
          {p.typ}
        </span>
      </div>

      {/* Title + client */}
      <div className="mb-1.5">
        <div className="text-sm font-semibold leading-snug" style={{ color: "oklch(0.92 0.005 222)" }}>
          {p.title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.005 222)" }}>
          {p.klient}
        </div>
      </div>

      {/* Date + amount */}
      <div className="flex items-center gap-3 mb-2">
        {p.datum && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.5 0.005 222)" }}>
            <Calendar className="w-3 h-3" /> {p.datum}
          </span>
        )}
        {p.castka > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.67 0.155 155)" }}>
            <Banknote className="w-3 h-3" /> {(p.castka / 1000).toFixed(0)}k
          </span>
        )}
      </div>

      {/* Checklist progress */}
      {total > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "oklch(0.45 0.005 222)" }}>
              {done}/{total}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.07)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: total > 0 ? `${(done / total) * 100}%` : "0%",
                background: "oklch(0.67 0.155 155)",
              }}
            />
          </div>
        </div>
      )}

      {/* Footer: avatars + move buttons */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {p.clenove.map((c) => <Avatar key={c} name={c} />)}
          {p.clenove.length === 0 && (
            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)" }}>
              <User className="w-3 h-3" style={{ color: "oklch(0.35 0.005 222)" }} />
            </span>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={colIdx === 0}
            onClick={() => onMove(-1)}
            className="p-1 rounded disabled:opacity-20 hover:opacity-70 transition-opacity"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.005 222)" }} />
          </button>
          <button
            disabled={colIdx === totalCols - 1}
            onClick={() => onMove(1)}
            className="p-1 rounded disabled:opacity-20 hover:opacity-70 transition-opacity"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          >
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.005 222)" }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Project detail modal ────────────────────────────────────────────────────── */
function ProjectModal({
  project,
  editing,
  editDraft,
  onClose,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditDraftChange,
  onToggleCheck,
  onMove,
}: {
  project: Project;
  editing: boolean;
  editDraft: Project | null;
  onClose: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditDraftChange: (p: Project) => void;
  onToggleCheck: (idx: number) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const p = editing && editDraft ? editDraft : project;
  const fmt = fmtStyleByTyp(p.typ);
  const pri = prioritaStyle(p.priorita);
  const colIdx = COLUMN_IDS.indexOf(p.column);
  const colDef = COLUMNS.find((c) => c.id === p.column)!;

  function field<K extends keyof Project>(key: K, value: Project[K]) {
    if (!editDraft) return;
    onEditDraftChange({ ...editDraft, [key]: value });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.65)" }} onClick={onClose} />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{ background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", border: "1px solid rgba(255,255,255,0.09)" }}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between p-5 pb-3 sticky top-0 z-10 rounded-t-2xl" style={{ background: "rgba(12, 10, 35, 0.75)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)" }}>
          <div className="flex-1 pr-4">
            {editing ? (
              <input
                className="w-full text-lg font-bold bg-transparent outline-none border-b pb-0.5"
                style={{ color: "oklch(0.93 0.005 222)", borderColor: "oklch(0.62 0.27 265 / 0.4)", fontFamily: "var(--font-outfit)" }}
                value={editDraft?.title ?? ""}
                onChange={(e) => field("title", e.target.value)}
              />
            ) : (
              <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.93 0.005 222)" }}>
                {p.title}
              </h2>
            )}
            <div className="text-sm mt-0.5" style={{ color: "oklch(0.5 0.005 222)" }}>
              {editing ? (
                <input
                  className="bg-transparent outline-none border-b text-sm"
                  style={{ color: "oklch(0.6 0.005 222)", borderColor: "oklch(1 0 0 / 0.15)" }}
                  value={editDraft?.klient ?? ""}
                  onChange={(e) => field("klient", e.target.value)}
                />
              ) : p.klient}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!editing && (
              <button onClick={onEditStart} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ background: "oklch(1 0 0 / 0.07)" }}>
                <Edit2 className="w-4 h-4" style={{ color: "oklch(0.7 0.005 222)" }} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ background: "oklch(1 0 0 / 0.07)" }}>
              <X className="w-4 h-4" style={{ color: "oklch(0.7 0.005 222)" }} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          {/* Badges + column */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority */}
            {editing ? (
              <select
                className="text-xs font-bold px-2 py-1 rounded-[5px] outline-none cursor-pointer"
                style={{ color: pri.color, background: pri.bg, border: `1px solid ${pri.border}` }}
                value={editDraft?.priorita}
                onChange={(e) => field("priorita", e.target.value as Priorita)}
              >
                {(["vysoká", "střední", "nízká"] as Priorita[]).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-[5px]" style={{ color: pri.color, background: pri.bg, border: `1px solid ${pri.border}` }}>
                {p.priorita}
              </span>
            )}

            {/* Typ */}
            {editing ? (
              <select
                className="text-xs font-bold px-2 py-1 rounded-[5px] outline-none cursor-pointer"
                style={{ color: fmt.color, background: fmt.bg, border: `1px solid ${fmt.border}` }}
                value={editDraft?.typ}
                onChange={(e) => field("typ", e.target.value as Typ)}
              >
                {(["VIDEO", "FOTO", "VIDEO + FOTO", "BTS", "REKLAMA"] as Typ[]).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-[5px]" style={{ color: fmt.color, background: fmt.bg, border: `1px solid ${fmt.border}` }}>
                {p.typ}
              </span>
            )}

            {/* Column (move) */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                disabled={colIdx === 0}
                onClick={() => onMove(-1)}
                className="p-1 rounded disabled:opacity-20 hover:opacity-70 transition-opacity"
                style={{ background: "oklch(1 0 0 / 0.07)" }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: "oklch(0.7 0.005 222)" }} />
              </button>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: colDef.tint, border: `1px solid ${colDef.border}`, color: "oklch(0.75 0.005 222)" }}>
                {colDef.label}
              </span>
              <button
                disabled={colIdx === COLUMN_IDS.length - 1}
                onClick={() => onMove(1)}
                className="p-1 rounded disabled:opacity-20 hover:opacity-70 transition-opacity"
                style={{ background: "oklch(1 0 0 / 0.07)" }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: "oklch(0.7 0.005 222)" }} />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "oklch(0.45 0.005 222)" }}>
                <Calendar className="w-3 h-3 inline mr-1" />Datum
              </label>
              {editing ? (
                <input
                  className="text-sm bg-transparent outline-none border-b"
                  style={{ color: "oklch(0.7 0.005 222)", borderColor: "oklch(1 0 0 / 0.15)" }}
                  value={editDraft?.datum ?? ""}
                  onChange={(e) => field("datum", e.target.value)}
                />
              ) : (
                <span className="text-sm" style={{ color: "oklch(0.7 0.005 222)" }}>{p.datum || "—"}</span>
              )}
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "oklch(0.45 0.005 222)" }}>
                <Banknote className="w-3 h-3 inline mr-1" />Částka
              </label>
              {editing ? (
                <input
                  type="number"
                  className="text-sm bg-transparent outline-none border-b"
                  style={{ color: "oklch(0.67 0.155 155)", borderColor: "oklch(1 0 0 / 0.15)", fontFamily: "var(--font-outfit)" }}
                  value={editDraft?.castka ?? 0}
                  onChange={(e) => field("castka", Number(e.target.value))}
                />
              ) : (
                <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.67 0.155 155)" }}>
                  {fKc(p.castka)}
                </span>
              )}
            </div>
          </div>

          {/* Team */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: "oklch(0.45 0.005 222)" }}>
              <User className="w-3 h-3 inline mr-1" />Tým
            </label>
            {editing ? (
              <div className="flex gap-3">
                {["Adam", "Honza"].map((name) => (
                  <label key={name} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "oklch(0.7 0.005 222)" }}>
                    <input
                      type="checkbox"
                      checked={editDraft?.clenove.includes(name) ?? false}
                      onChange={(e) => {
                        if (!editDraft) return;
                        const clenove = e.target.checked
                          ? [...editDraft.clenove, name]
                          : editDraft.clenove.filter((c) => c !== name);
                        onEditDraftChange({ ...editDraft, clenove });
                      }}
                    />
                    {name}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5">
                {p.clenove.length > 0
                  ? p.clenove.map((c) => (
                    <span key={c} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.7 0.005 222)" }}>
                      <Avatar name={c} /> {c}
                    </span>
                  ))
                  : <span className="text-sm" style={{ color: "oklch(0.4 0.005 222)" }}>Nepřiřazen</span>
                }
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: "oklch(0.45 0.005 222)" }}>
                <Check className="w-3 h-3 inline mr-1" />Checklist
              </label>
              <span className="text-xs" style={{ color: "oklch(0.45 0.005 222)" }}>
                {p.checklist.filter((c) => c.done).length}/{p.checklist.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {p.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: "oklch(1 0 0 / 0.04)" }}
                  onClick={() => onToggleCheck(idx)}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: item.done ? "oklch(0.67 0.155 155)" : "oklch(1 0 0 / 0.06)",
                      border: item.done ? "none" : "1px solid oklch(1 0 0 / 0.15)",
                    }}
                  >
                    {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span
                    className="text-sm"
                    style={{
                      color: item.done ? "oklch(0.45 0.005 222)" : "oklch(0.75 0.005 222)",
                      textDecoration: item.done ? "line-through" : "none",
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
              {editing && (
                <button
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs hover:opacity-70 transition-opacity"
                  style={{ color: "oklch(0.5 0.005 222)", border: "1px dashed oklch(1 0 0 / 0.1)" }}
                  onClick={() => {
                    if (!editDraft) return;
                    onEditDraftChange({
                      ...editDraft,
                      checklist: [...editDraft.checklist, { text: "Nový úkol", done: false }],
                    });
                  }}
                >
                  <Plus className="w-3 h-3" /> Přidat úkol
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: "oklch(0.45 0.005 222)" }}>
              Poznámka
            </label>
            {editing ? (
              <textarea
                rows={3}
                className="text-sm bg-transparent outline-none resize-none rounded-lg px-2 py-1.5"
                style={{ color: "oklch(0.7 0.005 222)", background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)" }}
                value={editDraft?.poznamka ?? ""}
                onChange={(e) => field("poznamka", e.target.value)}
              />
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: p.poznamka ? "oklch(0.65 0.005 222)" : "oklch(0.35 0.005 222)" }}>
                {p.poznamka || "Žádná poznámka."}
              </p>
            )}
          </div>

          {/* Edit actions */}
          {editing && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onEditSave}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)" }}
              >
                <Check className="w-4 h-4" /> Uložit
              </button>
              <button
                onClick={onEditCancel}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.6 0.005 222)", border: "1px solid oklch(1 0 0 / 0.1)" }}
              >
                <X className="w-4 h-4" /> Zrušit
              </button>
            </div>
          )}

          {/* Column dropdown (view mode) */}
          {!editing && (
            <ColumnSelect
              current={p.column}
              onSelect={(col) => {
                const fromIdx = COLUMN_IDS.indexOf(p.column);
                const toIdx = COLUMN_IDS.indexOf(col);
                const diff = toIdx - fromIdx;
                if (diff === 0) return;
                // Move step by step
                const steps = Math.abs(diff);
                const dir = diff > 0 ? 1 : -1;
                for (let i = 0; i < steps; i++) setTimeout(() => onMove(dir as -1 | 1), i * 0);
              }}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Column selector ─────────────────────────────────────────────────────────── */
function ColumnSelect({ current, onSelect }: { current: ColumnId; onSelect: (c: ColumnId) => void }) {
  const [open, setOpen] = useState(false);
  const colDef = COLUMNS.find((c) => c.id === current)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: colDef.tint, border: `1px solid ${colDef.border}`, color: "oklch(0.75 0.005 222)" }}
      >
        <span>Přesunout do…</span>
        <div className="flex items-center gap-2">
          <span>{colDef.label}</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden z-20"
            style={{ background: "oklch(0.15 0.008 222)", border: "1px solid oklch(1 0 0 / 0.12)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
          >
            {COLUMNS.map((col) => (
              <button
                key={col.id}
                className="w-full flex items-center px-3 py-2 text-sm text-left hover:opacity-80 transition-opacity"
                style={{
                  color: col.id === current ? "oklch(0.62 0.27 265)" : "oklch(0.7 0.005 222)",
                  background: col.id === current ? "oklch(0.62 0.27 265 / 0.08)" : "transparent",
                }}
                onClick={() => { onSelect(col.id); setOpen(false); }}
              >
                {col.label}
                {col.id === current && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: "oklch(0.62 0.27 265)" }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
