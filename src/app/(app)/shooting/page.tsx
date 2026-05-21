"use client";

import { useState, useMemo, useCallback } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clapperboard,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Calendar,
  Users,
  Trash2,
  CheckCircle2,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────────── */
type ShootTyp = "VIDEO" | "FOTO" | "VIDEO + FOTO" | "BTS" | "REKLAMA";
type ColumnId = "nataceni" | "preprodukce" | "potvrzeno" | "poptavka" | "nabidka" | "postprodukce" | "schvaleni" | "dokonceno";

interface ShootingDay {
  id: number;
  datum: string;
  klient: string;
  typ: ShootTyp;
  lokace: string;
  clenove: string[];
  zacatek: string;
  konec: string;
  poznamka: string;
}

interface Project {
  id: number;
  title: string;
  klient: string;
  column: ColumnId;
  typ: string;
  datum: string;
  castka: number;
  clenove: string[];
  checklist: { text: string; done: boolean }[];
  poznamka: string;
  priorita: string;
}

/* ── Colors by typ ───────────────────────────────────────────────────────────── */
const TYP_COLOR: Record<ShootTyp, { bg: string; border: string; text: string; badge: string }> = {
  "VIDEO":        { bg: "oklch(0.62 0.27 265 / 0.18)", border: "oklch(0.62 0.27 265 / 0.45)", text: "oklch(0.80 0.20 265)", badge: "oklch(0.62 0.27 265 / 0.28)" },
  "FOTO":         { bg: "oklch(0.82 0.16 85 / 0.15)",  border: "oklch(0.82 0.16 85 / 0.40)",  text: "oklch(0.88 0.14 85)",  badge: "oklch(0.82 0.16 85 / 0.25)"  },
  "VIDEO + FOTO": { bg: "oklch(0.72 0.2 310 / 0.15)",  border: "oklch(0.72 0.2 310 / 0.40)",  text: "oklch(0.82 0.16 310)", badge: "oklch(0.72 0.2 310 / 0.25)"  },
  "BTS":          { bg: "oklch(0.67 0.155 155 / 0.15)", border: "oklch(0.67 0.155 155 / 0.40)", text: "oklch(0.75 0.14 155)", badge: "oklch(0.67 0.155 155 / 0.25)" },
  "REKLAMA":      { bg: "oklch(0.65 0.22 25 / 0.15)",  border: "oklch(0.65 0.22 25 / 0.40)",  text: "oklch(0.75 0.18 25)",  badge: "oklch(0.65 0.22 25 / 0.25)"  },
};

/* ── Member avatars ──────────────────────────────────────────────────────────── */
const MEMBER_COLOR: Record<string, { bg: string; text: string }> = {
  "Adam":  { bg: "oklch(0.62 0.27 265 / 0.30)", text: "oklch(0.80 0.20 265)" },
  "Honza": { bg: "oklch(0.67 0.155 155 / 0.30)", text: "oklch(0.75 0.14 155)" },
  "Nezařazeno": { bg: "oklch(1 0 0 / 0.08)", text: "oklch(0.5 0 0)" },
};

/* ── Czech locale ─────────────────────────────────────────────────────────────── */
const CZ_MONTHS = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];
const CZ_DAYS_SHORT = ["Po","Út","St","Čt","Pá","So","Ne"];

const KNOWN_CLIENTS = [
  "SENIMED","IMTOS","EASTGATE BRNO","MTBCZ","TOFFI","FIRESTA",
  "BEHEJ BRNO","POWERPLATE","SK STAVOS BRNO SLATINA",
];

const TEAM_MEMBERS = ["Adam","Honza"];
const SHOOT_TYPES: ShootTyp[] = ["VIDEO","FOTO","VIDEO + FOTO","BTS","REKLAMA"];
const ROWS = ["Adam","Honza","Nezařazeno"] as const;
type RowMember = typeof ROWS[number];

/* ── Date helpers ─────────────────────────────────────────────────────────────── */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDayLabel(d: Date): string {
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/* ── Seed data ───────────────────────────────────────────────────────────────── */
function buildSeed(): ShootingDay[] {
  const today = new Date();
  const mon = getMondayOfWeek(today);
  const nextMon = addDays(mon, 7);

  return [
    {
      id: 1,
      datum: toISO(addDays(mon, 1)),
      klient: "SENIMED",
      typ: "VIDEO + FOTO",
      lokace: "Studio Brno",
      clenove: ["Adam", "Honza"],
      zacatek: "08:00",
      konec: "17:00",
      poznamka: "Kampaňové video + produktové foto",
    },
    {
      id: 2,
      datum: toISO(addDays(mon, 3)),
      klient: "IMTOS",
      typ: "VIDEO",
      lokace: "Klientova provozovna",
      clenove: ["Adam"],
      zacatek: "09:00",
      konec: "14:00",
      poznamka: "ROSSO STEEL promo",
    },
    {
      id: 3,
      datum: toISO(addDays(nextMon, 0)),
      klient: "EASTGATE BRNO",
      typ: "FOTO",
      lokace: "Exteriér",
      clenove: ["Honza"],
      zacatek: "10:00",
      konec: "13:00",
      poznamka: "Průběh stavby",
    },
    {
      id: 4,
      datum: toISO(addDays(nextMon, 2)),
      klient: "MTBCZ",
      typ: "BTS",
      lokace: "Exteriér",
      clenove: ["Adam", "Honza"],
      zacatek: "07:00",
      konec: "12:00",
      poznamka: "BTS sezóna 2026",
    },
  ];
}

/* ── Empty form ───────────────────────────────────────────────────────────────── */
const EMPTY_FORM: Omit<ShootingDay, "id"> = {
  datum: "",
  klient: "",
  typ: "VIDEO",
  lokace: "",
  clenove: [],
  zacatek: "09:00",
  konec: "17:00",
  poznamka: "",
};

/* ── Modal ────────────────────────────────────────────────────────────────────── */
function ShootModal({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Omit<ShootingDay, "id"> & { id?: number };
  onClose: () => void;
  onSave: (d: Omit<ShootingDay, "id"> & { id?: number }) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const isEdit = initial.id != null;

  function toggleMember(m: string) {
    setForm((f) => ({
      ...f,
      clenove: f.clenove.includes(m)
        ? f.clenove.filter((x) => x !== m)
        : [...f.clenove, m],
    }));
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        style={{
          background: "oklch(0.13 0.008 222)",
          border: "1px solid oklch(1 0 0 / 0.10)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 480,
          padding: "28px 28px 24px",
          fontFamily: "var(--font-jakarta)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: 17, fontWeight: 700, color: "oklch(0.96 0 0)" }}>
            {isEdit ? "Upravit výjezd" : "Nový výjezd"}
          </span>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            style={{
              background: "oklch(1 0 0 / 0.06)",
              border: "1px solid oklch(1 0 0 / 0.10)",
              borderRadius: 8,
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "oklch(0.6 0 0)",
            }}
          >
            <X size={15} />
          </motion.button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Datum */}
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Datum</span>
            <input
              type="date"
              value={form.datum}
              onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                borderRadius: 8, padding: "8px 11px",
                color: "oklch(0.92 0 0)", fontSize: 14,
                fontFamily: "var(--font-jakarta)", outline: "none", width: "100%",
              }}
            />
          </label>

          {/* Klient */}
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Klient</span>
            <input
              type="text"
              list="klienti-list"
              value={form.klient}
              onChange={(e) => setForm((f) => ({ ...f, klient: e.target.value }))}
              placeholder="Název klienta..."
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                borderRadius: 8, padding: "8px 11px",
                color: "oklch(0.92 0 0)", fontSize: 14,
                fontFamily: "var(--font-jakarta)", outline: "none", width: "100%",
              }}
            />
            <datalist id="klienti-list">
              {KNOWN_CLIENTS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>

          {/* Typ + Lokace */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Typ</span>
              <select
                value={form.typ}
                onChange={(e) => setForm((f) => ({ ...f, typ: e.target.value as ShootTyp }))}
                style={{
                  background: "oklch(0.11 0.008 222)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  borderRadius: 8, padding: "8px 11px",
                  color: "oklch(0.92 0 0)", fontSize: 14,
                  fontFamily: "var(--font-jakarta)", outline: "none", width: "100%",
                }}
              >
                {SHOOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Lokace</span>
              <input
                type="text"
                value={form.lokace}
                onChange={(e) => setForm((f) => ({ ...f, lokace: e.target.value }))}
                placeholder="Studio / Exteriér..."
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  borderRadius: 8, padding: "8px 11px",
                  color: "oklch(0.92 0 0)", fontSize: 14,
                  fontFamily: "var(--font-jakarta)", outline: "none", width: "100%",
                }}
              />
            </label>
          </div>

          {/* Zacatek + Konec */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Zacatek</span>
              <input
                type="time"
                value={form.zacatek}
                onChange={(e) => setForm((f) => ({ ...f, zacatek: e.target.value }))}
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  borderRadius: 8, padding: "8px 11px",
                  color: "oklch(0.92 0 0)", fontSize: 14,
                  fontFamily: "var(--font-jakarta)", outline: "none", width: "100%",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Konec</span>
              <input
                type="time"
                value={form.konec}
                onChange={(e) => setForm((f) => ({ ...f, konec: e.target.value }))}
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  borderRadius: 8, padding: "8px 11px",
                  color: "oklch(0.92 0 0)", fontSize: 14,
                  fontFamily: "var(--font-jakarta)", outline: "none", width: "100%",
                }}
              />
            </label>
          </div>

          {/* Clenove */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Tým</span>
            <div style={{ display: "flex", gap: 8 }}>
              {TEAM_MEMBERS.map((m) => {
                const active = form.clenove.includes(m);
                const mc = MEMBER_COLOR[m];
                return (
                  <motion.button
                    key={m}
                    onClick={() => toggleMember(m)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      fontFamily: "var(--font-jakarta)",
                      cursor: "pointer",
                      border: active ? `1px solid ${mc.text}` : "1px solid oklch(1 0 0 / 0.10)",
                      background: active ? mc.bg : "oklch(1 0 0 / 0.03)",
                      color: active ? mc.text : "oklch(0.55 0 0)",
                      transition: "all 0.15s",
                    }}
                  >
                    {active && <CheckCircle2 size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />}
                    {m}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Poznamka */}
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.5 0 0)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Poznámka</span>
            <textarea
              value={form.poznamka}
              onChange={(e) => setForm((f) => ({ ...f, poznamka: e.target.value }))}
              placeholder="Volitelné poznámky..."
              rows={2}
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                borderRadius: 8, padding: "8px 11px",
                color: "oklch(0.92 0 0)", fontSize: 14,
                fontFamily: "var(--font-jakarta)", outline: "none",
                resize: "vertical", width: "100%",
              }}
            />
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          {isEdit && onDelete && (
            <motion.button
              onClick={onDelete}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                fontFamily: "var(--font-jakarta)", cursor: "pointer",
                border: "1px solid oklch(0.65 0.22 25 / 0.35)",
                background: "oklch(0.65 0.22 25 / 0.10)",
                color: "oklch(0.70 0.18 25)", marginRight: "auto",
              }}
            >
              <Trash2 size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
              Smazat
            </motion.button>
          )}
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-jakarta)", cursor: "pointer",
              border: "1px solid oklch(1 0 0 / 0.10)",
              background: "oklch(1 0 0 / 0.05)",
              color: "oklch(0.6 0 0)",
            }}
          >
            Zrušit
          </motion.button>
          <motion.button
            onClick={() => onSave(form)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-jakarta)", cursor: "pointer",
              border: "1px solid oklch(0.62 0.27 265 / 0.40)",
              background: "oklch(0.62 0.27 265 / 0.18)",
              color: "oklch(0.80 0.20 265)",
            }}
          >
            {isEdit ? "Uložit" : "Přidat"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Shooting block ───────────────────────────────────────────────────────────── */
function ShootBlock({ day, onClick }: { day: ShootingDay; onClick: () => void }) {
  const c = TYP_COLOR[day.typ];
  return (
    <motion.div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      whileHover={{ scale: 1.025, y: -1 }}
      whileTap={{ scale: 0.97 }}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: "7px 9px",
        cursor: "pointer",
        marginBottom: 4,
        transition: "box-shadow 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.text, fontFamily: "var(--font-outfit)", lineHeight: 1.2 }}>
          {day.klient}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
          background: c.badge, color: c.text,
          borderRadius: 4, padding: "1px 5px",
          fontFamily: "var(--font-outfit)",
        }}>
          {day.typ}
        </span>
      </div>
      {day.zacatek && day.konec && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
          <Clock size={9} style={{ color: "oklch(0.5 0 0)", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "oklch(0.55 0 0)" }}>{day.zacatek} – {day.konec}</span>
        </div>
      )}
      {day.lokace && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
          <MapPin size={9} style={{ color: "oklch(0.5 0 0)", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "oklch(0.5 0 0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{day.lokace}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────────── */
export default function ShootingPage() {
  const [days, setDays, loading] = useSupabaseData<ShootingDay[]>("ov-shooting-days", buildSeed);
  const [projects] = useSupabaseData<Project[]>("ov-oneoffs-projects", () => []);

  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [modal, setModal] = useState<null | {
    form: Omit<ShootingDay, "id"> & { id?: number };
  }>(null);

  const today = useMemo(() => new Date(), []);

  /* Week days */
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  /* Month label */
  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${CZ_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${CZ_MONTHS[start.getMonth()]} / ${CZ_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }, [weekDays]);

  /* Days mapped to shooting entries */
  const dayMap = useMemo(() => {
    const m: Record<string, ShootingDay[]> = {};
    for (const d of days) {
      if (!m[d.datum]) m[d.datum] = [];
      m[d.datum].push(d);
    }
    return m;
  }, [days]);

  /* Projects in nataceni */
  const nataceniProjects = useMemo(
    () => projects.filter((p) => p.column === "nataceni"),
    [projects],
  );

  /* Handlers */
  const openAdd = useCallback((datum?: string) => {
    setModal({ form: { ...EMPTY_FORM, datum: datum ?? toISO(today) } });
  }, [today]);

  const openEdit = useCallback((d: ShootingDay) => {
    setModal({ form: { ...d } });
  }, []);

  const openFromProject = useCallback((p: Project) => {
    // Parse datum — projects use "D. M. YYYY" format
    let datum = toISO(today);
    if (p.datum) {
      const parts = p.datum.replace(/\s/g, "").split(".");
      if (parts.length >= 3) {
        const [d, m, y] = parts;
        datum = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }
    setModal({
      form: {
        ...EMPTY_FORM,
        datum,
        klient: p.klient,
        typ: SHOOT_TYPES.includes(p.typ as ShootTyp) ? (p.typ as ShootTyp) : "VIDEO",
        clenove: p.clenove.filter((m) => TEAM_MEMBERS.includes(m)),
      },
    });
  }, [today]);

  const handleSave = useCallback((form: Omit<ShootingDay, "id"> & { id?: number }) => {
    if (form.id != null) {
      setDays((prev) => prev.map((d) => d.id === form.id ? { ...form, id: form.id! } : d));
    } else {
      const newId = Date.now();
      setDays((prev) => [...prev, { ...form, id: newId }]);
    }
    setModal(null);
  }, [setDays]);

  const handleDelete = useCallback((id: number) => {
    setDays((prev) => prev.filter((d) => d.id !== id));
    setModal(null);
  }, [setDays]);

  /* Cell click: open add modal pre-filled with date */
  const handleCellClick = useCallback((datum: string) => {
    openAdd(datum);
  }, [openAdd]);

  /* Determine if a shooting day belongs to a row */
  function dayBelongsToRow(d: ShootingDay, row: RowMember): boolean {
    if (row === "Nezařazeno") return d.clenove.length === 0;
    return d.clenove.includes(row);
  }

  /* ── Render ── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "oklch(0.09 0.008 222)",
        fontFamily: "var(--font-jakarta)",
        padding: "clamp(16px, 4vw, 28px) clamp(14px, 4vw, 24px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "oklch(0.62 0.27 265 / 0.15)",
            border: "1px solid oklch(0.62 0.27 265 / 0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clapperboard size={20} style={{ color: "oklch(0.80 0.20 265)" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 22, fontWeight: 800, color: "oklch(0.97 0 0)", margin: 0 }}>
              Produkční plán
            </h1>
            <p style={{ fontSize: 12, color: "oklch(0.45 0 0)", margin: 0, marginTop: 1 }}>Týdenní přehled výjezdů</p>
          </div>
        </div>

        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid oklch(1 0 0 / 0.10)",
              background: "oklch(1 0 0 / 0.04)",
              color: "oklch(0.6 0 0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={16} />
          </motion.button>
          <div style={{
            padding: "0 14px", height: 32,
            border: "1px solid oklch(1 0 0 / 0.10)",
            background: "oklch(1 0 0 / 0.03)",
            borderRadius: 8, display: "flex", alignItems: "center",
            fontSize: 13, fontWeight: 600, color: "oklch(0.78 0 0)",
            minWidth: 160, justifyContent: "center",
          }}>
            {weekLabel}
          </div>
          <motion.button
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "0 12px", height: 32,
              border: "1px solid oklch(0.62 0.27 265 / 0.28)",
              background: "oklch(0.62 0.27 265 / 0.10)",
              borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              color: "oklch(0.78 0.18 265)",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <Calendar size={13} />
            Dnes
          </motion.button>
          <motion.button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid oklch(1 0 0 / 0.10)",
              background: "oklch(1 0 0 / 0.04)",
              color: "oklch(0.6 0 0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>

        {/* New */}
        <motion.button
          onClick={() => openAdd()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "0 16px", height: 36,
            borderRadius: 9,
            background: "oklch(0.62 0.27 265 / 0.18)",
            border: "1px solid oklch(0.62 0.27 265 / 0.38)",
            color: "oklch(0.82 0.20 265)",
            fontSize: 13, fontWeight: 700,
            fontFamily: "var(--font-outfit)",
            cursor: "pointer",
          }}
        >
          <Plus size={15} />
          Nový výjezd
        </motion.button>
      </div>

      {/* Gantt grid */}
      <div style={{ overflowX: "auto", marginBottom: 28 }} className="[&::-webkit-scrollbar]{display:none}">
      <div style={{
        background: "oklch(1 0 0 / 0.03)",
        border: "1px solid oklch(1 0 0 / 0.08)",
        borderRadius: 12,
        overflow: "hidden",
        minWidth: 700,
      }}>
        {/* Day header row */}
        <div style={{ display: "flex", borderBottom: "1px solid oklch(1 0 0 / 0.08)" }}>
          {/* Gutter */}
          <div style={{
            width: 88, flexShrink: 0,
            borderRight: "1px solid oklch(1 0 0 / 0.06)",
            padding: "10px 0",
          }} />
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const weekend = isWeekend(day);
            return (
              <div
                key={i}
                style={{
                  flex: 1, minWidth: 110,
                  borderRight: i < 6 ? "1px solid oklch(1 0 0 / 0.06)" : "none",
                  padding: "10px 10px 8px",
                  background: isToday
                    ? "oklch(0.62 0.27 265 / 0.08)"
                    : weekend ? "oklch(1 0 0 / 0.008)" : "transparent",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "oklch(0.45 0 0)", textTransform: "uppercase" }}>
                  {CZ_DAYS_SHORT[i]}
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: isToday ? "oklch(0.82 0.20 265)" : weekend ? "oklch(0.38 0 0)" : "oklch(0.75 0 0)",
                  fontFamily: "var(--font-outfit)",
                }}>
                  {formatDayLabel(day)}
                </span>
                {isToday && (
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "oklch(0.62 0.27 265)",
                    marginTop: 1,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Member rows */}
        {ROWS.map((row, ri) => (
          <div
            key={row}
            style={{
              display: "flex",
              borderBottom: ri < ROWS.length - 1 ? "1px solid oklch(1 0 0 / 0.06)" : "none",
            }}
          >
            {/* Row label */}
            <div style={{
              width: 88, flexShrink: 0,
              borderRight: "1px solid oklch(1 0 0 / 0.06)",
              padding: "12px 10px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
              gap: 6, paddingTop: 14,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: MEMBER_COLOR[row]?.bg ?? "oklch(1 0 0 / 0.06)",
                border: `1px solid ${MEMBER_COLOR[row]?.text ?? "oklch(1 0 0 / 0.10)"}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {row === "Nezařazeno"
                  ? <Users size={14} style={{ color: "oklch(0.45 0 0)" }} />
                  : <span style={{ fontSize: 12, fontWeight: 800, color: MEMBER_COLOR[row]?.text, fontFamily: "var(--font-outfit)" }}>{row[0]}</span>
                }
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: row === "Nezařazeno" ? "oklch(0.38 0 0)" : MEMBER_COLOR[row]?.text,
                letterSpacing: "0.04em",
                fontFamily: "var(--font-outfit)",
              }}>
                {row}
              </span>
            </div>

            {/* Day cells */}
            {weekDays.map((day, di) => {
              const iso = toISO(day);
              const isToday = isSameDay(day, today);
              const weekend = isWeekend(day);
              const cellDays = (dayMap[iso] ?? []).filter((d) => dayBelongsToRow(d, row));

              return (
                <div
                  key={di}
                  onClick={() => handleCellClick(iso)}
                  style={{
                    flex: 1, minWidth: 110,
                    borderRight: di < 6 ? "1px solid oklch(1 0 0 / 0.06)" : "none",
                    padding: "8px 7px",
                    minHeight: 80,
                    background: isToday
                      ? "oklch(0.62 0.27 265 / 0.04)"
                      : weekend ? "oklch(1 0 0 / 0.004)" : "transparent",
                    cursor: cellDays.length === 0 ? "pointer" : "default",
                    transition: "background 0.15s",
                    position: "relative",
                  }}
                  className={cellDays.length === 0 ? "group" : undefined}
                  onMouseEnter={(e) => {
                    if (cellDays.length === 0) {
                      (e.currentTarget as HTMLDivElement).style.background = isToday
                        ? "oklch(0.62 0.27 265 / 0.07)"
                        : "oklch(1 0 0 / 0.025)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = isToday
                      ? "oklch(0.62 0.27 265 / 0.04)"
                      : weekend ? "oklch(1 0 0 / 0.004)" : "transparent";
                  }}
                >
                  {cellDays.length === 0 && (
                    <div style={{
                      position: "absolute", inset: 6,
                      border: "1px dashed oklch(1 0 0 / 0)",
                      borderRadius: 7,
                      pointerEvents: "none",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(1 0 0 / 0.10)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(1 0 0 / 0)";
                    }}
                    />
                  )}
                  {cellDays.map((d) => (
                    <ShootBlock key={d.id} day={d} onClick={() => openEdit(d)} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>

      {/* Z projektu */}
      {nataceniProjects.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Clapperboard size={15} style={{ color: "oklch(0.65 0.22 25)" }} />
            <span style={{
              fontSize: 12, fontWeight: 700, color: "oklch(0.55 0 0)",
              letterSpacing: "0.07em", textTransform: "uppercase",
              fontFamily: "var(--font-outfit)",
            }}>
              Z projektu — potvrzeno k natácení
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {nataceniProjects.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "oklch(1 0 0 / 0.035)",
                  border: "1px solid oklch(0.65 0.22 25 / 0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.88 0 0)", fontFamily: "var(--font-outfit)" }}>
                    {p.klient}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                      color: "oklch(0.75 0.18 25)",
                      background: "oklch(0.65 0.22 25 / 0.15)",
                      padding: "1px 6px", borderRadius: 4,
                      fontFamily: "var(--font-outfit)",
                    }}>
                      {p.typ}
                    </span>
                    {p.datum && (
                      <span style={{ fontSize: 11, color: "oklch(0.48 0 0)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={10} />
                        {p.datum}
                      </span>
                    )}
                    {p.clenove.length > 0 && (
                      <span style={{ fontSize: 11, color: "oklch(0.48 0 0)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Users size={10} />
                        {p.clenove.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  onClick={() => openFromProject(p)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "5px 12px", borderRadius: 7,
                    fontSize: 11, fontWeight: 700,
                    fontFamily: "var(--font-outfit)",
                    cursor: "pointer",
                    border: "1px solid oklch(0.62 0.27 265 / 0.30)",
                    background: "oklch(0.62 0.27 265 / 0.12)",
                    color: "oklch(0.78 0.18 265)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Přidat do plánu
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "oklch(0 0 0 / 0.4)",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "oklch(0.13 0.008 222)",
            border: "1px solid oklch(1 0 0 / 0.10)",
            borderRadius: 10,
            padding: "14px 22px",
            fontSize: 13, color: "oklch(0.6 0 0)",
            fontFamily: "var(--font-jakarta)",
          }}>
            Nacitam...
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <ShootModal
            initial={modal.form}
            onClose={() => setModal(null)}
            onSave={handleSave}
            onDelete={modal.form.id != null ? () => handleDelete(modal.form.id!) : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
