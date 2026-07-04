"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Users, Receipt,
  CalendarDays, Settings, Megaphone, Clapperboard,
  Inbox, CheckSquare, BarChart2, PackageOpen, Layers2, LogOut, FileText,
  Building2, Film, Sparkles, ChevronRight, Wallet, ClipboardList, TrendingUp, LineChart, Camera, Clock, Package, MapPin, Share2, Target, Rocket,
  LayoutGrid, X, Sun, Trash2, Landmark, BellRing, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { canAccess } from "@/lib/roles";
import { ChatTrigger } from "@/components/chat/chat-overlay";
import { useChatContext } from "@/components/chat/chat-shell";
import { useTaskBadge, markTaskBadgeSeen } from "@/lib/hooks/use-task-badge";
import { useInboxUnread } from "@/lib/hooks/use-inbox-unread";

/* ── Nav structure ──────────────────────────────────────────────────────── */
const STANDALONE_TOP = [
  { label: "Můj den",   short: "Dnes",     href: "/dnes",       icon: Sun },
  { label: "Dashboard", short: "Přehled",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Gameplán",  short: "Plán",     href: "/gameplan",   icon: Rocket },
  { label: "Upozornění", short: "Upoz.",    href: "/inbox",      icon: Inbox },
  { label: "Úkoly",     short: "Úkoly",    href: "/ukoly",      icon: CheckSquare },
  { label: "Tým",       short: "Tým",      href: "/tym",        icon: Users },
  { label: "Koš",       short: "Koš",      href: "/kos",        icon: Trash2 },
];

const GROUPS = [
  {
    id: "projekty",
    label: "Projekty",
    items: [
      { label: "Měsíční klienti",  short: "Měsíční",  href: "/projects/monthly", icon: Users },
      { label: "Jednorázovky",     short: "Projekt.", href: "/projects/oneoffs", icon: FolderKanban },
      { label: "Výkazy hodin",     short: "Výkazy",   href: "/vykazy", icon: Clock },
      { label: "Zápis → úkoly",    short: "Zápis",    href: "/zapis", icon: FileText },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { label: "Finance",    short: "Finance",   href: "/finance",    icon: Receipt },
      { label: "Ziskovost",  short: "Zisk",      href: "/ziskovost",  icon: TrendingUp },
      { label: "Cashflow",   short: "Cashflow",  href: "/cashflow",   icon: LineChart },
      { label: "Cíle",       short: "Cíle",      href: "/cile",       icon: Target },
      { label: "Fakturace",  short: "Faktury",   href: "/fakturace",  icon: FileText },
      { label: "Kontrola fakturace", short: "Kontrola", href: "/fakturovat", icon: ClipboardCheck },
      { label: "Párování plateb", short: "Párování", href: "/parovani", icon: Landmark },
      { label: "Upomínky",   short: "Upomínky",  href: "/upominky",   icon: BellRing },
      { label: "Odměny",     short: "Odměny",    href: "/odmeny",     icon: Wallet },
      { label: "Investice",  short: "Investice", href: "/investice",  icon: PackageOpen },
      { label: "Klienti",    short: "Klienti",   href: "/klienti",    icon: Building2 },
    ],
  },
  {
    id: "obsah",
    label: "Obsah",
    items: [
      { label: "SMM",      short: "SMM",      href: "/smm",      icon: Layers2 },
      { label: "AI obsah", short: "AI obsah", href: "/smm-ai",   icon: Sparkles },
      { label: "SMM Studio", short: "Studio", href: "/smm-studio", icon: LayoutGrid },
      { label: "Reporty",  short: "Reporty",  href: "/reporty",  icon: BarChart2 },
      { label: "Kalendář", short: "Kalendář", href: "/calendar", icon: CalendarDays },
      { label: "Výstupy",  short: "Výstupy",  href: "/outputs",  icon: PackageOpen },
      { label: "Delivery", short: "Delivery", href: "/delivery", icon: Package },
      { label: "Klient. sdílení", short: "Sdílení", href: "/klient-share", icon: Share2 },
    ],
  },
  {
    id: "produkce",
    label: "Produkce",
    items: [
      { label: "Reklamy",         short: "Reklamy",  href: "/ads",      icon: Megaphone },
      { label: "Produkční plán",  short: "Produkce", href: "/shooting", icon: Film },
      { label: "Checklist",       short: "Checklist", href: "/checklist", icon: ClipboardCheck },
      { label: "Call sheety",     short: "Call sh.", href: "/call-sheet", icon: ClipboardList },
      { label: "Technika",        short: "Technika", href: "/technika", icon: Camera },
      { label: "Lokace",          short: "Lokace",   href: "/lokace", icon: MapPin },
      { label: "Kreativa",        short: "Kreativa", href: "/produkce", icon: Clapperboard },
    ],
  },
];

const STANDALONE_BOTTOM = [
  { label: "AI Asistent", short: "AI", href: "/ai", icon: Sparkles },
];

// Flat list for mobile nav (preserves original order)
const ALL_NAV = [
  ...STANDALONE_TOP,
  ...GROUPS.flatMap(g => g.items),
  ...STANDALONE_BOTTOM,
];

/* ── NavItem ────────────────────────────────────────────────────────────── */
function NavItem({
  label, href, icon: Icon, active, isAI = false, badge = 0,
}: {
  label: string; href: string; icon: React.ElementType; active: boolean; isAI?: boolean; badge?: number;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-[7px] rounded-[6px] text-[13px] font-medium select-none",
          active ? "text-[--primary]" : "text-[--muted-foreground] nav-item-hover"
        )}
        style={
          active ? {
            background: "oklch(0.62 0.27 265 / 0.12)",
            border: "1px solid oklch(0.62 0.27 265 / 0.18)",
          } : isAI ? {
            border: "1px solid oklch(0.62 0.27 265 / 0.14)",
            background: "oklch(0.62 0.27 265 / 0.05)",
          } : { border: "1px solid transparent" }
        }
        whileHover={!active ? { color: "oklch(0.82 0.005 222)" } : {}}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
      >
        {active && (
          <motion.span
            layoutId="nav-active-bar"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: "oklch(0.62 0.27 265)", boxShadow: "0 0 8px oklch(0.62 0.27 265 / 0.7)" }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          />
        )}
        <Icon
          className="w-[14px] h-[14px] shrink-0"
          style={{ color: active ? "oklch(0.62 0.27 265)" : isAI ? "oklch(0.55 0.15 265)" : "oklch(0.48 0.08 265)" }}
        />
        {label}
        {badge > 0 && (
          <motion.span
            key={badge}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
            style={{
              background: "#5353F6",
              color: "#fff",
              boxShadow: "0 0 8px rgba(83,83,246,0.5)",
              fontFamily: "var(--font-jakarta)",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </motion.span>
        )}
        {isAI && !active && badge === 0 && (
          <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "oklch(0.62 0.27 265 / 0.15)", color: "oklch(0.65 0.18 265)" }}>
            AI
          </span>
        )}
      </motion.div>
    </Link>
  );
}

/* ── NavGroup ───────────────────────────────────────────────────────────── */
function NavGroup({
  group, path, visibleHrefs, openGroups, toggleGroup,
}: {
  group: typeof GROUPS[0];
  path: string;
  visibleHrefs: Set<string>;
  openGroups: Set<string>;
  toggleGroup: (id: string) => void;
}) {
  const visibleItems = group.items.filter(i => visibleHrefs.has(i.href));
  if (visibleItems.length === 0) return null;

  const isOpen = openGroups.has(group.id);
  const hasActive = visibleItems.some(i => path === i.href || path.startsWith(i.href + "/"));

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => toggleGroup(group.id)}
        className="w-full flex items-center justify-between px-3 py-[5px] rounded-[6px] select-none group nav-item-hover"
        style={{ border: "1px solid transparent" }}
      >
        <span
          className="text-[10px] font-bold tracking-widest uppercase transition-colors"
          style={{ color: "oklch(0.58 0.15 265)" }}
        >
          {group.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <ChevronRight
            className="w-3 h-3"
            style={{ color: "oklch(0.58 0.15 265)" }}
          />
        </motion.div>
      </button>

      {/* Group items */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="pl-2 space-y-px pt-px">
              {visibleItems.map(item => {
                const active = path === item.href || path.startsWith(item.href + "/");
                return (
                  <NavItem key={item.href} {...item} active={active} />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Desktop sidebar ────────────────────────────────────────────────────── */
export function SidebarNav() {
  const path = usePathname();
  const { user, email, loading } = useUserRole();

  // Which groups are currently open
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // On mount: restore from localStorage, auto-open group of active page
  useEffect(() => {
    const activeGroupId = GROUPS.find(g =>
      g.items.some(i => path === i.href || path.startsWith(i.href + "/"))
    )?.id;

    try {
      const saved = JSON.parse(localStorage.getItem("ov-nav-groups") ?? "[]") as string[];
      const initial = new Set<string>(saved);
      if (activeGroupId) initial.add(activeGroupId);
      setOpenGroups(initial);
    } catch {
      setOpenGroups(activeGroupId ? new Set([activeGroupId]) : new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("ov-nav-groups", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const { toggle: toggleChat, unread: chatUnread, aiOpen, toggleAi } = useChatContext();
  const taskBadge = useTaskBadge();
  const { count: inboxUnread } = useInboxUnread();

  // Clear badge when user is on /ukoly
  useEffect(() => {
    if (path === "/ukoly") markTaskBadgeSeen();
  }, [path]);

  const displayName = user?.displayName ?? (email ? email.split("@")[0] : "—");
  const initials    = user?.initials ?? displayName.charAt(0).toUpperCase();
  const avatarColor = user?.color ?? "oklch(0.62 0.27 265)";
  const isAdmin     = user?.roles.includes("admin") ?? false;

  const visibleHrefs = new Set(
    ALL_NAV
      .filter(({ href }) => !user || canAccess(user.roles, href))
      .map(({ href }) => href)
  );

  return (
    <aside
      className="hidden md:flex flex-col w-[212px] shrink-0 h-screen sticky top-0 border-r"
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      {/* Wordmark */}
      <Link href="/dashboard" className="block">
        <div className="px-4 flex items-center gap-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 18px)", paddingBottom: "18px" }}>
          <div className="relative shrink-0" style={{ width: 36, height: 36 }}>
            <motion.div
              className="absolute"
              style={{
                inset: -3,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 50%, rgba(83,83,246,0.3) 70%, rgba(180,165,255,1) 88%, rgba(83,83,246,0.3) 95%, transparent 100%)",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), white calc(100% - 3px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), white calc(100% - 3px))",
                filter: "blur(0.5px)",
                pointerEvents: "none",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/onvision-mark.png"
              alt="OnVision"
              width={36}
              height={36}
              style={{ display: "block", borderRadius: "50%", position: "relative", zIndex: 1 }}
            />
          </div>
          <div className="flex flex-col leading-none gap-[3px]">
            <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "14px", letterSpacing: "-0.04em", color: "#ffffff", lineHeight: 1 }}>
              OnVision OS
            </span>
            <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 500, fontSize: "8.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", lineHeight: 1 }}>
              CRM Systém
            </span>
          </div>
        </div>
      </Link>

      <div className="mx-4 h-px mb-3" style={{ background: "var(--sidebar-border)" }} />

      {/* Nav */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-px">

        {/* Denně — to hlavní, co člověk otevírá každý den */}
        <p className="px-3 pt-1 pb-1 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "oklch(0.48 0.01 265)" }}>
          Denně
        </p>
        {STANDALONE_TOP
          .filter(({ href }) => visibleHrefs.has(href))
          .map(({ label, href, icon }) => (
            <NavItem key={href} label={label} href={href} icon={icon}
              active={path === href || path.startsWith(href + "/")}
              badge={href === "/ukoly" ? taskBadge : href === "/inbox" ? inboxUnread : 0} />
          ))
        }

        <div className="h-px mx-1 my-2" style={{ background: "var(--sidebar-border)" }} />
        <p className="px-3 pt-1 pb-1 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "oklch(0.48 0.01 265)" }}>
          Nástroje
        </p>

        {/* Groups */}
        <div className="space-y-1">
          {GROUPS.map(group => (
            <NavGroup
              key={group.id}
              group={group}
              path={path}
              visibleHrefs={visibleHrefs}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
            />
          ))}
        </div>

      </nav>

      {/* Bottom */}
      <div className="p-2 pb-5">
        <div className="mx-2 mb-2 h-px" style={{ background: "var(--sidebar-border)" }} />

        {/* Chat */}
        <div className="mx-1 mb-1">
          <ChatTrigger onClick={toggleChat} unread={chatUnread} />
        </div>

        {/* PWA install + push notifications */}
        <div className="mx-1 mb-1">
          <PwaInstallButton />
        </div>
        <div className="mx-1 mb-2">
          <PushSubscribeButton />
        </div>

        {isAdmin && (
          <Link href="/nastaveni">
            <motion.div
              className="flex items-center gap-2.5 px-3 py-[8px] rounded-[6px] text-[13px] font-medium text-[--muted-foreground]"
              whileHover={{ color: "oklch(0.82 0.005 222)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12 }}
            >
              <Settings className="w-[14px] h-[14px]" style={{ color: "oklch(0.35 0.005 222)" }} />
              Nastavení
            </motion.div>
          </Link>
        )}

        <div className="mt-1 flex items-center gap-2.5 px-3 py-2 rounded-[6px]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ background: avatarColor, color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)", fontWeight: 700 }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[--foreground] leading-tight truncate">{displayName}</p>
            <p className="text-[10px] text-[--muted-foreground] leading-tight truncate">{email ?? "..."}</p>
          </div>
          <motion.button
            onClick={async () => { await createClient().auth.signOut(); window.location.href = "/login"; }}
            whileTap={{ scale: 0.88 }}
            title="Odhlásit se"
            className="shrink-0 p-1 rounded-[4px] transition-colors"
            style={{ color: "oklch(0.35 0.005 222)" }}
            whileHover={{ color: "oklch(0.65 0.22 25)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <p className="mt-3 text-center"
          style={{ fontFamily: "var(--font-jakarta)", fontSize: "8px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(0.26 0.01 265)" }}>
          OnVision Kreativní Agentura
        </p>
      </div>
    </aside>
  );
}

/* ── Mobile bottom nav ──────────────────────────────────────────────────── */
export function MobileNav() {
  const path = usePathname();
  const { user } = useUserRole();
  const taskBadge = useTaskBadge();
  const { toggleAi } = useChatContext();
  const [moreOpen, setMoreOpen] = useState(false);

  // Clear badge when user is on /ukoly
  useEffect(() => {
    if (path === "/ukoly") markTaskBadgeSeen();
  }, [path]);

  // Vše ostatní (mimo 4 klíčové) seskupené do panelu „Víc"
  const moreSections = [
    { label: "Hlavní", items: [...STANDALONE_TOP, ...STANDALONE_BOTTOM] },
    ...GROUPS.map((g) => ({ label: g.label, items: g.items })),
    { label: "Systém", items: [{ short: "Nastavení", href: "/nastaveni", icon: Settings }] },
  ].map((s) => ({ label: s.label, items: s.items.filter((i) => !user || canAccess(user.roles, i.href)) }))
    .filter((s) => s.items.length > 0);

  // 4 klíčové záložky (filtrované dle oprávnění) + „Víc"
  const PRIMARY = [
    { short: "Dnes",    href: "/dnes",      icon: Sun },
    { short: "Přehled", href: "/dashboard", icon: LayoutDashboard },
    { short: "Úkoly",   href: "/ukoly",     icon: CheckSquare },
    { short: "Finance", href: "/finance",   icon: Receipt },
  ].filter(({ href }) => !user || canAccess(user.roles, href));

  const bar = [...PRIMARY, { short: "Víc", href: "__more__", icon: LayoutGrid }];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ background: "oklch(0.10 0.008 222)", borderTop: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="grid"
        style={{ gridTemplateColumns: `repeat(${bar.length}, 1fr)`, paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}>
        {bar.map(({ short, href, icon: Icon }) => {
          const isMore = href === "__more__";
          const active = isMore ? moreOpen : (path === href || path.startsWith(href + "/"));
          const badge = href === "/ukoly" ? taskBadge : 0;
          const inner = (
            <motion.div className="flex flex-col items-center gap-[5px] px-2 py-1"
              whileTap={{ scale: 0.85 }} transition={{ duration: 0.1 }}>
              <div className="relative flex items-center justify-center w-8 h-8 rounded-[8px]"
                style={active ? { background: "oklch(0.62 0.27 265 / 0.14)", border: "1px solid oklch(0.62 0.27 265 / 0.22)" } : { border: "1px solid transparent" }}>
                {active && (
                  <motion.span layoutId="mobile-nav-bg" className="absolute inset-0 rounded-[8px]"
                    style={{ background: "oklch(0.62 0.27 265 / 0.14)" }}
                    transition={{ duration: 0.18 }} />
                )}
                <Icon className="w-[15px] h-[15px] relative"
                  style={{ color: active ? "oklch(0.62 0.27 265)" : "oklch(0.42 0.005 222)" }} />
                  {/* Unread badge */}
                  {badge > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -3, right: -3,
                      minWidth: 16, height: 16,
                      borderRadius: 99,
                      background: "oklch(0.65 0.22 25)",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                      border: "1.5px solid oklch(0.10 0.008 222)",
                      fontFamily: "var(--font-jakarta)",
                      boxShadow: "0 0 8px oklch(0.65 0.22 25 / 0.5)",
                    }}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-semibold leading-none text-center whitespace-nowrap"
                  style={{ color: active ? "oklch(0.62 0.27 265)" : "oklch(0.38 0.005 222)", fontFamily: "var(--font-jakarta)", letterSpacing: "0.01em" }}>
                  {short}
                </span>
              </motion.div>
          );
          return isMore ? (
            <button key={href} onClick={() => setMoreOpen(true)} className="bg-transparent border-none p-0 flex justify-center">
              {inner}
            </button>
          ) : (
            <Link key={href} href={href} className="flex justify-center">
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Panel „Víc" — všechny sekce přehledně, žádný nekonečný swipe */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div key="more-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-40" style={{ background: "oklch(0 0 0 / 0.55)", backdropFilter: "blur(2px)" }} />
            <motion.div key="more-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 right-0 bottom-0 z-50 rounded-t-[20px] overflow-hidden"
              style={{ background: "oklch(0.12 0.012 265)", borderTop: "1px solid oklch(1 0 0 / 0.10)", maxHeight: "82vh" }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-outfit)" }}>Všechny sekce</span>
                <button onClick={() => setMoreOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.06)" }}>
                  <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <div className="overflow-y-auto px-3 pb-[max(env(safe-area-inset-bottom,0px),24px)]" style={{ maxHeight: "calc(82vh - 56px)" }}>
                {moreSections.map((sec) => (
                  <div key={sec.label} className="mb-3">
                    <p className="px-2 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>{sec.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {sec.items.map((it) => {
                        const ItIcon = it.icon;
                        const act = path === it.href || path.startsWith(it.href + "/");
                        const isAi = it.href === "/ai";
                        const content = (
                          <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-[12px]"
                            style={act
                              ? { background: "oklch(0.62 0.27 265 / 0.14)", border: "1px solid oklch(0.62 0.27 265 / 0.24)" }
                              : { background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
                            <ItIcon className="w-5 h-5" style={{ color: act ? "#5B5EFF" : "var(--muted-foreground)" }} />
                            <span className="text-[11px] font-medium text-center leading-tight" style={{ color: act ? "#F4F4F8" : "var(--muted-foreground)" }}>{it.short}</span>
                          </div>
                        );
                        return isAi ? (
                          <button key={it.href} onClick={() => { setMoreOpen(false); toggleAi(); }} className="bg-transparent border-none p-0">{content}</button>
                        ) : (
                          <Link key={it.href} href={it.href} onClick={() => setMoreOpen(false)}>{content}</Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
