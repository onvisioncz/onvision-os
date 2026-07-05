"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarRange, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { DEFAULT_USERS } from "@/lib/roles";
import {
  isoWeekKey, weekRange, outlookStatus,
  type OutlookEntry, type OutlookSubmits,
} from "@/lib/weekly-outlook";

const GREEN = "oklch(0.7 0.17 155)";
const AMBER = "oklch(0.78 0.165 75)";
const PRIMARY = "oklch(0.62 0.27 265)";

const nameOf = (email: string) => DEFAULT_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())?.displayName ?? email;
const firstName = (email: string) => nameOf(email).split(" ")[0];

/** Kompaktní přehled Týdenního výhledu pro jednatele — kdo odevzdal + co plánuje. */
export function VyhledGlance() {
  const [entries] = useSupabaseData<OutlookEntry[]>("ov-weekly-outlook", () => []);
  const [submits] = useSupabaseData<OutlookSubmits>("ov-weekly-outlook-submits", () => ({}));

  const weekKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // příští týden (ten se plánuje)
    return isoWeekKey(d);
  }, []);

  const status = useMemo(() => outlookStatus(entries, submits, weekKey), [entries, submits, weekKey]);
  const range = weekRange(weekKey);
  const fmt = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  const totalPosts = status.reduce((s, a) => s + a.entryCount, 0);
  const missing = status.filter((s) => !s.submitted).length;

  return (
    <Link href="/tydenni-vyhled" className="glass-card p-5 block group">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4" style={{ color: PRIMARY }} />
          <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>Týdenní výhled</h3>
        </div>
        <span className="text-[11px] text-[--muted-foreground] flex items-center gap-1">
          {range ? `${fmt(range.from)}–${fmt(range.to)}` : weekKey}
          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[22px] font-bold" style={{ fontFamily: "var(--font-heading)", color: missing ? AMBER : GREEN }}>{totalPosts}</span>
        <span className="text-[12px] text-[--muted-foreground]">{totalPosts === 1 ? "post v plánu" : totalPosts < 5 ? "posty v plánu" : "postů v plánu"}{missing > 0 && ` · ${missing} chybí odevzdat`}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {status.map((s) => (
          <span key={s.email} className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ background: "oklch(1 0 0 / 0.04)", border: `1px solid ${s.submitted ? "oklch(0.7 0.17 155 / 0.28)" : "oklch(0.78 0.165 75 / 0.28)"}` }}>
            {s.submitted ? <Check className="w-3 h-3" style={{ color: GREEN }} /> : <AlertTriangle className="w-3 h-3" style={{ color: AMBER }} />}
            {firstName(s.email)}
            <span style={{ color: s.submitted ? GREEN : AMBER }}>{s.submitted ? s.entryCount : "chybí"}</span>
          </span>
        ))}
      </div>
    </Link>
  );
}
