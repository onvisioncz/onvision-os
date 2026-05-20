"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  Bell,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DashboardAIWidget } from "@/components/dashboard/ai-widget";
import { BriefingCard } from "@/components/dashboard/briefing-card";
import { PwaInstallBanner } from "@/components/pwa-install-button";
import { useInboxUnread } from "@/lib/hooks/use-inbox-unread";

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
interface IssuedInvoice {
  id: number;
  klient: string;
  castka: number;
  stav: string;
  mesicSluzby?: string;
  rokSluzby?: number;
  typ?: string;
}
interface FinanceIncome {
  id: number;
  klient?: string;
  typ?: string;
  castka?: number;
  mesic?: string;
  datumZaplaceni?: string;
  stav?: string;
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
// className to add alongside cardStyle for hover glow
const cardClass = "ov-card";

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

/* ── Czech months (nominative) ─────────────────────────────────────────────── */
const CZ_MONTHS_NOM = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];

/* ── Quick-add input style ──────────────────────────────────────────────────── */
const qaInputStyle: React.CSSProperties = {
  background: "oklch(1 0 0 / 0.06)",
  border: "1px solid oklch(1 0 0 / 0.12)",
  color: "oklch(0.88 0.005 222)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "var(--font-jakarta)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

/* ── Faze pipeline order ────────────────────────────────────────────────────── */
const FAZE_ORDER = ["Lead", "Kvalifikace", "Nabídka", "Jednání", "Realizace"];

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  /* ── Auth ── */
  const { user } = useUserRole();
  const isAdmin = user?.roles.includes("admin") ?? false;
  const { count: inboxUnread, notifs: inboxNotifs } = useInboxUnread();

  /* ── Data ── */
  const [clients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", () => []);
  const [tasks, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
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

  /* suppress unused warning for pipeline deals (computed but not rendered on dashboard) */
  void deals;

  /* ── Quick Add state ── */
  const [qaOpen, setQaOpen] = useState(false);
  const [qaSuccess, setQaSuccess] = useState<string | null>(null);

  // Úkol form
  const [qaUkolNazev, setQaUkolNazev] = useState("");
  const [qaUkolPopis, setQaUkolPopis] = useState("");
  const [qaUkolProjekt, setQaUkolProjekt] = useState("Interní");
  const [qaUkolPrirazeno, setQaUkolPrirazeno] = useState("Adam");
  const [qaUkolPriority, setQaUkolPriority] = useState<Task["priorita"]>("Střední");
  const [qaUkolStatus, setQaUkolStatus] = useState<Task["status"]>("Nové");
  const [qaUkolDeadline, setQaUkolDeadline] = useState("");

  const handleQaUkolSubmit = useCallback(async () => {
    if (!qaUkolNazev.trim()) return;
    try {
      const res = await fetch("/api/sync?key=ov-ukoly-tasks");
      const { value } = await res.json();
      const existing: Task[] = Array.isArray(value) ? value : [];
      const newTask: Task = {
        id: Date.now(),
        nazev: qaUkolNazev.trim(),
        ...(qaUkolPopis.trim() ? { popis: qaUkolPopis.trim() } : {}),
        projekt: qaUkolProjekt,
        prirazeno: qaUkolPrirazeno,
        priorita: qaUkolPriority,
        status: qaUkolStatus,
        deadline: qaUkolDeadline || "",
      };
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ov-ukoly-tasks", value: [...existing, newTask] }),
      });
      // Okamžitě aktualizuj lokální stav — deadline list se zobrazí hned
      setTasks(prev => [...prev, newTask]);
      setQaSuccess("Úkol přidán!");
      setQaUkolNazev("");
      setQaUkolPopis("");
      setQaUkolDeadline("");
      setQaUkolStatus("Nové");
      setTimeout(() => setQaSuccess(null), 2500);
    } catch {
      setQaSuccess("Chyba při ukládání.");
      setTimeout(() => setQaSuccess(null), 2500);
    }
  }, [qaUkolNazev, qaUkolPopis, qaUkolProjekt, qaUkolPrirazeno, qaUkolPriority, qaUkolStatus, qaUkolDeadline]);

  /* ── Mark deadline task as done ── */
  const markTaskDone = useCallback((id: number) => {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: "Hotovo" as Task["status"] } : t)
    );
  }, [setTasks]);

  /* ── Monthly Closing state ── */
  const [closingOpen, setClosingOpen] = useState(false);
  const [closingInvoices, setClosingInvoices] = useState<IssuedInvoice[] | null>(null);
  const [closingIncomes, setClosingIncomes] = useState<FinanceIncome[] | null>(null);
  const [closingNote, setClosingNote] = useState("");
  const [closingLoading, setClosingLoading] = useState(false);
  const [closingDone, setClosingDone] = useState(false);

  const fetchClosingData = useCallback(async () => {
    setClosingLoading(true);
    try {
      const [invRes, incRes] = await Promise.all([
        fetch("/api/sync?key=ov-issued-invoices"),
        fetch("/api/sync?key=ov-finance-incomes"),
      ]);
      const invJson = await invRes.json();
      const incJson = await incRes.json();
      setClosingInvoices(Array.isArray(invJson.value) ? invJson.value : []);
      setClosingIncomes(Array.isArray(incJson.value) ? incJson.value : []);
    } catch {
      setClosingInvoices([]);
      setClosingIncomes([]);
    } finally {
      setClosingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (closingOpen) {
      setClosingDone(false);
      fetchClosingData();
    }
  }, [closingOpen, fetchClosingData]);

  const now = new Date();
  const currentMonthName = CZ_MONTHS_NOM[now.getMonth()];
  const currentYear = now.getFullYear();

  const closingChecks = useMemo(() => {
    if (!closingInvoices || !closingIncomes) return null;

    // 1. Fakturace
    const monthlyInvoices = closingInvoices.filter(
      (inv) => inv.mesicSluzby === currentMonthName && inv.rokSluzby === currentYear && inv.typ === "Měsíční"
    );
    const totalActiveClients = activeClients.length;
    const invoicedCount = monthlyInvoices.length;
    const invoicedClients = new Set(monthlyInvoices.map((inv) => inv.klient));
    const missingClients = activeClients.filter((c) => !invoicedClients.has(c.name));
    const faktStatus = invoicedCount === 0 ? "red" : invoicedCount >= totalActiveClients ? "green" : "amber";

    // 2. Platby
    const unpaidInvoices = closingInvoices.filter((inv) => inv.stav === "Čeká na platbu");
    const platbyStatus = unpaidInvoices.length === 0 ? "green" : "red";

    // 3. Vydaje
    const monthIncomes = closingIncomes.filter((inc) => inc.mesic === currentMonthName);
    const vydajeStatus = monthIncomes.length === 0 ? "red" : monthIncomes.length <= 3 ? "amber" : "green";

    // 4. Obsah
    const obsahStatus = delivPct >= 100 ? "green" : delivPct > 50 ? "amber" : "red";

    return {
      fakt: { status: faktStatus, invoicedCount, totalActiveClients, missingClients },
      platby: { status: platbyStatus, unpaidInvoices },
      vydaje: { status: vydajeStatus, count: monthIncomes.length },
      obsah: { status: obsahStatus, pct: delivPct, done: delivDone, total: delivTotal },
    };
  }, [closingInvoices, closingIncomes, activeClients, delivPct, delivDone, delivTotal, currentMonthName, currentYear]);

  const closingCanClose = closingChecks?.fakt.status === "green" && closingChecks?.platby.status === "green";

  /* ── Jednorázovky: active projects sorted by stage ── */
  const COL_ORDER = ["poptavka","nabidka","potvrzeno","preprodukce","nataceni","postprodukce","schvaleni","dokonceno"] as const;
  const COL_META: Record<string, { label: string; color: string; bg: string }> = {
    poptavka:     { label: "Poptávka",      color: "oklch(0.70 0.18 290)",  bg: "oklch(0.64 0.21 290 / 0.12)"  },
    nabidka:      { label: "Nabídka",       color: "oklch(0.75 0.2 265)",   bg: "oklch(0.62 0.27 265 / 0.12)"  },
    potvrzeno:    { label: "Potvrzeno",     color: "oklch(0.72 0.14 155)",  bg: "oklch(0.67 0.155 155 / 0.12)" },
    preprodukce:  { label: "Pre-produkce",  color: "oklch(0.80 0.14 75)",   bg: "oklch(0.74 0.165 75 / 0.12)"  },
    nataceni:     { label: "Natáčení",      color: "oklch(0.72 0.20 25)",   bg: "oklch(0.65 0.22 25 / 0.12)"   },
    postprodukce: { label: "Post-produkce", color: "oklch(0.72 0.18 290)",  bg: "oklch(0.72 0.18 290 / 0.12)"  },
    schvaleni:    { label: "Schválení",     color: "oklch(0.82 0.16 55)",   bg: "oklch(0.74 0.165 75 / 0.12)"  },
    dokonceno:    { label: "Dokončeno",     color: "oklch(0.72 0.14 155)",  bg: "oklch(0.67 0.155 155 / 0.12)" },
  };
  const activeOneoffs = useMemo(() => {
    return oneoffs
      .filter((o) => o.column !== "dokonceno")
      .sort((a, b) => COL_ORDER.indexOf(b.column as typeof COL_ORDER[number]) - COL_ORDER.indexOf(a.column as typeof COL_ORDER[number]))
      .slice(0, 6);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oneoffs]);

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
        {/* ── PWA install banner ── */}
        <PwaInstallBanner />

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

          {/* Right side: stacked on mobile (notification above buttons), row on desktop */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>

            {/* Row 1: Notification widget */}
            <Link href="/inbox">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.12 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 11px",
                  borderRadius: 10,
                  border: `1px solid ${inboxUnread > 0 ? "oklch(0.65 0.22 25 / 0.35)" : "oklch(1 0 0 / 0.08)"}`,
                  background: inboxUnread > 0 ? "oklch(0.65 0.22 25 / 0.08)" : "oklch(1 0 0 / 0.04)",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Bell style={{ width: 15, height: 15, color: inboxUnread > 0 ? "oklch(0.65 0.22 25)" : "oklch(0.38 0.005 222)" }} />
                  {inboxUnread > 0 && (
                    <motion.span
                      key={inboxUnread}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: "absolute", top: -5, right: -6,
                        minWidth: 16, height: 16, borderRadius: 99,
                        background: "oklch(0.65 0.22 25)", color: "#fff",
                        fontSize: 9, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 3px",
                        border: "1.5px solid oklch(0.09 0.008 222)",
                        fontFamily: "var(--font-jakarta)",
                        boxShadow: "0 0 8px oklch(0.65 0.22 25 / 0.6)",
                      }}
                    >
                      {inboxUnread > 9 ? "9+" : inboxUnread}
                    </motion.span>
                  )}
                </div>
                {inboxUnread > 0 ? (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.65 0.22 25)", fontFamily: "var(--font-jakarta)", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
                      {inboxUnread} upozornění
                    </span>
                    {inboxNotifs.some(n => n.urgency === 0) && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: "oklch(0.65 0.22 25 / 0.7)", fontFamily: "var(--font-jakarta)", whiteSpace: "nowrap" }}>
                        · kritické
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: "oklch(0.35 0.005 222)", fontFamily: "var(--font-jakarta)" }}>Upozornění</span>
                )}
              </motion.div>
            </Link>

            {/* Row 2: Live indicator + action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Live indicator — hidden on mobile */}
              <div className="hidden md:flex" style={{ alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.72 0.2 155)", boxShadow: "0 0 6px 2px oklch(0.72 0.2 155 / 0.5)", display: "block", flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(0.45 0.005 222)", fontFamily: "var(--font-sans)" }}>
                  Live
                </span>
              </div>

              {/* Uzavřít měsíc button */}
              <button
                onClick={() => setClosingOpen(true)}
                style={{
                  background: "oklch(1 0 0 / 0.05)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.72 0.14 155)",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-jakarta)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Uzavřít měsíc
              </button>

              {/* Quick Add button */}
              <button
                onClick={() => setQaOpen((v) => !v)}
                style={{
                  height: 30,
                  borderRadius: 8,
                  background: qaOpen ? "oklch(1 0 0 / 0.08)" : "oklch(0.62 0.27 265)",
                  border: qaOpen ? "1px solid oklch(1 0 0 / 0.12)" : "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "0 12px 0 9px",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: "var(--font-jakarta)",
                }}
                aria-label={qaOpen ? "Zavrit panel" : "Rychle pridat"}
              >
                {qaOpen ? <X size={13} /> : (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
                {qaOpen ? "Zavřít" : "Přidat"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Add Panel ── */}
        <AnimatePresence>
          {qaOpen && (
            <motion.div
              key="qa-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                ...cardStyle,
                padding: "18px 20px 20px",
                position: "relative",
              }}
            >
              {/* Success flash */}
              <AnimatePresence>
                {qaSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 50,
                      background: "oklch(0.67 0.155 155 / 0.18)",
                      border: "1px solid oklch(0.67 0.155 155 / 0.4)",
                      color: "oklch(0.72 0.14 155)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-jakarta)",
                    }}
                  >
                    {qaSuccess}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close button */}
              <button
                onClick={() => setQaOpen(false)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "transparent",
                  border: "none",
                  color: "oklch(0.40 0.005 222)",
                  cursor: "pointer",
                  padding: 4,
                  lineHeight: 1,
                }}
                aria-label="Zavřít"
              >
                <X size={16} />
              </button>

              {/* ── Nový úkol form ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Název — full width, prominent */}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                    Název úkolu <span style={{ color: "oklch(0.62 0.22 25)" }}>*</span>
                  </label>
                  <input
                    style={{ ...qaInputStyle, fontSize: 14, fontWeight: 500, padding: "10px 14px" }}
                    placeholder="Co je potřeba udělat?"
                    value={qaUkolNazev}
                    onChange={(e) => setQaUkolNazev(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleQaUkolSubmit()}
                    autoFocus
                  />
                </div>

                {/* Row: Projekt | Přiřazeno | Priorita | Stav */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                      Projekt
                    </label>
                    <select style={qaInputStyle} value={qaUkolProjekt} onChange={(e) => setQaUkolProjekt(e.target.value)}>
                      {[
                        ...clients.map(c => c.name),
                        "Interní",
                      ].filter((v, i, a) => a.indexOf(v) === i).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                      Přiřazeno
                    </label>
                    <select style={qaInputStyle} value={qaUkolPrirazeno} onChange={(e) => setQaUkolPrirazeno(e.target.value)}>
                      {["Adam", "Zdeněk", "Matěj", "Monika", "Patrik"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                      Priorita
                    </label>
                    <select
                      style={{
                        ...qaInputStyle,
                        color: qaUkolPriority === "Urgentní" ? "oklch(0.72 0.18 25)"
                          : qaUkolPriority === "Vysoká" ? "oklch(0.78 0.15 55)"
                          : qaUkolPriority === "Střední" ? "oklch(0.75 0.2 265)"
                          : "oklch(0.55 0.005 222)",
                      }}
                      value={qaUkolPriority}
                      onChange={(e) => setQaUkolPriority(e.target.value as Task["priorita"])}
                    >
                      {(["Nízká", "Střední", "Vysoká", "Urgentní"] as Task["priorita"][]).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                      Stav
                    </label>
                    <select style={qaInputStyle} value={qaUkolStatus} onChange={(e) => setQaUkolStatus(e.target.value as Task["status"])}>
                      {(["Nové", "Probíhá", "Review", "Hotovo"] as Task["status"][]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row: Popis | Deadline + Submit */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                      Popis <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "oklch(0.32 0.005 222)" }}>— volitelné</span>
                    </label>
                    <textarea
                      style={{ ...qaInputStyle, resize: "none", height: 60, lineHeight: 1.5 }}
                      placeholder="Doplňující info, kontext, odkaz…"
                      value={qaUkolPopis}
                      onChange={(e) => setQaUkolPopis(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.40 0.005 222)", marginBottom: 6, fontFamily: "var(--font-jakarta)" }}>
                        Deadline
                      </label>
                      <input
                        type="date"
                        style={{ ...qaInputStyle, minWidth: 160 }}
                        value={qaUkolDeadline}
                        onChange={(e) => setQaUkolDeadline(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleQaUkolSubmit}
                      disabled={!qaUkolNazev.trim()}
                      style={{
                        background: qaUkolNazev.trim() ? "oklch(0.62 0.27 265)" : "oklch(0.22 0.01 265)",
                        border: "none",
                        color: qaUkolNazev.trim() ? "oklch(0.97 0.004 265)" : "oklch(0.38 0.005 222)",
                        borderRadius: 8,
                        padding: "9px 0",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--font-jakarta)",
                        cursor: qaUkolNazev.trim() ? "pointer" : "not-allowed",
                        width: "100%",
                        transition: "background 0.15s, color 0.15s",
                        letterSpacing: "0.01em",
                      }}
                    >
                      Přidat úkol
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <AnimatePresence mode="popLayout">
                  {topTasks.map((t) => {
                    const d = parseDeadline(t.deadline);
                    const days = d ? daysUntil(d) : null;
                    const isUrgent = days !== null && days <= 1;
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 8px 9px 12px",
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
                        {/* Right: priority + avatar + deadline + done */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <PriorityBadge p={t.priorita} />
                          <Avatar name={t.prirazeno} />
                          {/* Deadline + done button share a sub-flex so the ✓ aligns with the pill, not the sublabel */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <DeadlinePill deadline={t.deadline} />
                          {/* Mark done button */}
                          <button
                            onClick={() => markTaskDone(t.id)}
                            title="Označit jako hotovo"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              background: "transparent",
                              border: "1px solid oklch(1 0 0 / 0.10)",
                              color: "oklch(0.35 0.005 222)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "background 0.15s, border-color 0.15s, color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.background = "oklch(0.67 0.155 155 / 0.15)";
                              el.style.borderColor = "oklch(0.67 0.155 155 / 0.40)";
                              el.style.color = "oklch(0.72 0.2 155)";
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.background = "transparent";
                              el.style.borderColor = "oklch(1 0 0 / 0.10)";
                              el.style.color = "oklch(0.35 0.005 222)";
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6.5l2.8 2.8 5.2-5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          </div>{/* end deadline+done sub-flex */}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── 4. Bottom row (3 columns) — REMOVED, items moved to own pages ── */}
        {false && <motion.div
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

          {/* Column 2: Jednorázovky */}
          <div style={{ ...cardStyle, padding: "20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  fontSize: 14,
                  color: "oklch(0.92 0.005 222)",
                }}
              >
                Jednorázovky
              </p>
              {activeOneoffs.length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                  background: "oklch(0.67 0.155 155 / 0.12)", color: "oklch(0.72 0.14 155)",
                }}>
                  {activeOneoffs.length} aktivních
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeOneoffs.length === 0 && (
                <p style={{ fontSize: 12, color: "oklch(0.40 0.005 222)" }}>
                  Žádné aktivní projekty
                </p>
              )}
              {activeOneoffs.map((o) => {
                const meta = COL_META[o.column] ?? { label: o.column, color: "oklch(0.55 0.005 222)", bg: "oklch(1 0 0 / 0.05)" };
                return (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 11px",
                      borderRadius: 8,
                      background: "oklch(1 0 0 / 0.025)",
                      border: "1px solid oklch(1 0 0 / 0.06)",
                    }}
                  >
                    {/* Stage dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: meta.color, flexShrink: 0,
                      boxShadow: `0 0 6px 1px ${meta.color}88`,
                    }} />
                    {/* Title + client */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: 600,
                        color: "oklch(0.90 0.005 222)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em",
                        marginBottom: 2,
                      }}>
                        {o.title}
                      </p>
                      <p style={{ fontSize: 10, color: "oklch(0.42 0.005 222)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.klient}
                      </p>
                    </div>
                    {/* Right: faze badge + amount */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                        textTransform: "uppercase", padding: "2px 6px", borderRadius: 4,
                        background: meta.bg, color: meta.color,
                        whiteSpace: "nowrap",
                      }}>
                        {meta.label}
                      </span>
                      {o.castka > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, fontFamily: "var(--font-outfit)",
                          color: "oklch(0.55 0.005 222)", letterSpacing: "-0.01em",
                        }}>
                          {fmt(o.castka)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/projects/oneoffs"
              style={{
                display: "block",
                marginTop: 14,
                fontSize: 12,
                color: "oklch(0.45 0.005 222)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Všechny projekty →
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
        </motion.div>}
      </motion.div>

      {/* ── Monthly Closing Modal ── */}
      <AnimatePresence>
        {closingOpen && (
          <motion.div
            key="closing-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "oklch(0 0 0 / 0.7)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setClosingOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              style={{
                ...cardStyle,
                background: "oklch(0.12 0.008 222)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                borderRadius: 20,
                width: "100%",
                maxWidth: 520,
                padding: "28px 28px 24px",
                position: "relative",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <h2 style={{
                    fontFamily: "var(--font-outfit)",
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: "-0.03em",
                    color: "oklch(0.96 0.005 222)",
                    margin: 0,
                  }}>
                    Uzaverka — {currentMonthName}
                  </h2>
                  <p style={{ fontSize: 12, color: "oklch(0.45 0.005 222)", marginTop: 4, fontFamily: "var(--font-jakarta)" }}>
                    Zkontroluj před uzavřením měsíce
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={fetchClosingData}
                    disabled={closingLoading}
                    style={{
                      background: "transparent",
                      border: "1px solid oklch(1 0 0 / 0.10)",
                      borderRadius: 7,
                      padding: "5px 8px",
                      color: "oklch(0.50 0.005 222)",
                      cursor: closingLoading ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontFamily: "var(--font-jakarta)",
                    }}
                  >
                    <RefreshCw size={12} style={{ opacity: closingLoading ? 0.4 : 1 }} />
                    Obnovit
                  </button>
                  <button
                    onClick={() => setClosingOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "oklch(0.40 0.005 222)",
                      cursor: "pointer",
                      padding: 4,
                      lineHeight: 1,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div style={{ height: 1, background: "oklch(1 0 0 / 0.07)", margin: "16px 0" }} />

              {/* Checklist */}
              {closingDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "32px 0",
                  }}
                >
                  <CheckCircle2 size={48} color="oklch(0.72 0.14 155)" />
                  <p style={{
                    fontFamily: "var(--font-outfit)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "oklch(0.96 0.005 222)",
                    letterSpacing: "-0.02em",
                  }}>
                    Mesic uzavren
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Items */}
                  <motion.div
                    variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                    initial="hidden"
                    animate="show"
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    {/* 1. Fakturace */}
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.28 } } }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "oklch(1 0 0 / 0.03)",
                        border: "1px solid oklch(1 0 0 / 0.07)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: closingLoading ? 0 : 6 }}>
                        {closingLoading ? (
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "oklch(1 0 0 / 0.07)", flexShrink: 0 }} />
                        ) : closingChecks?.fakt.status === "green" ? (
                          <CheckCircle2 size={18} color="oklch(0.72 0.14 155)" style={{ flexShrink: 0 }} />
                        ) : closingChecks?.fakt.status === "amber" ? (
                          <AlertTriangle size={18} color="oklch(0.82 0.16 85)" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="oklch(0.65 0.22 25)" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.92 0.005 222)", fontFamily: "var(--font-outfit)", margin: 0 }}>
                            Fakturace
                          </p>
                          <p style={{ fontSize: 11, color: "oklch(0.50 0.005 222)", marginTop: 2, fontFamily: "var(--font-jakarta)" }}>
                            Vsichni klienti vyfakturovani?
                          </p>
                        </div>
                        {!closingLoading && closingChecks && (
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "var(--font-outfit)",
                            color: closingChecks.fakt.status === "green" ? "oklch(0.72 0.14 155)" : closingChecks.fakt.status === "amber" ? "oklch(0.82 0.16 85)" : "oklch(0.65 0.22 25)",
                          }}>
                            {closingChecks.fakt.invoicedCount}/{closingChecks.fakt.totalActiveClients}
                          </span>
                        )}
                      </div>
                      {!closingLoading && closingChecks && closingChecks.fakt.missingClients.length > 0 && (
                        <p style={{ fontSize: 11, color: "oklch(0.65 0.22 25)", marginTop: 6, fontFamily: "var(--font-jakarta)", paddingLeft: 28 }}>
                          Chybi: {closingChecks.fakt.missingClients.map((c) => c.name).join(", ")}
                        </p>
                      )}
                    </motion.div>

                    {/* 2. Platby */}
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.28 } } }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "oklch(1 0 0 / 0.03)",
                        border: "1px solid oklch(1 0 0 / 0.07)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: (!closingLoading && closingChecks?.platby.unpaidInvoices.length) ? 6 : 0 }}>
                        {closingLoading ? (
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "oklch(1 0 0 / 0.07)", flexShrink: 0 }} />
                        ) : closingChecks?.platby.status === "green" ? (
                          <CheckCircle2 size={18} color="oklch(0.72 0.14 155)" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="oklch(0.65 0.22 25)" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.92 0.005 222)", fontFamily: "var(--font-outfit)", margin: 0 }}>
                            Platby
                          </p>
                          <p style={{ fontSize: 11, color: "oklch(0.50 0.005 222)", marginTop: 2, fontFamily: "var(--font-jakarta)" }}>
                            Vsechny faktury zaplaceny?
                          </p>
                        </div>
                        {!closingLoading && closingChecks && (
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "var(--font-outfit)",
                            color: closingChecks.platby.status === "green" ? "oklch(0.72 0.14 155)" : "oklch(0.65 0.22 25)",
                          }}>
                            {closingChecks.platby.unpaidInvoices.length} ceka
                          </span>
                        )}
                      </div>
                      {!closingLoading && closingChecks && closingChecks.platby.unpaidInvoices.length > 0 && (
                        <div style={{ paddingLeft: 28, marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                          {closingChecks.platby.unpaidInvoices.slice(0, 3).map((inv) => (
                            <p key={inv.id} style={{ fontSize: 11, color: "oklch(0.65 0.22 25)", fontFamily: "var(--font-jakarta)" }}>
                              {inv.klient} — {inv.castka ? fmt(inv.castka) : "?"}
                            </p>
                          ))}
                        </div>
                      )}
                    </motion.div>

                    {/* 3. Vydaje */}
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.28 } } }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "oklch(1 0 0 / 0.03)",
                        border: "1px solid oklch(1 0 0 / 0.07)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {closingLoading ? (
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "oklch(1 0 0 / 0.07)", flexShrink: 0 }} />
                        ) : closingChecks?.vydaje.status === "green" ? (
                          <CheckCircle2 size={18} color="oklch(0.72 0.14 155)" style={{ flexShrink: 0 }} />
                        ) : closingChecks?.vydaje.status === "amber" ? (
                          <AlertTriangle size={18} color="oklch(0.82 0.16 85)" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="oklch(0.65 0.22 25)" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.92 0.005 222)", fontFamily: "var(--font-outfit)", margin: 0 }}>
                            Vydaje
                          </p>
                          <p style={{ fontSize: 11, color: "oklch(0.50 0.005 222)", marginTop: 2, fontFamily: "var(--font-jakarta)" }}>
                            Vydaje zadany?
                          </p>
                        </div>
                        {!closingLoading && closingChecks && (
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "var(--font-outfit)",
                            color: closingChecks.vydaje.status === "green" ? "oklch(0.72 0.14 155)" : closingChecks.vydaje.status === "amber" ? "oklch(0.82 0.16 85)" : "oklch(0.65 0.22 25)",
                          }}>
                            {closingChecks.vydaje.count} zaznamu
                          </span>
                        )}
                      </div>
                    </motion.div>

                    {/* 4. Obsah */}
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.28 } } }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "oklch(1 0 0 / 0.03)",
                        border: "1px solid oklch(1 0 0 / 0.07)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {closingChecks?.obsah.status === "green" ? (
                          <CheckCircle2 size={18} color="oklch(0.72 0.14 155)" style={{ flexShrink: 0 }} />
                        ) : closingChecks?.obsah.status === "amber" ? (
                          <AlertTriangle size={18} color="oklch(0.82 0.16 85)" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="oklch(0.65 0.22 25)" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.92 0.005 222)", fontFamily: "var(--font-outfit)", margin: 0 }}>
                            Obsah
                          </p>
                          <p style={{ fontSize: 11, color: "oklch(0.50 0.005 222)", marginTop: 2, fontFamily: "var(--font-jakarta)" }}>
                            Deliverables splneny?
                          </p>
                        </div>
                        {closingChecks && (
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "var(--font-outfit)",
                            color: closingChecks.obsah.status === "green" ? "oklch(0.72 0.14 155)" : closingChecks.obsah.status === "amber" ? "oklch(0.82 0.16 85)" : "oklch(0.65 0.22 25)",
                          }}>
                            {closingChecks.obsah.done}/{closingChecks.obsah.total} ({closingChecks.obsah.pct}%)
                          </span>
                        )}
                      </div>
                    </motion.div>

                    {/* 5. Poznamky */}
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.28 } } }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "oklch(1 0 0 / 0.03)",
                        border: "1px solid oklch(1 0 0 / 0.07)",
                      }}
                    >
                      <p style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.92 0.005 222)", fontFamily: "var(--font-outfit)", marginBottom: 10 }}>
                        Poznamky
                      </p>
                      <textarea
                        style={{
                          ...qaInputStyle,
                          resize: "vertical",
                          minHeight: 72,
                        }}
                        placeholder="Volitelné poznámky k měsíci..."
                        value={closingNote}
                        onChange={(e) => setClosingNote(e.target.value)}
                      />
                    </motion.div>
                  </motion.div>

                  {/* Footer action */}
                  <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => { setClosingDone(true); setTimeout(() => setClosingOpen(false), 1800); }}
                      disabled={!closingCanClose}
                      style={{
                        background: closingCanClose ? "oklch(0.67 0.155 155)" : "oklch(1 0 0 / 0.06)",
                        border: "none",
                        color: closingCanClose ? "#fff" : "oklch(0.40 0.005 222)",
                        borderRadius: 10,
                        padding: "10px 26px",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "var(--font-outfit)",
                        cursor: closingCanClose ? "pointer" : "not-allowed",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Uzavřít měsíc
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI widget — jen pro jednatele (Adam + Jan) */}
      {isAdmin && (
        <DashboardAIWidget
          tasks={tasks}
          deals={deals}
          approvals={approvals}
          clients={clients}
          summaries={summaries}
          todayLabel={todayLabel}
          userName={user?.displayName ?? ""}
        />
      )}
    </div>
  );
}
