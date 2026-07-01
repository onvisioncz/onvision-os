"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Sparkles, Loader2, ArrowLeft, Clapperboard, MapPin, Calendar,
  Send, CalendarPlus, ListChecks, Cloud,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { DEFAULT_USERS } from "@/lib/roles";
import {
  CALLSHEET_KEY, emptyCallSheet, mapsLink, SHOOT_TYPY, CALL_STATUSY,
  type CallSheet, type ShootTyp, type CallStatus,
} from "@/lib/callsheet";

const CallSheetDownloadButton = dynamic(
  () => import("@/components/call-sheet/CallSheetDownloadButton").then((m) => m.CallSheetDownloadButton),
  { ssr: false, loading: () => <span className="text-[12px] text-[--muted-foreground]">PDF…</span> }
);

const PRIMARY = "oklch(0.62 0.27 265)";
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

function L({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.04em]">{children}</label>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] p-4 md:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: "var(--font-heading)", color: PRIMARY }}>{title}</h3>
      {children}
    </div>
  );
}

interface RetainerClient { name: string }
interface ShootingDay { id: number; datum: string; klient: string; typ: string; lokace: string; clenove: string[]; zacatek: string; konec: string; poznamka: string }
interface Task { id: number; nazev: string; projekt: string; prirazeno: string; priorita: string; status: string; deadline: string }

export default function CallSheetPage() {
  const [sheets, setSheets] = useSupabaseData<CallSheet[]>(CALLSHEET_KEY, () => []);
  const [clients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", () => []);
  const [editing, setEditing] = useState<CallSheet | null>(null);

  const team = DEFAULT_USERS.filter((u) => u.aktivni).map((u) => u.displayName);
  const clientNames = clients.map((c) => c.name).filter(Boolean);

  const save = (cs: CallSheet) => {
    setSheets((prev) => prev.some((x) => x.id === cs.id) ? prev.map((x) => x.id === cs.id ? cs : x) : [...prev, cs]);
    setEditing(null);
  };
  const remove = (id: number) => setSheets((prev) => prev.filter((x) => x.id !== id));

  if (editing) {
    return <Editor sheet={editing} team={team} clientNames={clientNames} onSave={save} onCancel={() => setEditing(null)} onDelete={remove} />;
  }

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Call sheety</h1>
          <p className="text-[13px] text-[--muted-foreground]">Produkční listy na natáčení — vyplň, stáhni PDF, rozešli crew</p>
        </div>
        <button onClick={() => setEditing(emptyCallSheet(Date.now()))} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: PRIMARY, color: "white" }}>
          <Plus className="w-4 h-4" /> Nový call sheet
        </button>
      </div>

      {sheets.length === 0 ? (
        <div className="rounded-[12px] p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Clapperboard className="w-8 h-8 mx-auto mb-3" style={{ color: PRIMARY, opacity: 0.6 }} />
          <p className="text-[14px] text-[--muted-foreground]">Zatím žádné call sheety. Vytvoř první tlačítkem nahoře — nebo popiš natáčení do AI a ono ho vyplní.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[...sheets].sort((a, b) => b.id - a.id).map((cs) => (
            <motion.button key={cs.id} onClick={() => setEditing({ ...cs })} whileHover={{ y: -2 }}
              className="text-left rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-bold">{cs.nazev || "Bez názvu"}</span>
                <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold" style={{ color: PRIMARY, background: "oklch(0.62 0.27 265 / 0.12)" }}>{cs.typ}</span>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[--muted-foreground]">
                {cs.klient && <span>{cs.klient}</span>}
                {cs.datum && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{cs.datum}</span>}
                {cs.adresa && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cs.adresa}</span>}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Editor ──────────────────────────────────────────────────────────────── */
function Editor({ sheet, team, clientNames, onSave, onCancel, onDelete }: {
  sheet: CallSheet; team: string[]; clientNames: string[];
  onSave: (c: CallSheet) => void; onCancel: () => void; onDelete: (id: number) => void;
}) {
  const [cs, setCs] = useState<CallSheet>(sheet);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [, setShooting] = useSupabaseData<ShootingDay[]>("ov-shooting-days", () => []);
  const [, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };
  const isNew = !sheet.nazev && sheet.crew.length === 0;

  const set = <K extends keyof CallSheet>(k: K, v: CallSheet[K]) => setCs((p) => ({ ...p, [k]: v }));

  /* ── Integrace ────────────────────────────────────────────────────────── */
  const sendCrew = async () => {
    setBusy("send");
    try {
      const res = await fetch("/api/call-sheet/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sheet: cs }) });
      const j = await res.json();
      if (j.ok) flash(`Odesláno crew (${j.sent})${j.skipped?.length ? ` · bez e-mailu: ${j.skipped.join(", ")}` : ""}`);
      else flash(`Chyba: ${j.error ?? "nepodařilo se"}`);
    } catch { flash("Chyba sítě."); } finally { setBusy(null); }
  };

  const toShooting = () => {
    setShooting((prev) => [...prev, {
      id: Date.now(), datum: cs.datum, klient: cs.klient, typ: cs.typ, lokace: cs.adresa,
      clenove: cs.crew.map((c) => c.jmeno).filter(Boolean), zacatek: cs.casSrazu, konec: cs.konec,
      poznamka: `Z call sheetu: ${cs.nazev}`,
    }]);
    flash("Přidáno do produkčního plánu.");
  };

  const genTasks = () => {
    const proj = cs.nazev || cs.klient || "Natáčení";
    const assign = cs.crew[0]?.jmeno || "Produkce";
    const items: string[] = [];
    cs.pujcenaTechnika.forEach((r) => r.nazev && items.push(`Půjčit: ${r.nazev}${r.odkud ? ` (${r.odkud})` : ""}`));
    if (cs.catering) items.push(`Zajistit catering: ${cs.catering}`);
    if (cs.rekvizity) items.push(`Připravit rekvizity: ${cs.rekvizity}`);
    if (cs.doprava) items.push(`Doprava techniky: ${cs.doprava}`);
    if (items.length === 0) { flash("Není z čeho úkoly vytvořit (vyplň techniku/catering…)."); return; }
    setTasks((prev) => {
      let id = Date.now();
      const nove: Task[] = items.map((nazev) => ({ id: id++, nazev, projekt: proj, prirazeno: assign, priorita: "Střední", status: "Nové", deadline: cs.datum }));
      return [...prev, ...nove];
    });
    flash(`Vytvořeno ${items.length} úkolů.`);
  };

  const loadWeather = async () => {
    if (!cs.adresa || !cs.datum) { flash("Vyplň nejdřív adresu a datum."); return; }
    setBusy("weather");
    try {
      const res = await fetch("/api/call-sheet/weather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adresa: cs.adresa, datum: cs.datum }) });
      const j = await res.json();
      if (j.pocasi) { setCs((p) => ({ ...p, pocasi: j.pocasi, golden: j.golden || p.golden })); flash("Počasí načteno."); }
      else flash(`Chyba: ${j.error ?? "nepodařilo se"}`);
    } catch { flash("Chyba sítě."); } finally { setBusy(null); }
  };

  const runAi = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiErr(null);
    try {
      const res = await fetch("/api/call-sheet/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const j = await res.json();
      if (j.fields) {
        setCs((p) => ({ ...p, ...j.fields }));
        setAiText("");
      } else setAiErr(j.error ?? "AI nevrátila data.");
    } catch { setAiErr("Chyba sítě."); }
    finally { setAiLoading(false); }
  };

  // generic repeatable-row helpers
  const addRow = <K extends keyof CallSheet>(k: K, empty: unknown) =>
    set(k, [...(cs[k] as unknown as unknown[]), empty] as unknown as CallSheet[K]);
  const setRow = <K extends keyof CallSheet>(k: K, i: number, patch: Record<string, unknown>) =>
    set(k, (cs[k] as unknown as Record<string, unknown>[]).map((r, j) => j === i ? { ...r, ...patch } : r) as unknown as CallSheet[K]);
  const delRow = <K extends keyof CallSheet>(k: K, i: number) =>
    set(k, (cs[k] as unknown as unknown[]).filter((_, j) => j !== i) as unknown as CallSheet[K]);

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onCancel} className="btn-tactile flex items-center gap-1.5 text-[13px] text-[--muted-foreground]">
          <ArrowLeft className="w-4 h-4" /> Zpět
        </button>
        <div className="flex items-center gap-2">
          {!isNew && <CallSheetDownloadButton data={cs} fileName={`callsheet-${(cs.nazev || "natáčení").replace(/\s+/g, "-")}.pdf`} />}
          <button onClick={() => onSave(cs)} disabled={!cs.nazev.trim()} className="btn-tactile px-4 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Uložit</button>
        </div>
      </div>

      {/* AI fill */}
      <div className="rounded-[12px] p-4" style={{ background: "oklch(0.62 0.27 265 / 0.06)", border: "1px solid oklch(0.62 0.27 265 / 0.18)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" style={{ color: PRIMARY }} />
          <span className="text-[13px] font-semibold">Vyplnit AI z popisu</span>
        </div>
        <div className="flex gap-2">
          <input className={iCls} style={iStyle} value={aiText} onChange={(e) => setAiText(e.target.value)}
            placeholder="např. Zítra 8:00 točíme promo pro Firestu na stadionu, kameraman Zdeněk, půjčíme gimbal z Foto Škoda…"
            onKeyDown={(e) => e.key === "Enter" && runAi()} />
          <button onClick={runAi} disabled={aiLoading || !aiText.trim()} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] text-[13px] font-semibold whitespace-nowrap disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Vyplnit
          </button>
        </div>
        {aiErr && <p className="text-[12px] mt-1.5" style={{ color: "oklch(0.65 0.22 25)" }}>{aiErr}</p>}
      </div>

      {/* Akce / integrace */}
      <div className="flex flex-wrap gap-2">
        <button onClick={sendCrew} disabled={busy === "send"} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-40" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
          {busy === "send" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" style={{ color: PRIMARY }} />} Rozeslat crew
        </button>
        <button onClick={toShooting} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
          <CalendarPlus className="w-3.5 h-3.5" style={{ color: PRIMARY }} /> Do produkčního plánu
        </button>
        <button onClick={genTasks} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
          <ListChecks className="w-3.5 h-3.5" style={{ color: PRIMARY }} /> Vygenerovat úkoly
        </button>
      </div>

      {/* Hlavička */}
      <Section title="Hlavička">
        <div className="grid md:grid-cols-2 gap-3">
          <div><L>Název natáčení</L><input className={iCls} style={iStyle} value={cs.nazev} onChange={(e) => set("nazev", e.target.value)} placeholder="Promo video…" /></div>
          <div><L>Klient</L><input list="cs-clients" className={iCls} style={iStyle} value={cs.klient} onChange={(e) => set("klient", e.target.value)} placeholder="Klient" />
            <datalist id="cs-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist></div>
          <div><L>Datum</L><input className={iCls} style={iStyle} value={cs.datum} onChange={(e) => set("datum", e.target.value)} placeholder="20. 6. 2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><L>Typ</L><select className={iCls} style={iStyle} value={cs.typ} onChange={(e) => set("typ", e.target.value as ShootTyp)}>{SHOOT_TYPY.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><L>Status</L><select className={iCls} style={iStyle} value={cs.status} onChange={(e) => set("status", e.target.value as CallStatus)}>{CALL_STATUSY.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
        </div>
      </Section>

      {/* Čas & místo */}
      <Section title="Čas & místo">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><L>Čas srazu</L><input className={iCls} style={iStyle} value={cs.casSrazu} onChange={(e) => set("casSrazu", e.target.value)} placeholder="8:00" /></div>
            <div><L>Konec</L><input className={iCls} style={iStyle} value={cs.konec} onChange={(e) => set("konec", e.target.value)} placeholder="16:00" /></div>
          </div>
          <div><L>Kontakt na místě</L><input className={iCls} style={iStyle} value={cs.kontaktMisto} onChange={(e) => set("kontaktMisto", e.target.value)} placeholder="Jméno + telefon" /></div>
          <div><L>Adresa</L><input className={iCls} style={iStyle} value={cs.adresa} onChange={(e) => set("adresa", e.target.value)} placeholder="Ulice, město" />
            {cs.adresa && <a href={mapsLink(cs.adresa)} target="_blank" rel="noopener noreferrer" className="text-[11px] mt-1 inline-block" style={{ color: PRIMARY }}>Otevřít v mapách →</a>}</div>
          <div><L>Sraz / parkování</L><input className={iCls} style={iStyle} value={cs.sraz} onChange={(e) => set("sraz", e.target.value)} placeholder="Kde se sejdeme, kde parkovat" /></div>
        </div>
      </Section>

      {/* Tým */}
      <Section title="Tým (obsazení)">
        <div className="space-y-2">
          {cs.crew.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input list="cs-team" className={iCls} style={iStyle} value={c.jmeno} placeholder="Jméno" onChange={(e) => setRow("crew", i, { jmeno: e.target.value })} />
              <input className={iCls} style={iStyle} value={c.role} placeholder="Role (kameraman…)" onChange={(e) => setRow("crew", i, { role: e.target.value })} />
              <input className="w-24 px-3 py-2 rounded-[7px] text-[13px] outline-none" style={iStyle} value={c.prichod} placeholder="Příchod" onChange={(e) => setRow("crew", i, { prichod: e.target.value })} />
              <button onClick={() => delRow("crew", i)} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <datalist id="cs-team">{team.map((t) => <option key={t} value={t} />)}</datalist>
          <button onClick={() => addRow("crew", { jmeno: "", role: "", prichod: "" })} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat člena</button>
        </div>
        <label className="flex items-center gap-2 text-[13px] mt-3 cursor-pointer">
          <input type="checkbox" checked={cs.klientPritomen} onChange={(e) => set("klientPritomen", e.target.checked)} /> Klient je přítomen na natáčení
        </label>
      </Section>

      {/* Technika */}
      <Section title="Technika">
        <div><L>Vlastní technika</L><textarea className={iCls} style={{ ...iStyle, minHeight: 60 }} value={cs.technika} onChange={(e) => set("technika", e.target.value)} placeholder="Kamera, objektivy, světla, zvuk…" /></div>
        <div className="mt-3 space-y-2">
          <L>Půjčená technika</L>
          {cs.pujcenaTechnika.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input className={iCls} style={iStyle} value={r.nazev} placeholder="Co" onChange={(e) => setRow("pujcenaTechnika", i, { nazev: e.target.value })} />
              <input className={iCls} style={iStyle} value={r.odkud} placeholder="Odkud" onChange={(e) => setRow("pujcenaTechnika", i, { odkud: e.target.value })} />
              <input className="w-24 px-3 py-2 rounded-[7px] text-[13px] outline-none" style={iStyle} value={r.cena} placeholder="Cena" onChange={(e) => setRow("pujcenaTechnika", i, { cena: e.target.value })} />
              <input className="w-28 px-3 py-2 rounded-[7px] text-[13px] outline-none" style={iStyle} value={r.vraceni} placeholder="Vrácení" onChange={(e) => setRow("pujcenaTechnika", i, { vraceni: e.target.value })} />
              <button onClick={() => delRow("pujcenaTechnika", i)} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => addRow("pujcenaTechnika", { nazev: "", odkud: "", cena: "", vraceni: "" })} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat půjčenou</button>
        </div>
      </Section>

      {/* Harmonogram */}
      <Section title="Harmonogram">
        <div className="space-y-2">
          {cs.harmonogram.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input className="w-28 px-3 py-2 rounded-[7px] text-[13px] outline-none" style={iStyle} value={h.cas} placeholder="9:00" onChange={(e) => setRow("harmonogram", i, { cas: e.target.value })} />
              <input className={iCls} style={iStyle} value={h.co} placeholder="Co se děje" onChange={(e) => setRow("harmonogram", i, { co: e.target.value })} />
              <button onClick={() => delRow("harmonogram", i)} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => addRow("harmonogram", { cas: "", co: "" })} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat blok</button>
        </div>
        <div className="mt-3"><L>Shot list / co natáčíme</L><textarea className={iCls} style={{ ...iStyle, minHeight: 60 }} value={cs.shotList} onChange={(e) => set("shotList", e.target.value)} placeholder="Scény, záběry…" /></div>
      </Section>

      {/* Podmínky */}
      <Section title="Podmínky (venku / sport)">
        <button onClick={loadWeather} disabled={busy === "weather"} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold mb-3 disabled:opacity-40" style={{ border: "1px solid var(--border)" }}>
          {busy === "weather" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" style={{ color: PRIMARY }} />} Načíst počasí z adresy
        </button>
        <div className="grid md:grid-cols-3 gap-3">
          <div><L>Počasí</L><input className={iCls} style={iStyle} value={cs.pocasi} onChange={(e) => set("pocasi", e.target.value)} placeholder="Předpověď" /></div>
          <div><L>Východ / západ slunce</L><input className={iCls} style={iStyle} value={cs.golden} onChange={(e) => set("golden", e.target.value)} placeholder="Golden hour" /></div>
          <div><L>Náhradní plán (déšť)</L><input className={iCls} style={iStyle} value={cs.planB} onChange={(e) => set("planB", e.target.value)} placeholder="Plán B" /></div>
        </div>
      </Section>

      {/* Logistika */}
      <Section title="Logistika">
        <div className="grid md:grid-cols-2 gap-3">
          <div><L>Catering</L><input className={iCls} style={iStyle} value={cs.catering} onChange={(e) => set("catering", e.target.value)} placeholder="Jídlo, pití" /></div>
          <div><L>Rekvizity</L><input className={iCls} style={iStyle} value={cs.rekvizity} onChange={(e) => set("rekvizity", e.target.value)} placeholder="Props" /></div>
          <div><L>Dress code</L><input className={iCls} style={iStyle} value={cs.dressCode} onChange={(e) => set("dressCode", e.target.value)} placeholder="Styling" /></div>
          <div><L>Doprava techniky</L><input className={iCls} style={iStyle} value={cs.doprava} onChange={(e) => set("doprava", e.target.value)} placeholder="Kdo veze" /></div>
        </div>
      </Section>

      {/* Ostatní */}
      <Section title="Ostatní">
        <div className="grid md:grid-cols-2 gap-3">
          <div><L>Moodboard / reference (odkaz)</L><input className={iCls} style={iStyle} value={cs.moodboard} onChange={(e) => set("moodboard", e.target.value)} placeholder="https://…" /></div>
          <div><L>Deadline dodání výstupu</L><input className={iCls} style={iStyle} value={cs.deadlineVystup} onChange={(e) => set("deadlineVystup", e.target.value)} placeholder="Kdy odevzdat" /></div>
        </div>
        <div className="mt-3"><L>Poznámka</L><textarea className={iCls} style={{ ...iStyle, minHeight: 60 }} value={cs.poznamka} onChange={(e) => set("poznamka", e.target.value)} /></div>
      </Section>

      {/* Bottom actions */}
      <div className="flex items-center justify-between">
        {!isNew ? (
          <button onClick={() => { onDelete(cs.id); onCancel(); }} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}>
            <Trash2 className="w-3.5 h-3.5" /> Smazat
          </button>
        ) : <span />}
        <button onClick={() => onSave(cs)} disabled={!cs.nazev.trim()} className="btn-tactile px-5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Uložit call sheet</button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[8px] text-[13px] font-medium shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>{toast}</div>
      )}
    </div>
  );
}
