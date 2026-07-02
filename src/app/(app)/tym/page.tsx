"use client";

/**
 * Tým — přehled lidí v systému: role, klienti, poslední přihlášení,
 * úkoly a odpracované hodiny tento měsíc. Jen pro vedení (admin).
 */
import { useEffect, useMemo, useState } from "react";
import { Users, Clock, CheckSquare, ShieldCheck, MinusCircle } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DEFAULT_USERS, ROLE_LABELS, ROLE_COLORS, type Role } from "@/lib/roles";
import { TIME_KEY, monthPrefix, fmtHod, type TimeEntry } from "@/lib/vykazy";
import { StatCard } from "@/components/ui/stat-card";

interface Task { nazev: string; prirazeno: string; status: string; deadline: string }

const PRIMARY = "#5B5EFF";

function relCz(iso: string | null): string {
  if (!iso) return "zatím bez přístupu";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "zatím bez přístupu";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "dnes";
  if (days === 1) return "včera";
  if (days < 7) return `před ${days} dny`;
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

/** Úkoly se přiřazují křestním jménem ("Adam"), profily mají celé jméno. */
const firstName = (s: string) => (s || "").trim().split(/\s+/)[0].toLowerCase();
/** Přezdívky používané v úkolech (Jan Kříž = "Honza"). */
const ALIASES: Record<string, string[]> = { jan: ["jan", "honza"] };
const belongsTo = (assigned: string, memberFirst: string) => {
  const a = firstName(assigned);
  return a === memberFirst || (ALIASES[memberFirst] ?? []).includes(a);
};

export default function TymPage() {
  const { user, loading } = useUserRole();
  const [tasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [entries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [logins, setLogins] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetch("/api/team/activity")
      .then((r) => r.json())
      .then((d) => setLogins(d.logins ?? {}))
      .catch(() => {});
  }, []);

  const month = monthPrefix(new Date());

  const rows = useMemo(() => {
    return DEFAULT_USERS.map((u) => {
      const fn = firstName(u.displayName);
      const mine = tasks.filter((t) => belongsTo(t.prirazeno, fn));
      const open = mine.filter((t) => t.status !== "Hotovo").length;
      const done = mine.filter((t) => t.status === "Hotovo").length;
      const myEntries = entries.filter((e) => belongsTo(e.kdo, fn));
      const hoursMonth = myEntries.filter((e) => e.datum.startsWith(month)).reduce((s, e) => s + (e.hodiny || 0), 0);
      const lastEntry = myEntries.map((e) => e.datum).sort().at(-1) ?? null;
      return { ...u, open, done, hoursMonth, lastEntry, lastLogin: logins[u.email.toLowerCase()] ?? null };
    }).sort((a, b) => Number(b.aktivni) - Number(a.aktivni) || b.hoursMonth - a.hoursMonth);
  }, [tasks, entries, logins, month]);

  const totals = useMemo(() => ({
    lidi: rows.filter((r) => r.aktivni).length,
    hodin: rows.reduce((s, r) => s + r.hoursMonth, 0),
    open: rows.reduce((s, r) => s + r.open, 0),
    sPristupem: rows.filter((r) => r.lastLogin).length,
  }), [rows]);

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user?.roles.includes("admin")) return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <Users className="w-5 h-5" style={{ color: PRIMARY }} /> Tým
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">Kdo je v systému, kdy se naposledy přihlásil a co má na stole</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Aktivních lidí" value={String(totals.lidi)} icon={Users} color={PRIMARY} />
        <StatCard label="Hodin tento měsíc" value={fmtHod(totals.hodin)} icon={Clock} color="oklch(0.7 0.14 195)" />
        <StatCard label="Otevřených úkolů" value={String(totals.open)} icon={CheckSquare} color="oklch(0.74 0.165 75)" />
        <StatCard label="S přístupem do OS" value={`${totals.sPristupem} / ${rows.length}`} icon={ShieldCheck} color="oklch(0.67 0.155 155)" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((p) => (
          <div key={p.email} className="glass-card p-4" style={{ opacity: p.aktivni ? 1 : 0.55 }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background: `color-mix(in oklch, ${p.color} 22%, transparent)`, color: p.color, border: `1px solid color-mix(in oklch, ${p.color} 40%, transparent)` }}>
                {p.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold truncate" style={{ fontFamily: "var(--font-heading)" }}>{p.displayName}</span>
                  {p.roles.map((r: Role) => (
                    <span key={r} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.04em]"
                      style={{ background: `color-mix(in oklch, ${ROLE_COLORS[r]} 15%, transparent)`, color: ROLE_COLORS[r] }}>
                      {ROLE_LABELS[r]}
                    </span>
                  ))}
                  {!p.aktivni && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase text-[--muted-foreground]" style={{ background: "rgba(255,255,255,0.06)" }}><MinusCircle className="w-2.5 h-2.5 inline mr-0.5" />neaktivní</span>}
                </div>
                <p className="text-[11px] text-[--muted-foreground] mt-0.5 truncate">
                  {p.clients.length ? `Klienti: ${p.clients.join(", ")}` : "Bez přiřazených klientů"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[--muted-foreground]">Přihlášení</p>
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: p.lastLogin ? "var(--foreground)" : "var(--muted-foreground)" }}>{relCz(p.lastLogin)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[--muted-foreground]">Úkoly</p>
                <p className="text-[12px] font-semibold mt-0.5">{p.open} otevř. · {p.done} hotovo</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[--muted-foreground]">Hodiny / měsíc</p>
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: p.hoursMonth > 0 ? PRIMARY : "var(--muted-foreground)" }}>
                  {p.hoursMonth > 0 ? fmtHod(p.hoursMonth) : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[--muted-foreground] mt-4">
        Přihlášení čte ze Supabase Auth (jen účty, které existují). Úkoly se párují podle křestního jména, hodiny z Výkazů.
      </p>
    </div>
  );
}
