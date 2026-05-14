"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Star, AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Circle, Film } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

/* ── Stagger config ────────────────────────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" as const } },
  },
};

/* ── Data ──────────────────────────────────────────────────────────────────── */
const revenue = [
  { m: "Led", rev: 85, exp: 42 },
  { m: "Úno", rev: 92, exp: 38 },
  { m: "Bře", rev: 78, exp: 45 },
  { m: "Dub", rev: 110, exp: 52 },
  { m: "Kvě", rev: 134, exp: 48 },
  { m: "Čer", rev: 125, exp: 55 },
];
// Produkční dny — jednorázové + měsíční klienti
// Zdroj: /growth stránka → Supabase tabulka `production_days`
const production = [
  { m: "Led", oneoff: 5,  monthly: 7  },
  { m: "Úno", oneoff: 8,  monthly: 10 },
  { m: "Bře", oneoff: 4,  monthly: 10 },
  { m: "Dub", oneoff: 9,  monthly: 13 },
  { m: "Kvě", oneoff: 11, monthly: 17 },
  { m: "Čer", oneoff: 10, monthly: 15 },
];

const todayTasks = [
  { id: 1, text: "Review střih — Novák & Sons",    type: "oneoff",  urgent: true  },
  { id: 2, text: "Obsah plán — Café Marino",        type: "monthly", urgent: false },
  { id: 3, text: "Faktura #2026-089 odeslat",       type: "finance", urgent: true  },
];
const weekTasks = [
  { id: 4, text: "Natáčecí den — FitLife",          type: "monthly", urgent: false },
  { id: 5, text: "Pre-produkce — Svatba Dvořák",    type: "oneoff",  urgent: false },
  { id: 6, text: "Schůzka — TechStart",             type: "monthly", urgent: false },
];
const monthTasks = [
  { id: 7, text: "Letní kampaň — 3 klienti",        type: "monthly", urgent: false },
  { id: 8, text: "Čtvrtletní report Q2",             type: "finance", urgent: false },
];

const starred = [
  { id: 1, name: "FitLife Studio",  type: "monthly", status: "Aktivní",       pct: 65 },
  { id: 2, name: "Svatba Dvořák",   type: "oneoff",  status: "Post-produkce", pct: 80 },
  { id: 3, name: "TechStart Brand", type: "oneoff",  status: "Shooting",      pct: 40 },
];
const overdue = [
  { client: "Novák & Sons", amount: "24 500 Kč", days: 5  },
  { client: "RetailCZ",     amount: "18 000 Kč", days: 12 },
];
const metrics = [
  { label: "Tržby / červen",   value: "125 000",  unit: "Kč",   delta: "+7,2%",    up: true  },
  { label: "Náklady / červen", value: "55 000",   unit: "Kč",   delta: "+14,5%",   up: false },
  { label: "Zisk / červen",    value: "70 000",   unit: "Kč",   delta: "+3,1%",    up: true  },
  { label: "Aktiv. projekty",  value: "8",        unit: "",     delta: "3 deadlines", up: false },
  { label: "Produkce / měsíc", value: "25",       unit: "vid.", delta: "+39% YoY", up: true  },
];

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function Tag({ type }: { type: string }) {
  if (type === "monthly") return <span className="tag-blue">Měsíční</span>;
  if (type === "oneoff")  return <span className="tag-purple">Jednorázový</span>;
  return <span className="tag-neutral">Finance</span>;
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; color: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3.5 py-2.5 text-[12px] shadow-xl" style={{ minWidth: 148 }}>
      <p className="text-[--muted-foreground] mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            <span className="text-[--muted-foreground]">{p.dataKey === "rev" ? "Tržby" : "Náklady"}</span>
          </span>
          <span className="num text-[--foreground]">{p.value}k Kč</span>
        </div>
      ))}
    </div>
  );
}

/* ── Spotlight Card ────────────────────────────────────────────────────────── */
function SpotlightCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    ref.current?.style.setProperty("--mouse-x", `${x}%`);
    ref.current?.style.setProperty("--mouse-y", `${y}%`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={`card card-spotlight ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ── Task row ──────────────────────────────────────────────────────────────── */
function TaskRow({ text, type, urgent }: { text: string; type: string; urgent: boolean }) {
  return (
    <motion.div
      className="group flex items-center gap-2.5 py-2.5 border-b last:border-0"
      style={{ borderColor: "var(--border)" }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.button
        className="shrink-0 text-[--muted-foreground] btn-tactile"
        whileHover={{ color: "oklch(0.81 0.155 200)" }}
        transition={{ duration: 0.12 }}
      >
        <Circle className="w-[13px] h-[13px]" />
      </motion.button>
      <span className="flex-1 text-[13px] text-[--foreground] leading-snug truncate">{text}</span>
      {urgent ? <span className="tag-amber shrink-0">Urgentní</span> : <Tag type={type} />}
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div
      className="p-7 space-y-5 min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse 60% 40% at 100% 0%,
            oklch(0.81 0.155 200 / 0.04) 0%,
            transparent 70%
          ),
          var(--background)
        `,
      }}
    >

      {/* Header */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <div>
          <h1
            className="text-[28px] leading-none text-[--foreground]"
            style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            Dashboard
          </h1>
          <p className="text-[13px] text-[--muted-foreground] mt-1.5">
            OnVision s.r.o. · červen 2026
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{
            background: "oklch(0.67 0.155 155 / 0.08)",
            border: "1px solid oklch(0.67 0.155 155 / 0.2)",
            color: "oklch(0.67 0.155 155)",
          }}
        >
          <span className="pulse w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
          Online
        </div>
      </motion.div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-3 px-4 py-3 rounded-[10px] text-[13px]"
          style={{
            background: "oklch(0.74 0.165 75 / 0.06)",
            border: "1px solid oklch(0.74 0.165 75 / 0.2)",
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.74 0.165 75)" }} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold" style={{ color: "oklch(0.8 0.155 75)" }}>
              {overdue.length} faktury po splatnosti:{" "}
            </span>
            <span className="text-[--muted-foreground]">
              {overdue.map(o => `${o.client} (${o.days}d, ${o.amount})`).join("  ·  ")}
            </span>
          </div>
          <motion.button
            className="shrink-0 flex items-center gap-1 font-medium btn-tactile"
            style={{ color: "oklch(0.8 0.155 75)" }}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.12 }}
          >
            Detail <ArrowUpRight className="w-3 h-3" />
          </motion.button>
        </motion.div>
      )}

      {/* ── Metric strip — big Outfit numbers ── */}
      <motion.div
        className="card grid grid-cols-5 divide-x divide-white/[0.06]"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {metrics.map(({ label, value, unit, delta, up }) => (
          <motion.div key={label} variants={stagger.item} className="px-5 py-5">
            <p className="text-[11px] text-[--muted-foreground] font-medium mb-2.5 uppercase tracking-[0.06em]">
              {label}
            </p>
            <p
              className="num leading-none mb-2"
              style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em", color: "var(--foreground)" }}
            >
              {value}
              {unit && (
                <span
                  style={{ fontSize: "15px", fontWeight: 400, color: "oklch(0.45 0.005 222)", marginLeft: "4px", fontFamily: "var(--font-jakarta)" }}
                >
                  {unit}
                </span>
              )}
            </p>
            <p
              className="text-[11px] font-medium"
              style={up ? { color: "var(--success)" } : { color: "oklch(0.45 0.005 222)" }}
            >
              {delta}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bento grid — asymmetric 2.2fr 1fr ─────────────────────────────── */}
      <motion.div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr)" }}
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {/* Revenue chart */}
        <motion.div variants={stagger.item}>
          <SpotlightCard className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p
                  className="text-[15px] text-[--foreground] tracking-tight"
                  style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  Tržby vs. Náklady
                </p>
                <p className="text-[12px] text-[--muted-foreground] mt-0.5">
                  Posledních 6 měsíců · tis. Kč
                </p>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[--muted-foreground]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] rounded" style={{ background: "oklch(0.81 0.155 200)" }} />
                  Tržby
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] rounded" style={{ background: "oklch(0.64 0.21 290)" }} />
                  Náklady
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenue} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="oklch(0.81 0.155 200)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="oklch(0.81 0.155 200)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="oklch(0.64 0.21 290)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="oklch(0.64 0.21 290)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="m"
                  tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11, fontFamily: "var(--font-jakarta)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11, fontFamily: "var(--font-outfit)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}k`}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "oklch(1 0 0 / 0.06)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="rev" stroke="oklch(0.81 0.155 200)" strokeWidth={2}
                  fill="url(#gRev)" dot={false} />
                <Area type="monotone" dataKey="exp" stroke="oklch(0.64 0.21 290)" strokeWidth={2}
                  fill="url(#gExp)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </SpotlightCard>
        </motion.div>

        {/* Production bars */}
        <motion.div variants={stagger.item}>
          <SpotlightCard className="p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p
                  className="text-[15px] text-[--foreground] tracking-tight mb-0.5"
                  style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  Produkční dny
                </p>
                <p className="text-[12px] text-[--muted-foreground]">Dny v terénu / měsíc</p>
              </div>
              <a
                href="/growth"
                className="btn-tactile flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] transition-colors"
                style={{
                  background: "oklch(0.81 0.155 200 / 0.1)",
                  color: "oklch(0.81 0.155 200)",
                  border: "1px solid oklch(0.81 0.155 200 / 0.2)",
                }}
              >
                + Přidat den
              </a>
            </div>
            {/* Legenda */}
            <div className="flex items-center gap-4 mb-4 text-[11px] text-[--muted-foreground]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "oklch(0.81 0.155 200 / 0.85)" }} />
                Měsíční klienti
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "oklch(0.64 0.21 290 / 0.85)" }} />
                Jednorázovky
              </span>
            </div>
            <ResponsiveContainer width="100%" height={172}>
              <BarChart data={production} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="m"
                  tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11, fontFamily: "var(--font-jakarta)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11, fontFamily: "var(--font-outfit)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.03)" }}
                  contentStyle={{
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12, fontFamily: "var(--font-jakarta)",
                  }}
                  labelStyle={{ color: "oklch(0.40 0.005 222)", marginBottom: 4 }}
                />
                <Bar dataKey="monthly" name="Měsíční klienti" stackId="a"
                  fill="oklch(0.81 0.155 200 / 0.85)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="oneoff"  name="Jednorázovky"    stackId="a"
                  fill="oklch(0.64 0.21 290 / 0.85)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SpotlightCard>
        </motion.div>
      </motion.div>

      {/* ── Priority Horizon + Starred ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr)" }}>

        {/* Horizon */}
        <div className="space-y-3">
          <p className="section-label">Priority Horizon</p>
          <motion.div
            className="space-y-3"
            variants={stagger.container}
            initial="hidden"
            animate="show"
          >
            {[
              { label: "Dnes",        icon: Clock,        color: "oklch(0.81 0.155 200)", tasks: todayTasks },
              { label: "Tento týden", icon: CheckCircle2, color: "oklch(0.64 0.21 290)",  tasks: weekTasks  },
              { label: "Tento měsíc", icon: Film,         color: "oklch(0.74 0.165 75)",  tasks: monthTasks },
            ].map(({ label, icon: Icon, color, tasks }) => (
              <motion.div key={label} variants={stagger.item}>
                <SpotlightCard
                  className="px-5 py-4"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span
                      className="ml-auto num text-[11px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.40 0.005 222)" }}
                    >
                      {tasks.length}
                    </span>
                  </div>
                  {tasks.map(t => (
                    <TaskRow key={t.id} text={t.text} type={t.type} urgent={t.urgent} />
                  ))}
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Starred */}
        <div className="space-y-3">
          <p className="section-label">Oblíbené projekty</p>
          <motion.div
            className="space-y-2.5"
            variants={stagger.container}
            initial="hidden"
            animate="show"
          >
            {starred.map(p => {
              const color = p.type === "monthly"
                ? "oklch(0.81 0.155 200)"
                : "oklch(0.64 0.21 290)";
              return (
                <motion.div key={p.id} variants={stagger.item} whileHover={{ y: -1 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
                  <SpotlightCard className="px-5 py-4 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13px] text-[--foreground] leading-snug"
                          style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, letterSpacing: "-0.01em" }}
                        >
                          {p.name}
                        </p>
                        <p className="text-[11px] text-[--muted-foreground] mt-0.5">{p.status}</p>
                      </div>
                      <Star className="w-3 h-3 mt-0.5 shrink-0"
                        style={{ color: "oklch(0.74 0.165 75)", fill: "oklch(0.74 0.165 75)" }} />
                    </div>
                    <div className="flex items-center justify-between mb-2.5">
                      <Tag type={p.type} />
                      <span className="num text-[11px] text-[--muted-foreground]">{p.pct}%</span>
                    </div>
                    {/* Progress bar — 3px */}
                    <div className="h-[3px] w-full rounded-full overflow-hidden"
                      style={{ background: "oklch(1 0 0 / 0.08)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      />
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}

            <motion.div variants={stagger.item}>
              <motion.button
                className="card w-full px-5 py-3.5 text-[13px] text-[--muted-foreground]
                           transition-colors hover:text-[--foreground] btn-tactile"
                style={{ borderStyle: "dashed" }}
                whileHover={{ borderColor: "oklch(0.81 0.155 200 / 0.3)" }}
                transition={{ duration: 0.15 }}
              >
                + Přidat projekt
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
