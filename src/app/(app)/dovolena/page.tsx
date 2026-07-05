"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Plus, Trash2, AlertTriangle, Plane, Users } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { DEFAULT_USERS } from "@/lib/roles";
import {
  ABSENCE_META, absenceDays, absenceCollisions, isAbsentOn,
  type Absence, type AbsenceTyp,
} from "@/lib/absence";

interface ShootingDay { datum?: string; klient?: string; clenove?: string[] }
interface Reservation { kdo?: string; od?: string; do?: string; projekt?: string }

const iCls = "px-3 py-2 rounded-[8px] text-[13px] outline-none";
const iStyle = { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)" } as const;
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (iso: string) => { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }); };

export default function DovolenaPage() {
  const { user, loading } = useUserRole();
  const [absences, setAbsences] = useSupabaseData<Absence[]>("ov-absence", () => []);
  const [shooting] = useSupabaseData<ShootingDay[]>("ov-shooting-days", () => []);
  const [reservations] = useSupabaseData<Reservation[]>("ov-gear-reservations", () => []);

  const team = useMemo(() => DEFAULT_USERS.filter((u) => u.aktivni), []);
  const [form, setForm] = useState({ name: "", typ: "dovolená" as AbsenceTyp, od: todayISO(), do: todayISO(), poznamka: "" });

  const today = todayISO();

  // Nadcházející + probíhající absence, seřazené podle začátku
  const upcoming = useMemo(
    () => [...absences].filter((a) => a.do >= today).sort((a, b) => a.od.localeCompare(b.od)),
    [absences, today]
  );
  const past = useMemo(
    () => [...absences].filter((a) => a.do < today).sort((a, b) => b.od.localeCompare(a.od)),
    [absences, today]
  );

  const collisions = useMemo(
    () => absenceCollisions(absences, shooting, reservations, today),
    [absences, shooting, reservations, today]
  );

  // Kdo je mimo dnes
  const outToday = useMemo(
    () => team.map((u) => ({ u, a: isAbsentOn(absences, u.displayName, today) })).filter((x) => x.a),
    [team, absences, today]
  );

  function add() {
    if (!form.name || !form.od || !form.do || form.do < form.od) return;
    const member = team.find((u) => u.displayName === form.name);
    setAbsences((prev) => [
      ...prev,
      { id: Date.now(), name: form.name, email: member?.email, typ: form.typ, od: form.od, do: form.do, poznamka: form.poznamka.trim() || undefined },
    ]);
    setForm((f) => ({ ...f, name: "", poznamka: "" }));
  }
  const remove = (id: number) => setAbsences((prev) => prev.filter((a) => a.id !== id));

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user) return <div className="p-8 text-[14px] text-[--muted-foreground]">Nemáš oprávnění.</div>;

  const initialsOf = (name: string) => team.find((u) => u.displayName === name)?.initials ?? name.slice(0, 2).toUpperCase();
  const colorOf = (name: string) => team.find((u) => u.displayName === name)?.color ?? "oklch(0.5 0.02 265)";

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="mb-5 flex items-center gap-2.5">
        <Plane className="w-5 h-5" style={{ color: "oklch(0.7 0.17 155)" }} />
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Dovolené &amp; absence</h1>
          <p className="text-[13px] text-[--muted-foreground]">Kdo je mimo a kdy — s hlídáním kolizí s natáčením a technikou</p>
        </div>
      </div>

      {/* Dnes mimo */}
      <div className="mb-5 p-4 rounded-[12px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-[--muted-foreground]" />
          <span className="text-[11px] font-semibold tracking-[0.04em] uppercase text-[--muted-foreground]">Dnes mimo</span>
        </div>
        {outToday.length === 0 ? (
          <p className="text-[13px] text-[--muted-foreground]">Dnes je celý tým k dispozici.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {outToday.map(({ u, a }) => (
              <div key={u.email} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: u.color, color: "white" }}>{u.initials}</span>
                <span className="text-[13px] font-medium">{u.displayName}</span>
                <span className="text-[11px] font-semibold" style={{ color: ABSENCE_META[a!.typ].color }}>{ABSENCE_META[a!.typ].label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kolize */}
      {collisions.length > 0 && (
        <div className="mb-5 p-4 rounded-[12px]" style={{ background: "oklch(0.65 0.22 25 / 0.08)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.65 0.22 25)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "oklch(0.72 0.19 25)" }}>{collisions.length} {collisions.length === 1 ? "kolize" : collisions.length < 5 ? "kolize" : "kolizí"} v plánu</span>
          </div>
          <ul className="space-y-1.5">
            {collisions.map((c, i) => (
              <li key={i} className="text-[13px] flex items-center gap-1.5">
                <span className="font-semibold">{c.name}</span>
                <span className="text-[--muted-foreground]">má {ABSENCE_META[c.absenceTyp].label.toLowerCase()}, ale je {c.kind === "shooting" ? "na natáčení" : "na rezervaci"}</span>
                <span className="text-[--muted-foreground]">„{c.detail}"</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "oklch(1 0 0 / 0.06)" }}>{fmt(c.datum)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Přidat absenci */}
      <div className="mb-5 p-4 rounded-[12px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Člen</span>
            <select className={iCls} style={{ ...iStyle, width: 180 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}>
              <option value="">— vyber —</option>
              {team.map((u) => <option key={u.email} value={u.displayName}>{u.displayName}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Typ</span>
            <select className={iCls} style={{ ...iStyle, width: 140 }} value={form.typ} onChange={(e) => setForm((f) => ({ ...f, typ: e.target.value as AbsenceTyp }))}>
              {(Object.keys(ABSENCE_META) as AbsenceTyp[]).map((t) => <option key={t} value={t}>{ABSENCE_META[t].label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Od</span>
            <input type="date" className={iCls} style={iStyle} value={form.od} onChange={(e) => setForm((f) => ({ ...f, od: e.target.value, do: f.do < e.target.value ? e.target.value : f.do }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Do</span>
            <input type="date" className={iCls} style={iStyle} value={form.do} min={form.od} onChange={(e) => setForm((f) => ({ ...f, do: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Poznámka</span>
            <input type="text" className={iCls} style={iStyle} value={form.poznamka} placeholder="volitelné" onChange={(e) => setForm((f) => ({ ...f, poznamka: e.target.value }))} />
          </label>
          <button onClick={add} disabled={!form.name} className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: "oklch(0.62 0.27 265)", color: "white" }}>
            <Plus className="w-3.5 h-3.5" /> Přidat
          </button>
        </div>
      </div>

      {/* Nadcházející */}
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="w-3.5 h-3.5 text-[--muted-foreground]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[--muted-foreground]">Nadcházející &amp; probíhající</span>
      </div>
      <div className="rounded-[12px] overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        {upcoming.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-[--muted-foreground]">Žádné plánované absence.</div>}
        {upcoming.map((a) => {
          const running = a.od <= today && today <= a.do;
          return (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--border)" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: colorOf(a.name), color: "white" }}>{initialsOf(a.name)}</span>
              <div className="min-w-[140px]">
                <div className="text-[13px] font-medium flex items-center gap-2">{a.name}{running && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ background: "oklch(0.7 0.17 155 / 0.15)", color: "oklch(0.72 0.17 155)" }}>teď</span>}</div>
                {a.poznamka && <div className="text-[11px] text-[--muted-foreground]">{a.poznamka}</div>}
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${ABSENCE_META[a.typ].color.replace(")", " / 0.14)")}`, color: ABSENCE_META[a.typ].color }}>{ABSENCE_META[a.typ].label}</span>
              <div className="ml-auto text-right">
                <div className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{fmt(a.od)} – {fmt(a.do)}</div>
                <div className="text-[11px] text-[--muted-foreground]">{absenceDays(a)} {absenceDays(a) === 1 ? "den" : absenceDays(a) < 5 ? "dny" : "dní"}</div>
              </div>
              <button onClick={() => remove(a.id)} className="p-1.5 rounded-[6px] hover:bg-white/5" aria-label="Smazat"><Trash2 className="w-3.5 h-3.5 text-[--muted-foreground]" /></button>
            </div>
          );
        })}
      </div>

      {/* Historie (sbalená, jen pár) */}
      {past.length > 0 && (
        <details>
          <summary className="text-[12px] text-[--muted-foreground] cursor-pointer mb-2">Historie ({past.length})</summary>
          <div className="rounded-[12px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {past.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-t first:border-t-0 opacity-70" style={{ borderColor: "var(--border)" }}>
                <span className="text-[13px] font-medium min-w-[140px]">{a.name}</span>
                <span className="text-[11px]" style={{ color: ABSENCE_META[a.typ].color }}>{ABSENCE_META[a.typ].label}</span>
                <span className="ml-auto text-[12px] text-[--muted-foreground]">{fmt(a.od)} – {fmt(a.do)}</span>
                <button onClick={() => remove(a.id)} className="p-1.5 rounded-[6px] hover:bg-white/5" aria-label="Smazat"><Trash2 className="w-3.5 h-3.5 text-[--muted-foreground]" /></button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
