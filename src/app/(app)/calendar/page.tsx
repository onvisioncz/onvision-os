"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Plus, X, ChevronLeft, ChevronRight,
  Clock, MapPin, User, Tag, Edit2, Check,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────────── */
type EventType = "Natáčení" | "Focení" | "Meeting" | "Deadline" | "Ostatní";
type EventColor = "blue" | "green" | "amber" | "red" | "purple";

interface CalEvent {
  id: number;
  title: string;
  klient: string;
  typ: EventType;
  color: EventColor;
  datum: string;       // "YYYY-MM-DD"
  cas: string;         // "09:00" or ""
  delka: string;       // "4h" / "celý den"
  misto: string;
  clenove: string[];
  poznamka: string;
}

/* ── Color map ───────────────────────────────────────────────────────────────── */
const COLOR: Record<EventColor, { bg: string; text: string; border: string }> = {
  blue:   { bg: "oklch(0.62 0.27 265 / 0.12)", text: "oklch(0.62 0.27 265)", border: "oklch(0.62 0.27 265 / 0.3)" },
  green:  { bg: "oklch(0.67 0.155 155 / 0.12)", text: "oklch(0.67 0.155 155)", border: "oklch(0.67 0.155 155 / 0.3)" },
  amber:  { bg: "oklch(0.74 0.165 75 / 0.12)",  text: "oklch(0.78 0.165 75)",  border: "oklch(0.74 0.165 75 / 0.3)"  },
  red:    { bg: "oklch(0.65 0.22 25 / 0.12)",   text: "oklch(0.65 0.22 25)",   border: "oklch(0.65 0.22 25 / 0.3)"   },
  purple: { bg: "oklch(0.64 0.21 290 / 0.12)",  text: "oklch(0.72 0.18 290)",  border: "oklch(0.64 0.21 290 / 0.3)"  },
};
function typColor(t: EventType): EventColor {
  if (t === "Natáčení") return "blue";
  if (t === "Focení")   return "green";
  if (t === "Meeting")  return "amber";
  if (t === "Deadline") return "red";
  return "purple";
}

/* ── Seed data ───────────────────────────────────────────────────────────────── */
const SEED: CalEvent[] = [
  { id:  1, title: "SENIMED — video produkce",         klient: "SENIMED s.r.o.",    typ: "Natáčení", color: "blue",   datum: "2026-05-07", cas: "08:00", delka: "celodenní", misto: "Brno, Královo Pole",  clenove: ["Adam","Zdeněk"], poznamka: "" },
  { id:  2, title: "EASTGATE — průběh stavby",         klient: "EASTGATE Brno",     typ: "Focení",   color: "green",  datum: "2026-05-09", cas: "10:00", delka: "3h",        misto: "Brno, Heršpická",     clenove: ["Adam","Matěj"],  poznamka: "" },
  { id:  3, title: "Meeting — Power Plate new season", klient: "Power Plate Česko", typ: "Meeting",  color: "amber",  datum: "2026-05-12", cas: "14:00", delka: "1.5h",      misto: "online / Teams",      clenove: ["Adam"],          poznamka: "Připravit nabídku na Q3" },
  { id:  4, title: "SK Brno Slatina — FINAL FOUR",     klient: "SK Brno Slatina",   typ: "Natáčení", color: "blue",   datum: "2026-05-16", cas: "09:00", delka: "celodenní", misto: "Brno, Vodova hala",   clenove: ["Adam","Zdeněk","Matěj"], poznamka: "Live stream + záběry" },
  { id:  5, title: "BehejBrno — Sezóna 2026 kick-off", klient: "BehejBrno",         typ: "Meeting",  color: "amber",  datum: "2026-05-19", cas: "10:00", delka: "1h",        misto: "Café Teplárna Brno",  clenove: ["Adam"],          poznamka: "" },
  { id:  6, title: "IMTOS — montáž deadline",          klient: "IMTOS spol. s r.o.",typ: "Deadline", color: "red",    datum: "2026-05-20", cas: "",      delka: "celý den",  misto: "",                    clenove: ["Adam"],          poznamka: "Odevzdat final cut ROSSO STEEL" },
  { id:  7, title: "TEKMA — promo video natáčení",     klient: "TEKMA s.r.o.",      typ: "Natáčení", color: "blue",   datum: "2026-05-22", cas: "07:30", delka: "celodenní", misto: "Brno-sever, závod",   clenove: ["Adam","Zdeněk"], poznamka: "" },
  { id:  8, title: "Power Plate — produktové focení",  klient: "Power Plate Česko", typ: "Focení",   color: "green",  datum: "2026-05-26", cas: "09:00", delka: "4h",        misto: "Studio OnVision",     clenove: ["Adam","Matěj"],  poznamka: "Nové produkty Q3" },
  { id:  9, title: "FIRESTA — Dvorecký most update",   klient: "FIRESTA s.r.o.",    typ: "Natáčení", color: "blue",   datum: "2026-05-28", cas: "06:00", delka: "3h",        misto: "Praha, Dvorecký most",clenove: ["Adam"],          poznamka: "Sunrise shot" },
  { id: 10, title: "EFFECT Clinic — brand content",    klient: "EFFECT Clinic",     typ: "Focení",   color: "green",  datum: "2026-05-29", cas: "11:00", delka: "3h",        misto: "Brno, klinika",       clenove: ["Adam","Matěj"],  poznamka: "" },
  { id: 11, title: "Cukrárna TOFFI — Šumavská",        klient: "Cukrárna TOFFI",    typ: "Focení",   color: "green",  datum: "2026-06-03", cas: "10:00", delka: "2h",        misto: "Brno, Šumavská",      clenove: ["Matěj"],         poznamka: "" },
  { id: 12, title: "SENIMED — červen produkce",        klient: "SENIMED s.r.o.",    typ: "Natáčení", color: "blue",   datum: "2026-06-10", cas: "08:00", delka: "celodenní", misto: "Brno, Královo Pole",  clenove: ["Adam","Zdeněk"], poznamka: "" },
];

const MEMBERS = ["Adam","Honza","Zdeněk","Matěj"];
const EVENT_TYPES: EventType[] = ["Natáčení","Focení","Meeting","Deadline","Ostatní"];

/* ── Czech month names ───────────────────────────────────────────────────────── */
const CZ_MONTHS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const CZ_DAYS_SHORT = ["Ne","Po","Út","St","Čt","Pá","So"];

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function toKey(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}`; }

/* ── Modal helpers ───────────────────────────────────────────────────────────── */
const EMPTY: Omit<CalEvent,"id"> = { title:"", klient:"", typ:"Natáčení", color:"blue", datum:"2026-05-15", cas:"09:00", delka:"celodenní", misto:"", clenove:[], poznamka:"" };
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
const iSty = { background:"oklch(1 0 0 / 0.04)", border:"1px solid oklch(1 0 0 / 0.09)", fontFamily:"var(--font-jakarta)" };
function FInput({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return <input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className={iCls} style={iSty}
    onFocus={e=>(e.target.style.borderColor="oklch(0.62 0.27 265 / 0.5)")} onBlur={e=>(e.target.style.borderColor="oklch(1 0 0 / 0.09)")}/>;
}
function FSelect({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e=>onChange(e.target.value)} className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
        {options.map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
      </select>
    </div>
  );
}
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">{label}</label>
      {children}
    </div>
  );
}

/* ── Event chip (shown on calendar cell) ─────────────────────────────────────── */
function EventChip({ event, onClick }: { event: CalEvent; onClick:()=>void }) {
  const c = COLOR[event.color];
  return (
    <motion.button onClick={onClick} whileTap={{scale:0.97}}
      className="w-full text-left px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold truncate mb-0.5"
      style={{background:c.bg, color:c.text, border:`1px solid ${c.border}`}}>
      {event.cas&&<span className="opacity-60">{event.cas} </span>}{event.title}
    </motion.button>
  );
}

/* ── Detail modal ────────────────────────────────────────────────────────────── */
function EventModal({ event, onClose, onSave, onDelete }: {
  event: CalEvent | "new";
  onClose: ()=>void;
  onSave: (e: Omit<CalEvent,"id">&{id?:number})=>void;
  onDelete?: (id:number)=>void;
}) {
  const isNew = event === "new";
  const [f, setF] = useState<Omit<CalEvent,"id">>(isNew ? {...EMPTY} : {...event as CalEvent});
  const set = (k: keyof typeof f) => (v: string) => setF(p=>({...p,[k]:v}));

  const toggleMember = (m: string) => setF(p=>({
    ...p, clenove: p.clenove.includes(m) ? p.clenove.filter(x=>x!==m) : [...p.clenove, m]
  }));

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{background:"oklch(0 0 0 / 0.65)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <motion.div className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
        style={{background:"oklch(0.11 0.008 222)",border:"1px solid oklch(1 0 0 / 0.09)"}}
        initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
        transition={{duration:0.3,ease:[0.23,1,0.32,1]}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
          <h2 className="text-[15px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>
            {isNew ? "Nová událost" : "Upravit událost"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[6px] text-[--muted-foreground] hover:text-[--foreground] transition-colors"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Field label="Název"><FInput value={f.title} onChange={set("title")} placeholder="Název události"/></Field></div>
          <Field label="Klient"><FInput value={f.klient} onChange={set("klient")} placeholder="Klient nebo projekt"/></Field>
          <Field label="Typ"><FSelect value={f.typ} onChange={set("typ")} options={EVENT_TYPES}/></Field>
          <Field label="Datum"><FInput value={f.datum} onChange={set("datum")} placeholder="2026-05-22"/></Field>
          <Field label="Čas"><FInput value={f.cas} onChange={set("cas")} placeholder="09:00"/></Field>
          <Field label="Délka"><FInput value={f.delka} onChange={set("delka")} placeholder="celodenní / 3h"/></Field>
          <Field label="Místo"><FInput value={f.misto} onChange={set("misto")} placeholder="Brno, adresa..."/></Field>
          <div className="md:col-span-2">
            <Field label="Tým">
              <div className="flex flex-wrap gap-2 mt-1">
                {MEMBERS.map(m=>(
                  <motion.button key={m} onClick={()=>toggleMember(m)} whileTap={{scale:0.94}}
                    className="px-2.5 py-1 rounded-[6px] text-[12px] font-semibold transition-colors"
                    style={f.clenove.includes(m)
                      ?{background:"oklch(0.62 0.27 265 / 0.15)",color:"oklch(0.62 0.27 265)",border:"1px solid oklch(0.62 0.27 265 / 0.3)"}
                      :{background:"oklch(1 0 0 / 0.04)",color:"oklch(0.45 0.005 222)",border:"1px solid oklch(1 0 0 / 0.08)"}}>
                    {m}
                  </motion.button>
                ))}
              </div>
            </Field>
          </div>
          <div className="md:col-span-2"><Field label="Poznámka"><FInput value={f.poznamka} onChange={set("poznamka")} placeholder="Volitelná poznámka"/></Field></div>
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
          {!isNew&&onDelete&&(
            <button onClick={()=>{ onDelete((event as CalEvent).id); onClose(); }}
              className="px-3 py-2 rounded-[7px] text-[12px] font-medium transition-colors"
              style={{color:"oklch(0.65 0.22 25)",background:"oklch(0.65 0.22 25 / 0.08)",border:"1px solid oklch(0.65 0.22 25 / 0.2)"}}>
              Smazat
            </button>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground]" style={{background:"oklch(1 0 0 / 0.04)",border:"1px solid oklch(1 0 0 / 0.08)"}}>Zrušit</button>
          <motion.button onClick={()=>onSave({...f,...(!isNew?{id:(event as CalEvent).id}:{})})} whileTap={{scale:0.96}}
            className="px-4 py-2 rounded-[7px] text-[13px] font-semibold"
            style={{background:"oklch(0.62 0.27 265)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
            {isNew ? "Přidat" : "Uložit"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────────── */
export default function KalendarPage() {
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useLocalStorage<CalEvent[]>("ov-calendar-events", () => SEED);
  const [modal,  setModal]  = useState<CalEvent|"new"|null>(null);
  const [newDate, setNewDate] = useState("");

  const days   = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);

  // Build event map by date key
  const eventMap = useMemo(()=>{
    const m: Record<string, CalEvent[]> = {};
    events.forEach(e=>{
      if(!m[e.datum]) m[e.datum]=[];
      m[e.datum].push(e);
    });
    return m;
  },[events]);

  // Upcoming events in current month
  const upcomingThisMonth = useMemo(()=>{
    const prefix = `${year}-${pad(month+1)}`;
    return events
      .filter(e=>e.datum.startsWith(prefix))
      .sort((a,b)=>a.datum.localeCompare(b.datum));
  },[events,year,month]);

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  function save(data: Omit<CalEvent,"id">&{id?:number}) {
    const color = typColor(data.typ);
    if(data.id!==undefined) setEvents(p=>p.map(e=>e.id===data.id?{...data,color,id:data.id!}:e));
    else setEvents(p=>[...p,{...data,color,id:Date.now()}]);
    setModal(null);
  }
  function del(id:number) { setEvents(p=>p.filter(e=>e.id!==id)); }

  function openNew(dateKey: string) {
    setNewDate(dateKey);
    setModal("new");
  }

  const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;

  // Stats
  const shootingDays = upcomingThisMonth.filter(e=>e.typ==="Natáčení"||e.typ==="Focení").length;
  const meetings     = upcomingThisMonth.filter(e=>e.typ==="Meeting").length;

  return (
    <div className="p-4 md:p-7 space-y-5 min-h-screen"
      style={{background:`radial-gradient(ellipse 50% 40% at 50% 0%, oklch(0.62 0.27 265 / 0.03) 0%, transparent 70%), var(--background)`}}>

      {/* Header */}
      <motion.div className="flex items-center justify-between gap-3"
        initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:0.4,ease:[0.23,1,0.32,1]}}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{background:"oklch(0.62 0.27 265 / 0.12)",border:"1px solid oklch(0.62 0.27 265 / 0.2)"}}>
            <CalendarDays className="w-4 h-4" style={{color:"oklch(0.62 0.27 265)"}}/>
          </div>
          <div>
            <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
              style={{fontFamily:"var(--font-outfit)",fontWeight:700,letterSpacing:"-0.03em"}}>Kalendář</h1>
            <p className="text-[12px] text-[--muted-foreground] mt-1">Produkce &amp; meetingy agentury</p>
          </div>
        </div>
        <motion.button onClick={()=>setModal("new")} whileTap={{scale:0.96}}
          className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold"
          style={{background:"oklch(0.62 0.27 265)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          <Plus className="w-3.5 h-3.5"/> Přidat
        </motion.button>
      </motion.div>

      {/* Stats strip */}
      <motion.div className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden"
        style={{background:"oklch(1 0 0 / 0.06)"}}
        initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:0.05}}>
        {[
          { label:`Akce v ${CZ_MONTHS[month]}`, value: String(upcomingThisMonth.length), color:"oklch(0.62 0.27 265)" },
          { label:"Natáčení / Focení",           value: String(shootingDays),             color:"oklch(0.67 0.155 155)" },
          { label:"Meetingy",                    value: String(meetings),                 color:"oklch(0.78 0.165 75)"  },
        ].map(s=>(
          <div key={s.label} className="px-4 py-4" style={{background:"var(--card)"}}>
            <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-1.5">{s.label}</p>
            <p className="num text-[28px] font-bold leading-none" style={{fontFamily:"var(--font-outfit)",color:s.color,letterSpacing:"-0.02em"}}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Calendar grid */}
        <motion.div className="card overflow-hidden"
          initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:0.1}}>
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:"oklch(1 0 0 / 0.07)"}}>
            <motion.button onClick={prevMonth} whileTap={{scale:0.9}}
              className="p-1.5 rounded-[6px] btn-tactile" style={{color:"oklch(0.45 0.005 222)"}}>
              <ChevronLeft className="w-4 h-4"/>
            </motion.button>
            <h2 className="text-[15px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>
              {CZ_MONTHS[month]} {year}
            </h2>
            <motion.button onClick={nextMonth} whileTap={{scale:0.9}}
              className="p-1.5 rounded-[6px] btn-tactile" style={{color:"oklch(0.45 0.005 222)"}}>
              <ChevronRight className="w-4 h-4"/>
            </motion.button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b" style={{borderColor:"oklch(1 0 0 / 0.06)"}}>
            {CZ_DAYS_SHORT.map(d=>(
              <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground]">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {/* Empty offset cells */}
            {Array.from({length:offset}).map((_,i)=>(
              <div key={`e-${i}`} className="min-h-[80px] border-b border-r p-1" style={{borderColor:"oklch(1 0 0 / 0.05)"}}/>
            ))}
            {/* Day cells */}
            {Array.from({length:days}).map((_,i)=>{
              const day = i+1;
              const key = toKey(year, month, day);
              const dayEvents = eventMap[key] || [];
              const isToday = key === todayKey;
              const isWeekend = ((offset + i) % 7 >= 5);
              return (
                <div key={key}
                  className={`min-h-[80px] border-b border-r p-1 relative group ${isWeekend?"":"hover:bg-white/[0.015]"} transition-colors cursor-pointer`}
                  style={{borderColor:"oklch(1 0 0 / 0.05)",background:isWeekend?"oklch(1 0 0 / 0.01)":undefined}}
                  onClick={()=>openNew(key)}>
                  {/* Day number */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold mb-1 ${isToday?"text-[oklch(0.09_0.008_222)]":""}`}
                    style={isToday?{background:"oklch(0.62 0.27 265)",fontFamily:"var(--font-outfit)"}:{color:isWeekend?"oklch(0.30 0.005 222)":"oklch(0.50 0.005 222)"}}>
                    {day}
                  </div>
                  {/* Events */}
                  {dayEvents.slice(0,2).map(ev=>(
                    <EventChip key={ev.id} event={ev} onClick={()=>setModal(ev)}/>
                  ))}
                  {dayEvents.length>2&&(
                    <span className="text-[9px] pl-1" style={{color:"oklch(0.45 0.005 222)"}}>+{dayEvents.length-2} další</span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Sidebar: upcoming events */}
        <motion.div className="space-y-3"
          initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{duration:0.35,delay:0.15}}>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] px-1" style={{color:"oklch(0.45 0.005 222)"}}>
            {CZ_MONTHS[month]} — přehled
          </p>
          {upcomingThisMonth.length===0&&(
            <div className="card px-4 py-6 text-center">
              <p className="text-[12px] text-[--muted-foreground]">Žádné akce v tomto měsíci.</p>
            </div>
          )}
          {upcomingThisMonth.map((ev,i)=>{
            const c = COLOR[ev.color];
            const d = new Date(ev.datum);
            const dayNum = d.getDate();
            const dayName = CZ_DAYS_SHORT[d.getDay()===0?6:d.getDay()-1];
            return (
              <motion.button key={ev.id} onClick={()=>setModal(ev)} whileTap={{scale:0.98}}
                className="w-full text-left card px-3 py-3 flex items-start gap-3 btn-tactile"
                initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.25,delay:i*0.03}}>
                {/* Date chip */}
                <div className="shrink-0 w-9 text-center">
                  <p className="text-[18px] font-bold leading-none" style={{fontFamily:"var(--font-outfit)",color:c.text}}>{dayNum}</p>
                  <p className="text-[9px] font-bold uppercase" style={{color:"oklch(0.40 0.005 222)"}}>{dayName}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[--foreground] truncate leading-tight" style={{fontFamily:"var(--font-outfit)"}}>{ev.title}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{color:"oklch(0.45 0.005 222)"}}>{ev.klient}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold" style={{background:c.bg,color:c.text}}>{ev.typ}</span>
                    {ev.cas&&<span className="text-[9px]" style={{color:"oklch(0.40 0.005 222)"}}>{ev.cas} · {ev.delka}</span>}
                  </div>
                  {ev.clenove.length>0&&(
                    <div className="flex gap-1 mt-1.5">
                      {ev.clenove.map(m=>(
                        <span key={m} className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-semibold" style={{background:"oklch(1 0 0 / 0.06)",color:"oklch(0.50 0.005 222)"}}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}

          {/* Legend */}
          <div className="card px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground] mb-2">Legenda</p>
            {EVENT_TYPES.map(t=>{
              const c = COLOR[typColor(t)];
              return (
                <div key={t} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:c.text}}/>
                  <span className="text-[11px]" style={{color:"oklch(0.55 0.005 222)"}}>{t}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Event modal */}
      <AnimatePresence>
        {modal!==null&&(
          <EventModal
            event={modal==="new" ? "new" : modal}
            onClose={()=>setModal(null)}
            onSave={save}
            onDelete={modal!=="new"?del:undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
