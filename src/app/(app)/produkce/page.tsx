"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, Check, ChevronDown, Clapperboard,
  Clock, AlertCircle, CheckCircle2, User, CalendarDays,
  TrendingUp, RefreshCw, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
type FormatZ    = "CELODENNÍ" | "3 HOD" | "BTS";
type FormatM    = "FOTO" | "VIDEO" | "FOTO + VIDEO" | "BTS" | string;
type StatusMark = "✅" | "❓" | "";
type PoznamkaType =
  | "NADPRACOVANÉ" | "NEVYČERPANÉ" | "PROPLACENO"
  | `NÁHRADA ${string}` | `PŘEDPRACOVANÉ ${string}` | string;

interface ZEntry {
  id: number;
  mesic: string;
  datum: string;
  projekt: string;
  format: FormatZ;
  status: StatusMark;
  poznamka: PoznamkaType;
}
interface MEntry {
  id: number;
  mesic: string;
  datum: string;
  projekt: string;
  format: FormatM;
  status: StatusMark;
  castka: number;
  poznamka: string;
}

/* ── Zdeněk paušál config ───────────────────────────────────────────────────── */
const PAUSAL_CELODENNI = 1;
const PAUSAL_3HOD      = 2;
// BTS = extra, not counted toward paušál quota

/* ── MONTHS ─────────────────────────────────────────────────────────────────── */
const MONTHS_CZ = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

/* ── Seed: Zdeněk Dolíhal ───────────────────────────────────────────────────── */
const Z_SEED: ZEntry[] = [
  // LEDEN
  { id:  1, mesic: "Leden",  datum: "4. 1.",  projekt: "SK Brno Slatina — EXTRALIGA 6. kolo",    format: "3 HOD",     status: "✅", poznamka: "NEVYČERPANÉ" },
  { id:  2, mesic: "Leden",  datum: "15. 1.", projekt: "Power Plate Česko — natáčení",           format: "3 HOD",     status: "✅", poznamka: "" },
  { id:  3, mesic: "Leden",  datum: "28. 1.", projekt: "BehejBrno — trénink",                    format: "BTS",       status: "✅", poznamka: "NÁHRADA PROSINEC 2025" },
  // ÚNOR
  { id:  4, mesic: "Únor",   datum: "10. 2.", projekt: "NERA Displays — promo video EuroShop",   format: "CELODENNÍ", status: "✅", poznamka: "PROPLACENO" },
  { id:  5, mesic: "Únor",   datum: "13. 2.", projekt: "BehejBrno — CRAFT Brněnský půlmaraton",  format: "BTS",       status: "✅", poznamka: "NÁHRADA LEDEN" },
  { id:  6, mesic: "Únor",   datum: "15. 2.", projekt: "SK Brno Slatina — EXTRALIGA 7. kolo",    format: "3 HOD",     status: "✅", poznamka: "" },
  { id:  7, mesic: "Únor",   datum: "16. 2.", projekt: "SENIMED s.r.o.",                          format: "CELODENNÍ", status: "✅", poznamka: "NÁHRADA LEDEN" },
  // BŘEZEN
  { id:  8, mesic: "Březen", datum: "4. 3.",  projekt: "Cukrárna TOFFI — Produktové focení DORTY", format: "3 HOD",   status: "✅", poznamka: "NÁHRADA ÚNOR" },
  { id:  9, mesic: "Březen", datum: "11. 3.", projekt: "SENIMED Lékárna — nová pobočka",          format: "CELODENNÍ", status: "✅", poznamka: "" },
  { id: 10, mesic: "Březen", datum: "12. 3.", projekt: "TEKMA — PROMO VIDEO",                     format: "CELODENNÍ", status: "✅", poznamka: "PŘEDPRACOVANÉ DUBEN" },
  { id: 11, mesic: "Březen", datum: "17. 3.", projekt: "SK Brno Slatina — pozvánka FINAL 4",      format: "BTS",       status: "✅", poznamka: "" },
  { id: 12, mesic: "Březen", datum: "18. 3.", projekt: "BehejBrno — Sokol Brno 1",               format: "BTS",       status: "✅", poznamka: "NÁHRADA ÚNOR" },
  { id: 13, mesic: "Březen", datum: "25. 3.", projekt: "EFFECT Clinic — FOTO + VIDEO",            format: "3 HOD",     status: "✅", poznamka: "" },
  // DUBEN
  { id: 14, mesic: "Duben",  datum: "9. 4.",  projekt: "SENIMED s.r.o.",                          format: "CELODENNÍ", status: "✅", poznamka: "" },
  { id: 15, mesic: "Duben",  datum: "15. 4.", projekt: "POWER PLATE ČESKO",                       format: "CELODENNÍ", status: "✅", poznamka: "NADPRACOVANÉ" },
  { id: 16, mesic: "Duben",  datum: "17. 4.", projekt: "FIRESTA — Dvorecký most",                 format: "CELODENNÍ", status: "✅", poznamka: "NADPRACOVANÉ" },
  { id: 17, mesic: "Duben",  datum: "19. 4.", projekt: "BehejBrno — CRAFT Brněnský půlmaraton",   format: "3 HOD",     status: "✅", poznamka: "" },
  // KVĚTEN
  { id: 18, mesic: "Květen", datum: "7. 5.",  projekt: "Cukrárna TOFFI — Šumavská",              format: "3 HOD",     status: "✅", poznamka: "" },
  { id: 19, mesic: "Květen", datum: "16. 5.", projekt: "SK Brno Slatina — FINAL FOUR live",       format: "CELODENNÍ", status: "❓", poznamka: "" },
  { id: 20, mesic: "Květen", datum: "",       projekt: "",                                         format: "3 HOD",     status: "❓", poznamka: "" },
  { id: 21, mesic: "Květen", datum: "",       projekt: "",                                         format: "BTS",       status: "❓", poznamka: "" },
];

/* ── Seed: Matěj Hořák ──────────────────────────────────────────────────────── */
const M_SEED: MEntry[] = [
  // LEDEN — bez projektu
  { id:  1, mesic: "Leden",  datum: "",       projekt: "BEZ PROJEKTU",                                                          format: "—",    status: "",  castka: 0,    poznamka: "" },
  // ÚNOR
  { id:  2, mesic: "Únor",   datum: "25. 2.", projekt: "EASTGATE Brno — průběh stavby měsíc ÚNOR",                              format: "3 HOD", status: "✅", castka: 3000, poznamka: "PROPLACENO" },
  // BŘEZEN
  { id:  3, mesic: "Březen", datum: "24. 3.", projekt: "EASTGATE Brno — průběh stavby měsíc BŘEZEN",                            format: "3 HOD", status: "✅", castka: 3000, poznamka: "PROPLACENO" },
  // DUBEN
  { id:  4, mesic: "Duben",  datum: "17. 4.", projekt: 'IMTOS, spol. s r.o. — "ROSSO STEEL, a.s. firemní akce" (FOTO + VIDEO)', format: "3 HOD", status: "✅", castka: 3500, poznamka: "" },
  { id:  5, mesic: "Duben",  datum: "21. 4.", projekt: 'IMTOS, spol. s r.o. — "Dny průmyslového čištění" (FOTO + VIDEO)',       format: "3 HOD", status: "✅", castka: 3000, poznamka: "" },
  { id:  6, mesic: "Duben",  datum: "22. 4.", projekt: "EASTGATE Brno — průběh stavby měsíc DUBEN",                             format: "3 HOD", status: "✅", castka: 3000, poznamka: "" },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fKc(n: number) { return n ? n.toLocaleString("cs-CZ") + " Kč" : "—"; }

/* ── Format styles ──────────────────────────────────────────────────────────── */
function fmtStyleZ(f: FormatZ) {
  if (f === "CELODENNÍ") return { color: "oklch(0.81 0.155 200)", bg: "oklch(0.81 0.155 200 / 0.1)",  border: "oklch(0.81 0.155 200 / 0.25)" };
  if (f === "3 HOD")     return { color: "oklch(0.67 0.155 155)", bg: "oklch(0.67 0.155 155 / 0.09)", border: "oklch(0.67 0.155 155 / 0.22)" };
  return                        { color: "oklch(0.78 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.09)",  border: "oklch(0.74 0.165 75 / 0.22)" };
}
function fmtStyleM(f: string) {
  if (f === "FOTO + VIDEO") return { color: "oklch(0.72 0.18 290)",  bg: "oklch(0.64 0.21 290 / 0.1)", border: "oklch(0.64 0.21 290 / 0.22)" };
  if (f === "VIDEO")        return { color: "oklch(0.81 0.155 200)", bg: "oklch(0.81 0.155 200 / 0.1)",border: "oklch(0.81 0.155 200 / 0.22)" };
  if (f === "FOTO")         return { color: "oklch(0.78 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.09)",border: "oklch(0.74 0.165 75 / 0.22)" };
  return                           { color: "oklch(0.55 0.005 222)", bg: "oklch(1 0 0 / 0.05)",        border: "oklch(1 0 0 / 0.1)" };
}

function poznamkaStyle(p: string) {
  if (p === "NADPRACOVANÉ")     return { color: "oklch(0.81 0.155 200)", bg: "oklch(0.81 0.155 200 / 0.1)", border: "oklch(0.81 0.155 200 / 0.25)" };
  if (p === "NEVYČERPANÉ")      return { color: "oklch(0.65 0.22 25)",   bg: "oklch(0.65 0.22 25 / 0.1)",   border: "oklch(0.65 0.22 25 / 0.25)" };
  if (p === "PROPLACENO")       return { color: "oklch(0.67 0.155 155)", bg: "oklch(0.67 0.155 155 / 0.08)",border: "oklch(0.67 0.155 155 / 0.2)" };
  if (p.startsWith("NÁHRADA"))  return { color: "oklch(0.78 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.09)", border: "oklch(0.74 0.165 75 / 0.22)" };
  if (p.startsWith("PŘEDPRAC")) return { color: "oklch(0.72 0.18 290)",  bg: "oklch(0.64 0.21 290 / 0.08)", border: "oklch(0.64 0.21 290 / 0.2)" };
  return null;
}

function statusIcon(s: StatusMark) {
  if (s === "✅") return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.67 0.155 155)" }} />;
  if (s === "❓") return <AlertCircle  className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.165 75)" }} />;
  return <Clock className="w-3.5 h-3.5" style={{ color: "oklch(0.35 0.005 222)" }} />;
}

/* ── Shared small components ─────────────────────────────────────────────────── */
function FmtBadge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-[5px] text-[11px] font-bold whitespace-nowrap tracking-[0.02em]"
      style={{ color, background: bg, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}
function PozBadge({ label }: { label: string }) {
  const s = poznamkaStyle(label);
  if (!s) return <span className="text-[11px] text-[--muted-foreground]">{label}</span>;
  return (
    <span className="inline-flex px-2 py-0.5 rounded-[5px] text-[10px] font-bold whitespace-nowrap tracking-[0.04em]"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {label}
    </span>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">{label}</label>
      {children}
    </div>
  );
}
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
const iSty = { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)", fontFamily: "var(--font-jakarta)" };
function FInput({ value, onChange, placeholder }: { value: string; onChange:(v:string)=>void; placeholder?:string }) {
  return <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={iCls} style={iSty}
    onFocus={e=>(e.target.style.borderColor="oklch(0.81 0.155 200 / 0.5)")} onBlur={e=>(e.target.style.borderColor="oklch(1 0 0 / 0.09)")} />;
}
function FSelect({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e=>onChange(e.target.value)} className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
        {options.map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
    </div>
  );
}
function MonthHeader({ mesic, count, color, right }: { mesic: string; count: number; color: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 pt-4 pb-1.5 px-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-outfit)", color }}>{mesic}</span>
      <span className="flex-1 h-px" style={{ background: `${color}33` }} />
      {right ?? <span className="text-[10px] text-[--muted-foreground]">{count} {count===1?"položka":count<5?"položky":"položek"}</span>}
    </div>
  );
}

/* ── Modal wrapper ───────────────────────────────────────────────────────────── */
function ModalWrap({ title, onClose, onSave, children }: { title:string; onClose:()=>void; onSave:()=>void; children:React.ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{background:"oklch(0 0 0 / 0.6)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <motion.div className="relative w-full md:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
        style={{background:"oklch(0.11 0.008 222)",border:"1px solid oklch(1 0 0 / 0.09)"}}
        initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
        transition={{duration:0.3,ease:[0.23,1,0.32,1]}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
          <h2 className="text-[15px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground] hover:text-[--foreground] transition-colors"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
          <button onClick={onClose} className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile" style={{background:"oklch(1 0 0 / 0.04)",border:"1px solid oklch(1 0 0 / 0.08)"}}>Zrušit</button>
          <motion.button onClick={onSave} whileHover={{filter:"brightness(1.08)"}} whileTap={{scale:0.96}}
            className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
            style={{background:"oklch(0.81 0.155 200)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
            Uložit
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Zdeněk paušál progress ─────────────────────────────────────────────────── */
function PausalBar({ done, total, label, color }: { done:number; total:number; label:string; color:string }) {
  const pct = Math.min((done/total)*100, 100);
  const over = done > total;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[--muted-foreground]">{label}</span>
        <span className="num text-[12px] font-bold" style={{ fontFamily:"var(--font-outfit)", color: over?"oklch(0.81 0.155 200)":done===total?"oklch(0.67 0.155 155)":color }}>
          {done}/{total}{over?` (+${done-total})`:""}
        </span>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden" style={{background:"oklch(1 0 0 / 0.08)"}}>
        <motion.div className="h-full rounded-full" style={{background: over?"oklch(0.81 0.155 200)":done===total?"oklch(0.67 0.155 155)":color}}
          initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.6,ease:[0.23,1,0.32,1]}}/>
      </div>
    </div>
  );
}

/* ── ZDENĚK tab ─────────────────────────────────────────────────────────────── */
const Z_EMPTY: Omit<ZEntry,"id"> = { mesic:"Květen", datum:"", projekt:"", format:"3 HOD", status:"❓", poznamka:"" };

function ZdenekTab({ entries, setEntries }: { entries:ZEntry[]; setEntries:(fn:(p:ZEntry[])=>ZEntry[])=>void }) {
  const [modal, setModal]   = useState<ZEntry|null|"new">(null);
  const [mesicF, setMesicF] = useState("Vše");

  // Build months that have data (newest first)
  const usedMonths = useMemo(() => {
    const s = new Set(entries.map(e=>e.mesic));
    return MONTHS_CZ.filter(m=>s.has(m)).reverse();
  }, [entries]);

  const filtered = useMemo(() => {
    const base = mesicF==="Vše" ? entries : entries.filter(e=>e.mesic===mesicF);
    return [...base].sort((a,b)=>MONTHS_CZ.indexOf(b.mesic)-MONTHS_CZ.indexOf(a.mesic));
  }, [entries, mesicF]);

  const grouped = useMemo(() => {
    const g:{mesic:string;items:ZEntry[]}[]=[];
    const seen:Record<string,number>={};
    filtered.forEach(e=>{
      if(seen[e.mesic]===undefined){seen[e.mesic]=g.length;g.push({mesic:e.mesic,items:[]});}
      g[seen[e.mesic]].items.push(e);
    });
    return g;
  },[filtered]);

  // Per-month paušál stats
  function monthStats(mesic:string) {
    const items = entries.filter(e=>e.mesic===mesic && e.status==="✅");
    const celodenni = items.filter(e=>e.format==="CELODENNÍ").length;
    const hod3      = items.filter(e=>e.format==="3 HOD").length;
    const bts       = items.filter(e=>e.format==="BTS").length;
    return { celodenni, hod3, bts };
  }

  // Global stats
  const totalDone  = entries.filter(e=>e.status==="✅").length;
  const totalPlan  = entries.filter(e=>e.status==="❓").length;
  const totalExtra = entries.filter(e=>e.poznamka==="NADPRACOVANÉ").length;

  function save(data: Omit<ZEntry,"id">&{id?:number}) {
    if(data.id!==undefined) setEntries(p=>p.map(e=>e.id===data.id?{...data,id:data.id!}:e));
    else setEntries(p=>[...p,{...data,id:Date.now()}]);
    setModal(null);
  }

  const accentColor = "oklch(0.81 0.155 200)";

  return (
    <div className="space-y-4">
      {/* Contract info banner */}
      <div className="card px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0"
            style={{background:"oklch(0.81 0.155 200)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>ZD</div>
          <div>
            <p className="text-[14px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>Zdeněk Dolíhal</p>
            <p className="text-[11px] text-[--muted-foreground] mt-0.5">Kameraman &amp; fotograf · Měsíční paušál</p>
          </div>
        </div>
        <div className="md:ml-auto flex flex-wrap gap-2">
          {[
            { label:"1× CELODENNÍ / měsíc", color:"oklch(0.81 0.155 200)", bg:"oklch(0.81 0.155 200 / 0.1)", border:"oklch(0.81 0.155 200 / 0.25)" },
            { label:"2× 3 HOD / měsíc",     color:"oklch(0.67 0.155 155)", bg:"oklch(0.67 0.155 155 / 0.09)",border:"oklch(0.67 0.155 155 / 0.22)" },
            { label:"v rámci Brna",          color:"oklch(0.55 0.005 222)", bg:"oklch(1 0 0 / 0.05)",         border:"oklch(1 0 0 / 0.1)" },
          ].map(t=>(
            <span key={t.label} className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold"
              style={{color:t.color,background:t.bg,border:`1px solid ${t.border}`}}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden" style={{background:"oklch(1 0 0 / 0.06)"}}>
        {[
          {label:"Splněno celkem",   value:totalDone,  color:"oklch(0.67 0.155 155)"},
          {label:"Plánováno",        value:totalPlan,  color:"oklch(0.78 0.165 75)"},
          {label:"Nadpracováno",     value:totalExtra, color:"oklch(0.81 0.155 200)"},
        ].map(s=>(
          <div key={s.label} className="px-4 py-4" style={{background:"var(--card)"}}>
            <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-1.5 leading-tight">{s.label}</p>
            <p className="num text-[28px] font-bold leading-none" style={{fontFamily:"var(--font-outfit)",color:s.color,letterSpacing:"-0.02em"}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {["Vše",...usedMonths].map(m=>(
            <motion.button key={m} onClick={()=>setMesicF(m)} whileTap={{scale:0.95}}
              className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
              style={mesicF===m
                ?{background:"oklch(0.81 0.155 200 / 0.1)",color:accentColor,border:`1px solid oklch(0.81 0.155 200 / 0.25)`}
                :{background:"transparent",color:"oklch(0.40 0.005 222)",border:"1px solid oklch(1 0 0 / 0.06)"}}>
              {m}
            </motion.button>
          ))}
        </div>
        <motion.button onClick={()=>setModal("new")} whileTap={{scale:0.96}}
          className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
          style={{background:accentColor,color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          <Plus className="w-3.5 h-3.5"/> Přidat záznam
        </motion.button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{borderBottom:"1px solid oklch(1 0 0 / 0.07)"}}>
                {["Datum","Projekt","Formát","Status","Poznámka",""].map((h,i)=>(
                  <th key={i} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${h==="Poznámka"?"hidden lg:table-cell":h===""?"w-8":""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(group=>{
                const st = monthStats(group.mesic);
                const monthTotal = group.items.length;
                return (
                  <>
                    <tr key={`gh-${group.mesic}`}>
                      <td colSpan={6} className="px-4">
                        <MonthHeader mesic={group.mesic} count={monthTotal} color={accentColor}
                          right={
                            <div className="flex items-center gap-3 text-[11px]">
                              <span style={{color:"oklch(0.81 0.155 200)"}}>{st.celodenni}/{PAUSAL_CELODENNI} cel.</span>
                              <span style={{color:"oklch(0.67 0.155 155)"}}>{st.hod3}/{PAUSAL_3HOD} × 3hod</span>
                              {st.bts>0&&<span style={{color:"oklch(0.78 0.165 75)"}}>{st.bts}× BTS</span>}
                            </div>
                          }
                        />
                        {/* Paušál mini progress */}
                        <div className="grid grid-cols-2 gap-2 mb-3 mt-1">
                          <PausalBar done={st.celodenni} total={PAUSAL_CELODENNI} label="Celodenní" color="oklch(0.81 0.155 200)"/>
                          <PausalBar done={st.hod3}      total={PAUSAL_3HOD}      label="3 HOD"     color="oklch(0.67 0.155 155)"/>
                        </div>
                      </td>
                    </tr>
                    {group.items.map(item=>(
                      <motion.tr key={item.id} className="group border-b hover:bg-white/[0.015] transition-colors" style={{borderColor:"oklch(1 0 0 / 0.05)"}}>
                        <td className="px-4 py-3 text-[12px] text-[--muted-foreground] whitespace-nowrap w-[80px]">{item.datum||"—"}</td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground] max-w-[240px]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.01em"}}>
                          {item.projekt||<span className="text-[--muted-foreground] font-normal italic">Nenaplánováno</span>}
                        </td>
                        <td className="px-4 py-3"><FmtBadge label={item.format} {...fmtStyleZ(item.format as FormatZ)}/></td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">{statusIcon(item.status)}
                            <span className="text-[11px]" style={{color:item.status==="✅"?"oklch(0.67 0.155 155)":item.status==="❓"?"oklch(0.78 0.165 75)":"oklch(0.40 0.005 222)"}}>
                              {item.status==="✅"?"Splněno":item.status==="❓"?"Plánováno":"—"}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">{item.poznamka?<PozBadge label={item.poznamka}/>:"—"}</td>
                        <td className="pr-4 pl-2 py-3 w-8">
                          <motion.button onClick={()=>setModal(item)} whileTap={{scale:0.9}}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] btn-tactile transition-opacity" style={{color:"oklch(0.45 0.005 222)"}}>
                            <Edit2 className="w-3.5 h-3.5"/>
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={6} className="py-12 text-center text-[13px] text-[--muted-foreground]">Žádné záznamy.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal!==null&&(
          <ModalWrap title={modal==="new"?"Přidat záznam — Zdeněk":"Upravit záznam"} onClose={()=>setModal(null)}
            onSave={()=>{ if(typeof modal==="object") save({...modal}); else save({...Z_EMPTY}); }}>
            <ZForm entry={modal==="new"?null:modal} onSave={save} />
          </ModalWrap>
        )}
      </AnimatePresence>
    </div>
  );
}

function ZForm({ entry, onSave }: { entry:ZEntry|null; onSave:(d:Omit<ZEntry,"id">&{id?:number})=>void }) {
  const [f, setF] = useState<Omit<ZEntry,"id">>(entry?{...entry}:{...Z_EMPTY});
  const set = (k:keyof typeof f)=>(v:string)=>setF(p=>({...p,[k]:v}));
  return (
    <>
      <Field label="Měsíc"><FSelect value={f.mesic} onChange={set("mesic")} options={MONTHS_CZ}/></Field>
      <Field label="Datum"><FInput value={f.datum} onChange={set("datum")} placeholder="16. 5."/></Field>
      <Field label="Projekt"><FInput value={f.projekt} onChange={set("projekt")} placeholder="Název projektu / klienta"/></Field>
      <Field label="Formát"><FSelect value={f.format} onChange={set("format")} options={["CELODENNÍ","3 HOD","BTS"]}/></Field>
      <Field label="Status"><FSelect value={f.status} onChange={set("status")} options={["✅","❓",""]}/></Field>
      <Field label="Poznámka"><FSelect value={f.poznamka} onChange={set("poznamka")} options={["","NADPRACOVANÉ","NEVYČERPANÉ","PROPLACENO","NÁHRADA LEDEN","NÁHRADA ÚNOR","NÁHRADA BŘEZEN","NÁHRADA DUBEN","NÁHRADA KVĚTEN","PŘEDPRACOVANÉ ČERVEN","PŘEDPRACOVANÉ ČERVENEC"]}/></Field>
      <div className="md:col-span-2 flex justify-end">
        <motion.button onClick={()=>onSave({...f,...(entry?{id:entry.id}:{})})} whileTap={{scale:0.96}}
          className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
          style={{background:"oklch(0.81 0.155 200)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          {entry?"Uložit změny":"Přidat"}
        </motion.button>
      </div>
    </>
  );
}

/* ── MATĚJ tab ───────────────────────────────────────────────────────────────── */
const M_EMPTY: Omit<MEntry,"id"> = { mesic:"Květen", datum:"", projekt:"", format:"FOTO", status:"❓", castka:0, poznamka:"" };

function MatejTab({ entries, setEntries }: { entries:MEntry[]; setEntries:(fn:(p:MEntry[])=>MEntry[])=>void }) {
  const [modal, setModal]   = useState<MEntry|null|"new">(null);
  const [mesicF, setMesicF] = useState("Vše");

  const usedMonths = useMemo(()=>{
    const s=new Set(entries.map(e=>e.mesic));
    return MONTHS_CZ.filter(m=>s.has(m)).reverse();
  },[entries]);

  const filtered = useMemo(()=>{
    const base = mesicF==="Vše"?entries:entries.filter(e=>e.mesic===mesicF);
    return [...base].sort((a,b)=>MONTHS_CZ.indexOf(b.mesic)-MONTHS_CZ.indexOf(a.mesic));
  },[entries,mesicF]);

  const grouped = useMemo(()=>{
    const g:{mesic:string;items:MEntry[]}[]=[];
    const seen:Record<string,number>={};
    filtered.forEach(e=>{
      if(seen[e.mesic]===undefined){seen[e.mesic]=g.length;g.push({mesic:e.mesic,items:[]});}
      g[seen[e.mesic]].items.push(e);
    });
    return g;
  },[filtered]);

  const realEntries   = entries.filter(e=>e.projekt!=="BEZ PROJEKTU");
  const totalEarned   = realEntries.filter(e=>e.status==="✅").reduce((s,e)=>s+e.castka,0);
  const totalPending  = realEntries.filter(e=>e.status==="❓").reduce((s,e)=>s+e.castka,0);
  const jobsDone      = realEntries.filter(e=>e.status==="✅").length;

  const accentColor = "oklch(0.72 0.18 290)";

  function save(data:Omit<MEntry,"id">&{id?:number}) {
    if(data.id!==undefined) setEntries(p=>p.map(e=>e.id===data.id?{...data,id:data.id!}:e));
    else setEntries(p=>[...p,{...data,id:Date.now()}]);
    setModal(null);
  }

  return (
    <div className="space-y-4">
      {/* Profile banner */}
      <div className="card px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0"
            style={{background:"oklch(0.72 0.18 290)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>MH</div>
          <div>
            <p className="text-[14px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>Matěj Hořák</p>
            <p className="text-[11px] text-[--muted-foreground] mt-0.5">Fotograf &amp; kameraman · Platba za zakázku</p>
          </div>
        </div>
        <div className="md:ml-auto">
          <span className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold"
            style={{color:"oklch(0.72 0.18 290)",background:"oklch(0.64 0.21 290 / 0.1)",border:"1px solid oklch(0.64 0.21 290 / 0.25)"}}>
            Bez paušálu — per zakázka
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden" style={{background:"oklch(1 0 0 / 0.06)"}}>
        {[
          {label:"Celkem vyplaceno",  value:fKc(totalEarned),   color:"oklch(0.67 0.155 155)"},
          {label:"Čeká na vyplacení", value:fKc(totalPending),  color:"oklch(0.78 0.165 75)"},
          {label:"Zakázek splněno",   value:String(jobsDone),   color:"oklch(0.72 0.18 290)"},
        ].map(s=>(
          <div key={s.label} className="px-4 py-4" style={{background:"var(--card)"}}>
            <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-1.5 leading-tight">{s.label}</p>
            <p className="num leading-none" style={{fontSize:"clamp(18px,3vw,26px)",fontWeight:700,fontFamily:"var(--font-outfit)",color:s.color,letterSpacing:"-0.02em"}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {["Vše",...usedMonths].map(m=>(
            <motion.button key={m} onClick={()=>setMesicF(m)} whileTap={{scale:0.95}}
              className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
              style={mesicF===m
                ?{background:"oklch(0.64 0.21 290 / 0.1)",color:accentColor,border:`1px solid oklch(0.64 0.21 290 / 0.25)`}
                :{background:"transparent",color:"oklch(0.40 0.005 222)",border:"1px solid oklch(1 0 0 / 0.06)"}}>
              {m}
            </motion.button>
          ))}
        </div>
        <motion.button onClick={()=>setModal("new")} whileTap={{scale:0.96}}
          className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
          style={{background:accentColor,color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          <Plus className="w-3.5 h-3.5"/> Přidat zakázku
        </motion.button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{borderBottom:"1px solid oklch(1 0 0 / 0.07)"}}>
                {["Datum","Projekt","Formát","Status","Částka","Poznámka",""].map((h,i)=>(
                  <th key={i} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${h==="Poznámka"?"hidden lg:table-cell":h===""?"w-8":""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(group=>{
                const groupTotal = group.items.filter(i=>i.status==="✅").reduce((s,i)=>s+i.castka,0);
                return (
                  <>
                    <tr key={`gh-${group.mesic}`}>
                      <td colSpan={7} className="px-4">
                        {(() => {
                          const realItems = group.items.filter(i=>i.projekt!=="BEZ PROJEKTU");
                          const realCount = realItems.length;
                          return (
                            <MonthHeader mesic={group.mesic} count={realCount} color={accentColor}
                              right={realCount>0
                                ?<span className="text-[10px] text-[--muted-foreground]">{realCount} zakázek · <span style={{color:"oklch(0.67 0.155 155)"}}>{fKc(groupTotal)} splněno</span></span>
                                :<span className="text-[10px]" style={{color:"oklch(0.65 0.22 25)"}}>Žádná zakázka</span>
                              }/>
                          );
                        })()}
                      </td>
                    </tr>
                    {group.items.map(item=>{
                      const isBezProjektu = item.projekt === "BEZ PROJEKTU";
                      const fs = fmtStyleM(item.format);
                      if (isBezProjektu) return (
                        <tr key={item.id} style={{borderBottom:"1px solid oklch(1 0 0 / 0.05)"}}>
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-[6px]"
                              style={{background:"oklch(0.65 0.22 25 / 0.06)",border:"1px solid oklch(0.65 0.22 25 / 0.18)"}}>
                              <X className="w-3.5 h-3.5 shrink-0" style={{color:"oklch(0.65 0.22 25)"}}/>
                              <span className="text-[12px] font-semibold" style={{color:"oklch(0.65 0.22 25)"}}>BEZ PROJEKTU</span>
                              <span className="text-[11px] text-[--muted-foreground] ml-1">— v tomto měsíci nebyla zakázka</span>
                            </div>
                          </td>
                        </tr>
                      );
                      return (
                        <motion.tr key={item.id} className="group border-b hover:bg-white/[0.015] transition-colors" style={{borderColor:"oklch(1 0 0 / 0.05)"}}>
                          <td className="px-4 py-3 text-[12px] text-[--muted-foreground] whitespace-nowrap w-[80px]">{item.datum||"—"}</td>
                          <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.01em"}}>{item.projekt}</td>
                          <td className="px-4 py-3"><FmtBadge label={item.format} {...fs}/></td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5">{statusIcon(item.status)}
                              <span className="text-[11px]" style={{color:item.status==="✅"?"oklch(0.67 0.155 155)":item.status==="❓"?"oklch(0.78 0.165 75)":"oklch(0.40 0.005 222)"}}>
                                {item.status==="✅"?"Splněno":item.status==="❓"?"Plánováno":"—"}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 num text-[13px] font-bold text-right" style={{color:"oklch(0.72 0.18 290)",fontFamily:"var(--font-outfit)"}}>{fKc(item.castka)}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">{item.poznamka?<PozBadge label={item.poznamka}/>:"—"}</td>
                          <td className="pr-4 pl-2 py-3 w-8">
                            <motion.button onClick={()=>setModal(item)} whileTap={{scale:0.9}}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] btn-tactile transition-opacity" style={{color:"oklch(0.45 0.005 222)"}}>
                              <Edit2 className="w-3.5 h-3.5"/>
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={7} className="py-12 text-center text-[13px] text-[--muted-foreground]">Žádné zakázky.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal!==null&&(
          <ModalWrap title={modal==="new"?"Přidat zakázku — Matěj":"Upravit zakázku"} onClose={()=>setModal(null)} onSave={()=>{}}>
            <MForm entry={modal==="new"?null:modal} onSave={save}/>
          </ModalWrap>
        )}
      </AnimatePresence>
    </div>
  );
}

function MForm({ entry, onSave }: { entry:MEntry|null; onSave:(d:Omit<MEntry,"id">&{id?:number})=>void }) {
  const [f, setF] = useState<Omit<MEntry,"id">>(entry?{...entry}:{...M_EMPTY});
  const set = (k:keyof typeof f)=>(v:string)=>setF(p=>({...p,[k]:k==="castka"?Number(v.replace(/\D/g,""))||0:v}));
  return (
    <>
      <Field label="Měsíc"><FSelect value={f.mesic} onChange={set("mesic")} options={MONTHS_CZ}/></Field>
      <Field label="Datum"><FInput value={f.datum} onChange={set("datum")} placeholder="16. 5."/></Field>
      <Field label="Projekt"><FInput value={f.projekt} onChange={set("projekt")} placeholder="Klient — popis zakázky"/></Field>
      <Field label="Formát"><FSelect value={f.format} onChange={set("format")} options={["FOTO","VIDEO","FOTO + VIDEO","BTS"]}/></Field>
      <Field label="Částka (Kč)"><FInput value={f.castka?String(f.castka):""} onChange={set("castka")} placeholder="5000"/></Field>
      <Field label="Status"><FSelect value={f.status} onChange={set("status")} options={["✅","❓",""]}/></Field>
      <Field label="Poznámka"><FInput value={f.poznamka} onChange={set("poznamka")} placeholder="Volitelné..."/></Field>
      <div className="md:col-span-2 flex justify-end">
        <motion.button onClick={()=>onSave({...f,...(entry?{id:entry.id}:{})})} whileTap={{scale:0.96}}
          className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
          style={{background:"oklch(0.72 0.18 290)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          {entry?"Uložit změny":"Přidat"}
        </motion.button>
      </div>
    </>
  );
}

/* ── PŘEHLED tab ─────────────────────────────────────────────────────────────── */
function PrehledTab({ zEntries, mEntries }: { zEntries:ZEntry[]; mEntries:MEntry[] }) {
  const currentMonth = "Květen";

  const zMonth = zEntries.filter(e=>e.mesic===currentMonth);
  const zDone  = zMonth.filter(e=>e.status==="✅");
  const zCel   = zDone.filter(e=>e.format==="CELODENNÍ").length;
  const zHod   = zDone.filter(e=>e.format==="3 HOD").length;
  const zBts   = zDone.filter(e=>e.format==="BTS").length;

  const mMonth    = mEntries.filter(e=>e.mesic===currentMonth);
  const mEarned   = mMonth.filter(e=>e.status==="✅").reduce((s,e)=>s+e.castka,0);
  const mPending  = mMonth.filter(e=>e.status==="❓").reduce((s,e)=>s+e.castka,0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zdeněk card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{background:"oklch(0.81 0.155 200)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>ZD</div>
            <div>
              <p className="text-[14px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>Zdeněk Dolíhal</p>
              <p className="text-[11px] text-[--muted-foreground]">Paušál · {currentMonth} 2026</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <PausalBar done={zCel} total={PAUSAL_CELODENNI} label="Celodenní produkční den" color="oklch(0.81 0.155 200)"/>
            <PausalBar done={zHod} total={PAUSAL_3HOD}      label="3 hodinové produkční dny" color="oklch(0.67 0.155 155)"/>
          </div>
          {zBts>0&&<p className="text-[11px] text-[--muted-foreground]">+ {zBts}× BTS natáčení</p>}
          <div className="pt-2 border-t space-y-1.5" style={{borderColor:"oklch(1 0 0 / 0.07)"}}>
            {zMonth.slice(0,3).map(e=>(
              <div key={e.id} className="flex items-center gap-2 text-[12px]">
                {statusIcon(e.status)}
                <span className="text-[--foreground] truncate flex-1">{e.projekt||"(nenaplánováno)"}</span>
                <FmtBadge label={e.format} {...fmtStyleZ(e.format as FormatZ)}/>
              </div>
            ))}
            {zMonth.length>3&&<p className="text-[11px] text-[--muted-foreground]">+ {zMonth.length-3} dalších</p>}
          </div>
        </div>

        {/* Matěj card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{background:"oklch(0.72 0.18 290)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>MH</div>
            <div>
              <p className="text-[14px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>Matěj Hořák</p>
              <p className="text-[11px] text-[--muted-foreground]">Per zakázka · {currentMonth} 2026</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card px-4 py-3">
              <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.06em] mb-1">Splněno</p>
              <p className="num text-[22px] font-bold" style={{fontFamily:"var(--font-outfit)",color:"oklch(0.67 0.155 155)",letterSpacing:"-0.02em"}}>{fKc(mEarned)}</p>
            </div>
            <div className="card px-4 py-3">
              <p className="text-[10px] text-[--muted-foreground] uppercase tracking-[0.06em] mb-1">Plánováno</p>
              <p className="num text-[22px] font-bold" style={{fontFamily:"var(--font-outfit)",color:"oklch(0.78 0.165 75)",letterSpacing:"-0.02em"}}>{fKc(mPending)}</p>
            </div>
          </div>
          <div className="pt-2 border-t space-y-1.5" style={{borderColor:"oklch(1 0 0 / 0.07)"}}>
            {mMonth.slice(0,3).map(e=>(
              <div key={e.id} className="flex items-center gap-2 text-[12px]">
                {statusIcon(e.status)}
                <span className="text-[--foreground] truncate flex-1">{e.projekt}</span>
                <span className="num font-semibold shrink-0" style={{color:"oklch(0.72 0.18 290)",fontFamily:"var(--font-outfit)"}}>{fKc(e.castka)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card px-5 py-4">
        <p className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] mb-3">Legenda poznámek</p>
        <div className="flex flex-wrap gap-2">
          {[
            {l:"NADPRACOVANÉ",   d:"Odpracováno nad paušál"},
            {l:"NEVYČERPANÉ",    d:"Paušál nebyl vyčerpán"},
            {l:"PROPLACENO",     d:"Mimořádně proplaceno"},
            {l:"NÁHRADA MĚSÍC",  d:"Kompenzace za předchozí měsíc"},
            {l:"PŘEDPRACOVANÉ",  d:"Odpracováno dopředu"},
          ].map(({l,d})=>{
            const s=poznamkaStyle(l);
            return s?(
              <div key={l} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold" style={{color:s.color,background:s.bg,border:`1px solid ${s.border}`}}>{l}</span>
                <span className="text-[11px] text-[--muted-foreground]">{d}</span>
              </div>
            ):null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
type ProdTab = "prehled" | "zdenek" | "matej";

const TABS: { id:ProdTab; label:string; short:string; color:string }[] = [
  { id:"prehled", label:"Přehled",         short:"Přehled", color:"oklch(0.81 0.155 200)" },
  { id:"zdenek",  label:"Zdeněk Dolíhal",  short:"Zdeněk",  color:"oklch(0.81 0.155 200)" },
  { id:"matej",   label:"Matěj Hořák",     short:"Matěj",   color:"oklch(0.72 0.18 290)" },
];

export default function ProdukccePage() {
  const [tab,      setTab]      = useState<ProdTab>("prehled");
  const [zEntries, setZEntries] = useState<ZEntry[]>(Z_SEED);
  const [mEntries, setMEntries] = useState<MEntry[]>(M_SEED);

  const activeColor = TABS.find(t=>t.id===tab)?.color ?? "oklch(0.81 0.155 200)";

  return (
    <div className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{background:`radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.81 0.155 200 / 0.04) 0%, transparent 70%), var(--background)`}}>

      {/* Header */}
      <motion.div className="flex items-start justify-between gap-3"
        initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:0.4,ease:[0.23,1,0.32,1]}}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{background:"oklch(0.81 0.155 200 / 0.12)",border:"1px solid oklch(0.81 0.155 200 / 0.2)"}}>
            <Clapperboard className="w-4 h-4" style={{color:"oklch(0.81 0.155 200)"}}/>
          </div>
          <div>
            <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
              style={{fontFamily:"var(--font-outfit)",fontWeight:700,letterSpacing:"-0.03em"}}>Produkce</h1>
            <p className="text-[12px] text-[--muted-foreground] mt-1">Foto &amp; video externisté · 2026</p>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div className="flex items-center gap-1" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:0.05}}>
        {TABS.map(t=>{
          const active = tab===t.id;
          return (
            <motion.button key={t.id} onClick={()=>setTab(t.id)} whileTap={{scale:0.95}}
              className="relative flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold btn-tactile transition-colors"
              style={active
                ?{background:`${t.color.replace(")","/0.12)")}`,color:t.color,border:`1px solid ${t.color.replace(")","/0.25)")}`}
                :{background:"transparent",color:"oklch(0.40 0.005 222)",border:"1px solid oklch(1 0 0 / 0.06)"}}>
              {t.id==="zdenek"&&<span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0" style={{background:active?t.color:"oklch(0.25 0.005 222)",color:active?"oklch(0.09 0.008 222)":"oklch(0.45 0.005 222)"}}>ZD</span>}
              {t.id==="matej"&&<span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0" style={{background:active?t.color:"oklch(0.25 0.005 222)",color:active?"oklch(0.09 0.008 222)":"oklch(0.45 0.005 222)"}}>MH</span>}
              {t.id==="prehled"&&<CalendarDays className="w-3.5 h-3.5"/>}
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
          transition={{duration:0.25,ease:[0.23,1,0.32,1]}}>
          {tab==="prehled"&&<PrehledTab zEntries={zEntries} mEntries={mEntries}/>}
          {tab==="zdenek"&&<ZdenekTab  entries={zEntries} setEntries={fn=>setZEntries(fn)}/>}
          {tab==="matej"&&<MatejTab   entries={mEntries} setEntries={fn=>setMEntries(fn)}/>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
