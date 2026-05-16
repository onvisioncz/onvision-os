"use client";

import { useState, useMemo } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, ChevronRight, ChevronLeft, Layers2,
  Film, Camera, ImageIcon, LayoutGrid, Share2, Play,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
type KanbanStav = "Nápad" | "Script" | "Natočeno" | "Střih" | "Schváleno" | "Naplánováno";
type ContentTyp = "Reel" | "Post" | "Story" | "Video" | "Foto" | "Jiné";

interface ContentCard {
  id: number;
  nazev: string;
  klient: string;
  typ: ContentTyp;
  prirazeno: string;
  deadline: string;
  poznamka: string;
  stav: KanbanStav;
}

/* ── Columns ────────────────────────────────────────────────────────────────── */
const COLS: { id: KanbanStav; color: string; desc: string }[] = [
  { id: "Nápad",       color: "oklch(0.45 0.005 222)",    desc: "Nápady a briefingy" },
  { id: "Script",      color: "oklch(0.72 0.18 265)",     desc: "Příprava scénáře" },
  { id: "Natočeno",    color: "oklch(0.74 0.18 55)",      desc: "Materiál nahrán" },
  { id: "Střih",       color: "oklch(0.70 0.18 290)",     desc: "Ve střihu / retouch" },
  { id: "Schváleno",   color: "oklch(0.67 0.155 155)",    desc: "Interně schváleno" },
  { id: "Naplánováno", color: "oklch(0.62 0.27 265)",     desc: "Připraveno ke zveřejnění" },
];

const TYP_ICON: Record<ContentTyp, React.ReactNode> = {
  Reel:  <Film className="w-3 h-3" />,
  Post:  <Share2 className="w-3 h-3" />,
  Story: <Layers2 className="w-3 h-3" />,
  Video: <Play className="w-3 h-3" />,
  Foto:  <Camera className="w-3 h-3" />,
  Jiné:  <LayoutGrid className="w-3 h-3" />,
};

const TYP_COLOR: Record<ContentTyp, string> = {
  Reel:  "oklch(0.70 0.18 290)",
  Post:  "oklch(0.62 0.27 265)",
  Story: "oklch(0.72 0.18 55)",
  Video: "oklch(0.65 0.22 25)",
  Foto:  "oklch(0.67 0.155 155)",
  Jiné:  "oklch(0.50 0.005 222)",
};

const CLIENTS = [
  "SENIMED", "IMTOS", "EASTGATE BRNO", "MTBCZ", "TOFFI",
  "FIRESTA", "BEHEJ BRNO", "POWERPLATE", "SK STAVOS BRNO SLATINA",
];
const TEAM    = ["Adam", "Honza", "Dominika"];
const TYPY: ContentTyp[] = ["Reel", "Post", "Story", "Video", "Foto", "Jiné"];

/* ── Seed ───────────────────────────────────────────────────────────────────── */
function makeSeed(): ContentCard[] {
  return [
    { id: 1,  nazev: "Červnový reel — výsledky",  klient: "SENIMED",        typ: "Reel",  prirazeno: "Adam",     deadline: "2026-06-10", poznamka: "", stav: "Nápad" },
    { id: 2,  nazev: "Produktové foto nová řada",  klient: "POWERPLATE",     typ: "Foto",  prirazeno: "Dominika", deadline: "2026-06-05", poznamka: "", stav: "Script" },
    { id: 3,  nazev: "Behind the scenes závod",    klient: "BEHEJ BRNO",     typ: "Reel",  prirazeno: "Honza",    deadline: "2026-05-25", poznamka: "", stav: "Natočeno" },
    { id: 4,  nazev: "Stavba update červen",       klient: "EASTGATE BRNO",  typ: "Video", prirazeno: "Adam",     deadline: "2026-06-15", poznamka: "Drone záběry", stav: "Střih" },
    { id: 5,  nazev: "MTB Trail Blansko",          klient: "MTBCZ",          typ: "Reel",  prirazeno: "Adam",     deadline: "2026-05-30", poznamka: "", stav: "Schváleno" },
    { id: 6,  nazev: "Sweet moments stories",      klient: "TOFFI",          typ: "Story", prirazeno: "Dominika", deadline: "2026-05-22", poznamka: "", stav: "Naplánováno" },
  ];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  const colors: Record<string, string> = {
    Adam: "oklch(0.62 0.27 265)", Honza: "oklch(0.67 0.155 155)", Dominika: "oklch(0.70 0.18 290)",
  };
  const bg = colors[name] ?? "oklch(0.50 0.005 222)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%", fontSize: 9, fontWeight: 700,
      background: bg + "33", color: bg, fontFamily: "var(--font-heading)",
      border: `1px solid ${bg}44`, flexShrink: 0,
    }}>
      {initials}
    </span>
  );
}

function daysLeft(deadline: string): number | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return diff;
}

function DeadlineChip({ deadline }: { deadline: string }) {
  if (!deadline) return null;
  const d = daysLeft(deadline);
  if (d === null) return null;
  const color = d < 0 ? "oklch(0.62 0.22 25)" : d <= 3 ? "oklch(0.72 0.20 45)" : "oklch(0.42 0.005 222)";
  const label = d < 0 ? `${Math.abs(d)}d po` : d === 0 ? "dnes" : `za ${d}d`;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.03em" }}>{label}</span>
  );
}

/* ── Card form ──────────────────────────────────────────────────────────────── */
const iSty: React.CSSProperties = {
  background: "oklch(1 0 0 / 0.04)",
  border: "1px solid oklch(1 0 0 / 0.09)",
  borderRadius: 7,
  color: "var(--foreground)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  padding: "7px 10px",
  width: "100%",
  outline: "none",
};

function CardForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<ContentCard>;
  onSave: (c: Omit<ContentCard, "id">) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<Omit<ContentCard, "id">>({
    nazev: "",
    klient: CLIENTS[0],
    typ: "Reel",
    prirazeno: TEAM[0],
    deadline: "",
    poznamka: "",
    stav: "Nápad",
    ...initial,
  });
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full md:max-w-md rounded-t-[16px] md:rounded-[14px] overflow-hidden"
        style={{ background: "oklch(0.11 0.008 222)", border: "1px solid oklch(1 0 0 / 0.09)" }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <h2 className="text-[14px] font-bold text-[--foreground]" style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
            {initial.id ? "Upravit obsah" : "Nový obsah"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[6px]" style={{ color: "oklch(0.45 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Název</label>
            <input value={f.nazev} onChange={e => set("nazev")(e.target.value)} style={iSty} placeholder="Červnový reel..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Klient</label>
              <select value={f.klient} onChange={e => set("klient")(e.target.value)} style={{ ...iSty, appearance: "none" }}>
                {CLIENTS.map(c => <option key={c} value={c} style={{ background: "#111" }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Typ</label>
              <select value={f.typ} onChange={e => set("typ")(e.target.value as ContentTyp)} style={{ ...iSty, appearance: "none" }}>
                {TYPY.map(t => <option key={t} value={t} style={{ background: "#111" }}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Přiřazeno</label>
              <select value={f.prirazeno} onChange={e => set("prirazeno")(e.target.value)} style={{ ...iSty, appearance: "none" }}>
                {TEAM.map(m => <option key={m} value={m} style={{ background: "#111" }}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Deadline</label>
              <input type="date" value={f.deadline} onChange={e => set("deadline")(e.target.value)} style={iSty} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Fáze</label>
            <div className="flex flex-wrap gap-1.5">
              {COLS.map(col => (
                <button key={col.id} onClick={() => set("stav")(col.id)}
                  className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all"
                  style={f.stav === col.id
                    ? { background: col.color + "22", color: col.color, border: `1px solid ${col.color}44` }
                    : { background: "oklch(1 0 0 / 0.04)", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.07)" }
                  }>
                  {col.id}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[--muted-foreground] mb-1.5">Poznámka</label>
            <input value={f.poznamka} onChange={e => set("poznamka")(e.target.value)} style={iSty} placeholder="Volitelně..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-[7px] text-[13px] font-medium"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.50 0.005 222)" }}>
            Zrušit
          </button>
          <motion.button onClick={() => { if (f.nazev.trim()) { onSave(f); onClose(); } }}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 rounded-[7px] text-[13px] font-semibold"
            style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-heading)", opacity: f.nazev.trim() ? 1 : 0.5 }}>
            Uložit
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Kanban card ────────────────────────────────────────────────────────────── */
function KCard({
  card,
  colIndex,
  totalCols,
  onMove,
  onEdit,
  onDelete,
}: {
  card: ContentCard;
  colIndex: number;
  totalCols: number;
  onMove: (id: number, dir: 1 | -1) => void;
  onEdit: (card: ContentCard) => void;
  onDelete: (id: number) => void;
}) {
  const col = COLS[colIndex];
  const typColor = TYP_COLOR[card.typ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group relative rounded-[10px] p-3 cursor-pointer"
      style={{ background: "oklch(0.14 0.008 222)", border: "1px solid oklch(1 0 0 / 0.07)" }}
      onClick={() => onEdit(card)}
    >
      {/* Top: typ badge + deadline */}
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold"
          style={{ background: typColor + "20", color: typColor }}>
          {TYP_ICON[card.typ]}
          {card.typ}
        </span>
        <DeadlineChip deadline={card.deadline} />
      </div>

      {/* Title */}
      <p className="text-[12px] font-semibold text-[--foreground] leading-snug mb-2"
        style={{ fontFamily: "var(--font-heading)" }}>
        {card.nazev}
      </p>

      {/* Client + person */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium truncate max-w-[60%]"
          style={{ color: col.color }}>
          {card.klient}
        </span>
        <Avatar name={card.prirazeno} />
      </div>

      {/* Move arrows + delete — appear on hover */}
      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1"
        onClick={e => e.stopPropagation()}>
        {colIndex > 0 && (
          <button onClick={() => onMove(card.id, -1)}
            className="p-0.5 rounded-[4px] transition-colors"
            style={{ color: "oklch(0.45 0.005 222)", background: "oklch(1 0 0 / 0.06)" }}
            title="Zpět">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {colIndex < totalCols - 1 && (
          <button onClick={() => onMove(card.id, 1)}
            className="p-0.5 rounded-[4px] transition-colors"
            style={{ color: "oklch(0.62 0.27 265)", background: "oklch(0.62 0.27 265 / 0.1)" }}
            title="Další fáze">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onDelete(card.id)}
          className="p-0.5 rounded-[4px] ml-0.5"
          style={{ color: "oklch(0.62 0.22 25)", background: "oklch(0.62 0.22 25 / 0.1)" }}>
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function ObsahPage() {
  const [cards, setCards] = useSupabaseData<ContentCard[]>("ov-obsah-pipeline", makeSeed);
  const [modal, setModal] = useState<ContentCard | "new" | null>(null);
  const [filterKlient, setFilterKlient] = useState<string>("vše");
  const [filterPerson, setFilterPerson] = useState<string>("vše");

  const filtered = useMemo(() => {
    return cards.filter(c => {
      if (filterKlient !== "vše" && c.klient !== filterKlient) return false;
      if (filterPerson !== "vše" && c.prirazeno !== filterPerson) return false;
      return true;
    });
  }, [cards, filterKlient, filterPerson]);

  const byCol = useMemo(() => {
    const m: Record<KanbanStav, ContentCard[]> = {
      "Nápad": [], "Script": [], "Natočeno": [], "Střih": [], "Schváleno": [], "Naplánováno": [],
    };
    filtered.forEach(c => m[c.stav]?.push(c));
    return m;
  }, [filtered]);

  function save(data: Omit<ContentCard, "id">) {
    if ((modal as ContentCard)?.id) {
      const id = (modal as ContentCard).id;
      setCards(p => p.map(c => c.id === id ? { ...data, id } : c));
    } else {
      setCards(p => [...p, { ...data, id: Date.now() }]);
    }
  }

  function move(id: number, dir: 1 | -1) {
    setCards(p => p.map(c => {
      if (c.id !== id) return c;
      const idx = COLS.findIndex(col => col.id === c.stav);
      const next = COLS[idx + dir];
      return next ? { ...c, stav: next.id } : c;
    }));
  }

  function del(id: number) {
    setCards(p => p.filter(c => c.id !== id));
  }

  const totalCards = cards.length;
  const doneCards  = cards.filter(c => c.stav === "Naplánováno" || c.stav === "Schváleno").length;

  return (
    <div className="min-h-screen p-4 md:p-6"
      style={{ background: "var(--background)", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <motion.div className="flex items-center justify-between gap-3 mb-5"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
            <ImageIcon className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} />
          </div>
          <div>
            <h1 className="text-[22px] md:text-[26px] leading-none text-[--foreground]"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 700, letterSpacing: "-0.03em" }}>
              Content Pipeline
            </h1>
            <p className="text-[12px] text-[--muted-foreground] mt-1">
              {totalCards} kusů obsahu · {doneCards} hotových nebo naplánovaných
            </p>
          </div>
        </div>
        <motion.button onClick={() => setModal("new")} whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold"
          style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.09 0.008 222)", fontFamily: "var(--font-heading)" }}>
          <Plus className="w-3.5 h-3.5" /> Nový obsah
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div className="flex flex-wrap items-center gap-2 mb-5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center gap-1 flex-wrap">
          {["vše", ...CLIENTS].map(k => (
            <button key={k} onClick={() => setFilterKlient(k)}
              className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors"
              style={filterKlient === k
                ? { background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.75 0.20 265)", border: "1px solid oklch(0.62 0.27 265 / 0.25)" }
                : { background: "transparent", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.07)" }
              }>
              {k === "vše" ? "Všichni klienti" : k}
            </button>
          ))}
        </div>
        <div className="w-px h-4 mx-1" style={{ background: "oklch(1 0 0 / 0.09)" }} />
        <div className="flex items-center gap-1">
          {["vše", ...TEAM].map(p => (
            <button key={p} onClick={() => setFilterPerson(p)}
              className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors"
              style={filterPerson === p
                ? { background: "oklch(0.67 0.155 155 / 0.12)", color: "oklch(0.72 0.15 155)", border: "1px solid oklch(0.67 0.155 155 / 0.25)" }
                : { background: "transparent", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.07)" }
              }>
              {p === "vše" ? "Celý tým" : p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Kanban board — horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-3 min-w-max">
          {COLS.map((col, colIndex) => {
            const colCards = byCol[col.id];
            return (
              <div key={col.id} className="w-[240px] shrink-0 flex flex-col gap-2">
                {/* Column header */}
                <div className="flex items-center justify-between px-1 mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-[12px] font-bold text-[--foreground]"
                        style={{ fontFamily: "var(--font-heading)" }}>
                        {col.id}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: col.color + "20", color: col.color }}>
                        {colCards.length}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 pl-4" style={{ color: "oklch(0.38 0.005 222)" }}>
                      {col.desc}
                    </p>
                  </div>
                </div>

                {/* Drop zone */}
                <div className="flex flex-col gap-2 min-h-[120px] rounded-[10px] p-2"
                  style={{ background: "oklch(1 0 0 / 0.02)", border: "1px solid oklch(1 0 0 / 0.05)" }}>
                  <AnimatePresence>
                    {colCards.map(card => (
                      <KCard
                        key={card.id}
                        card={card}
                        colIndex={colIndex}
                        totalCols={COLS.length}
                        onMove={move}
                        onEdit={c => setModal(c)}
                        onDelete={del}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Add button in column */}
                  <button
                    onClick={() => setModal({ id: 0, nazev: "", klient: CLIENTS[0], typ: "Reel", prirazeno: TEAM[0], deadline: "", poznamka: "", stav: col.id })}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-[7px] w-full text-[11px] font-medium transition-colors mt-auto"
                    style={{ color: "oklch(0.35 0.005 222)", border: "1px dashed oklch(1 0 0 / 0.08)" }}
                  >
                    <Plus className="w-3 h-3" />
                    Přidat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal !== null && (
          <CardForm
            key="card-form"
            initial={modal === "new" ? {} : { ...modal as ContentCard }}
            onSave={save}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
