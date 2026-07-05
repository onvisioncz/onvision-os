"use client";

/**
 * Můj den — osobní ranní obrazovka pro každého člena týmu.
 * Moje úkoly (po termínu / dnes / nejbližší), dnešní a nadcházející
 * natáčení, moje rezervace techniky a rychlý zápis hodin. Jedna stránka,
 * na které člověk ráno zjistí, co ho čeká, a večer zapíše hodiny.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sun, CheckSquare, Clapperboard, Camera, Clock, Plus, ArrowRight, Check,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { parseDeadline, daysUntil, fmtDeadline } from "@/lib/dates";
import { TIME_KEY, fmtHod, type TimeEntry } from "@/lib/vykazy";
import { GEAR_KEY, GEAR_RES_KEY, type GearItem, type GearReservation } from "@/lib/gear";
import { CALLSHEET_KEY, type CallSheet } from "@/lib/callsheet";
import { PushNudge } from "@/components/push-subscribe-button";

interface Task { id: number; nazev: string; projekt: string; prirazeno: string; priorita: string; status: string; deadline: string }
interface ShootingDay { id: number; datum: string; klient: string; typ: string; lokace: string; clenove: string[]; zacatek: string; konec: string }

const PRIMARY = "#5B5EFF";
const RED = "oklch(0.65 0.22 25)";
const AMBER = "oklch(0.74 0.165 75)";
const GREEN = "oklch(0.67 0.155 155)";

const firstName = (s: string) => (s || "").trim().split(/\s+/)[0].toLowerCase();
const ALIASES: Record<string, string[]> = { jan: ["jan", "honza"] };
const isMine = (assigned: string, myFirst: string) => {
  const a = firstName(assigned);
  return a === myFirst || (ALIASES[myFirst] ?? []).includes(a);
};

export default function DnesPage() {
  const { user, loading } = useUserRole();
  const [tasks, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [entries, setEntries] = useSupabaseData<TimeEntry[]>(TIME_KEY, () => []);
  const [shooting] = useSupabaseData<ShootingDay[]>("ov-shooting-days", () => []);
  const [callSheets] = useSupabaseData<CallSheet[]>(CALLSHEET_KEY, () => []);
  const [reservations] = useSupabaseData<GearReservation[]>(GEAR_RES_KEY, () => []);
  const [gear] = useSupabaseData<GearItem[]>(GEAR_KEY, () => []);
  const [clients] = useSupabaseData<{ name: string }[]>("ov-monthly-clients", () => []);

  const [logKlient, setLogKlient] = useState("");
  const [logHodiny, setLogHodiny] = useState("");
  const [logged, setLogged] = useState(false);

  const me = user?.displayName ?? "";
  const myFirst = firstName(me);

  const data = useMemo(() => {
    const mine = tasks.filter((t) => t.status !== "Hotovo" && isMine(t.prirazeno, myFirst));
    const withD = mine.map((t) => ({ t, d: parseDeadline(t.deadline) }));
    const overdue = withD.filter((x) => x.d && daysUntil(x.d) < 0).map((x) => x.t);
    const today = withD.filter((x) => x.d && daysUntil(x.d) === 0).map((x) => x.t);
    const upcoming = withD
      .filter((x) => !x.d || daysUntil(x.d) > 0)
      .sort((a, b) => (a.d ? a.d.getTime() : Infinity) - (b.d ? b.d.getTime() : Infinity))
      .slice(0, 4)
      .map((x) => x.t);

    // Natáčení: shooting days + call sheety, kde jsem v týmu, dnes až +7 dní
    const shoots: { datum: Date; label: string; sub: string; href: string }[] = [];
    shooting.forEach((s) => {
      if (!s.clenove?.some((c) => isMine(c, myFirst))) return;
      const d = parseDeadline(s.datum);
      if (!d) return;
      const days = daysUntil(d);
      if (days < 0 || days > 7) return;
      shoots.push({ datum: d, label: `${s.klient} · ${s.typ}`, sub: `${s.zacatek || ""}${s.lokace ? ` · ${s.lokace}` : ""}`, href: "/shooting" });
    });
    callSheets.forEach((cs) => {
      if (!cs.crew?.some((c) => isMine(c.jmeno, myFirst))) return;
      const d = parseDeadline(cs.datum);
      if (!d) return;
      const days = daysUntil(d);
      if (days < 0 || days > 7) return;
      shoots.push({ datum: d, label: cs.nazev || cs.klient, sub: `${cs.casSrazu ? `sraz ${cs.casSrazu}` : ""}${cs.adresa ? ` · ${cs.adresa}` : ""}`, href: "/call-sheet" });
    });
    shoots.sort((a, b) => a.datum.getTime() - b.datum.getTime());

    // Moje rezervace techniky (aktivní / nadcházející)
    const todayIso = new Date().toISOString().slice(0, 10);
    const myRes = reservations
      .filter((r) => isMine(r.kdo, myFirst) && r.do >= todayIso)
      .sort((a, b) => a.od.localeCompare(b.od))
      .slice(0, 4)
      .map((r) => ({ ...r, nazev: gear.find((g) => g.id === r.gearId)?.nazev ?? "technika" }));

    // Hodiny tento týden
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() === 0 ? 7 : now.getDay()) - 1));
    const mondayIso = monday.toISOString().slice(0, 10);
    const weekHours = entries
      .filter((e) => isMine(e.kdo, myFirst) && e.datum >= mondayIso)
      .reduce((s, e) => s + (e.hodiny || 0), 0);

    return { overdue, today, upcoming, shoots: shoots.slice(0, 4), myRes, weekHours };
  }, [tasks, shooting, callSheets, reservations, gear, entries, myFirst]);

  const markDone = (id: number) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "Hotovo" } : t)));

  const logHours = () => {
    if (!logKlient.trim() || !logHodiny) return;
    setEntries((prev) => [...prev, {
      id: Date.now(), kdo: me, klient: logKlient.trim(), projekt: "",
      datum: new Date().toISOString().slice(0, 10), hodiny: Number(logHodiny), popis: "",
    }]);
    setLogKlient(""); setLogHodiny(""); setLogged(true);
    setTimeout(() => setLogged(false), 2500);
  };

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user) return null;

  const dnes = new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
  const hour = new Date().getHours();
  const greeting = hour < 10 ? "Dobré ráno" : hour < 18 ? "Dobrý den" : "Dobrý večer";
  const clean = data.overdue.length === 0 && data.today.length === 0;

  const TaskRow = ({ t, tone }: { t: Task; tone: string }) => (
    <div className="flex items-center gap-2.5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <button onClick={() => markDone(t.id)} title="Hotovo"
        className="btn-tactile w-[18px] h-[18px] rounded-[5px] shrink-0 flex items-center justify-center"
        style={{ border: `1.5px solid ${tone}55`, color: tone }}>
        <Check className="w-3 h-3 opacity-0 hover:opacity-100" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate">{t.nazev}</p>
        <p className="text-[11px] text-[--muted-foreground] truncate">{t.projekt}</p>
      </div>
      <span className="text-[11px] font-semibold shrink-0" style={{ color: tone }}>
        {t.deadline ? fmtDeadline(t.deadline) : ""}
      </span>
    </div>
  );

  return (
    <div className="p-5 md:p-7 max-w-[860px] mx-auto">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[--muted-foreground]">{dnes}</p>
        <h1 className="text-[24px] font-bold tracking-[-0.01em] flex items-center gap-2 mt-1" style={{ fontFamily: "var(--font-heading)" }}>
          <Sun className="w-5 h-5" style={{ color: AMBER }} />
          {greeting}, {me.split(" ")[0]}
        </h1>
        <p className="text-[13px] text-[--muted-foreground] mt-0.5">
          {clean ? "Čistý stůl — nic nehoří." : `${data.overdue.length + data.today.length} věcí chce tvou pozornost.`}
          {data.weekHours > 0 && ` Tento týden máš vykázáno ${fmtHod(data.weekHours)}.`}
        </p>
      </div>

      <PushNudge />

      <div className="grid md:grid-cols-2 gap-4">
        {/* Úkoly */}
        <div className="glass-card p-4 md:col-span-2">
          <h2 className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <CheckSquare className="w-4 h-4" style={{ color: PRIMARY }} /> Moje úkoly
            <Link href="/ukoly" className="ml-auto text-[11px] font-semibold flex items-center gap-1" style={{ color: PRIMARY }}>
              Vše <ArrowRight className="w-3 h-3" />
            </Link>
          </h2>
          {data.overdue.length === 0 && data.today.length === 0 && data.upcoming.length === 0 ? (
            <p className="text-[12px] text-[--muted-foreground] py-3">Žádné otevřené úkoly.</p>
          ) : (
            <>
              {data.overdue.map((t) => <TaskRow key={t.id} t={t} tone={RED} />)}
              {data.today.map((t) => <TaskRow key={t.id} t={t} tone={AMBER} />)}
              {data.upcoming.map((t) => <TaskRow key={t.id} t={t} tone={"oklch(0.6 0.01 265)"} />)}
            </>
          )}
        </div>

        {/* Natáčení */}
        <div className="glass-card p-4">
          <h2 className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Clapperboard className="w-4 h-4" style={{ color: PRIMARY }} /> Natáčení (7 dní)
          </h2>
          {data.shoots.length === 0 ? (
            <p className="text-[12px] text-[--muted-foreground] py-3">Žádné natáčení, kde jsi v týmu.</p>
          ) : data.shoots.map((s, i) => (
            <Link key={i} href={s.href} className="flex items-center gap-2.5 py-2 group" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[11px] font-bold w-12 shrink-0" style={{ color: daysUntil(s.datum) === 0 ? RED : AMBER }}>
                {daysUntil(s.datum) === 0 ? "Dnes" : daysUntil(s.datum) === 1 ? "Zítra" : `${s.datum.getDate()}. ${s.datum.getMonth() + 1}.`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate group-hover:underline">{s.label}</p>
                {s.sub && <p className="text-[11px] text-[--muted-foreground] truncate">{s.sub}</p>}
              </div>
            </Link>
          ))}
        </div>

        {/* Rezervace techniky */}
        <div className="glass-card p-4">
          <h2 className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Camera className="w-4 h-4" style={{ color: PRIMARY }} /> Moje technika
          </h2>
          {data.myRes.length === 0 ? (
            <p className="text-[12px] text-[--muted-foreground] py-3">Žádné rezervace. <Link href="/technika" style={{ color: PRIMARY }}>Rezervovat →</Link></p>
          ) : data.myRes.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate">{r.nazev}</p>
                <p className="text-[11px] text-[--muted-foreground]">{r.od.slice(8, 10)}.{r.od.slice(5, 7)}. – {r.do.slice(8, 10)}.{r.do.slice(5, 7)}.{r.projekt ? ` · ${r.projekt}` : ""}</p>
              </div>
              {r.od <= new Date().toISOString().slice(0, 10) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${GREEN.replace(")", " / 0.14)")}`, color: GREEN }}>u tebe</span>
              )}
            </div>
          ))}
        </div>

        {/* Rychlý zápis hodin */}
        <div className="glass-card p-4 md:col-span-2">
          <h2 className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Clock className="w-4 h-4" style={{ color: PRIMARY }} /> Rychlý zápis hodin
            <span className="ml-auto text-[11px] text-[--muted-foreground]">tento týden: <strong style={{ color: PRIMARY }}>{fmtHod(data.weekHours)}</strong></span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input list="dnes-clients" className="glass-input px-3 py-2 text-[13px] flex-1 min-w-[150px]"
              placeholder="Klient" value={logKlient} onChange={(e) => setLogKlient(e.target.value)} />
            <datalist id="dnes-clients">{clients.map((c) => <option key={c.name} value={c.name} />)}</datalist>
            <input type="number" step="0.5" min="0" className="glass-input px-3 py-2 text-[13px] w-24"
              placeholder="hod." value={logHodiny} onChange={(e) => setLogHodiny(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") logHours(); }} />
            <button onClick={logHours} disabled={!logKlient.trim() || !logHodiny}
              className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40"
              style={{ background: PRIMARY, color: "white" }}>
              <Plus className="w-4 h-4" /> Zapsat dnes
            </button>
            {logged && <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: GREEN }}><Check className="w-3.5 h-3.5" /> Zapsáno</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
