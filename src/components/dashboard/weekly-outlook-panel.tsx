"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, ChevronDown, Film, Send, Users, Sparkles } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";

/* Tvary dat (podmnožiny) */
interface SmmPost { id: string; klient: string; datum: string; format?: string; status?: string; platform?: string }
interface ShootingDay { id: number; datum: string; klient: string; typ?: string; lokace?: string; zacatek?: string }
interface CalEvent { id: number; title: string; klient?: string; typ?: string; datum: string; cas?: string; misto?: string }

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const DAY_FULL = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

/** ISO klíč (YYYY-MM-DD) z různých formátů ("2026-07-08", "8. 7.", "8.7.2026"). */
function toISO(raw: string, weekYear: number): string | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const cz = raw.match(/(\d{1,2})\.\s*(\d{1,2})\.?\s*(\d{4})?/);
  if (cz) {
    const d = String(parseInt(cz[1])).padStart(2, "0");
    const m = String(parseInt(cz[2])).padStart(2, "0");
    const y = cz[3] ? cz[3] : String(weekYear);
    return `${y}-${m}-${d}`;
  }
  return null;
}

/** Pondělí aktuálního týdne (lokálně). */
function mondayOfThisWeek(): Date {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = pondělí
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  return mon;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Týdenní výhled — plný panel (karta). */
export function WeeklyOutlookPanel() {
  return (
    <div className="glass-card p-5 flex flex-col" style={{ minHeight: 220 }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4" style={{ color: "oklch(0.7 0.18 300)" }} />
        <h3 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)" }}>Týdenní výhled</h3>
      </div>
      <WeeklyDays />
    </div>
  );
}

/** Obsah týdenního výhledu bez karty — pro vložení do AI briefu. */
export function WeeklyDays() {
  const [posts] = useSupabaseData<SmmPost[]>("ov-smm-posts", () => []);
  const [shootings] = useSupabaseData<ShootingDay[]>("ov-shooting-days", () => []);
  const [events] = useSupabaseData<CalEvent[]>("ov-calendar-events", () => []);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const week = useMemo(() => {
    const mon = mondayOfThisWeek();
    const year = mon.getFullYear();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
      return { idx: i, date: d, iso: isoOf(d) };
    });
    const isoSet = new Set(days.map((d) => d.iso));

    const postByDay: Record<string, SmmPost[]> = {};
    posts.forEach((p) => { const k = toISO(p.datum, year); if (k && isoSet.has(k)) (postByDay[k] ??= []).push(p); });
    const shootByDay: Record<string, ShootingDay[]> = {};
    shootings.forEach((s) => { const k = toISO(s.datum, year); if (k && isoSet.has(k)) (shootByDay[k] ??= []).push(s); });
    const eventByDay: Record<string, CalEvent[]> = {};
    events.forEach((e) => { const k = toISO(e.datum, year); if (k && isoSet.has(k)) (eventByDay[k] ??= []).push(e); });

    const rows = days.map((d) => ({
      ...d,
      posts: postByDay[d.iso] ?? [],
      shoots: shootByDay[d.iso] ?? [],
      events: eventByDay[d.iso] ?? [],
    }));
    const totalPosts = rows.reduce((s, r) => s + r.posts.length, 0);
    const totalShoots = rows.reduce((s, r) => s + r.shoots.length, 0);
    const totalEvents = rows.reduce((s, r) => s + r.events.length, 0);
    const range = `${days[0].date.getDate()}. – ${days[6].date.getDate()}. ${days[6].date.toLocaleDateString("cs-CZ", { month: "long" })}`;
    const todayIdx = (new Date().getDay() + 6) % 7;
    return { rows, totalPosts, totalShoots, totalEvents, range, todayIdx };
  }, [posts, shootings, events]);

  const nic = week.totalPosts + week.totalShoots + week.totalEvents === 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "oklch(0.5 0.005 222)" }}>Program týdne</span>
        <span className="ml-auto text-[11px] text-[--muted-foreground]">{week.range}</span>
      </div>

      {/* Slovní shrnutí */}
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: "oklch(0.72 0.008 222)" }}>
        {nic ? (
          "Tento týden zatím nic naplánovaného. Přidej příspěvky, natáčení nebo schůzky."
        ) : (
          <>Tento týden jde ven <strong style={{ color: "oklch(0.7 0.18 300)" }}>{week.totalPosts}</strong> {plural(week.totalPosts, "příspěvek", "příspěvky", "příspěvků")}
            {week.totalShoots > 0 && <>, <strong style={{ color: "oklch(0.65 0.22 25)" }}>{week.totalShoots}</strong> {plural(week.totalShoots, "natáčení", "natáčení", "natáčení")}</>}
            {week.totalEvents > 0 && <> a <strong style={{ color: "oklch(0.62 0.27 265)" }}>{week.totalEvents}</strong> {plural(week.totalEvents, "schůzka", "schůzky", "schůzek")}</>}.
          </>
        )}
      </p>

      {/* Den po dni */}
      <div className="flex flex-col gap-1">
        {week.rows.map((r) => {
          const count = r.posts.length + r.shoots.length + r.events.length;
          const isToday = r.idx === week.todayIdx;
          const open = openDay === r.idx;
          return (
            <div key={r.idx}>
              <button
                onClick={() => setOpenDay(open ? null : r.idx)}
                className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-[8px] transition-colors"
                style={{ background: isToday ? "oklch(0.62 0.27 265 / 0.1)" : count ? "oklch(1 0 0 / 0.03)" : "transparent", cursor: count ? "pointer" : "default" }}
              >
                <span className="text-[11px] font-bold w-7 shrink-0 text-left" style={{ color: isToday ? "oklch(0.72 0.2 265)" : "oklch(0.5 0.005 222)" }}>
                  {DAY_LABELS[r.idx]} {r.date.getDate()}.
                </span>
                {count === 0 ? (
                  <span className="text-[12px]" style={{ color: "oklch(0.4 0.005 222)" }}>—</span>
                ) : (
                  <span className="flex items-center gap-2 flex-wrap text-[12px]" style={{ color: "oklch(0.7 0.008 222)" }}>
                    {r.posts.length > 0 && <span className="flex items-center gap-1"><Send className="w-3 h-3" style={{ color: "oklch(0.7 0.18 300)" }} />{r.posts.length}</span>}
                    {r.shoots.length > 0 && <span className="flex items-center gap-1"><Film className="w-3 h-3" style={{ color: "oklch(0.65 0.22 25)" }} />{r.shoots.length}</span>}
                    {r.events.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" style={{ color: "oklch(0.62 0.27 265)" }} />{r.events.length}</span>}
                  </span>
                )}
                {count > 0 && <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "oklch(0.45 0.005 222)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
              </button>
              {open && count > 0 && (
                <div className="pl-9 pr-2 py-1.5 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.4 0.005 222)" }}>{DAY_FULL[r.idx]}</span>
                  {r.shoots.map((s) => (
                    <div key={`s${s.id}`} className="text-[12px] flex items-center gap-1.5" style={{ color: "oklch(0.72 0.008 222)" }}>
                      <Film className="w-3 h-3 shrink-0" style={{ color: "oklch(0.65 0.22 25)" }} />
                      Natáčení · {s.klient}{s.zacatek ? ` · ${s.zacatek}` : ""}{s.lokace ? ` · ${s.lokace}` : ""}
                    </div>
                  ))}
                  {r.events.map((e) => (
                    <div key={`e${e.id}`} className="text-[12px] flex items-center gap-1.5" style={{ color: "oklch(0.72 0.008 222)" }}>
                      <Users className="w-3 h-3 shrink-0" style={{ color: "oklch(0.62 0.27 265)" }} />
                      {e.title}{e.cas ? ` · ${e.cas}` : ""}{e.klient ? ` · ${e.klient}` : ""}
                    </div>
                  ))}
                  {r.posts.map((p) => (
                    <div key={`p${p.id}`} className="text-[12px] flex items-center gap-1.5" style={{ color: "oklch(0.72 0.008 222)" }}>
                      <Send className="w-3 h-3 shrink-0" style={{ color: "oklch(0.7 0.18 300)" }} />
                      {p.klient}{p.format ? ` · ${p.format}` : ""}{p.platform ? ` · ${p.platform}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 flex items-center gap-3" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
        <Link href="/calendar" className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "oklch(0.62 0.27 265)" }}>
          <CalendarRange className="w-3 h-3" /> Kalendář
        </Link>
        <Link href="/smm" className="text-[11px] font-semibold" style={{ color: "oklch(0.7 0.18 300)" }}>Plán obsahu →</Link>
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
