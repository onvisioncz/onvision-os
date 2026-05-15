"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Deliverable {
  id: number;
  text: string;
  done: boolean;
  category: string;
}
interface RetainerClient {
  id: number;
  name: string;
  logo: string;
  color: string;
  pausal: number;
  aktivni: boolean;
  deliverables: Deliverable[];
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
interface Deal {
  id: number;
  klient: string;
  faze: string;
  hodnota: number;
  pravdepodobnost: number;
}
interface Approval {
  id: number;
  typ: string;
  klient: string;
  popis: string;
  castka?: number;
  status: "Čeká" | "Schváleno" | "Zamítnuto";
  datum: string;
}
interface MonthSummary {
  mesic: string;
  prijemCelkovy: number;
  vydaje: number;
  prijemCisty: number;
  stav: string;
}
interface Oneoff {
  id: number;
  title: string;
  klient: string;
  column: string;
  castka: number;
  typ: string;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return n.toLocaleString("cs-CZ") + " Kč";
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + " M";
  if (n >= 1_000) return Math.round(n / 1_000) + " k";
  return String(n);
}

/** Parse "15. 5." or "15. 5. 2026" → Date. Returns null on failure. */
function parseDeadline(str: string): Date | null {
  const m = str.match(/(\d+)\.\s*(\d+)\.?(?:\s*(\d{4}))?/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const month = parseInt(m[2]) - 1;
  const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/** Calendar days from today (negative = overdue). */
function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

const MONTH_SHORT: Record<string, string> = {
  Leden: "Led",
  Únor: "Úno",
  Březen: "Bře",
  Duben: "Dub",
  Květen: "Kvě",
  Červen: "Čer",
  Červenec: "Čec",
  Srpen: "Srp",
  Září: "Zář",
  Říjen: "Říj",
  Listopad: "Lis",
  Prosinec: "Pro",
};

/* ── Animation presets ─────────────────────────────────────────────────────── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: "easeOut" as const } },
};

/* ── Shared card style ─────────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: "oklch(1 0 0 / 0.035)",
  border: "1px solid oklch(1 0 0 / 0.08)",
  borderRadius: 12,
};

/* ── Recharts custom tooltip ───────────────────────────────────────────────── */
function FinanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; color: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        ...cardStyle,
        padding: "10px 14px",
        minWidth: 160,
        fontFamily: "var(--font-jakarta)",
        fontSize: 12,
      }}
    >
      <p style={{ color: "oklch(0.45 0.005 222)", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </p>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 2 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "oklch(0.55 0.005 222)" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color,
                display: "inline-block",
              }}
            />
            {p.dataKey === "prijemCelkovy" ? "Příjmy" : "Výdaje"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-outfit)",
              fontWeight: 700,
              color: "oklch(0.92 0.005 222)",
            }}
          >
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Priority badge ────────────────────────────────────────────────────────── */
function PriorityBadge({ p }: { p: Task["priorita"] }) {
  const map: Record<Task["priorita"], { bg: string; text: string; label: string }> = {
    Urgentní: {
      bg: "oklch(0.74 0.18 45 / 0.15)",
      text: "oklch(0.82 0.18 45)",
      label: "Urgentní",
    },
    Vysoká: {
      bg: "oklch(0.62 0.27 265 / 0.15)",
      text: "oklch(0.75 0.2 265)",
      label: "Vysoká",
    },
    Střední: {
      bg: "oklch(1 0 0 / 0.06)",
      text: "oklch(0.50 0.005 222)",
      label: "Střední",
    },
    Nízká: {
      bg: "oklch(1 0 0 / 0.04)",
      text: "oklch(0.40 0.005 222)",
      label: "Nízká",
    },
  };
  const s = map[p];
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 5,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-jakarta)",
      }}
    >
      {s.label}
    </span>
  );
}

/* ── Approval typ badge ────────────────────────────────────────────────────── */
function TypBadge({ typ }: { typ: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Faktura: { bg: "oklch(0.62 0.27 265 / 0.14)", text: "oklch(0.75 0.2 265)" },
    Kreativa: { bg: "oklch(0.68 0.18 275 / 0.14)", text: "oklch(0.78 0.16 275)" },
    Nabídka: { bg: "oklch(0.67 0.155 155 / 0.14)", text: "oklch(0.72 0.14 155)" },
    Smlouva: { bg: "oklch(0.74 0.18 45 / 0.14)", text: "oklch(0.82 0.18 45)" },
  };
  const s = colors[typ] ?? { bg: "oklch(1 0 0 / 0.06)", text: "oklch(0.50 0.005 222)" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 5,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-jakarta)",
      }}
    >
      {typ}
    </span>
  );
}

/* ── Avatar circle ─────────────────────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase();
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: `oklch(0.55 0.20 ${hue})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        fontFamily: "var(--font-outfit)",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

/* ── Deadline pill ──────────────────────────────────────────────────────────── */
function DeadlinePill({ deadline }: { deadline: string }) {
  const d = parseDeadline(deadline);

  let color: string, bg: string, border: string, label: string, sublabel: string | null = null;
  let urgent = false; // triggers red pulse

  if (!d) {
    color = "oklch(0.50 0.005 222)"; bg = "oklch(1 0 0 / 0.05)"; border = "oklch(1 0 0 / 0.10)";
    label = deadline;
  } else {
    const days = daysUntil(d);
    if (days < 0) {
      urgent = true;
      color = "oklch(0.72 0.22 25)"; bg = "oklch(0.55 0.22 25 / 0.20)"; border = "oklch(0.65 0.22 25 / 0.50)";
      label = deadline; sublabel = `${Math.abs(days)}d po splatnosti`;
    } else if (days === 0) {
      urgent = true;
      color = "oklch(0.72 0.22 25)"; bg = "oklch(0.55 0.22 25 / 0.20)"; border = "oklch(0.65 0.22 25 / 0.50)";
      label = deadline; sublabel = "Dnes!";
    } else if (days === 1) {
      urgent = true;
      color = "oklch(0.82 0.16 45)"; bg = "oklch(0.74 0.18 45 / 0.18)"; border = "oklch(0.74 0.18 45 / 0.45)";
      label = deadline; sublabel = "Zítra";
    } else if (days <= 3) {
      color = "oklch(0.84 0.14 75)"; bg = "oklch(0.80 0.14 75 / 0.11)"; border = "oklch(0.80 0.14 75 / 0.28)";
      label = deadline; sublabel = `za ${days} dny`;
    } else if (days <= 7) {
      color = "oklch(0.70 0.08 222)"; bg = "oklch(0.62 0.27 265 / 0.09)"; border = "oklch(0.62 0.27 265 / 0.20)";
      label = deadline; sublabel = `za ${days} dní`;
    } else {
      color = "oklch(0.55 0.005 222)"; bg = "oklch(1 0 0 / 0.05)"; border = "oklch(1 0 0 / 0.12)";
      label = deadline; sublabel = null;
    }
  }

  const pillStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.01em",
    padding: "3px 8px",
    borderRadius: 6,
    color,
    background: bg,
    border: `1px solid ${border}`,
    whiteSpace: "nowrap",
    fontFamily: "var(--font-outfit)",
    display: "inline-block",
  };

  const d2 = d ? daysUntil(d) : 99;
  const redGlow = ["0 0 0px 0px rgba(220,60,40,0)", "0 0 10px 3px rgba(220,60,40,0.55)", "0 0 0px 0px rgba(220,60,40,0)"];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 2 }}>
      {urgent ? (
        <motion.span
          style={pillStyle}
          animate={{ boxShadow: d2 <= 1 ? redGlow : "0 0 0px 0px rgba(220,60,40,0)" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.span>
      ) : (
        <span style={pillStyle}>{label}</span>
      )}
      {sublabel && (
        <span style={{ fontSize: 9, color, opacity: 0.8, fontFamily: "var(--font-jakarta)", whiteSpace: "nowrap", letterSpacing: "0.02em", fontWeight: 600 }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

/* ── Faze pipeline order ────────────────────────────────────────────────────── */
const FAZE_ORDER = ["Lead", "Kvalifikace", "Nabídka", "Jednání", "Realizace"];

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  /* ── Data ── */
  const [clients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", () => []);
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [deals] = useSupabaseData<Deal[]>("ov-pipeline-deals", () => []);
  const [approvals] = useSupabaseData<Approval[]>("ov-schvaleni-items", () => []);
  // Read-only fetch — dashboard never seeds finance data (to avoid overwriting real data with [])
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  useEffect(() => {
    fetch("/api/sync?key=ov-finance-summaries")
      .then((r) => r.json())
      .then(({ value }) => { if (Array.isArray(value)) setSummaries(value); })
      .catch(() => {});
  }, []);
  const [oneoffs] = useSupabaseData<Oneoff[]>("ov-oneoffs-projects", () => []);

  /* ── Greeting (client-only to avoid SSR mismatch) ── */
  const [greeting, setGreeting] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Dobré ráno");
    else if (h < 18) setGreeting("Dobrý den");
    else setGreeting("Dobrý večer");

    const now = new Date();
    const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    const months = [
      "ledna","února","března","dubna","května","června",
      "července","srpna","září","října","listopadu","prosince",
    ];
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    setTodayLabel(`${day}, ${date}. ${month} ${year}`);
  }, []);

  /* ── KPI: MRR ── */
  const activeClients = useMemo(() => clients.filter((c) => c.aktivni), [clients]);
  const mrr = useMemo(
    () => activeClients.reduce((s, c) => s + c.pausal, 0),
    [activeClients]
  );

  /* ── KPI: Deliverable completion ── */
  const { delivDone, delivTotal } = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const c of activeClients) {
      for (const d of c.deliverables) {
        total++;
        if (d.done) done++;
      }
    }
    return { delivDone: done, delivTotal: total };
  }, [activeClients]);
  const delivPct = delivTotal > 0 ? Math.round((delivDone / delivTotal) * 100) : 0;

  /* ── KPI: Tasks ── */
  const urgentTasks = useMemo(
    () => tasks.filter((t) => t.priorita === "Urgentní" && t.status !== "Hotovo"),
    [tasks]
  );
  const probihaTasks = useMemo(
    () => tasks.filter((t) => t.status === "Probíhá").length,
    [tasks]
  );
  const reviewTasks = useMemo(
    () => tasks.filter((t) => t.status === "Review").length,
    [tasks]
  );

  /* ── KPI: Approvals ── */
  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === "Čeká"),
    [approvals]
  );
  const pendingSum = useMemo(
    () => pendingApprovals.reduce((s, a) => s + (a.castka ?? 0), 0),
    [pendingApprovals]
  );

  /* ── Finance chart data (last 6 with data) ── */
  const chartData = useMemo(() => {
    const filtered = summaries.filter((s) => s.prijemCelkovy > 0).slice(-6);
    return filtered.map((s) => ({
      ...s,
      m: MONTH_SHORT[s.mesic] ?? s.mesic,
    }));
  }, [summaries]);

  /* ── Finance YTD stats ── */
  const ytd = useMemo(() => {
    const prijmy = summaries.reduce((s, m) => s + m.prijemCelkovy, 0);
    const vydaje = summaries.reduce((s, m) => s + m.vydaje, 0);
    const cisty = summaries.reduce((s, m) => s + m.prijemCisty, 0);
    return { prijmy, vydaje, cisty };
  }, [summaries]);

  /* ── Top tasks for right column — sorted by nearest deadline, then priority ── */
  const topTasks = useMemo(() => {
    const priorityOrder: Record<Task["priorita"], number> = {
      Urgentní: 0,
      Vysoká: 1,
      Střední: 2,
      Nízká: 3,
    };
    return tasks
      .filter((t) => t.status !== "Hotovo")
      .sort((a, b) => {
        const da = parseDeadline(a.deadline);
        const db = parseDeadline(b.deadline);
        const daysA = da ? daysUntil(da) : 9999;
        const daysB = db ? daysUntil(db) : 9999;
        if (daysA !== daysB) return daysA - daysB;
        return priorityOrder[a.priorita] - priorityOrder[b.priorita];
      })
      .slice(0, 7);
  }, [tasks]);

  /* ── Active clients (max 5) ── */
  const displayClients = useMemo(() => activeClients.slice(0, 5), [activeClients]);

  /* ── Pipeline grouped ── */
  const pipelineByFaze = useMemo(() => {
    const active = deals.filter((d) => d.faze !== "Dokončeno");
    const map = new Map<string, { count: number; sum: number }>();
    for (const d of active) {
      const cur = map.get(d.faze) ?? { count: 0, sum: 0 };
      map.set(d.faze, { count: cur.count + 1, sum: cur.sum + d.hodnota });
    }
    return FAZE_ORDER.filter((f) => map.has(f)).map((f) => ({
      faze: f,
      count: map.get(f)!.count,
      sum: map.get(f)!.sum,
    }));
  }, [deals]);

  const pipelineWeighted = useMemo(
    () =>
      deals
        .filter((d) => d.faze !== "Dokončeno")
        .reduce((s, d) => s + d.hodnota * (d.pravdepodobnost / 100), 0),
    [deals]
  );

  const topDeals = useMemo(
    () =>
      deals
        .filter((d) => d.faze !== "Dokončeno")
        .sort((a, b) => b.hodnota - a.hodnota)
        .slice(0, 3),
    [deals]
  );

  /* suppress unused warning for pipeline/approvals (still used in KPI strip) */
  void deals;
  void oneoffs;

  /* ── Projekty: group active tasks by projekt ── */
  const projectStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number; review: number; people: Set<string>; nearestDays: number }>();
    for (const t of tasks) {
      const proj = t.projekt || "Bez projektu";
      if (!map.has(proj)) map.set(proj, { total: 0, done: 0, review: 0, people: new Set(), nearestDays: 9999 });
      const s = map.get(proj)!;
      s.total++;
      if (t.status === "Hotovo") s.done++;
      if (t.status === "Review") s.review++;
      if (t.prirazeno) s.people.add(t.prirazeno);
      const d = parseDeadline(t.deadline);
      if (d && t.status !== "Hotovo") {
        const days = daysUntil(d);
        if (days < s.nearestDays) s.nearestDays = days;
      }
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s, people: Array.from(s.people) }))
      .filter((p) => p.total - p.done > 0)
      .sort((a, b) => a.nearestDays - b.nearestDays)
      .slice(0, 6);
  }, [tasks]);

  /* ── Tým: per-person task stats ── */
  const TEAM = ["Adam", "Honza", "Dominika"] as const;
  const teamStats = useMemo(() => {
    return TEAM.map((name) => {
      const mine = tasks.filter((t) => t.prirazeno === name && t.status !== "Hotovo");
      const urgent = mine.filter((t) => t.priorita === "Urgentní" || t.priorita === "Vysoká");
      let nearestTask: Task | null = null;
      let nearestDays = 9999;
      for (const t of mine) {
        const d = parseDeadline(t.deadline);
        if (d) { const days = daysUntil(d); if (days < nearestDays) { nearestDays = days; nearestTask = t; } }
      }
      return { name, total: mine.length, urgent: urgent.length, nearestTask, nearestDays };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  /* ── Render ── */
  return (
    <div
      style={{
        background: "oklch(0.09 0.008 222)",
        minHeight: "100vh",
        fontFamily: "var(--font-jakarta)",
      }}
      className="p-4 md:p-7"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* ── 1. Header ── */}
        <motion.div
          variants={item}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
        >
          {/* Greeting */}
          <div>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: 30,
                letterSpacing: "-0.035em",
                lineHeight: 1,
                margin: 0,
                color: "oklch(0.96 0.005 222)",
              }}
            >
              {greeting},{" "}
              <span style={{ color: "oklch(0.96 0.005 222)" }}>Adame.</span>
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "oklch(0.4 0.005 222)",
                marginTop: 7,
                fontFamily: "var(--font-sans)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {todayLabel}
            </p>
          </div>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 2 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "oklch(0.72 0.2 155)",
                boxShadow: "0 0 6px 2px oklch(0.72 0.2 155 / 0.5)",
                display: "block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "oklch(0.45 0.005 222)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Live
            </span>
          </div>
        </motion.div>

        {/* ── 2. KPI Strip ── */}
        <motion.div
          variants={item}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {/* Tile 1: MRR */}
          <div
            style={{
              ...cardStyle,
              padding: "20px 22px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "oklch(0.62 0.27 265 / 0.06)",
                borderRadius: 12,
              }}
            />
            <div style={{ position: "relative" }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.45 0.005 222)",
                  marginBottom: 8,
                }}
              >
                MRR / měsíc
              </p>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: "oklch(0.62 0.27 265)",
                  marginBottom: 6,
                }}
              >
                {mrr > 0 ? fmt(mrr) : "-- Kč"}
              </p>
              <p style={{ fontSize: 12, color: "oklch(0.50 0.005 222)" }}>
                {activeClients.length} aktivních klientů
              </p>
            </div>
          </div>

          {/* Tile 2: Deliverable completion */}
          <div
            style={{
              ...cardStyle,
              padding: "20px 22px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "oklch(0.67 0.155 155 / 0.05)",
                borderRadius: 12,
              }}
            />
            <div style={{ position: "relative" }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.45 0.005 222)",
                  marginBottom: 8,
                }}
              >
                Splněno tento měsíc
              </p>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: "oklch(0.67 0.155 155)",
                  marginBottom: 6,
                }}
              >
                {delivPct} %
              </p>
              <p style={{ fontSize: 12, color: "oklch(0.50 0.005 222)", marginBottom: 10 }}>
                {delivDone}/{delivTotal} úkolů
              </p>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: "oklch(1 0 0 / 0.07)",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: "oklch(0.67 0.155 155)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${delivPct}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Tile 3: Urgent tasks */}
          <div
            style={{
              ...cardStyle,
              padding: "20px 22px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "oklch(0.74 0.18 45 / 0.06)",
                borderRadius: 12,
              }}
            />
            <div style={{ position: "relative" }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.45 0.005 222)",
                  marginBottom: 8,
                }}
              >
                Urgentní úkoly
              </p>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: "oklch(0.74 0.18 45)",
                  marginBottom: 6,
                }}
              >
                {urgentTasks.length}
              </p>
              <p style={{ fontSize: 12, color: "oklch(0.50 0.005 222)" }}>
                {probihaTasks} probíhá · {reviewTasks} v review
              </p>
            </div>
          </div>

          {/* Tile 4: Approvals */}
          <div
            style={{
              ...cardStyle,
              padding: "20px 22px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "oklch(0.68 0.18 275 / 0.06)",
                borderRadius: 12,
              }}
            />
            <div style={{ position: "relative" }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.45 0.005 222)",
                  marginBottom: 8,
                }}
              >
                Čeká na schválení
              </p>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: "oklch(0.68 0.18 275)",
                  marginBottom: 6,
                }}
              >
                {pendingApprovals.length}
              </p>
              <p style={{ fontSize: 12, color: "oklch(0.50 0.005 222)" }}>
                {pendingSum > 0 ? fmt(pendingSum) : "0 Kč"} celkem
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── 3. Middle row (60/40) ── */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4"
        >
          {/* Left: Finance chart */}
          <div style={{ ...cardStyle, padding: "22px 22px 16px" }}>
            <p
              style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                fontSize: 15,
                color: "oklch(0.92 0.005 222)",
                marginBottom: 4,
              }}
            >
              Finance přehled
            </p>
            <p style={{ fontSize: 12, color: "oklch(0.45 0.005 222)", marginBottom: 18 }}>
              Příjmy vs. výdaje · posledních 6 měsíců
            </p>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPrijmy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.27 265)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="oklch(0.62 0.27 265)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVydaje" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.18 275)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="oklch(0.68 0.18 275)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="m"
                    tick={{
                      fill: "oklch(0.40 0.005 222)",
                      fontSize: 11,
                      fontFamily: "var(--font-jakarta)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: "oklch(0.40 0.005 222)",
                      fontSize: 11,
                      fontFamily: "var(--font-outfit)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtShort(v)}
                  />
                  <Tooltip content={<FinanceTooltip />} cursor={{ stroke: "oklch(1 0 0 / 0.05)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="prijemCelkovy"
                    name="Příjmy"
                    stroke="oklch(0.62 0.27 265)"
                    strokeWidth={2}
                    fill="url(#gPrijmy)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="vydaje"
                    name="Výdaje"
                    stroke="oklch(0.68 0.18 275)"
                    strokeWidth={2}
                    fill="url(#gVydaje)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 190,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "oklch(0.40 0.005 222)",
                  fontSize: 13,
                }}
              >
                Žádná data
              </div>
            )}

            {/* YTD stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid oklch(1 0 0 / 0.07)",
              }}
            >
              {[
                { label: "Celkem příjmy YTD", value: ytd.prijmy, color: "oklch(0.62 0.27 265)" },
                { label: "Celkem výdaje YTD", value: ytd.vydaje, color: "oklch(0.68 0.18 275)" },
                { label: "Čistý zisk YTD", value: ytd.cisty, color: "oklch(0.67 0.155 155)" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: "oklch(0.40 0.005 222)", marginBottom: 4, lineHeight: 1.4 }}>
                    {label}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-outfit)",
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: "-0.02em",
                      color,
                    }}
                  >
                    {value > 0 ? fmt(value) : "-- Kč"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tasks by deadline */}
          <div style={{ ...cardStyle, padding: "22px 20px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  fontSize: 15,
                  color: "oklch(0.92 0.005 222)",
                }}
              >
                Nejbližší deadliny
              </p>
              {topTasks.length > 0 && (
                <span style={{ fontSize: 11, color: "oklch(0.42 0.005 222)" }}>
                  {topTasks.filter(t => { const d = parseDeadline(t.deadline); return d && daysUntil(d) <= 3; }).length} blíží se
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "oklch(0.45 0.005 222)", marginBottom: 16 }}>
              Seřazeno podle termínu odevzdání
            </p>

            {topTasks.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 120,
                  color: "oklch(0.40 0.005 222)",
                  fontSize: 13,
                }}
              >
                Žádné otevřené úkoly
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 340 }}>
                {topTasks.map((t) => {
                  const d = parseDeadline(t.deadline);
                  const days = d ? daysUntil(d) : null;
                  const isUrgent = days !== null && days <= 1;
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        borderRadius: 8,
                        background: isUrgent
                          ? "oklch(0.65 0.22 25 / 0.06)"
                          : "oklch(1 0 0 / 0.025)",
                        border: `1px solid ${isUrgent ? "oklch(0.65 0.22 25 / 0.18)" : "oklch(1 0 0 / 0.06)"}`,
                      }}
                    >
                      {/* Left: task info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "oklch(0.90 0.005 222)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "var(--font-outfit)",
                            letterSpacing: "-0.01em",
                            marginBottom: 3,
                          }}
                        >
                          {t.nazev}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              color: "oklch(0.40 0.005 222)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.projekt}
                          </span>
                        </div>
                      </div>
                      {/* Right: priority + avatar + deadline */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <PriorityBadge p={t.priorita} />
                        <Avatar name={t.prirazeno} />
                        <DeadlinePill deadline={t.deadline} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── 4. Bottom row (3 columns) ── */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Column 1: Měsíční klienti */}
          <div style={{ ...cardStyle, padding: "20px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  fontSize: 14,
                  color: "oklch(0.92 0.005 222)",
                }}
              >
                Měsíční klienti
              </p>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "oklch(0.62 0.27 265 / 0.12)",
                  color: "oklch(0.75 0.2 265)",
                }}
              >
                {activeClients.length}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {displayClients.map((c) => {
                const total = c.deliverables.length;
                const done = c.deliverables.filter((d) => d.done).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const abbr = c.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div key={c.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: c.color || "oklch(0.62 0.27 265)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#fff",
                          fontFamily: "var(--font-outfit)",
                          flexShrink: 0,
                        }}
                      >
                        {abbr}
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "oklch(0.88 0.005 222)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-outfit)",
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "oklch(0.50 0.005 222)",
                          fontFamily: "var(--font-outfit)",
                          flexShrink: 0,
                        }}
                      >
                        {pct} %
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        borderRadius: 99,
                        background: "oklch(1 0 0 / 0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        style={{
                          height: "100%",
                          borderRadius: 99,
                          background: c.color || "oklch(0.62 0.27 265)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {activeClients.length > 5 && (
              <Link
                href="/projects/monthly"
                style={{
                  display: "block",
                  marginTop: 14,
                  fontSize: 12,
                  color: "oklch(0.62 0.27 265)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Zobrazit vše →
              </Link>
            )}
            {activeClients.length <= 5 && activeClients.length > 0 && (
              <Link
                href="/projects/monthly"
                style={{
                  display: "block",
                  marginTop: 14,
                  fontSize: 12,
                  color: "oklch(0.45 0.005 222)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Zobrazit vše →
              </Link>
            )}
          </div>

          {/* Column 2: Stav projektů */}
          <div style={{ ...cardStyle, padding: "20px 20px" }}>
            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                fontSize: 14,
                color: "oklch(0.92 0.005 222)",
                marginBottom: 16,
              }}
            >
              Stav projektů
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projectStats.length === 0 && (
                <p style={{ fontSize: 12, color: "oklch(0.40 0.005 222)" }}>
                  Žádné aktivní projekty
                </p>
              )}
              {projectStats.map((p) => {
                const activeTasks = p.total - p.done;
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const isUrgent = p.nearestDays <= 2;
                const isSoon = p.nearestDays <= 7;
                const barColor = isUrgent
                  ? "oklch(0.62 0.22 25)"
                  : isSoon
                  ? "oklch(0.72 0.18 55)"
                  : "oklch(0.62 0.27 265)";
                return (
                  <div key={p.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "oklch(0.88 0.005 222)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "60%",
                        }}
                      >
                        {p.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.review > 0 && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "oklch(0.72 0.18 55 / 0.15)",
                              color: "oklch(0.78 0.16 55)",
                            }}
                          >
                            {p.review} review
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "oklch(0.45 0.005 222)", fontWeight: 500 }}>
                          {activeTasks} úkolů
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div
                      style={{
                        height: 3,
                        borderRadius: 99,
                        background: "oklch(1 0 0 / 0.07)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 99,
                          background: barColor,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                    {/* People */}
                    {p.people.length > 0 && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {p.people.map((person) => (
                          <Avatar key={person} name={person} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Link
              href="/ukoly"
              style={{
                display: "block",
                marginTop: 16,
                fontSize: 12,
                color: "oklch(0.45 0.005 222)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Všechny úkoly →
            </Link>
          </div>

          {/* Column 3: Tým */}
          <div style={{ ...cardStyle, padding: "20px 20px" }}>
            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                fontSize: 14,
                color: "oklch(0.92 0.005 222)",
                marginBottom: 16,
              }}
            >
              Tým
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {teamStats.map((member) => {
                const isOverloaded = member.urgent > 0;
                return (
                  <div key={member.name} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={member.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "oklch(0.90 0.005 222)",
                            }}
                          >
                            {member.name}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            {isOverloaded && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: "oklch(0.62 0.22 25 / 0.15)",
                                  color: "oklch(0.70 0.20 25)",
                                }}
                              >
                                {member.urgent} urgent
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                color: "oklch(0.45 0.005 222)",
                                fontWeight: 500,
                              }}
                            >
                              {member.total} úkolů
                            </span>
                          </div>
                        </div>
                        {/* Nearest deadline task */}
                        {member.nearestTask && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "oklch(0.50 0.005 222)",
                              marginTop: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {member.nearestDays <= 0
                              ? "⚠ dnes — "
                              : member.nearestDays === 1
                              ? "zítra — "
                              : `za ${member.nearestDays} d — `}
                            {member.nearestTask.nazev}
                          </p>
                        )}
                        {!member.nearestTask && member.total === 0 && (
                          <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginTop: 3 }}>
                            Žádné aktivní úkoly
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Workload bar */}
                    {member.total > 0 && (
                      <div
                        style={{
                          height: 2,
                          borderRadius: 99,
                          background: "oklch(1 0 0 / 0.06)",
                          overflow: "hidden",
                          marginLeft: 34,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, (member.total / 10) * 100)}%`,
                            borderRadius: 99,
                            background: isOverloaded
                              ? "oklch(0.62 0.22 25)"
                              : "oklch(0.62 0.27 265)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
