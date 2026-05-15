"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Award, Percent } from "lucide-react";

/* ── Data ──────────────────────────────────────────────────────────────────── */
const MESICE = [
  { mesic: "Leden",  prijmy: 266500, naklady: 90893,  zisk: 175607, status: "UZAVŘENO" },
  { mesic: "Únor",   prijmy: 295000, naklady: 98343,  zisk: 196657, status: "UZAVŘENO" },
  { mesic: "Březen", prijmy: 349500, naklady: 122644, zisk: 226856, status: "UZAVŘENO" },
  { mesic: "Duben",  prijmy: 279500, naklady: 101956, zisk: 177544, status: "PROBÍHÁ" },
];

const YTD_PRIJMY  = 1190500;
const YTD_NAKLADY = 413836;
const YTD_ZISK    = 776664;
const AVG_MARZE   = Math.round((YTD_ZISK / YTD_PRIJMY) * 100 * 10) / 10;
const BEST_MESIC  = "Březen";

const ACCENT = "oklch(0.72 0.14 195)";

type ViewMode = "Příjmy" | "Zisk" | "Náklady";

const VIEW_CONFIG: Record<ViewMode, { key: keyof (typeof MESICE)[0]; color: string }> = {
  Příjmy:  { key: "prijmy",  color: "oklch(0.81 0.155 200)" },
  Zisk:    { key: "zisk",    color: "oklch(0.67 0.155 155)" },
  Náklady: { key: "naklady", color: "oklch(0.74 0.18 45)" },
};

/* ── Bar chart ──────────────────────────────────────────────────────────────── */
function BarChartCSS({ mode }: { mode: ViewMode }) {
  const maxVal = Math.max(...MESICE.map(m => m.prijmy));

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-5 text-[11px] text-[--muted-foreground]">
        {(["Příjmy", "Náklady", "Zisk"] as ViewMode[]).map(v => (
          <span key={v} className="flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded-full" style={{ background: VIEW_CONFIG[v].color, opacity: v === mode ? 1 : 0.4 }} />
            <span style={{ opacity: v === mode ? 1 : 0.5 }}>{v}</span>
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="space-y-5">
        {MESICE.map((m, idx) => {
          const prijmyPct = (m.prijmy / maxVal) * 100;
          const nakladyPct = (m.naklady / maxVal) * 100;
          const ziskPct = (m.zisk / maxVal) * 100;
          const marze = Math.round((m.zisk / m.prijmy) * 100);

          return (
            <div key={m.mesic}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[13px] font-semibold"
                  style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.01em" }}
                >
                  {m.mesic}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px]" style={{ color: "oklch(0.45 0.005 222)" }}>
                    marže {marze}%
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[3px]"
                    style={
                      m.status === "UZAVŘENO"
                        ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                        : { color: ACCENT, background: `${ACCENT.replace(")", " / 0.12)")}`, border: `1px solid ${ACCENT.replace(")", " / 0.2)")}` }
                    }
                  >
                    {m.status}
                  </span>
                </div>
              </div>

              {/* Three bars */}
              <div className="space-y-1.5">
                {([
                  { label: "Příjmy",  pct: prijmyPct,  value: m.prijmy,  color: VIEW_CONFIG.Příjmy.color,  key: "Příjmy" as ViewMode },
                  { label: "Náklady", pct: nakladyPct, value: m.naklady, color: VIEW_CONFIG.Náklady.color, key: "Náklady" as ViewMode },
                  { label: "Zisk",    pct: ziskPct,    value: m.zisk,    color: VIEW_CONFIG.Zisk.color,    key: "Zisk" as ViewMode },
                ] as const).map(bar => {
                  const isActive = bar.key === mode;
                  return (
                    <div key={bar.label} className="flex items-center gap-3">
                      <span
                        className="text-[10px] w-[46px] text-right shrink-0"
                        style={{ color: isActive ? bar.color : "oklch(0.40 0.005 222)", fontFamily: "var(--font-jakarta)" }}
                      >
                        {bar.label}
                      </span>
                      <div
                        className="flex-1 h-[14px] rounded-[3px] overflow-hidden"
                        style={{ background: "oklch(1 0 0 / 0.05)" }}
                      >
                        <motion.div
                          className="h-full rounded-[3px]"
                          style={{
                            background: bar.color,
                            opacity: isActive ? 1 : 0.25,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${bar.pct}%` }}
                          transition={{ duration: 0.7, delay: idx * 0.07, ease: [0.23, 1, 0.32, 1] }}
                        />
                      </div>
                      <span
                        className="text-[11px] font-bold w-[80px] shrink-0 tabular-nums"
                        style={{
                          fontFamily: "var(--font-outfit)",
                          color: isActive ? bar.color : "oklch(0.40 0.005 222)",
                          opacity: isActive ? 1 : 0.6,
                        }}
                      >
                        {bar.value.toLocaleString("cs-CZ")} Kč
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function ReportyPage() {
  const [mode, setMode] = useState<ViewMode>("Příjmy");

  return (
    <div
      className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{
        background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.72 0.14 195 / 0.04) 0%, transparent 70%), var(--background)`,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1
          className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
        >
          Reporty
        </h1>
        <p className="text-[12px] md:text-[13px] text-[--muted-foreground] mt-1.5">
          OnVision s.r.o. · Analytika & finance 2026
        </p>
      </motion.div>

      {/* KPI row */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-[12px] overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
      >
        {[
          {
            label: "YTD Příjmy",
            value: YTD_PRIJMY.toLocaleString("cs-CZ"),
            unit: "Kč",
            sub: "Leden–Duben 2026",
            icon: TrendingUp,
            color: "oklch(0.81 0.155 200)",
          },
          {
            label: "YTD Zisk",
            value: YTD_ZISK.toLocaleString("cs-CZ"),
            unit: "Kč",
            sub: `z ${YTD_PRIJMY.toLocaleString("cs-CZ")} Kč příjmů`,
            icon: BarChart2,
            color: "oklch(0.67 0.155 155)",
          },
          {
            label: "Průměrná marže",
            value: String(AVG_MARZE),
            unit: "%",
            sub: "Průměr leden–duben",
            icon: Percent,
            color: ACCENT,
          },
          {
            label: "Nejlepší měsíc",
            value: BEST_MESIC,
            unit: "",
            sub: `${MESICE.find(m => m.mesic === BEST_MESIC)!.zisk.toLocaleString("cs-CZ")} Kč zisk`,
            icon: Award,
            color: "oklch(0.82 0.16 85)",
          },
        ].map(({ label, value, unit, sub, icon: Icon, color }) => (
          <div key={label} className="px-5 py-4" style={{ background: "var(--card)" }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium leading-tight">{label}</p>
              <div
                className="w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0"
                style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.2)")}` }}
              >
                <Icon className="w-3 h-3" style={{ color }} />
              </div>
            </div>
            <p
              className="leading-none mb-1"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "clamp(18px,3vw,26px)", color, letterSpacing: "-0.02em" }}
            >
              {value}
              {unit && <span style={{ fontSize: 13, fontWeight: 400, color: "oklch(0.40 0.005 222)", marginLeft: 3 }}>{unit}</span>}
            </p>
            <p className="text-[10px] text-[--muted-foreground]">{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Chart card */}
      <motion.div
        className="card p-5 md:p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className="text-[15px] text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              Měsíční přehled
            </p>
            <p className="text-[12px] text-[--muted-foreground] mt-0.5">Příjmy · Náklady · Zisk</p>
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-[9px]"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
          >
            {(["Příjmy", "Zisk", "Náklady"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setMode(v)}
                className="px-3 py-1 rounded-[6px] text-[11px] font-semibold transition-all btn-tactile"
                style={{
                  background: mode === v ? VIEW_CONFIG[v].color.replace(")", " / 0.15)") : "transparent",
                  color: mode === v ? VIEW_CONFIG[v].color : "oklch(0.42 0.005 222)",
                  border: mode === v ? `1px solid ${VIEW_CONFIG[v].color.replace(")", " / 0.3)")}` : "1px solid transparent",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <BarChartCSS mode={mode} />
      </motion.div>

      {/* Month cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {MESICE.map((m, idx) => {
          const marze = Math.round((m.zisk / m.prijmy) * 100);
          return (
            <motion.div
              key={m.mesic}
              className="card p-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 + idx * 0.06 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[15px] font-bold"
                  style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.02em" }}
                >
                  {m.mesic}
                </p>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[3px]"
                  style={
                    m.status === "UZAVŘENO"
                      ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                      : { color: ACCENT, background: `${ACCENT.replace(")", " / 0.12)")}`, border: `1px solid ${ACCENT.replace(")", " / 0.2)")}` }
                  }
                >
                  {m.status}
                </span>
              </div>

              <div className="space-y-2">
                {([
                  { label: "Příjmy",  value: m.prijmy,  color: "oklch(0.81 0.155 200)" },
                  { label: "Náklady", value: m.naklady, color: "oklch(0.74 0.18 45)" },
                  { label: "Zisk",    value: m.zisk,    color: "oklch(0.67 0.155 155)" },
                ] as const).map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px] text-[--muted-foreground]">{label}</span>
                    <span className="text-[12px] font-bold" style={{ fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.01em" }}>
                      {value.toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[--muted-foreground]">Marže</span>
                  <span className="text-[12px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: ACCENT }}>
                    {marze}%
                  </span>
                </div>
                <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: ACCENT }}
                    initial={{ width: 0 }}
                    animate={{ width: `${marze}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + idx * 0.07, ease: [0.23, 1, 0.32, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* YTD summary row */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.25 }}
      >
        <p
          className="text-[14px] font-bold text-[--foreground] mb-4"
          style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}
        >
          YTD Souhrn · Leden–Duben 2026
        </p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Celkové příjmy",   value: YTD_PRIJMY,  pct: 100,                                    color: "oklch(0.81 0.155 200)" },
            { label: "Celkové náklady",  value: YTD_NAKLADY, pct: Math.round(YTD_NAKLADY / YTD_PRIJMY * 100), color: "oklch(0.74 0.18 45)" },
            { label: "Celkový zisk",     value: YTD_ZISK,    pct: Math.round(YTD_ZISK / YTD_PRIJMY * 100),   color: "oklch(0.67 0.155 155)" },
          ].map(({ label, value, pct, color }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[--muted-foreground] mb-2">{label}</p>
              <p className="text-[20px] md:text-[26px] font-bold leading-none mb-2"
                style={{ fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.03em" }}
              >
                {value.toLocaleString("cs-CZ")}
                <span className="text-[13px] font-normal ml-1" style={{ color: "oklch(0.40 0.005 222)" }}>Kč</span>
              </p>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.07)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "oklch(0.40 0.005 222)" }}>{pct}% z příjmů</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
