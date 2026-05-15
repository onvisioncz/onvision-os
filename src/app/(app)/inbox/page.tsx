"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CreditCard, Clock, FileCheck, AlertTriangle, MessageSquare,
  Archive, CheckCheck, X,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type NotifType = "platba" | "deadline" | "schvaleni" | "upozorneni" | "zprava";

interface Notif {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  cas: string;
  precten: boolean;
  archivovano: boolean;
  castka?: number;
}

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const SEED: Notif[] = [
  { id: 1,  type: "platba",     title: "Platba přijata · SENIMED s.r.o.",       body: "Uhradili fakturu FV-2026-013 za duben.",                          cas: "před 20 min",  precten: false, archivovano: false, castka: 47500 },
  { id: 2,  type: "schvaleni",  title: "Čeká na schválení · Mo.one",             body: "Monika Kudličková odevzdala úvodní pracovní zadání.",             cas: "před 1 hod",   precten: false, archivovano: false, castka: 17500 },
  { id: 3,  type: "deadline",   title: "Blíží se deadline · IMTOS REMATECH",     body: "Facelift loga — deadline 18. 5. 2026. Zbývají 3 dny.",            cas: "před 2 hod",   precten: false, archivovano: false },
  { id: 4,  type: "upozorneni", title: "Faktura po splatnosti · EFFECT Clinic",  body: "Faktura FV-2026-011 je 5 dní po splatnosti.",                     cas: "před 3 hod",   precten: false, archivovano: false, castka: 18000 },
  { id: 5,  type: "deadline",   title: "Blíží se deadline · Mo.one",             body: "Deadline 15. 5. — zbývá 1 den!",                                 cas: "dnes 9:12",    precten: true,  archivovano: false },
  { id: 6,  type: "platba",     title: "Platba přijata · FIRESTA s.r.o.",        body: "Uhradili fakturu za Dvorecký most.",                              cas: "včera 16:30",  precten: true,  archivovano: false, castka: 28000 },
  { id: 7,  type: "zprava",     title: "Komentář · SK Brno Slatina",             body: "Požadavek na úpravu grafiky FINAL 4.",                            cas: "včera 11:05",  precten: true,  archivovano: false },
  { id: 8,  type: "schvaleni",  title: "Schváleno · TEKMA promo video",          body: "Klient schválil finální verzi.",                                  cas: "předevčírem",  precten: true,  archivovano: false },
  { id: 9,  type: "platba",     title: "Platba přijata · TEKMA s.r.o.",          body: "Uhradili fakturu za promo video duben.",                          cas: "10. 5.",       precten: true,  archivovano: true,  castka: 60000 },
  { id: 10, type: "upozorneni", title: "Nadpracování · Zdeněk Dolíhal",          body: "Zdeněk nadpracoval 2 celodenní dny v dubnu.",                     cas: "8. 5.",        precten: true,  archivovano: false },
];

/* ── Icon per type ──────────────────────────────────────────────────────────── */
const ACCENT = "oklch(0.82 0.16 85)";

function TypeIcon({ type }: { type: NotifType }) {
  const map: Record<NotifType, { icon: React.ElementType; color: string }> = {
    platba:     { icon: CreditCard,   color: "oklch(0.67 0.155 155)" },
    deadline:   { icon: Clock,        color: "oklch(0.82 0.16 85)" },
    schvaleni:  { icon: FileCheck,    color: "oklch(0.81 0.155 200)" },
    upozorneni: { icon: AlertTriangle, color: "oklch(0.74 0.18 45)" },
    zprava:     { icon: MessageSquare, color: "oklch(0.45 0.005 222)" },
  };
  const { icon: Icon, color } = map[type];
  return (
    <div
      className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
      style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.2)")}` }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function InboxPage() {
  const [items, setItems] = useState<Notif[]>(SEED);
  const [tab, setTab] = useState<"vše" | "nepřečtené" | "archiv">("vše");

  const unreadCount = items.filter(i => !i.precten && !i.archivovano).length;

  const markRead = (id: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, precten: true } : i));
  };

  const archive = (id: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, archivovano: true, precten: true } : i));
  };

  const markAllRead = () => {
    setItems(prev => prev.map(i => ({ ...i, precten: true })));
  };

  const visible = items.filter(i => {
    if (tab === "archiv")      return i.archivovano;
    if (tab === "nepřečtené")  return !i.precten && !i.archivovano;
    return !i.archivovano;
  });

  const tabs: { key: "vše" | "nepřečtené" | "archiv"; label: string }[] = [
    { key: "vše",        label: "Vše" },
    { key: "nepřečtené", label: `Nepřečtené${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "archiv",     label: "Archiv" },
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
              Inbox
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
            OnVision OS · Notifikace a aktivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <motion.button
              onClick={markAllRead}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
              style={{ background: "oklch(0.82 0.16 85 / 0.1)", color: ACCENT, border: "1px solid oklch(0.82 0.16 85 / 0.2)" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Označit vše jako přečtené
            </motion.button>
          )}
          <div
            className="relative p-2 rounded-[8px]"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
          >
            <Bell className="w-4 h-4" style={{ color: "oklch(0.50 0.005 222)" }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: ACCENT }}
              />
            )}
          </div>
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
            className="relative px-4 py-1.5 rounded-[7px] text-[12px] font-semibold transition-colors"
            style={{
              color: tab === t.key ? "var(--foreground)" : "oklch(0.42 0.005 222)",
              background: tab === t.key ? "oklch(1 0 0 / 0.07)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* List */}
      <motion.div
        className="card overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.12 }}
      >
        <AnimatePresence initial={false}>
          {visible.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-[--muted-foreground]"
            >
              <Bell className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-[14px] font-medium">Žádné notifikace</p>
            </motion.div>
          )}
          {visible.map((notif, idx) => (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div
                className="group relative flex items-start gap-3.5 px-5 py-4 cursor-pointer transition-colors"
                style={{
                  background: !notif.precten ? "oklch(0.81 0.155 200 / 0.03)" : "transparent",
                  borderBottom: idx < visible.length - 1 ? "1px solid var(--border)" : "none",
                }}
                onClick={() => markRead(notif.id)}
              >
                {/* Unread dot */}
                {!notif.precten && (
                  <motion.span
                    layoutId={`dot-${notif.id}`}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "oklch(0.81 0.155 200)" }}
                  />
                )}

                <TypeIcon type={notif.type} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-[13px] leading-snug"
                      style={{
                        fontFamily: "var(--font-outfit)",
                        fontWeight: notif.precten ? 500 : 700,
                        color: notif.precten ? "oklch(0.60 0.005 222)" : "var(--foreground)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {notif.title}
                    </p>
                    <span className="text-[11px] text-[--muted-foreground] shrink-0 whitespace-nowrap mt-0.5">
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
                </div>

                {/* Archive button on hover */}
                {tab !== "archiv" && (
                  <motion.button
                    onClick={e => { e.stopPropagation(); archive(notif.id); }}
                    className="shrink-0 p-1.5 rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity btn-tactile"
                    style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.45 0.005 222)" }}
                    whileHover={{ color: ACCENT }}
                    whileTap={{ scale: 0.9 }}
                    title="Archivovat"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
