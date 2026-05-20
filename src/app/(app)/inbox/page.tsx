"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CreditCard, Clock, FileCheck, AlertTriangle,
  CheckCircle2, RotateCcw, CheckCheck, RefreshCw, ArrowRight,
} from "lucide-react";

/* ── Source data types ──────────────────────────────────────────────────────── */
interface Task {
  id: number; nazev: string; projekt: string; prirazeno: string;
  priorita: string; status: string; deadline: string;
}
interface Faktura {
  id: number; cislo: string; klient: string; popis: string;
  castka: number; splatnost: string; stav: string;
}
interface SchvaleniItem {
  id: number; typ: string; klient: string; popis: string;
  castka?: number; status: string; datum: string;
}
interface IncomeItem {
  id: number; mesic: string; klient: string; typ: string;
  datumZaplaceni: string; castka: number; stav: string;
}

/* ── Generated notification type ────────────────────────────────────────────── */
type NotifType = "platba" | "deadline" | "schvaleni" | "upozorneni";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  cas: string;
  urgency: 0 | 1 | 2 | 3; // 0 = nejkritičtější
  castka?: number;
  link?: string;       // deep-link destination
  linkLabel?: string;  // button label e.g. "Přejít na fakturace"
}

/* ── Read/archived state stored in Supabase ─────────────────────────────────── */
interface InboxState { read: string[]; archived: string[]; }
const EMPTY_STATE: InboxState = { read: [], archived: [] };

/* ── Date helpers ───────────────────────────────────────────────────────────── */
function parseCzDate(str: string): Date | null {
  if (!str || str === "—") return null;
  const m = str.match(/(\d+)\.\s*(\d+)\.?\s*(\d{4})?/);
  if (!m) return null;
  const day = parseInt(m[1]), month = parseInt(m[2]) - 1;
  const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

function daysDiff(d: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

function relativeCas(days: number): string {
  if (days < 0)  return `${Math.abs(days)}d po termínu`;
  if (days === 0) return "Dnes";
  if (days === 1) return "Zítra";
  return `za ${days} dní`;
}

function pastCas(daysAgo: number): string {
  if (daysAgo === 0) return "Dnes";
  if (daysAgo === 1) return "Včera";
  if (daysAgo <= 6)  return `před ${daysAgo} dny`;
  return `před ${Math.round(daysAgo / 7)} týdny`;
}

/* ── Notification generator ─────────────────────────────────────────────────── */
function generate(
  tasks: Task[],
  faktury: Faktura[],
  schvaleni: SchvaleniItem[],
  incomes: IncomeItem[],
): Notif[] {
  const out: Notif[] = [];

  /* 1. Úkoly s blížícím se / prošlým deadlinem ─────────────────────────────── */
  tasks
    .filter(t => t.status !== "Hotovo")
    .forEach(t => {
      const d = parseCzDate(t.deadline);
      if (!d) return;
      const days = daysDiff(d);
      if (days > 7) return;

      let urgency: 0 | 1 | 2 | 3;
      let title: string, body: string;

      if (days < 0) {
        urgency = 0;
        title = `Deadline prošel · ${t.projekt}`;
        body = `${t.nazev} — byl ${Math.abs(days)}d po termínu. Přiřazeno: ${t.prirazeno}.`;
      } else if (days === 0) {
        urgency = 0;
        title = `Dnes deadline · ${t.projekt}`;
        body = `${t.nazev} — termín odevzdání je dnes! Přiřazeno: ${t.prirazeno}.`;
      } else if (days === 1) {
        urgency = 1;
        title = `Zítra deadline · ${t.projekt}`;
        body = `${t.nazev} — zbývá 1 den. Přiřazeno: ${t.prirazeno}.`;
      } else if (days <= 3) {
        urgency = 1;
        title = `Blíží se deadline · ${t.projekt}`;
        body = `${t.nazev} — zbývají ${days} dny (${t.deadline}). Přiřazeno: ${t.prirazeno}.`;
      } else {
        urgency = 2;
        title = `Deadline tento týden · ${t.projekt}`;
        body = `${t.nazev} — termín ${t.deadline}. Přiřazeno: ${t.prirazeno}.`;
      }

      out.push({ id: `task-${t.id}`, type: "deadline", title, body, cas: relativeCas(days), urgency, link: "/ukoly", linkLabel: "Otevřít úkoly" });
    });

  /* 2. Faktury po splatnosti nebo splatné do 3 dnů ───────────────────────────── */
  faktury
    .filter(f => f.stav === "Čeká na platbu" || f.stav === "Po splatnosti")
    .forEach(f => {
      const d = parseCzDate(f.splatnost);
      if (!d) return;
      const days = daysDiff(d);

      if (days < 0) {
        out.push({
          id: `faktura-overdue-${f.id}`,
          type: "upozorneni",
          title: `Faktura po splatnosti · ${f.klient}`,
          body: `${f.cislo} — ${Math.abs(days)} dní po splatnosti. ${f.popis}.`,
          cas: `${Math.abs(days)}d po splatnosti`,
          urgency: days < -7 ? 0 : 1,
          castka: f.castka,
          link: "/fakturace",
          linkLabel: "Otevřít fakturace",
        });
      } else if (days <= 3) {
        out.push({
          id: `faktura-due-${f.id}`,
          type: "upozorneni",
          title: `Splatnost ${days === 0 ? "dnes" : `za ${days} dní`} · ${f.klient}`,
          body: `${f.cislo} — splatná ${f.splatnost}.`,
          cas: relativeCas(days),
          urgency: 1,
          castka: f.castka,
          link: "/fakturace",
          linkLabel: "Otevřít fakturace",
        });
      }
    });

  /* 3. Čeká na schválení ──────────────────────────────────────────────────────── */
  schvaleni
    .filter(s => s.status === "Čeká")
    .forEach(s => {
      out.push({
        id: `schvaleni-${s.id}`,
        type: "schvaleni",
        title: `Čeká na schválení · ${s.klient}`,
        body: `${s.typ}: ${s.popis}`,
        cas: s.datum,
        urgency: 1,
        castka: s.castka,
        link: "/fakturace",
        linkLabel: "Otevřít schválení",
      });
    });

  /* 4. Nedávné platby (posledních 14 dní), seskupené po klientovi ──────────── */
  const payMap = new Map<string, { klient: string; mesic: string; total: number; latestDate: Date }>();
  incomes
    .filter(i => {
      if (i.stav !== "Zaplaceno") return false;
      const d = parseCzDate(i.datumZaplaceni);
      if (!d) return false;
      return -daysDiff(d) <= 14 && -daysDiff(d) >= 0;
    })
    .forEach(i => {
      const key = `${i.klient}__${i.mesic}`;
      const d = parseCzDate(i.datumZaplaceni)!;
      const cur = payMap.get(key);
      if (!cur || d > cur.latestDate) {
        payMap.set(key, { klient: i.klient, mesic: i.mesic, total: (cur?.total ?? 0) + i.castka, latestDate: d });
      } else {
        cur.total += i.castka;
      }
    });

  payMap.forEach((g, key) => {
    const dAgo = -daysDiff(g.latestDate);
    out.push({
      id: `payment-${key}`,
      type: "platba",
      title: `Platba přijata · ${g.klient}`,
      body: `${g.mesic} — celkem ${g.total.toLocaleString("cs-CZ")} Kč.`,
      cas: pastCas(dAgo),
      urgency: 3,
      castka: g.total,
      link: "/finance",
      linkLabel: "Přejít na finance",
    });
  });

  /* Seřadit: urgency asc, pak stabilně podle ID ──────────────────────────────── */
  return out.sort((a, b) => a.urgency - b.urgency || a.id.localeCompare(b.id));
}

/* ── Icon per type ──────────────────────────────────────────────────────────── */
const ACCENT = "oklch(0.82 0.16 85)";

function TypeIcon({ type, urgency }: { type: NotifType; urgency: number }) {
  const map: Record<NotifType, { icon: React.ElementType; color: string }> = {
    platba:     { icon: CreditCard,    color: "oklch(0.67 0.155 155)" },
    deadline:   { icon: Clock,         color: urgency === 0 ? "oklch(0.65 0.22 25)" : urgency === 1 ? "oklch(0.82 0.16 45)" : "oklch(0.82 0.16 85)" },
    schvaleni:  { icon: FileCheck,     color: "oklch(0.62 0.27 265)" },
    upozorneni: { icon: AlertTriangle, color: urgency === 0 ? "oklch(0.65 0.22 25)" : "oklch(0.74 0.18 45)" },
  };
  const { icon: Icon, color } = map[type];
  return (
    <div
      className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
      style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
/* ── Event notification (stored in DB by sync route when push fires) ──── */
interface NotifEvent {
  id: string;
  type: "task_assigned" | "output_uploaded";
  title: string;
  body: string;
  url: string;
  createdAt: string;
  targetEmail: string | null;
}

function eventToNotif(e: NotifEvent): Notif {
  return {
    id: e.id,
    type: e.type === "task_assigned" ? "deadline" : "upozorneni",
    title: e.title,
    body: e.body,
    cas: new Date(e.createdAt).toLocaleString("cs-CZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    urgency: e.type === "task_assigned" ? 1 : 2,
    link: e.url,
    linkLabel: e.type === "task_assigned" ? "Otevřít úkoly" : "Otevřít výstupy",
  };
}

export default function InboxPage() {
  const router = useRouter();

  /* Read/archived state — only this persists to Supabase */
  const [state, setState] = useSupabaseData<InboxState>("ov-inbox-state", () => EMPTY_STATE);

  /* Source data — fetched read-only, never seeded from here */
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [faktury,   setFaktury]   = useState<Faktura[]>([]);
  const [schvaleni, setSchvaleni] = useState<SchvaleniItem[]>([]);
  const [incomes,   setIncomes]   = useState<IncomeItem[]>([]);
  const [events,    setEvents]    = useState<NotifEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/sync?key=ov-ukoly-tasks").then(r => r.json()),
      fetch("/api/sync?key=ov-finance-faktury").then(r => r.json()),
      fetch("/api/sync?key=ov-schvaleni-items").then(r => r.json()),
      fetch("/api/sync?key=ov-finance-incomes").then(r => r.json()),
      fetch("/api/sync?key=ov-notif-events").then(r => r.json()),
    ]).then(([t, f, s, i, ev]) => {
      if (Array.isArray(t.value)) setTasks(t.value);
      if (Array.isArray(f.value)) setFaktury(f.value);
      if (Array.isArray(s.value)) setSchvaleni(s.value);
      if (Array.isArray(i.value)) setIncomes(i.value);
      if (Array.isArray(ev.value)) setEvents(ev.value);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [lastRefresh]);

  /* Generate notifications from live data + stored events */
  const allNotifs = useMemo(() => {
    const system = generate(tasks, faktury, schvaleni, incomes);
    // Convert stored events to Notif format; deduplicate by id
    const existingIds = new Set(system.map(n => n.id));
    const eventNotifs = events
      .map(eventToNotif)
      .filter(n => !existingIds.has(n.id))
      // Most recent events first for event section
      .reverse();
    // Events go after system alerts
    return [...system, ...eventNotifs];
  }, [tasks, faktury, schvaleni, incomes, events]);

  /* Apply read/archived state */
  const notifs = useMemo(
    () => allNotifs.map(n => ({
      ...n,
      precten:    state.read.includes(n.id),
      archivovano: state.archived.includes(n.id),
    })),
    [allNotifs, state]
  );

  const [tab, setTab] = useState<"vše" | "nepřečtené" | "archiv">("vše");

  const visible = useMemo(() => notifs.filter(n => {
    if (tab === "archiv")      return n.archivovano;
    if (tab === "nepřečtené")  return !n.precten && !n.archivovano;
    return !n.archivovano;
  }), [notifs, tab]);

  const unreadCount = notifs.filter(n => !n.precten && !n.archivovano).length;

  const markRead = (id: string) => {
    setState(prev => ({ ...prev, read: prev.read.includes(id) ? prev.read : [...prev.read, id] }));
  };

  const archive = (id: string) => {
    setState(prev => ({
      read:     prev.read.includes(id) ? prev.read : [...prev.read, id],
      archived: prev.archived.includes(id) ? prev.archived : [...prev.archived, id],
    }));
  };

  const unarchive = (id: string) => {
    setState(prev => ({
      ...prev,
      archived: prev.archived.filter(a => a !== id),
    }));
  };

  const markAllRead = () => {
    const allIds = allNotifs.map(n => n.id);
    setState(prev => ({ ...prev, read: [...new Set([...prev.read, ...allIds])] }));
  };

  const tabs = [
    { key: "vše"        as const, label: "Vše" },
    { key: "nepřečtené" as const, label: `Nepřečtené${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "archiv"     as const, label: "Archiv" },
  ];

  return (
    <div
      className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{
        background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.82 0.16 85 / 0.04) 0%, transparent 70%), var(--background)`,
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
          <div className="flex items-center gap-3">
            <h1
              className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
            >
              Upozornění
            </h1>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                style={{ background: ACCENT, color: "oklch(0.09 0.008 222)", fontFamily: "var(--font-outfit)" }}
              >
                {unreadCount}
              </motion.span>
            )}
          </div>
          <p className="text-[12px] md:text-[13px] text-[--muted-foreground] mt-1.5">
            Automatické notifikace z dat systému
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <motion.button
            onClick={() => setLastRefresh(Date.now())}
            className="btn-tactile p-2 rounded-[8px]"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.50 0.005 222)" }}
            whileHover={{ color: "oklch(0.75 0.005 222)" }}
            whileTap={{ scale: 0.93 }}
            title="Obnovit"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </motion.button>

          {unreadCount > 0 && (
            <motion.button
              onClick={markAllRead}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
              style={{ background: "oklch(0.82 0.16 85 / 0.1)", color: ACCENT, border: "1px solid oklch(0.82 0.16 85 / 0.2)" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Označit vše přečtené
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="flex items-center gap-1 p-1 rounded-[10px]"
        style={{ background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.07)", width: "fit-content" }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-[7px] text-[12px] font-semibold transition-colors"
            style={{
              color:      tab === t.key ? "var(--foreground)" : "oklch(0.42 0.005 222)",
              background: tab === t.key ? "oklch(1 0 0 / 0.07)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { color: "oklch(0.65 0.22 25)", label: "Kritické" },
          { color: "oklch(0.82 0.16 45)", label: "Vysoká priorita" },
          { color: "oklch(0.67 0.155 155)", label: "Platby" },
          { color: "oklch(0.62 0.27 265)", label: "Schválení" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px]" style={{ color: "oklch(0.42 0.005 222)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* List */}
      <motion.div
        className="card overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.12 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-[--muted-foreground]">
            <RefreshCw className="w-5 h-5 animate-spin opacity-40" />
            <span className="text-[13px]">Načítám data…</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-[--muted-foreground]"
              >
                <Bell className="w-8 h-8 mb-3 opacity-25" />
                <p className="text-[14px] font-medium">Žádné notifikace</p>
                <p className="text-[12px] mt-1 opacity-60">Vše je v pořádku 👍</p>
              </motion.div>
            ) : (
              visible.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="group relative flex items-start gap-3.5 px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.015]"
                    style={{
                      background: !notif.precten ? "oklch(0.62 0.27 265 / 0.03)" : "transparent",
                      borderBottom: idx < visible.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                    onClick={() => {
                      markRead(notif.id);
                      if (notif.link) router.push(notif.link);
                    }}
                  >
                    {/* Unread dot */}
                    {!notif.precten && (
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                        style={{
                          background: notif.urgency === 0 ? "oklch(0.65 0.22 25)" : "oklch(0.62 0.27 265)",
                          boxShadow: notif.urgency === 0
                            ? "0 0 6px oklch(0.65 0.22 25 / 0.7)"
                            : "0 0 6px oklch(0.62 0.27 265 / 0.7)",
                        }}
                      />
                    )}

                    <TypeIcon type={notif.type} urgency={notif.urgency} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-[13px] leading-snug"
                          style={{
                            fontFamily: "var(--font-outfit)",
                            fontWeight: notif.precten ? 500 : 700,
                            color: notif.precten ? "oklch(0.55 0.005 222)" : "var(--foreground)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {notif.title}
                        </p>
                        <span
                          className="text-[11px] shrink-0 whitespace-nowrap mt-0.5 font-medium"
                          style={{ color: notif.urgency === 0 ? "oklch(0.65 0.22 25)" : "oklch(0.42 0.005 222)" }}
                        >
                          {notif.cas}
                        </span>
                      </div>
                      <p className="text-[12px] text-[--muted-foreground] mt-0.5 leading-snug">
                        {notif.body}
                      </p>
                      {notif.castka !== undefined && (
                        <p
                          className="mt-1.5 text-[13px] font-bold"
                          style={{ fontFamily: "var(--font-outfit)", color: ACCENT, letterSpacing: "-0.01em" }}
                        >
                          {notif.castka.toLocaleString("cs-CZ")} Kč
                        </p>
                      )}
                      {notif.link && (
                        <span
                          className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold"
                          style={{ color: "oklch(0.62 0.27 265)", letterSpacing: "0.01em" }}
                        >
                          {notif.linkLabel ?? "Přejít"}
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {tab === "archiv" ? (
                      <motion.button
                        onClick={e => { e.stopPropagation(); unarchive(notif.id); }}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] transition-opacity btn-tactile text-[11px] font-semibold opacity-50 group-hover:opacity-100"
                        style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}
                        whileHover={{ color: "oklch(0.75 0.005 222)" }}
                        whileTap={{ scale: 0.93 }}
                        title="Obnovit"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Obnovit
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); archive(notif.id); }}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] btn-tactile text-[11px] font-semibold"
                        style={{
                          background: notif.precten ? "oklch(0.67 0.155 155 / 0.08)" : "oklch(0.62 0.27 265 / 0.08)",
                          color: notif.precten ? "oklch(0.55 0.005 222)" : "oklch(0.67 0.155 155)",
                          border: `1px solid ${notif.precten ? "oklch(1 0 0 / 0.07)" : "oklch(0.67 0.155 155 / 0.2)"}`,
                        }}
                        whileHover={{
                          background: "oklch(0.67 0.155 155 / 0.15)",
                          color: "oklch(0.67 0.155 155)",
                        }}
                        whileTap={{ scale: 0.93 }}
                        title="Označit jako vyřešené"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Vyřešit
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Footer info */}
      {!loading && allNotifs.length > 0 && (
        <p className="text-center text-[11px]" style={{ color: "oklch(0.35 0.005 222)" }}>
          {allNotifs.length} notifikací generováno z úkolů, faktur, schválení a plateb · klikni pro obnovení ↺
        </p>
      )}
    </div>
  );
}
