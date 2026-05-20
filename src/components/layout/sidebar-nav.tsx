"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Users, Receipt,
  CalendarDays, Settings, Megaphone, Clapperboard,
  Inbox, CheckSquare, BarChart2, PackageOpen, Layers2, LogOut, FileText,
  Building2, Film, Sparkles, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { canAccess } from "@/lib/roles";

/* ── Nav structure ──────────────────────────────────────────────────────── */
const STANDALONE_TOP = [
  { label: "Dashboard", short: "Přehled",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Inbox",     short: "Inbox",    href: "/inbox",      icon: Inbox },
  { label: "Úkoly",     short: "Úkoly",    href: "/ukoly",      icon: CheckSquare },
];

const GROUPS = [
  {
    id: "projekty",
    label: "Projekty",
    items: [
      { label: "Klienti",          short: "Klienti",  href: "/klienti",          icon: Building2 },
      { label: "Měsíční klienti",  short: "Měsíční",  href: "/projects/monthly", icon: Users },
      { label: "Jednorázovky",     short: "Projekt.", href: "/projects/oneoffs", icon: FolderKanban },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { label: "Finance",    short: "Finance",   href: "/finance",    icon: Receipt },
      { label: "Fakturace",  short: "Faktury",   href: "/fakturace",  icon: FileText },
      { label: "Investice",  short: "Investice", href: "/investice",  icon: PackageOpen },
    ],
  },
  {
    id: "obsah",
    label: "Obsah",
    items: [
      { label: "SMM",      short: "SMM",      href: "/smm",      icon: Layers2 },
      { label: "Reporty",  short: "Reporty",  href: "/reporty",  icon: BarChart2 },
      { label: "Kalendář", short: "Kalendář", href: "/calendar", icon: CalendarDays },
      { label: "Výstupy",  short: "Výstupy",  href: "/outputs",  icon: PackageOpen },
    ],
  },
  {
    id: "produkce",
    label: "Produkce",
    items: [
      { label: "Reklamy",         short: "Reklamy",  href: "/ads",      icon: Megaphone },
      { label: "Produkční plán",  short: "Produkce", href: "/shooting", icon: Film },
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
  label, href, icon: Icon, active, isAI = false,
}: {
  label: string; href: string; icon: React.ElementType; active: boolean; isAI?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-[7px] rounded-[6px] text-[13px] font-medium select-none",
          active ? "text-[--primary]" : "text-[--muted-foreground]"
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
          style={{ color: active ? "oklch(0.62 0.27 265)" : isAI ? "oklch(0.55 0.15 265)" : "oklch(0.38 0.005 222)" }}
        />
        {label}
        {isAI && !active && (
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
        className="w-full flex items-center justify-between px-3 py-[5px] rounded-[6px] select-none group"
        style={{ border: "1px solid transparent" }}
      >
        <span
          className="text-[10px] font-bold tracking-widest uppercase transition-colors"
          style={{ color: hasActive ? "oklch(0.58 0.15 265)" : "oklch(0.36 0.005 222)" }}
        >
          {group.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <ChevronRight
            className="w-3 h-3"
            style={{ color: hasActive ? "oklch(0.58 0.15 265)" : "oklch(0.30 0.005 222)" }}
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
      <div className="px-4 py-[18px] flex items-center gap-3">
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
          <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: "14px", letterSpacing: "-0.04em", color: "oklch(0.96 0.01 265)", lineHeight: 1 }}>
            OnVision
          </span>
          <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 500, fontSize: "8.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "oklch(0.35 0.01 265)", lineHeight: 1 }}>
            OS Platform
          </span>
        </div>
      </div>

      <div className="mx-4 h-px mb-3" style={{ background: "var(--sidebar-border)" }} />

      {/* Nav */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-px">

        {/* Standalone top items */}
        {STANDALONE_TOP
          .filter(({ href }) => visibleHrefs.has(href))
          .map(({ label, href, icon }) => (
            <NavItem key={href} label={label} href={href} icon={icon}
              active={path === href || path.startsWith(href + "/")} />
          ))
        }

        <div className="h-px mx-1 my-2" style={{ background: "var(--sidebar-border)" }} />

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

        <div className="h-px mx-1 my-2" style={{ background: "var(--sidebar-border)" }} />

        {/* AI Asistent */}
        {visibleHrefs.has("/ai") && (
          <NavItem label="AI Asistent" href="/ai" icon={Sparkles}
            active={path === "/ai"} isAI />
        )}
      </nav>

      {/* Bottom */}
      <div className="p-2 pb-5">
        <div className="mx-2 mb-2 h-px" style={{ background: "var(--sidebar-border)" }} />

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
          style={{ background: "oklch(1 0 0 / 0.025)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
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

  const visibleNav = ALL_NAV.filter(({ href }) => !user || canAccess(user.roles, href));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ background: "oklch(0.10 0.008 222)", borderTop: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-stretch overflow-x-auto"
        style={{ paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
        <style>{`.mobile-nav-scroll::-webkit-scrollbar{display:none}`}</style>
        {[...visibleNav, { label: "Nastavení", short: "Nastavení", href: "/nastaveni", icon: Settings }].map(({ short, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="flex-shrink-0" style={{ minWidth: 68 }}>
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
                </div>
                <span className="text-[9px] font-semibold leading-none text-center whitespace-nowrap"
                  style={{ color: active ? "oklch(0.62 0.27 265)" : "oklch(0.38 0.005 222)", fontFamily: "var(--font-jakarta)", letterSpacing: "0.01em" }}>
                  {short}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
