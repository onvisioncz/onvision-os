"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Users, Receipt,
  CalendarDays, TrendingUp, FolderLock, Settings, Megaphone, Clapperboard,
  Inbox, CheckSquare, GitMerge, ClipboardCheck, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard",       short: "Přehled",   href: "/dashboard",        icon: LayoutDashboard },
  { label: "Inbox",           short: "Inbox",     href: "/inbox",            icon: Inbox },
  { label: "Úkoly",           short: "Úkoly",     href: "/ukoly",            icon: CheckSquare },
  { label: "Jednorázovky",    short: "Projekt.",   href: "/projects/oneoffs", icon: FolderKanban },
  { label: "Měsíční klienti", short: "Klienti",    href: "/projects/monthly", icon: Users },
  { label: "Pipeline",        short: "Pipeline",  href: "/pipeline",         icon: GitMerge },
  { label: "Finance",         short: "Finance",    href: "/finance",          icon: Receipt },
  { label: "Schválení",       short: "Schválení", href: "/schvaleni",        icon: ClipboardCheck },
  { label: "Reklamy",         short: "Reklamy",    href: "/ads",              icon: Megaphone },
  { label: "Kreativa",        short: "Kreativa",   href: "/produkce",         icon: Clapperboard },
  { label: "Kalendář",        short: "Kalendář",   href: "/calendar",         icon: CalendarDays },
  { label: "Reporty",         short: "Reporty",   href: "/reporty",          icon: BarChart2 },
  { label: "Growth Hub",      short: "Growth",     href: "/growth",           icon: TrendingUp },
  { label: "Vault",           short: "Vault",      href: "/vault",            icon: FolderLock },
];

/* ── Desktop sidebar ────────────────────────────────────────────────────────── */
export function SidebarNav() {
  const path = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-[212px] shrink-0 h-screen sticky top-0 border-r"
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      {/* Wordmark */}
      <div className="px-4 py-5 flex items-center gap-2.5">
        {/* OnVision "On" circle mark */}
        <div className="shrink-0 w-7 h-7">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <circle cx="14" cy="14" r="14" fill="oklch(0.62 0.27 265)" />
            <circle cx="14" cy="14" r="14" fill="none" stroke="oklch(0.72 0.27 265)" strokeWidth="0.6" />
            {/* "O" — hollow ring */}
            <circle cx="9.8" cy="14" r="3.5" fill="none" stroke="white" strokeWidth="1.8" />
            {/* "n" — vertical stem */}
            <line x1="15.4" y1="10.6" x2="15.4" y2="17.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            {/* "n" — arch + right stem */}
            <path d="M15.4 13.8 Q15.6 10.6 18.8 10.6 Q21.8 10.6 21.8 13.8 L21.8 17.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div className="flex flex-col leading-none gap-[1px]">
          <span
            style={{
              fontFamily: "var(--font-outfit)",
              fontWeight: 800,
              fontSize: "13.5px",
              letterSpacing: "-0.04em",
              color: "oklch(0.95 0.008 265)",
              lineHeight: 1,
            }}
          >
            OnVision
          </span>
          <span
            style={{
              fontFamily: "var(--font-jakarta)",
              fontWeight: 600,
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "oklch(0.38 0.008 265)",
              lineHeight: 1,
            }}
          >
            OS
          </span>
        </div>
      </div>

      <div className="mx-4 h-px mb-4" style={{ background: "var(--sidebar-border)" }} />

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-px overflow-y-auto">
        <p className="section-label px-3 mb-2">Navigace</p>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="block">
              <motion.div
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-[8px] rounded-[6px] text-[13px] font-medium select-none",
                  active ? "text-[--primary]" : "text-[--muted-foreground]"
                )}
                style={active ? {
                  background: "oklch(0.62 0.27 265 / 0.12)",
                  border: "1px solid oklch(0.62 0.27 265 / 0.18)",
                } : { border: "1px solid transparent" }}
                whileHover={!active ? { color: "oklch(0.82 0.005 222)" } : {}}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{
                      background: "oklch(0.62 0.27 265)",
                      boxShadow: "0 0 8px oklch(0.62 0.27 265 / 0.7)",
                    }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  />
                )}
                <Icon
                  className="w-[14px] h-[14px] shrink-0"
                  style={{ color: active ? "oklch(0.62 0.27 265)" : "oklch(0.38 0.005 222)" }}
                />
                {label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 pb-5">
        <div className="mx-2 mb-2 h-px" style={{ background: "var(--sidebar-border)" }} />

        <Link href="/settings">
          <motion.div
            className="flex items-center gap-2.5 px-3 py-[8px] rounded-[6px] text-[13px] font-medium text-[--muted-foreground]"
            whileHover={{ color: "oklch(0.82 0.005 222)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
          >
            <Settings className="w-[14px] h-[14px]" style={{ color: "oklch(0.35 0.005 222)" }} />
            Nastavení
          </motion.div>
        </Link>

        {/* User */}
        <div className="mt-1 flex items-center gap-2.5 px-3 py-2 rounded-[6px]"
          style={{ background: "oklch(1 0 0 / 0.025)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{
              background: "oklch(0.62 0.27 265)",
              color: "oklch(0.97 0.004 265)",
              fontFamily: "var(--font-outfit)",
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[--foreground] leading-tight">Adam</p>
            <p className="text-[11px] text-[--muted-foreground] leading-tight">Admin</p>
          </div>
          <span
            className="pulse w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "var(--success)" }}
          />
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile bottom nav ──────────────────────────────────────────────────────── */
export function MobileNav() {
  const path = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "oklch(0.10 0.008 222)",
        borderTop: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      {/* Scrollable row — hide native scrollbar */}
      <div
        className="flex items-stretch overflow-x-auto"
        style={{
          paddingTop: "8px",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
          scrollbarWidth: "none",          /* Firefox */
          msOverflowStyle: "none",         /* IE/Edge */
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Hide webkit scrollbar via inline style trick */}
        <style>{`.mobile-nav-scroll::-webkit-scrollbar{display:none}`}</style>

        {[...nav, { label: "Nastavení", short: "Nastavení", href: "/settings", icon: Settings }].map(({ short, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-shrink-0"
              style={{ minWidth: 68 }}
            >
              <motion.div
                className="flex flex-col items-center gap-[5px] px-2 py-1"
                whileTap={{ scale: 0.85 }}
                transition={{ duration: 0.1, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="relative flex items-center justify-center w-8 h-8 rounded-[8px]"
                  style={active ? {
                    background: "oklch(0.62 0.27 265 / 0.14)",
                    border: "1px solid oklch(0.62 0.27 265 / 0.22)",
                  } : {
                    border: "1px solid transparent",
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-bg"
                      className="absolute inset-0 rounded-[8px]"
                      style={{ background: "oklch(0.62 0.27 265 / 0.14)" }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    />
                  )}
                  <Icon
                    className="w-[15px] h-[15px] relative"
                    style={{ color: active ? "oklch(0.62 0.27 265)" : "oklch(0.42 0.005 222)" }}
                  />
                </div>
                <span
                  className="text-[9px] font-semibold leading-none text-center whitespace-nowrap"
                  style={{
                    color: active ? "oklch(0.62 0.27 265)" : "oklch(0.38 0.005 222)",
                    fontFamily: "var(--font-jakarta)",
                    letterSpacing: "0.01em",
                  }}
                >
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
