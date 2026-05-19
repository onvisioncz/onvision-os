"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, TrendingUp, Award, Percent, X,
  Sparkles, Download, ChevronDown, Users,
  Heart, Eye, MousePointerClick, DollarSign,
  Play, FileText, ArrowLeft,
  CheckCircle2, Loader2, RefreshCw, Printer,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { ReportDocument } from "@/components/reports/report-document";

/* ─────────────────────────────────────────────────────────────────────────────
   Finance types & data
───────────────────────────────────────────────────────────────────────────── */
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

const MESICE: MesicData[] = [
  {
    mesic: "Leden", prijmy: 266500, naklady: 90893, zisk: 175607, status: "UZAVŘENO",
    prijmyBreakdown: [
      { klient: "SENIMED s.r.o.",         castka: 25000, typ: "Pausál" },
      { klient: "STAVOS Brno, a.s.",       castka: 30000, typ: "Pausál" },
      { klient: "FIRESTA-Fišer a.s.",      castka: 28500, typ: "Pausál" },
      { klient: "IMTOS spol. s r.o.",      castka: 25000, typ: "Pausál" },
      { klient: "Power Plate Česko",       castka: 12000, typ: "Pausál" },
      { klient: "ACsport.cz",              castka: 15000, typ: "Pausál" },
      { klient: "SK Brno Slatina",         castka: 12000, typ: "Pausál" },
      { klient: "DIAM s.r.o.",             castka: 30000, typ: "Pausál" },
      { klient: "MTB CZ s.r.o.",           castka: 30000, typ: "Pausál" },
      { klient: "CKTCH Brno",              castka: 20000, typ: "Jednorázová", poznamka: "Výroční video" },
      { klient: "Brno Open Game Business", castka: 39000, typ: "Jednorázová", poznamka: "Event coverage" },
    ],
    nakladyBreakdown: [
      { klient: "Adam Mendrek",     castka: 16900, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Jan Kříž",         castka: 16900, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Tereza Burianová", castka:  5500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Dominika Mendrek", castka:  3000, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Tomáš Dang",       castka:  2500, typ: "Mzdy",     poznamka: "DPP" },
      { klient: "Zdeněk Dolíhal",   castka: 20000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Matty Hořák",      castka: 12000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Martin Fiala",     castka:  3000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Patrik Petr",      castka:  3000, typ: "Provize",  poznamka: "Faktura" },
      { klient: "Jiří Juhaňák",     castka:  3900, typ: "Provize",  poznamka: "Provize Brno Open Game" },
      { klient: "Software / AI",    castka:  3098, typ: "Software", poznamka: "ChatGPT, Adobe, Freepik, Higgsfield, Artlist, iCloud, Google" },
      { klient: "Direct",           castka:   395, typ: "Pojištění" },
      { klient: "Apple Meta Verified", castka: 670, typ: "Software", poznamka: "Modrý štítek" },
    ],
  },
  {
    mesic: "Únor", prijmy: 295000, naklady: 98343, zisk: 196657, status: "UZAVŘENO",
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
      { klient: "Apple Meta Verified", castka:   670, typ: "Software" },
    ],
  },
  {
    mesic: "Březen", prijmy: 349500, naklady: 122644, zisk: 226856, status: "UZAVŘENO",
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
      { klient: "Apple Meta Verified", castka:  670, typ: "Software" },
      { klient: "Adobe",             castka:   249, typ: "Software", poznamka: "iCloud" },
    ],
  },
  {
    mesic: "Duben", prijmy: 279500, naklady: 101956, zisk: 177544, status: "PROBÍHÁ",
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
      { klient: "Apple Meta Verified", castka:  670, typ: "Software" },
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

/* ─────────────────────────────────────────────────────────────────────────────
   Client reporting types
───────────────────────────────────────────────────────────────────────────── */
const KLIENTI = [
  "OnVision (interní)",
  "SENIMED s.r.o.",
  "STAVOS Brno, a.s.",
  "FIRESTA-Fišer a.s.",
  "IMTOS spol. s r.o.",
  "Power Plate Česko",
  "ACsport.cz",
  "SK Brno Slatina",
  "DIAM s.r.o.",
  "MTB CZ s.r.o.",
  "TEKMA spol. s r.o.",
  "NERA Displays s.r.o.",
  "Mo.one a.s.",
  "Cukrárna TOFFI",
  "Jiný klient",
];

const MESICE_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

interface IGMetrics {
  followers: string;
  followersGrowth: string;
  reach: string;
  impressions: string;
  engagement: string;
  posts: string;
  stories: string;
  reels: string;
  reelViews: string;
  topPost: string;
}

interface MetaAdsMetrics {
  enabled: boolean;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpc: string;
  conversions: string;
  convValue: string;
}

interface ClientReportData {
  id: string;
  klient: string;
  mesic: string;
  rok: number;
  ig: IGMetrics;
  meta: MetaAdsMetrics;
  poznamky: string;
  aiReport: string;
  generatedAt: string;
}

const EMPTY_IG: IGMetrics = {
  followers: "", followersGrowth: "", reach: "", impressions: "",
  engagement: "", posts: "", stories: "", reels: "", reelViews: "", topPost: "",
};

const EMPTY_META: MetaAdsMetrics = {
  enabled: false, spend: "", impressions: "", reach: "",
  clicks: "", ctr: "", cpc: "", conversions: "", convValue: "",
};

/* ─────────────────────────────────────────────────────────────────────────────
   Finance sub-components
───────────────────────────────────────────────────────────────────────────── */
function BarChartCSS({ mode }: { mode: ViewMode }) {
  const maxVal = Math.max(...MESICE.map(m => m.prijmy));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-[11px] text-[--muted-foreground]">
        {(["Příjmy", "Náklady", "Zisk"] as ViewMode[]).map(v => (
          <span key={v} className="flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded-full" style={{ background: VIEW_CONFIG[v].color, opacity: v === mode ? 1 : 0.4 }} />
            <span style={{ opacity: v === mode ? 1 : 0.5 }}>{v}</span>
          </span>
        ))}
      </div>
      <div className="space-y-5">
        {MESICE.map((m, idx) => {
          const prijmyPct  = (m.prijmy  / maxVal) * 100;
          const nakladyPct = (m.naklady / maxVal) * 100;
          const ziskPct    = (m.zisk    / maxVal) * 100;
          const marze = Math.round((m.zisk / m.prijmy) * 100);
          return (
            <div key={m.mesic}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold"
                  style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                  {m.mesic}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px]" style={{ color: "oklch(0.45 0.005 222)" }}>marže {marze}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[3px]"
                    style={m.status === "UZAVŘENO"
                      ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                      : { color: ACCENT, background: `${ACCENT.replace(")", " / 0.12)")}`, border: `1px solid ${ACCENT.replace(")", " / 0.2)")}` }}>
                    {m.status}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {([
                  { label: "Příjmy",  pct: prijmyPct,  value: m.prijmy,  color: VIEW_CONFIG.Příjmy.color,  key: "Příjmy" as ViewMode },
                  { label: "Náklady", pct: nakladyPct, value: m.naklady, color: VIEW_CONFIG.Náklady.color, key: "Náklady" as ViewMode },
                  { label: "Zisk",    pct: ziskPct,    value: m.zisk,    color: VIEW_CONFIG.Zisk.color,    key: "Zisk" as ViewMode },
                ] as const).map(bar => {
                  const isActive = bar.key === mode;
                  return (
                    <div key={bar.label} className="flex items-center gap-3">
                      <span className="text-[10px] w-[46px] text-right shrink-0"
                        style={{ color: isActive ? bar.color : "oklch(0.40 0.005 222)", fontFamily: "var(--font-jakarta)" }}>
                        {bar.label}
                      </span>
                      <div className="flex-1 h-[14px] rounded-[3px] overflow-hidden" style={{ background: "oklch(1 0 0 / 0.05)" }}>
                        <motion.div className="h-full rounded-[3px]"
                          style={{ background: bar.color, opacity: isActive ? 1 : 0.25 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${bar.pct}%` }}
                          transition={{ duration: 0.7, delay: idx * 0.07, ease: [0.23, 1, 0.32, 1] }} />
                      </div>
                      <span className="text-[11px] font-bold w-[80px] shrink-0 tabular-nums"
                        style={{ fontFamily: "var(--font-outfit)", color: isActive ? bar.color : "oklch(0.40 0.005 222)", opacity: isActive ? 1 : 0.6 }}>
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

function BreakdownItem({ item, maxVal, idx }: { item: MesicBreakdown; maxVal: number; idx: number }) {
  const pct   = maxVal > 0 ? (item.castka / maxVal) * 100 : 0;
  const color = TYP_COLOR[item.typ] ?? "oklch(0.55 0.005 222)";
  return (
    <motion.div className="space-y-1.5"
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + idx * 0.04, ease: [0.23, 1, 0.32, 1] }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold truncate"
            style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.01em" }}>
            {item.klient}
          </span>
          {item.poznamka && (
            <span className="text-[10px] shrink-0" style={{ color: "oklch(0.40 0.005 222)" }}>{item.poznamka}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap"
            style={{ color, background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.2)")}` }}>
            {item.typ}
          </span>
          <span className="text-[12px] font-bold tabular-nums w-[80px] text-right"
            style={{ fontFamily: "var(--font-outfit)", color }}>
            {item.castka.toLocaleString("cs-CZ")} Kč
          </span>
        </div>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.07)" }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, delay: 0.15 + idx * 0.04, ease: [0.23, 1, 0.32, 1] }} />
      </div>
    </motion.div>
  );
}

interface RealIncomeEntry {
  mesic?: string; klient?: string; castka?: number; typ?: string; [key: string]: unknown;
}

function BreakdownModal({ mesic, onClose }: { mesic: MesicData; onClose: () => void }) {
  const [realData, setRealData] = useState<RealIncomeEntry[] | null>(null);
  useEffect(() => {
    fetch("/api/sync?key=ov-finance-incomes")
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          const filtered = (data as RealIncomeEntry[]).filter(
            (e: RealIncomeEntry) => typeof e.mesic === "string" && e.mesic.toLowerCase() === mesic.mesic.toLowerCase()
          );
          if (filtered.length > 0) setRealData(filtered);
        }
      }).catch(() => null);
  }, [mesic.mesic]);

  const prijmyItems: MesicBreakdown[] = realData
    ? realData.map(e => ({ klient: String(e.klient ?? ""), castka: Number(e.castka ?? 0), typ: (e.typ as MesicBreakdown["typ"]) ?? "Pausál", poznamka: typeof e.poznamka === "string" ? e.poznamka : undefined }))
    : mesic.prijmyBreakdown;
  const nakladyItems = mesic.nakladyBreakdown;
  const maxPrijmy  = Math.max(...prijmyItems.map(i => i.castka), 1);
  const maxNaklady = Math.max(...nakladyItems.map(i => i.castka), 1);
  const totalPrijmy  = prijmyItems.reduce((s, i) => s + i.castka, 0);
  const totalNaklady = nakladyItems.reduce((s, i) => s + i.castka, 0);
  const zisk = totalPrijmy - totalNaklady;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <motion.div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[16px]"
        style={{ background: "oklch(0.11 0.008 222)", border: "1px solid oklch(1 0 0 / 0.1)", boxShadow: "0 32px 80px oklch(0 0 0 / 0.5)" }}
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10 rounded-t-[16px]"
          style={{ background: "oklch(0.11 0.008 222)", borderColor: "oklch(1 0 0 / 0.08)" }}>
          <div className="flex items-center gap-3">
            <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              {mesic.mesic} 2026
            </h2>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[3px]"
              style={mesic.status === "UZAVŘENO"
                ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                : { color: ACCENT, background: `${ACCENT.replace(")", " / 0.12)")}`, border: `1px solid ${ACCENT.replace(")", " / 0.2)")}` }}>
              {mesic.status}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[6px] transition-colors" style={{ color: "oklch(0.45 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "oklch(0.62 0.27 265)" }}>Příjmy</span>
              <span className="flex-1 h-px" style={{ background: "oklch(0.62 0.27 265 / 0.2)" }} />
              <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.62 0.27 265)" }}>
                {totalPrijmy.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
            <div className="space-y-3">
              {prijmyItems.map((item, i) => <BreakdownItem key={`p-${i}`} item={item} maxVal={maxPrijmy} idx={i} />)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "oklch(0.65 0.22 25)" }}>Náklady</span>
              <span className="flex-1 h-px" style={{ background: "oklch(0.65 0.22 25 / 0.2)" }} />
              <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.65 0.22 25)" }}>
                {totalNaklady.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
            <div className="space-y-3">
              {nakladyItems.map((item, i) => <BreakdownItem key={`n-${i}`} item={item} maxVal={maxNaklady} idx={i} />)}
            </div>
          </div>
          <motion.div className="grid grid-cols-3 gap-px rounded-[10px] overflow-hidden"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
            {[
              { label: "Příjmy",  value: totalPrijmy,  color: "oklch(0.62 0.27 265)" },
              { label: "Náklady", value: totalNaklady, color: "oklch(0.65 0.22 25)" },
              { label: "Zisk",    value: zisk,         color: "oklch(0.67 0.155 155)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center" style={{ background: "oklch(1 0 0 / 0.035)" }}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] mb-1.5" style={{ color: "oklch(0.40 0.005 222)" }}>{label}</p>
                <p className="text-[14px] font-bold leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.02em" }}>
                  {value.toLocaleString("cs-CZ")}
                  <span className="text-[10px] font-normal ml-0.5" style={{ color: "oklch(0.35 0.005 222)" }}>Kč</span>
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Client reporting sub-components
───────────────────────────────────────────────────────────────────────────── */

/* Metric input field */
function MetricInput({
  label, value, onChange, placeholder, icon: Icon, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ElementType; suffix?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] mb-1.5"
        style={{ color: "oklch(0.45 0.005 222)" }}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "—"}
          className="w-full px-3 py-2 rounded-[8px] text-[13px] font-medium outline-none transition-all"
          style={{
            background: "oklch(1 0 0 / 0.04)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            color: "var(--foreground)",
            fontFamily: "var(--font-outfit)",
          }}
          onFocus={e => { e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)"; e.target.style.background = "oklch(1 0 0 / 0.06)"; }}
          onBlur={e => { e.target.style.borderColor = "oklch(1 0 0 / 0.1)"; e.target.style.background = "oklch(1 0 0 / 0.04)"; }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]"
            style={{ color: "oklch(0.40 0.005 222)" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* Section heading */
function SectionLabel({ children, color = "oklch(0.62 0.27 265)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color }}>{children}</span>
      <span className="flex-1 h-px" style={{ background: `${color.replace(")", " / 0.2)")}` }} />
    </div>
  );
}

/* Formatted AI report output — simple paragraph renderer */
function ReportOutput({ text, streaming }: { text: string; streaming: boolean }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => {
        /* Section headings: lines starting with ## or ** */
        if (p.startsWith("##") || p.startsWith("**")) {
          const clean = p.replace(/^#+\s*/, "").replace(/\*\*/g, "");
          return (
            <p key={i} className="text-[13px] font-bold pt-2"
              style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.82 0.27 265)", letterSpacing: "-0.01em" }}>
              {clean}
            </p>
          );
        }
        /* Bullet lists */
        if (p.startsWith("- ") || p.startsWith("• ")) {
          const lines = p.split("\n").filter(Boolean);
          return (
            <ul key={i} className="space-y-1.5 pl-0">
              {lines.map((line, li) => (
                <li key={li} className="flex items-start gap-2 text-[13px] leading-[1.65]"
                  style={{ color: "oklch(0.72 0.005 222)" }}>
                  <span className="mt-[6px] w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.62 0.27 265)" }} />
                  <span>{line.replace(/^[-•]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        /* Normal paragraph */
        return (
          <p key={i} className="text-[13px] leading-[1.7]" style={{ color: "oklch(0.72 0.005 222)" }}>
            {p}
            {streaming && i === paragraphs.length - 1 && (
              <span className="inline-block w-[2px] h-[14px] ml-[2px] align-middle rounded-full"
                style={{ background: "oklch(0.62 0.27 265)", animation: "pulse 1s ease-in-out infinite" }} />
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Client Reporting main panel
───────────────────────────────────────────────────────────────────────────── */
function ClientReportingPanel() {
  /* State */
  const [step, setStep] = useState<"form" | "report">("form");
  const [klient, setKlient] = useState(KLIENTI[0]);
  const [mesic, setMesic] = useState(MESICE_NAMES[3]); // Duben default
  const [rok]   = useState(2026);
  const [ig, setIg]     = useState<IGMetrics>({ ...EMPTY_IG });
  const [meta, setMeta] = useState<MetaAdsMetrics>({ ...EMPTY_META });
  const [poznamky, setPoznamky] = useState("");
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [savedReports, setSavedReports] = useSupabaseData<ClientReportData[]>("ov-client-reports", () => []);
  const [viewingReport, setViewingReport] = useState<ClientReportData | null>(null);
  const [metaFetching, setMetaFetching] = useState(false);
  const [metaFetchError, setMetaFetchError] = useState<string | null>(null);
  const [metaFetchedAt, setMetaFetchedAt] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  /* Load real data from Meta API */
  async function loadFromMeta() {
    setMetaFetching(true);
    setMetaFetchError(null);
    try {
      const res = await fetch("/api/meta/insights");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chyba při načítání dat");

      const ig = data.instagram;
      setIg(prev => ({
        ...prev,
        followers:      ig.followers       ? String(ig.followers)                               : prev.followers,
        followersGrowth: ig.followerGrowth ? `+${ig.followerGrowth}`                            : prev.followersGrowth,
        reach:          ig.reach           ? String(ig.reach)                                    : prev.reach,
        engagement:     (ig.interactions && ig.followers)
                          ? ((ig.interactions / ig.followers) * 100).toFixed(2)
                          : prev.engagement,
      }));
      setMetaFetchedAt(new Date().toLocaleString("cs-CZ"));
    } catch (err) {
      setMetaFetchError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setMetaFetching(false);
    }
  }

  /* Shortcuts for updating IG / Meta fields */
  const setIgField  = (k: keyof IGMetrics,  v: string) => setIg(p  => ({ ...p, [k]: v }));
  const setMetaField = (k: keyof MetaAdsMetrics, v: string | boolean) => setMeta(p => ({ ...p, [k]: v }));

  /* Build system prompt for Claude */
  function buildPrompt(): string {
    const igLines = [
      ig.followers      && `Followers: ${ig.followers}`,
      ig.followersGrowth && `Nárůst sledujících: ${ig.followersGrowth}`,
      ig.reach          && `Reach: ${ig.reach}`,
      ig.impressions    && `Impressions: ${ig.impressions}`,
      ig.engagement     && `Engagement rate: ${ig.engagement}%`,
      ig.posts          && `Počet příspěvků: ${ig.posts}`,
      ig.stories        && `Stories: ${ig.stories}`,
      ig.reels          && `Reels: ${ig.reels}`,
      ig.reelViews      && `Zobrazení Reels: ${ig.reelViews}`,
      ig.topPost        && `Nejlepší příspěvek: ${ig.topPost}`,
    ].filter(Boolean).join("\n");

    const metaLines = meta.enabled ? [
      meta.spend       && `Výdaje na reklamy: ${meta.spend} Kč`,
      meta.impressions && `Impressions reklam: ${meta.impressions}`,
      meta.reach       && `Reach reklam: ${meta.reach}`,
      meta.clicks      && `Kliknutí: ${meta.clicks}`,
      meta.ctr         && `CTR: ${meta.ctr}%`,
      meta.cpc         && `CPC: ${meta.cpc} Kč`,
      meta.conversions && `Konverze: ${meta.conversions}`,
      meta.convValue   && `Hodnota konverzí: ${meta.convValue} Kč`,
    ].filter(Boolean).join("\n") : "";

    return [
      `Klient: ${klient}`,
      `Období: ${mesic} ${rok}`,
      igLines && `\nINSTAGRAM METRIKY:\n${igLines}`,
      metaLines && `\nMETA ADS METRIKY:\n${metaLines}`,
      poznamky && `\nDOPLŇUJÍCÍ POZNÁMKY OD AGENTURY:\n${poznamky}`,
    ].filter(Boolean).join("\n");
  }

  /* Generate report — auto-fetches Meta data first if not yet loaded */
  async function generate() {
    // Auto-fetch Meta data before generating if fields are empty
    const noData = !ig.followers && !ig.reach && !ig.engagement;
    if (noData) {
      setMetaFetching(true);
      setMetaFetchError(null);
      try {
        const res = await fetch("/api/meta/insights");
        if (res.ok) {
          const data = await res.json();
          const igData = data.instagram;
          setIg(prev => ({
            ...prev,
            followers:       igData.followers       ? String(igData.followers)   : prev.followers,
            followersGrowth: igData.followerGrowth  ? `+${igData.followerGrowth}` : prev.followersGrowth,
            reach:           igData.reach           ? String(igData.reach)        : prev.reach,
            engagement:      (igData.interactions && igData.followers)
                               ? ((igData.interactions / igData.followers) * 100).toFixed(2)
                               : prev.engagement,
          }));
          setMetaFetchedAt(new Date().toLocaleString("cs-CZ"));
        }
      } catch { /* continue without data */ }
      finally { setMetaFetching(false); }
    }

    setGenerating(true);
    setStreamText("");
    setStep("report");

    abortRef.current = new AbortController();
    let fullText = "";

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          model: "sonnet",
          maxTokens: 2048,
          systemPrompt: `Jsi expertní social media analytik kreativní agentury OnVision. Vytváříš profesionální měsíční reporty pro klienty agentury.

Tvůj report musí být:
- Napsán v češtině, profesionálně ale srozumitelně
- Strukturovaný s jasným nadpisem každé sekce (použij ## pro nadpisy)
- Konkrétní: cituj čísla, vypočítej změny, pojmenuj trendy
- Actionable: každé zjištění doplň praktickým doporučením
- Pozitivní v tónu — zaměř se na výsledky a příležitosti

Struktura reportu:
## Shrnutí měsíce
## Instagram — výkon
## Meta Ads — výkon (pokud jsou data)
## Co fungovalo nejlépe
## Doporučení pro příští měsíc

Délka: 400–600 slov. Žádné zbytečné fráze ani omluvy.`,
          messages: [{
            role: "user",
            content: `Prosím vytvoř měsíční report pro klienta na základě těchto dat:\n\n${buildPrompt()}`,
          }],
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.delta?.text ?? parsed?.delta?.value ?? "";
            if (delta) {
              fullText += delta;
              setStreamText(t => t + delta);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamText("Nepodařilo se vygenerovat report. Zkuste to prosím znovu.");
      }
    } finally {
      setGenerating(false);
      // Save report to Supabase
      if (fullText) {
        const report: ClientReportData = {
          id: `${klient}-${mesic}-${rok}-${Date.now()}`,
          klient, mesic, rok,
          ig: { ...ig },
          meta: { ...meta },
          poznamky,
          aiReport: fullText,
          generatedAt: new Date().toISOString(),
        };
        setSavedReports(prev => {
          const arr = prev ?? [];
          return [report, ...arr.slice(0, 49)]; // keep last 50
        });
      }
    }
  }

  /* Open premium PDF document */
  function handlePrint() {
    setShowDocument(true);
  }

  /* Viewing a saved report — open premium document directly */
  if (viewingReport) {
    return (
      <ReportDocument
        klient={viewingReport.klient}
        mesic={viewingReport.mesic}
        rok={viewingReport.rok}
        ig={viewingReport.ig}
        meta={viewingReport.meta}
        aiReport={viewingReport.aiReport}
        generatedAt={viewingReport.generatedAt}
        onClose={() => setViewingReport(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Premium document overlay — shown when PDF button clicked */}
      {showDocument && streamText && (
        <ReportDocument
          klient={klient}
          mesic={mesic}
          rok={rok}
          ig={ig}
          meta={meta}
          aiReport={streamText}
          generatedAt={new Date().toISOString()}
          onClose={() => setShowDocument(false)}
        />
      )}

      {step === "form" ? (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Client + period selector */}
          <div className="card p-5">
            <p className="text-[14px] font-bold mb-4"
              style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              Nový klientský report
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client picker */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.07em] mb-1.5 block"
                  style={{ color: "oklch(0.45 0.005 222)" }}>Klient</label>
                <div className="relative">
                  <select value={klient} onChange={e => setKlient(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] text-[13px] font-medium outline-none appearance-none cursor-pointer"
                    style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)", fontFamily: "var(--font-outfit)" }}>
                    {KLIENTI.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: "oklch(0.45 0.005 222)" }} />
                </div>
              </div>
              {/* Month picker */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.07em] mb-1.5 block"
                  style={{ color: "oklch(0.45 0.005 222)" }}>Měsíc</label>
                <div className="relative">
                  <select value={mesic} onChange={e => setMesic(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] text-[13px] font-medium outline-none appearance-none cursor-pointer"
                    style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)", fontFamily: "var(--font-outfit)" }}>
                    {MESICE_NAMES.map(m => <option key={m} value={m}>{m} {rok}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: "oklch(0.45 0.005 222)" }} />
                </div>
              </div>
              {/* Generate button */}
              <div className="flex items-end">
                <button onClick={generate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-all"
                  style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.005 265)", fontFamily: "var(--font-outfit)" }}>
                  <Sparkles className="w-4 h-4" />
                  Vygenerovat report
                </button>
              </div>
            </div>
          </div>

          {/* Instagram metrics */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "oklch(0.72 0.18 335)" }}>
                  Instagram — {mesic} {rok}
                </span>
                <span className="flex-1 h-px w-16" style={{ background: "oklch(0.72 0.18 335 / 0.2)" }} />
              </div>
              <div className="flex items-center gap-2">
                {metaFetchedAt && (
                  <span className="text-[10px]" style={{ color: "oklch(0.50 0.005 222)" }}>
                    Aktualizováno {metaFetchedAt}
                  </span>
                )}
                {metaFetchError && (
                  <span className="text-[10px]" style={{ color: "oklch(0.65 0.22 25)" }}>
                    {metaFetchError}
                  </span>
                )}
                <button
                  onClick={loadFromMeta}
                  disabled={metaFetching}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-[7px] transition-all disabled:opacity-50"
                  style={{
                    color: "oklch(0.72 0.18 335)",
                    background: "oklch(0.72 0.18 335 / 0.08)",
                    border: "1px solid oklch(0.72 0.18 335 / 0.2)",
                  }}
                >
                  {metaFetching
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Načítám...</>
                    : <><RefreshCw className="w-3 h-3" /> Načíst z Meta</>
                  }
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <MetricInput label="Followers celkem" value={ig.followers} onChange={v => setIgField("followers", v)} placeholder="např. 4 820" icon={Users} />
              <MetricInput label="Nárůst followers" value={ig.followersGrowth} onChange={v => setIgField("followersGrowth", v)} placeholder="+120" />
              <MetricInput label="Reach" value={ig.reach} onChange={v => setIgField("reach", v)} placeholder="38 400" icon={Eye} />
              <MetricInput label="Impressions" value={ig.impressions} onChange={v => setIgField("impressions", v)} placeholder="96 000" />
              <MetricInput label="Engagement rate" value={ig.engagement} onChange={v => setIgField("engagement", v)} placeholder="3.2" suffix="%" icon={Heart} />
              <MetricInput label="Příspěvky" value={ig.posts} onChange={v => setIgField("posts", v)} placeholder="12" />
              <MetricInput label="Stories" value={ig.stories} onChange={v => setIgField("stories", v)} placeholder="28" />
              <MetricInput label="Reels" value={ig.reels} onChange={v => setIgField("reels", v)} placeholder="4" icon={Play} />
              <MetricInput label="Zobrazení Reels" value={ig.reelViews} onChange={v => setIgField("reelViews", v)} placeholder="14 200" />
            </div>
            <div className="mt-3">
              <MetricInput label="Nejlepší příspěvek (popis / reach)" value={ig.topPost}
                onChange={v => setIgField("topPost", v)} placeholder="např. video ze závodu, reach 8 400" />
            </div>
          </div>

          {/* Meta Ads */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <SectionLabel color="oklch(0.72 0.18 265)">
                Meta Ads
              </SectionLabel>
              <button onClick={() => setMetaField("enabled", !meta.enabled)}
                className="ml-auto flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-all"
                style={{
                  background: meta.enabled ? "oklch(0.62 0.27 265 / 0.12)" : "oklch(1 0 0 / 0.04)",
                  color: meta.enabled ? "oklch(0.72 0.27 265)" : "oklch(0.45 0.005 222)",
                  border: meta.enabled ? "1px solid oklch(0.62 0.27 265 / 0.3)" : "1px solid oklch(1 0 0 / 0.1)",
                }}>
                {meta.enabled ? <CheckCircle2 className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                {meta.enabled ? "Zapnuto" : "Zahrnout Meta Ads"}
              </button>
            </div>
            <AnimatePresence>
              {meta.enabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricInput label="Výdaje" value={meta.spend} onChange={v => setMetaField("spend", v)} placeholder="12 400" suffix="Kč" icon={DollarSign} />
                    <MetricInput label="Impressions" value={meta.impressions} onChange={v => setMetaField("impressions", v)} placeholder="280 000" icon={Eye} />
                    <MetricInput label="Reach" value={meta.reach} onChange={v => setMetaField("reach", v)} placeholder="98 000" />
                    <MetricInput label="Kliknutí" value={meta.clicks} onChange={v => setMetaField("clicks", v)} placeholder="1 840" icon={MousePointerClick} />
                    <MetricInput label="CTR" value={meta.ctr} onChange={v => setMetaField("ctr", v)} placeholder="0.65" suffix="%" />
                    <MetricInput label="CPC" value={meta.cpc} onChange={v => setMetaField("cpc", v)} placeholder="6.74" suffix="Kč" />
                    <MetricInput label="Konverze" value={meta.conversions} onChange={v => setMetaField("conversions", v)} placeholder="48" />
                    <MetricInput label="Hodnota konverzí" value={meta.convValue} onChange={v => setMetaField("convValue", v)} placeholder="38 400" suffix="Kč" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!meta.enabled && (
              <p className="text-[12px]" style={{ color: "oklch(0.38 0.005 222)" }}>
                Aktivujte pokud klient spravuje placené reklamy.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="card p-5">
            <SectionLabel color="oklch(0.67 0.155 155)">Poznámky pro AI</SectionLabel>
            <textarea
              value={poznamky}
              onChange={e => setPoznamky(e.target.value)}
              placeholder="Volitelně: co se dělo u klienta tento měsíc? Jaké kampaně probíhaly? Jaké byly cíle? Co se povedlo / nepovedlo?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-[8px] text-[13px] outline-none resize-none transition-all"
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                color: "var(--foreground)",
                fontFamily: "var(--font-jakarta)",
                lineHeight: "1.6",
              }}
              onFocus={e => { e.target.style.borderColor = "oklch(0.67 0.155 155 / 0.5)"; }}
              onBlur={e => { e.target.style.borderColor = "oklch(1 0 0 / 0.1)"; }}
            />
          </div>
        </motion.div>
      ) : (
        /* Report view */
        <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setStep("form"); setStreamText(""); abortRef.current?.abort(); }}
              className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[7px] transition-all"
              style={{ color: "oklch(0.55 0.005 222)", background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <ArrowLeft className="w-3.5 h-3.5" />
              {generating ? "Zrušit" : "Zpět na formulář"}
            </button>
            {!generating && streamText && (
              <>
                <button onClick={() => generate()}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[7px] transition-all"
                  style={{ color: "oklch(0.62 0.27 265)", background: "oklch(0.62 0.27 265 / 0.08)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
                  <RefreshCw className="w-3 h-3" /> Znovu vygenerovat
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-[8px] transition-all ml-auto"
                  style={{ background: "#5353f6", color: "#fff", border: "none", fontFamily: "var(--font-outfit)" }}>
                  <Printer className="w-3.5 h-3.5" /> Exportovat PDF
                </button>
              </>
            )}
          </div>

          {/* Report card */}
          <div ref={reportRef} className="card p-6 print:shadow-none print:border-none"
            style={{ background: "oklch(0.11 0.006 222)" }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-5 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: "oklch(0.50 0.15 265)" }}>
                  Social Media Report
                </p>
                <p className="text-[20px] font-bold leading-tight" style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.025em" }}>
                  {klient}
                </p>
                <p className="text-[12px] mt-1" style={{ color: "oklch(0.45 0.005 222)" }}>
                  {mesic} {rok} · OnVision Kreativní Agentura
                </p>
              </div>
              {generating && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]"
                  style={{ background: "oklch(0.62 0.27 265 / 0.1)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "oklch(0.62 0.27 265)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "oklch(0.62 0.27 265)" }}>Generuji...</span>
                </div>
              )}
            </div>
            {/* Key metrics summary strip */}
            {(ig.reach || ig.engagement || meta.spend) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-[10px] overflow-hidden mb-6"
                style={{ background: "oklch(1 0 0 / 0.06)" }}>
                {[
                  ig.reach       && { label: "IG Reach",       value: ig.reach,       color: "oklch(0.72 0.18 335)" },
                  ig.engagement  && { label: "Engagement",     value: `${ig.engagement}%`, color: "oklch(0.82 0.16 85)" },
                  ig.followers   && { label: "Followers",      value: ig.followers,   color: "oklch(0.62 0.27 265)" },
                  meta.enabled && meta.spend && { label: "Meta Ads", value: `${meta.spend} Kč`, color: "oklch(0.72 0.27 265)" },
                ].filter(Boolean).slice(0, 4).map((item) => {
                  if (!item) return null;
                  return (
                    <div key={item.label} className="px-4 py-3" style={{ background: "oklch(1 0 0 / 0.035)" }}>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.07em] mb-1" style={{ color: "oklch(0.40 0.005 222)" }}>{item.label}</p>
                      <p className="text-[16px] font-bold leading-none tabular-nums"
                        style={{ fontFamily: "var(--font-outfit)", color: item.color, letterSpacing: "-0.02em" }}>
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            {/* AI report text */}
            {streamText ? (
              <ReportOutput text={streamText} streaming={generating} />
            ) : generating ? (
              <div className="flex items-center gap-3 py-8">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "oklch(0.62 0.27 265)", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <span className="text-[13px]" style={{ color: "oklch(0.45 0.005 222)" }}>Analyzuji data a píšu report...</span>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}

      {/* Saved reports */}
      {savedReports && savedReports.length > 0 && step === "form" && (
        <motion.div className="card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              Uložené reporty
            </p>
            <span className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ color: "oklch(0.55 0.005 222)", background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.1)" }}>
              {savedReports.length}
            </span>
          </div>
          <div className="space-y-2">
            {savedReports.slice(0, 8).map(r => (
              <motion.button key={r.id} onClick={() => setViewingReport(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-left transition-all group"
                style={{ background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.07)" }}
                whileHover={{ background: "oklch(1 0 0 / 0.06)" }}
                whileTap={{ scale: 0.99 }}>
                <div className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.62 0.27 265 / 0.1)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
                  <FileText className="w-3.5 h-3.5" style={{ color: "oklch(0.62 0.27 265)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold truncate" style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)" }}>
                    {r.klient}
                  </p>
                  <p className="text-[10px]" style={{ color: "oklch(0.42 0.005 222)" }}>
                    {r.mesic} {r.rok} · {new Date(r.generatedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <Download className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ color: "oklch(0.55 0.005 222)" }} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Finance tab content (unchanged layout, extracted to component)
───────────────────────────────────────────────────────────────────────────── */
function FinanceTab() {
  const [mode, setMode] = useState<ViewMode>("Příjmy");
  const [selectedMesic, setSelectedMesic] = useState<MesicData | null>(null);

  return (
    <div className="space-y-4 md:space-y-5">
      {/* KPI row */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-[12px] overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
        {[
          { label: "YTD Příjmy",     value: YTD_PRIJMY.toLocaleString("cs-CZ"),  unit: "Kč", sub: "Leden–Duben 2026",                                           icon: TrendingUp, color: "oklch(0.62 0.27 265)" },
          { label: "YTD Zisk",       value: YTD_ZISK.toLocaleString("cs-CZ"),    unit: "Kč", sub: `z ${YTD_PRIJMY.toLocaleString("cs-CZ")} Kč příjmů`,          icon: BarChart2,  color: "oklch(0.67 0.155 155)" },
          { label: "Průměrná marže", value: String(AVG_MARZE),                   unit: "%",  sub: "Průměr leden–duben",                                          icon: Percent,    color: ACCENT },
          { label: "Nejlepší měsíc", value: BEST_MESIC,                          unit: "",   sub: `${MESICE.find(m => m.mesic === BEST_MESIC)!.zisk.toLocaleString("cs-CZ")} Kč zisk`, icon: Award, color: "oklch(0.82 0.16 85)" },
        ].map(({ label, value, unit, sub, icon: Icon, color }) => (
          <div key={label} className="px-5 py-4" style={{ background: "var(--card)" }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium leading-tight">{label}</p>
              <div className="w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0"
                style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.2)")}` }}>
                <Icon className="w-3 h-3" style={{ color }} />
              </div>
            </div>
            <p className="leading-none mb-1"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "clamp(18px,3vw,26px)", color, letterSpacing: "-0.02em" }}>
              {value}
              {unit && <span style={{ fontSize: 13, fontWeight: 400, color: "oklch(0.40 0.005 222)", marginLeft: 3 }}>{unit}</span>}
            </p>
            <p className="text-[10px] text-[--muted-foreground]">{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Chart */}
      <motion.div className="card p-5 md:p-6"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[15px] text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.02em" }}>Měsíční přehled</p>
            <p className="text-[12px] text-[--muted-foreground] mt-0.5">Příjmy · Náklady · Zisk</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-[9px]"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
            {(["Příjmy", "Zisk", "Náklady"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setMode(v)}
                className="px-3 py-1 rounded-[6px] text-[11px] font-semibold transition-all btn-tactile"
                style={{
                  background: mode === v ? VIEW_CONFIG[v].color.replace(")", " / 0.15)") : "transparent",
                  color: mode === v ? VIEW_CONFIG[v].color : "oklch(0.42 0.005 222)",
                  border: mode === v ? `1px solid ${VIEW_CONFIG[v].color.replace(")", " / 0.3)")}` : "1px solid transparent",
                }}>
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
            <motion.div key={m.mesic} className="card p-4 cursor-pointer"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.35, delay: 0.12 + idx * 0.06 }}
              onClick={() => setSelectedMesic(m)}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[15px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                  {m.mesic}
                </p>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[3px]"
                  style={m.status === "UZAVŘENO"
                    ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                    : { color: ACCENT, background: `${ACCENT.replace(")", " / 0.12)")}`, border: `1px solid ${ACCENT.replace(")", " / 0.2)")}` }}>
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
                  <span className="text-[12px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: ACCENT }}>{marze}%</span>
                </div>
                <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: ACCENT }}
                    initial={{ width: 0 }} animate={{ width: `${marze}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + idx * 0.07, ease: [0.23, 1, 0.32, 1] }} />
                </div>
                <p className="text-[10px] mt-2 text-center" style={{ color: "oklch(0.38 0.005 222)" }}>Klikni pro detail</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* YTD summary */}
      <motion.div className="card p-5"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.25 }}>
        <p className="text-[14px] font-bold text-[--foreground] mb-4"
          style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>
          YTD Souhrn · Leden–Duben 2026
        </p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Celkové příjmy",  value: YTD_PRIJMY,  pct: 100,                                            color: "oklch(0.62 0.27 265)" },
            { label: "Celkové náklady", value: YTD_NAKLADY, pct: Math.round(YTD_NAKLADY / YTD_PRIJMY * 100),    color: "oklch(0.74 0.18 45)" },
            { label: "Celkový zisk",    value: YTD_ZISK,    pct: Math.round(YTD_ZISK    / YTD_PRIJMY * 100),    color: "oklch(0.67 0.155 155)" },
          ].map(({ label, value, pct, color }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[--muted-foreground] mb-2">{label}</p>
              <p className="text-[20px] md:text-[26px] font-bold leading-none mb-2"
                style={{ fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.03em" }}>
                {value.toLocaleString("cs-CZ")}
                <span className="text-[13px] font-normal ml-1" style={{ color: "oklch(0.40 0.005 222)" }}>Kč</span>
              </p>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.07)" }}>
                <motion.div className="h-full rounded-full" style={{ background: color }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.3, ease: [0.23, 1, 0.32, 1] }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "oklch(0.40 0.005 222)" }}>{pct}% z příjmů</p>
            </div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedMesic && <BreakdownModal mesic={selectedMesic} onClose={() => setSelectedMesic(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────────── */
type Tab = "finance" | "klient";

export default function ReportyPage() {
  const [tab, setTab] = useState<Tab>("finance");

  return (
    <div
      className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{
        background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.72 0.14 195 / 0.04) 0%, transparent 70%), var(--background)`,
      }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}>
          Reporty
        </h1>
        <p className="text-[12px] md:text-[13px] text-[--muted-foreground] mt-1.5">
          OnVision s.r.o. · Finance & klientské reporty 2026
        </p>
      </motion.div>

      {/* Tab bar */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}
        className="flex items-center gap-1 p-1 rounded-[10px] w-fit"
        style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
        {([
          { id: "finance", label: "Finance", icon: BarChart2 },
          { id: "klient",  label: "Klientské reporty", icon: Sparkles },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-semibold transition-all"
            style={{
              background: tab === id
                ? id === "klient" ? "oklch(0.62 0.27 265 / 0.15)" : "oklch(1 0 0 / 0.08)"
                : "transparent",
              color: tab === id
                ? id === "klient" ? "oklch(0.72 0.27 265)" : "var(--foreground)"
                : "oklch(0.42 0.005 222)",
              border: tab === id
                ? id === "klient" ? "1px solid oklch(0.62 0.27 265 / 0.3)" : "1px solid oklch(1 0 0 / 0.12)"
                : "1px solid transparent",
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "klient" && (
              <span className="text-[8px] font-bold uppercase tracking-[0.05em] px-1 py-0.5 rounded-[3px]"
                style={{ background: "oklch(0.62 0.27 265 / 0.15)", color: "oklch(0.65 0.18 265)" }}>
                AI
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "finance" ? (
          <motion.div key="finance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <FinanceTab />
          </motion.div>
        ) : (
          <motion.div key="klient" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <ClientReportingPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:shadow-none { position: fixed; top: 0; left: 0; width: 100%; padding: 32px; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
