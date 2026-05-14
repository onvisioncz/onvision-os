"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Film, Users, Calendar } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type DayType = "monthly" | "oneoff";

interface ProductionDay {
  id: number;
  date: string;
  client: string;
  type: DayType;
  note: string;
}

/* ─── Mock data (bude nahrazeno Supabase) ────────────────────────────────── */
const INITIAL: ProductionDay[] = [
  { id: 1, date: "2026-06-03", client: "FitLife Studio",  type: "monthly", note: "Natáčení fitness obsahu — 3 reels" },
  { id: 2, date: "2026-06-05", client: "Svatba Dvořák",   type: "oneoff",  note: "Ceremonie + recepce, 2 kameramani" },
  { id: 3, date: "2026-06-10", client: "Café Marino",     type: "monthly", note: "Produktové foto + video menu" },
  { id: 4, date: "2026-06-12", client: "TechStart Brand", type: "oneoff",  note: "Brand story video, kancelář Praha 5" },
  { id: 5, date: "2026-06-17", client: "FitLife Studio",  type: "monthly", note: "Interview s trenéry" },
  { id: 6, date: "2026-06-19", client: "Novák & Sons",    type: "oneoff",  note: "Reklamní spot, exteriér" },
];

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1,  y: 0,  transition: { duration: 0.3, ease: "easeOut" as const } },
  },
};

const MONTHS = ["Led","Úno","Bře","Dub","Kvě","Čer","Čvc","Srp","Zář","Říj","Lis","Pro"];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function GrowthPage() {
  const [days, setDays]       = useState<ProductionDay[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ date: "", client: "", type: "monthly" as DayType, note: "" });

  /* Summary stats */
  const monthly = days.filter(d => d.type === "monthly").length;
  const oneoff  = days.filter(d => d.type === "oneoff").length;
  const total   = days.length;

  /* Group by month for mini-chart data */
  const byMonth = MONTHS.map((label, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      label,
      monthly: days.filter(d => d.type === "monthly" && d.date.includes(`-${m}-`)).length,
      oneoff:  days.filter(d => d.type === "oneoff"  && d.date.includes(`-${m}-`)).length,
    };
  }).filter(m => m.monthly + m.oneoff > 0);

  function addDay() {
    if (!form.date || !form.client) return;
    setDays(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ date: "", client: "", type: "monthly", note: "" });
    setShowForm(false);
  }

  function removeDay(id: number) {
    setDays(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="p-7 space-y-6 min-h-screen" style={{ background: "var(--background)" }}>

      {/* Header */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div>
          <h1
            className="text-[26px] leading-none text-[--foreground]"
            style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            Produkční dny
          </h1>
          <p className="text-[13px] text-[--muted-foreground] mt-1.5">
            Evidence natáčecích dnů · párováno s dashboardem a kalendářem
          </p>
        </div>
        <motion.button
          onClick={() => setShowForm(v => !v)}
          className="btn-tactile flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold"
          style={{
            background: "oklch(0.81 0.155 200)",
            color: "oklch(0.09 0.008 222)",
          }}
          whileHover={{ filter: "brightness(1.08)" }}
          transition={{ duration: 0.15 }}
        >
          <Plus className="w-3.5 h-3.5" />
          Přidat den
        </motion.button>
      </motion.div>

      {/* Stat strip */}
      <motion.div
        className="card grid grid-cols-3 divide-x divide-white/[0.06]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
      >
        {[
          { label: "Celkem dnů",        value: total,   icon: Calendar, color: "oklch(0.81 0.155 200)" },
          { label: "Měsíční klienti",   value: monthly, icon: Users,    color: "oklch(0.81 0.155 200)" },
          { label: "Jednorázovky",      value: oneoff,  icon: Film,     color: "oklch(0.64 0.21 290)"  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="px-6 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-[11px] text-[--muted-foreground] font-medium mb-0.5">{label}</p>
              <p className="num text-[22px] leading-none text-[--foreground]">{value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Add form */}
      {showForm && (
        <motion.div
          className="card p-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <p className="text-[13px] font-semibold text-[--foreground] mb-4"
            style={{ fontFamily: "var(--font-outfit)" }}>
            Nový produkční den
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] text-[--muted-foreground] font-medium mb-1.5">Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid var(--border)",
                  colorScheme: "dark",
                  fontFamily: "var(--font-jakarta)",
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] text-[--muted-foreground] font-medium mb-1.5">Typ</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as DayType }))}
                className="w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none"
                style={{
                  background: "oklch(0.115 0.007 222)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                <option value="monthly">Měsíční klient</option>
                <option value="oneoff">Jednorázovka</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] text-[--muted-foreground] font-medium mb-1.5">Klient</label>
            <input
              type="text"
              placeholder="Název klienta..."
              value={form.client}
              onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              className="w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] placeholder:text-[--muted-foreground] outline-none"
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-jakarta)",
              }}
            />
          </div>
          <div className="mb-4">
            <label className="block text-[11px] text-[--muted-foreground] font-medium mb-1.5">Poznámka</label>
            <input
              type="text"
              placeholder="Co se natáčelo..."
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] placeholder:text-[--muted-foreground] outline-none"
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-jakarta)",
              }}
            />
          </div>
          <div className="flex gap-2">
            <motion.button
              onClick={addDay}
              className="btn-tactile px-4 py-2 rounded-[7px] text-[13px] font-semibold"
              style={{ background: "oklch(0.81 0.155 200)", color: "oklch(0.09 0.008 222)" }}
              whileHover={{ filter: "brightness(1.08)" }}
            >
              Uložit
            </motion.button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] hover:text-[--foreground] transition-colors"
              style={{ border: "1px solid var(--border)" }}
            >
              Zrušit
            </button>
          </div>
        </motion.div>
      )}

      {/* Days list */}
      <div>
        <p className="section-label mb-3">
          Záznamy · {days.length} dnů celkem
        </p>
        <motion.div
          className="card overflow-hidden"
          variants={stagger.container}
          initial="hidden"
          animate="show"
        >
          {days
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((day, i) => {
              const isMonthly = day.type === "monthly";
              const accentColor = isMonthly ? "oklch(0.81 0.155 200)" : "oklch(0.64 0.21 290)";
              const dateObj = new Date(day.date);
              const dateStr = dateObj.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" });

              return (
                <motion.div
                  key={day.id}
                  variants={stagger.item}
                  className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0 group"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Left type bar */}
                  <div className="w-[3px] h-8 rounded-full shrink-0" style={{ background: accentColor }} />

                  {/* Date */}
                  <div className="w-[110px] shrink-0">
                    <p className="num text-[13px] text-[--foreground]">{dateStr}</p>
                  </div>

                  {/* Client */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[--foreground] truncate">{day.client}</p>
                    {day.note && (
                      <p className="text-[11px] text-[--muted-foreground] truncate mt-0.5">{day.note}</p>
                    )}
                  </div>

                  {/* Badge */}
                  {isMonthly
                    ? <span className="tag-blue shrink-0">Měsíční</span>
                    : <span className="tag-purple shrink-0">Jednorázový</span>
                  }

                  {/* Delete */}
                  <motion.button
                    onClick={() => removeDay(day.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity btn-tactile"
                    style={{ color: "oklch(0.62 0.22 25)" }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </motion.div>
              );
            })}
        </motion.div>
      </div>

      {/* Info box — Supabase pairing */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 rounded-[10px] text-[12px]"
        style={{ background: "oklch(0.81 0.155 200 / 0.05)", border: "1px solid oklch(0.81 0.155 200 / 0.12)" }}
      >
        <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0 pulse" style={{ background: "oklch(0.81 0.155 200)" }} />
        <div className="text-[--muted-foreground]">
          <span className="text-[--foreground] font-medium">Plánované propojení: </span>
          Data zde budou uložena do Supabase tabulky{" "}
          <code className="text-[--primary] text-[11px]">production_days</code>.
          Graf na dashboardu, Kalendář i Growth Hub budou číst ze stejného zdroje — přidáš den sem, objeví se všude.
        </div>
      </div>

    </div>
  );
}
