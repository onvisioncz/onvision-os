"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, TrendingUp, Award, Percent, X } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface MesicBreakdown {
  klient: string;
  castka: number;
  typ: "Pausál" | "Jednorázová" | "Reklamy" | "Mzdy" | "Provize" | "Software" | "Pojištění" | "Ostatní";
  poznamka?: string;
}

interface MesicData {
  mesic: string;
  prijmy: number;
  naklady: number;
  zisk: number;
  status: "UZAVŘENO" | "PROBÍHÁ";
  prijmyBreakdown: MesicBreakdown[];
  nakladyBreakdown: MesicBreakdown[];
}

/* ── Data ──────────────────────────────────────────────────────────────────── */
const MESICE: MesicData[] = [
  {
    mesic: "Leden",
    prijmy: 266500,
    naklady: 90893,
    zisk: 175607,
    status: "UZAVŘENO",
    prijmyBreakdown: [
      { klient: "SENIMED s.r.o.",        castka: 25000, typ: "Pausál" },
      { klient: "STAVOS Brno, a.s.",      castka: 30000, typ: "Pausál" },
      { klient: "FIRESTA-Fišer a.s.",     castka: 28500, typ: "Pausál" },
      { klient: "IMTOS spol. s r.o.",     castka: 25000, typ: "Pausál" },
      { klient: "Power Plate Česko",      castka: 12000, typ: "Pausál" },
      { klient: "ACsport.cz",             castka: 15000, typ: "Pausál" },
      { klient: "SK Brno Slatina",        castka: 12000, typ: "Pausál" },
      { klient: "DIAM s.r.o.",            castka: 30000, typ: "Pausál" },
      { klient: "MTB CZ s.r.o.",          castka: 30000, typ: "Pausál" },
      { klient: "CKTCH Brno",             castka: 20000, typ: "Jednorázová", poznamka: "Výroční video" },
      { klient: "Brno Open Game Business",castka: 39000, typ: "Jednorázová", poznamka: "Event coverage" },
    ],
    nakladyBreakdown: [
      { klient: "Adam Mendrek",    castka: 16900, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Jan Kříž",        castka: 16900, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Tereza Burianová",castka:  5500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Dominika Mendrek",castka:  3000, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Tomáš Dang",      castka:  2500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Zdeněk Dolíhal",  castka: 20000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Matty Hořák",     castka: 12000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Martin Fiala",    castka:  3000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Patrik Petr",     castka:  3000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Jiří Juhaňák",    castka:  3900, typ: "Provize",  poznamka: "Provize Brno Open Game" },
      { klient: "Software / AI",   castka:  3098, typ: "Software", poznamka: "ChatGPT, Adobe, Freepik, Higgsfield, Artlist, iCloud, Google" },
      { klient: "Direct",          castka:   395, typ: "Pojištění" },
      { klient: "Apple Meta Verified", castka: 670, typ: "Software", poznamka: "Modrý štítek" },
    ],
  },
  {
    mesic: "Únor",
    prijmy: 295000,
    naklady: 98343,
    zisk: 196657,
    status: "UZAVŘENO",
    prijmyBreakdown: [
      { klient: "SENIMED s.r.o.",          castka: 47500, typ: "Pausál" },
      { klient: "STAVOS Brno, a.s.",        castka: 30000, typ: "Pausál" },
      { klient: "FIRESTA-Fišer a.s.",       castka: 28500, typ: "Pausál" },
      { klient: "IMTOS spol. s r.o.",       castka: 25000, typ: "Pausál" },
      { klient: "Power Plate Česko",        castka: 12000, typ: "Pausál" },
      { klient: "ACsport.cz",               castka: 15000, typ: "Pausál" },
      { klient: "SK Brno Slatina",          castka: 12000, typ: "Pausál" },
      { klient: "DIAM s.r.o.",              castka: 30000, typ: "Pausál" },
      { klient: "MTB CZ s.r.o.",            castka: 30000, typ: "Pausál" },
      { klient: "NERA Displays s.r.o.",     castka: 35000, typ: "Jednorázová" },
      { klient: "TEKMA spol. s r.o.",       castka: 30000, typ: "Jednorázová" },
    ],
    nakladyBreakdown: [
      { klient: "Adam Mendrek",       castka: 16500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Jan Kříž",           castka: 16500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Tereza Burianová",   castka:  8500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Dominika Mendrek",   castka:  3000, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Tomáš Dang",         castka:  3500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Zdeněk Dolíhal",     castka: 20000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Monika Kudličková",  castka: 13500, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Martin Fiala",       castka:  5500, typ: "Provize",  poznamka: "Faktura + uznávací SENIMED" },
      { klient: "Patrik Petr",        castka:  4150, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Matty Hořák",        castka:  3000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Software / AI",      castka:  3098, typ: "Software" },
      { klient: "Direct",             castka:   395, typ: "Pojištění" },
      { klient: "Apple Meta Verified",castka:   670, typ: "Software" },
    ],
  },
  {
    mesic: "Březen",
    prijmy: 349500,
    naklady: 122644,
    zisk: 226856,
    status: "UZAVŘENO",
    prijmyBreakdown: [
      { klient: "SENIMED s.r.o.",        castka: 47000, typ: "Pausál" },
      { klient: "IMTOS spol. s r.o.",    castka: 35000, typ: "Pausál" },
      { klient: "STAVOS Brno, a.s.",     castka: 30000, typ: "Pausál" },
      { klient: "FIRESTA-Fišer a.s.",    castka: 28500, typ: "Pausál" },
      { klient: "Power Plate Česko",     castka: 12000, typ: "Pausál" },
      { klient: "ACsport.cz",            castka: 15000, typ: "Pausál" },
      { klient: "SK Brno Slatina",       castka: 12000, typ: "Pausál" },
      { klient: "DIAM s.r.o.",           castka: 30000, typ: "Pausál" },
      { klient: "MTB CZ s.r.o.",         castka: 30000, typ: "Pausál" },
      { klient: "TEKMA spol. s r.o.",    castka: 60000, typ: "Jednorázová" },
      { klient: "SENIMED s.r.o.",        castka: 35000, typ: "Jednorázová", poznamka: "Jednorázová akce" },
      { klient: "Sport Lubas s.r.o.",    castka: 15000, typ: "Jednorázová" },
    ],
    nakladyBreakdown: [
      { klient: "Adam Mendrek",      castka: 16500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Jan Kříž",          castka: 16500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Tereza Burianová",  castka:  8500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Dominika Mendrek",  castka:  3000, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Tomáš Dang",        castka:  5000, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Michael Weiser",    castka: 28700, typ: "Provize", poznamka: "Faktura" },
      { klient: "Zdeněk Dolíhal",    castka: 21500, typ: "Provize", poznamka: "Faktura" },
      { klient: "Monika Kudličková", castka:  6000, typ: "Provize", poznamka: "Faktura" },
      { klient: "David Mačala",      castka:  3500, typ: "Provize", poznamka: "Faktura" },
      { klient: "Patrik Petr",       castka:  3750, typ: "Provize", poznamka: "Faktura" },
      { klient: "Martin Fiala",      castka:  3000, typ: "Provize", poznamka: "Faktura" },
      { klient: "Matty Hořák",       castka:  3000, typ: "Provize", poznamka: "Faktura" },
      { klient: "Software / AI",     castka:  2560, typ: "Software" },
      { klient: "Direct",            castka:   395, typ: "Pojištění" },
      { klient: "Apple Meta Verified",castka:   670, typ: "Software" },
      { klient: "Adobe",             castka:   249, typ: "Software", poznamka: "iCloud" },
    ],
  },
  {
    mesic: "Duben",
    prijmy: 279500,
    naklady: 101956,
    zisk: 177544,
    status: "PROBÍHÁ",
    prijmyBreakdown: [
      { klient: "SENIMED s.r.o.",        castka: 47000, typ: "Pausál" },
      { klient: "IMTOS spol. s r.o.",    castka: 35000, typ: "Pausál" },
      { klient: "STAVOS Brno, a.s.",     castka: 30000, typ: "Pausál" },
      { klient: "FIRESTA-Fišer a.s.",    castka: 28500, typ: "Pausál" },
      { klient: "Power Plate Česko",     castka: 12000, typ: "Pausál" },
      { klient: "ACsport.cz",            castka: 15000, typ: "Pausál" },
      { klient: "SK Brno Slatina",       castka: 12000, typ: "Pausál" },
      { klient: "DIAM s.r.o.",           castka: 30000, typ: "Pausál" },
      { klient: "MTB CZ s.r.o.",         castka: 30000, typ: "Pausál" },
      { klient: "SENIMED s.r.o.",        castka:  5000, typ: "Jednorázová" },
      { klient: "Cukrárna TOFFI",        castka:  4000, typ: "Jednorázová" },
      { klient: "TEKMA spol. s r.o.",    castka:  6000, typ: "Jednorázová" },
      { klient: "Mo.one a.s.",           castka: 25000, typ: "Jednorázová" },
    ],
    nakladyBreakdown: [
      { klient: "Adam Mendrek",      castka: 16500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Jan Kříž",          castka: 16500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Tereza Burianová",  castka:  7500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Dominika Mendrek",  castka:  3000, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Tomáš Dang",        castka:  4500, typ: "Mzdy",    poznamka: "DPP" },
      { klient: "Zdeněk Dolíhal",    castka: 20000, typ: "Provize", poznamka: "Faktura" },
      { klient: "Monika Kudličková", castka:  7500, typ: "Provize", poznamka: "Faktura" },
      { klient: "Patrik Petr",       castka:  7300, typ: "Provize", poznamka: "Faktura" },
      { klient: "Matty Hořák",       castka:  9500, typ: "Provize", poznamka: "Faktura" },
      { klient: "Martin Fiala",      castka:  3500, typ: "Provize", poznamka: "Faktura" },
      { klient: "David Mačala",      castka:  3500, typ: "Provize", poznamka: "Faktura" },
      { klient: "Software / AI",     castka:  2011, typ: "Software" },
      { klient: "Direct",            castka:   395, typ: "Pojištění" },
      { klient: "Apple Meta Verified",castka:   670, typ: "Software" },
      { klient: "Apple iCloud",      castka:   249, typ: "Software" },
      { klient: "Adobe",             castka:   608, typ: "Software" },
      { klient: "Artlist.io",        castka:   484, typ: "Software" },
      { klient: "Google",            castka:   250, typ: "Software" },
    ],
  },
];

const YTD_PRIJMY  = 1190500;
const YTD_NAKLADY = 413836;
const YTD_ZISK    = 776664;
const AVG_MARZE   = Math.round((YTD_ZISK / YTD_PRIJMY) * 100 * 10) / 10;
const BEST_MESIC  = "Březen";

const ACCENT = "oklch(0.72 0.14 195)";

type ViewMode = "Příjmy" | "Zisk" | "Náklady";

const VIEW_CONFIG: Record<ViewMode, { key: keyof MesicData; color: string }> = {
  Příjmy:  { key: "prijmy",  color: "oklch(0.62 0.27 265)" },
  Zisk:    { key: "zisk",    color: "oklch(0.67 0.155 155)" },
  Náklady: { key: "naklady", color: "oklch(0.74 0.18 45)" },
};

const TYP_COLOR: Record<string, string> = {
  "Pausál":       "oklch(0.62 0.27 265)",
  "Jednorázová":  "oklch(0.72 0.18 290)",
  "Reklamy":      "oklch(0.82 0.16 85)",
  "Mzdy":         "oklch(0.72 0.18 290)",
  "Provize":      "oklch(0.78 0.165 75)",
  "Software":     "oklch(0.62 0.27 265)",
  "Pojištění":    "oklch(0.67 0.155 155)",
  "Ostatní":      "oklch(0.55 0.005 222)",
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

/* ── Breakdown bar item ────────────────────────────────────────────────────── */
function BreakdownItem({ item, maxVal, idx }: { item: MesicBreakdown; maxVal: number; idx: number }) {
  const pct = maxVal > 0 ? (item.castka / maxVal) * 100 : 0;
  const color = TYP_COLOR[item.typ] ?? "oklch(0.55 0.005 222)";
  return (
    <motion.div
      className="space-y-1.5"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + idx * 0.04, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[11px] font-semibold truncate"
            style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.01em" }}
          >
            {item.klient}
          </span>
          {item.poznamka && (
            <span className="text-[10px] shrink-0" style={{ color: "oklch(0.40 0.005 222)" }}>
              {item.poznamka}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap"
            style={{
              color,
              background: `${color.replace(")", " / 0.12)")}`,
              border: `1px solid ${color.replace(")", " / 0.2)")}`,
            }}
          >
            {item.typ}
          </span>
          <span
            className="text-[12px] font-bold tabular-nums w-[80px] text-right"
            style={{ fontFamily: "var(--font-outfit)", color }}
          >
            {item.castka.toLocaleString("cs-CZ")} Kč
          </span>
        </div>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.07)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, delay: 0.15 + idx * 0.04, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
    </motion.div>
  );
}

/* ── Breakdown Modal ────────────────────────────────────────────────────────── */
interface RealIncomeEntry {
  mesic?: string;
  klient?: string;
  castka?: number;
  typ?: string;
  [key: string]: unknown;
}

function BreakdownModal({ mesic, onClose }: { mesic: MesicData; onClose: () => void }) {
  const [realData, setRealData] = useState<RealIncomeEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/sync?key=ov-finance-incomes")
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          const filtered = (data as RealIncomeEntry[]).filter(
            (e: RealIncomeEntry) =>
              typeof e.mesic === "string" &&
              e.mesic.toLowerCase() === mesic.mesic.toLowerCase()
          );
          if (filtered.length > 0) setRealData(filtered);
        }
      })
      .catch(() => null);
  }, [mesic.mesic]);

  const prijmyItems: MesicBreakdown[] = realData
    ? realData.map(e => ({
        klient:    String(e.klient ?? ""),
        castka:    Number(e.castka ?? 0),
        typ:       (e.typ as MesicBreakdown["typ"]) ?? "Pausál",
        poznamka:  typeof e.poznamka === "string" ? e.poznamka : undefined,
      }))
    : mesic.prijmyBreakdown;

  const nakladyItems = mesic.nakladyBreakdown;

  const maxPrijmy  = Math.max(...prijmyItems.map(i => i.castka), 1);
  const maxNaklady = Math.max(...nakladyItems.map(i => i.castka), 1);

  const totalPrijmy  = prijmyItems.reduce((s, i) => s + i.castka, 0);
  const totalNaklady = nakladyItems.reduce((s, i) => s + i.castka, 0);
  const zisk         = totalPrijmy - totalNaklady;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[16px]"
        style={{
          background: "oklch(0.11 0.008 222)",
          border: "1px solid oklch(1 0 0 / 0.1)",
          boxShadow: "0 32px 80px oklch(0 0 0 / 0.5)",
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10 rounded-t-[16px]"
          style={{ background: "oklch(0.11 0.008 222)", borderColor: "oklch(1 0 0 / 0.08)" }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-[17px] font-bold"
              style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.02em" }}
            >
              {mesic.mesic} 2026
            </h2>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[3px]"
              style={
                mesic.status === "UZAVŘENO"
                  ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                  : { color: ACCENT, background: `${ACCENT.replace(")", " / 0.12)")}`, border: `1px solid ${ACCENT.replace(")", " / 0.2)")}` }
              }
            >
              {mesic.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] transition-colors"
            style={{ color: "oklch(0.45 0.005 222)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Příjmy section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: "oklch(0.62 0.27 265)" }}
              >
                Příjmy
              </span>
              <span className="flex-1 h-px" style={{ background: "oklch(0.62 0.27 265 / 0.2)" }} />
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.62 0.27 265)" }}
              >
                {totalPrijmy.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
            <div className="space-y-3">
              {prijmyItems.map((item, i) => (
                <BreakdownItem key={`p-${i}`} item={item} maxVal={maxPrijmy} idx={i} />
              ))}
            </div>
          </div>

          {/* Náklady section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: "oklch(0.65 0.22 25)" }}
              >
                Náklady
              </span>
              <span className="flex-1 h-px" style={{ background: "oklch(0.65 0.22 25 / 0.2)" }} />
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.65 0.22 25)" }}
              >
                {totalNaklady.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
            <div className="space-y-3">
              {nakladyItems.map((item, i) => (
                <BreakdownItem key={`n-${i}`} item={item} maxVal={maxNaklady} idx={i} />
              ))}
            </div>
          </div>

          {/* Summary strip */}
          <motion.div
            className="grid grid-cols-3 gap-px rounded-[10px] overflow-hidden"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {[
              { label: "Příjmy",  value: totalPrijmy,  color: "oklch(0.62 0.27 265)" },
              { label: "Náklady", value: totalNaklady, color: "oklch(0.65 0.22 25)" },
              { label: "Zisk",    value: zisk,         color: "oklch(0.67 0.155 155)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center" style={{ background: "oklch(1 0 0 / 0.035)" }}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] mb-1.5" style={{ color: "oklch(0.40 0.005 222)" }}>
                  {label}
                </p>
                <p
                  className="text-[14px] font-bold leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.02em" }}
                >
                  {value.toLocaleString("cs-CZ")}
                  <span className="text-[10px] font-normal ml-0.5" style={{ color: "oklch(0.35 0.005 222)" }}>
                    Kč
                  </span>
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function ReportyPage() {
  const [mode, setMode] = useState<ViewMode>("Příjmy");
  const [selectedMesic, setSelectedMesic] = useState<MesicData | null>(null);

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
            color: "oklch(0.62 0.27 265)",
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
              className="card p-4 cursor-pointer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.35, delay: 0.12 + idx * 0.06 }}
              onClick={() => setSelectedMesic(m)}
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
                  { label: "Příjmy",  value: m.prijmy,  color: "oklch(0.62 0.27 265)" },
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
                <p
                  className="text-[10px] mt-2 text-center"
                  style={{ color: "oklch(0.38 0.005 222)" }}
                >
                  Klikni pro detail
                </p>
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
            { label: "Celkové příjmy",   value: YTD_PRIJMY,  pct: 100,                                    color: "oklch(0.62 0.27 265)" },
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

      {/* Breakdown modal */}
      <AnimatePresence>
        {selectedMesic && (
          <BreakdownModal mesic={selectedMesic} onClose={() => setSelectedMesic(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
