"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, Plus, Trash2, X, Sparkles, Loader2, Check, Square, CheckSquare, Edit2,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { AiBrief } from "@/components/ai-brief";
import {
  GAMEPLAN_KEY, HORIZONTY, emptyInitiative, progress, statusLabel,
  type Initiative, type Horizont, type Milnik,
} from "@/lib/gameplan";

const PRIMARY = "oklch(0.62 0.27 265)";
const GREEN = "oklch(0.67 0.155 155)";
const iCls = "w-full px-3 py-2 text-[13px] glass-input";

export default function GameplanPage() {
  const { user, loading } = useUserRole();
  const [items, setItems] = useSupabaseData<Initiative[]>(GAMEPLAN_KEY, () => []);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const save = (it: Initiative) => { setItems((prev) => prev.some((x) => x.id === it.id) ? prev.map((x) => x.id === it.id ? it : x) : [...prev, it]); setEditing(null); };
  const patch = (id: number, p: Partial<Initiative>) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, ...p } : x));
  const del = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !user.roles.includes("admin")) return <div className="p-8 text-[14px] text-[--muted-foreground]">Gameplán je jen pro vedení.</div>;

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}><Rocket className="w-6 h-6" style={{ color: PRIMARY }} /> Gameplán OnVision</h1>
          <p className="text-[13px] text-[--muted-foreground]">Kam firmu posouváme — ne úkoly, ale reálné posuny. Adam &amp; Honza.</p>
        </div>
        <button onClick={() => setAiOpen(true)} className="btn-tactile flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[14px] font-semibold" style={{ background: "linear-gradient(120deg,#4B4DEA,#8C64FF)", color: "white" }}>
          <Sparkles className="w-4 h-4" /> AI: navrhni posuny
        </button>
      </div>

      <div className="mb-5">
        <AiBrief />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {HORIZONTY.map((h) => {
          const list = items.filter((i) => i.horizont === h);
          const avg = list.length ? Math.round(list.reduce((s, i) => s + progress(i), 0) / list.length) : 0;
          return (
            <div key={h}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: PRIMARY, fontFamily: "var(--font-heading)" }}>{h}</span>
                  {list.length > 0 && <span className="text-[11px] text-[--muted-foreground]">{avg} %</span>}
                </div>
                <button onClick={() => setEditing(emptyInitiative(h))} className="btn-tactile p-1 rounded-[6px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-3">
                {list.length === 0 && <div className="glass-panel p-4 text-center text-[12px] text-[--muted-foreground]">Zatím nic. Přidej posun nebo nech navrhnout AI.</div>}
                {list.map((i) => <Card key={i.id} it={i} onPatch={patch} onEdit={() => setEditing({ ...i, milniky: [...i.milniky] })} />)}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && <EditorModal it={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
        {aiOpen && <AiModal existing={items.map((i) => i.nazev)} onClose={() => setAiOpen(false)} onAdd={(nazev, popis, h) => { save({ ...emptyInitiative(h), id: Date.now() + Math.floor(Math.random() * 100000), nazev, popis }); }} />}
      </AnimatePresence>
    </div>
  );
}

function Card({ it, onPatch, onEdit }: { it: Initiative; onPatch: (id: number, p: Partial<Initiative>) => void; onEdit: () => void }) {
  const p = progress(it);
  const done = p >= 100;
  const toggleMil = (idx: number) => onPatch(it.id, { milniky: it.milniky.map((m, j) => j === idx ? { ...m, done: !m.done } : m) });
  return (
    <div className="glass-panel p-4" style={{ borderColor: done ? "oklch(0.67 0.155 155 / 0.4)" : undefined }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold leading-snug">{it.nazev || "Bez názvu"}</span>
            {done && <Check className="w-4 h-4" style={{ color: GREEN }} />}
          </div>
          {it.popis && <p className="text-[12px] text-[--muted-foreground] mt-0.5">{it.popis}</p>}
        </div>
        <button onClick={onEdit} className="btn-tactile p-1 rounded-[5px] opacity-60"><Edit2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: done ? GREEN : PRIMARY }} />
        </div>
        <span className="text-[11px] font-bold w-9 text-right" style={{ color: done ? GREEN : PRIMARY }}>{p} %</span>
      </div>

      {it.milniky.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {it.milniky.map((m, idx) => (
            <button key={idx} onClick={() => toggleMil(idx)} className="flex items-center gap-2 text-left w-full text-[12px]">
              {m.done ? <CheckSquare className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} /> : <Square className="w-3.5 h-3.5 shrink-0 text-[--muted-foreground]" />}
              <span className={m.done ? "line-through text-[--muted-foreground]" : ""}>{m.text}</span>
            </button>
          ))}
        </div>
      )}

      {it.milniky.length === 0 && (
        <button onClick={() => onPatch(it.id, { hotovo: !it.hotovo })} className="mt-2.5 text-[12px] font-semibold" style={{ color: done ? GREEN : "var(--muted-foreground)" }}>
          {done ? "✓ Splněno" : "Označit jako splněné"}
        </button>
      )}
      <div className="mt-1 text-[10px] uppercase tracking-[0.06em]" style={{ color: done ? GREEN : "var(--muted-foreground)" }}>{statusLabel(it)}</div>
    </div>
  );
}

function EditorModal({ it, onClose, onSave, onDelete }: { it: Initiative; onClose: () => void; onSave: (i: Initiative) => void; onDelete: (id: number) => void }) {
  const [x, setX] = useState<Initiative>(it);
  const isNew = !it.nazev;
  const setMil = (arr: Milnik[]) => setX({ ...x, milniky: arr });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-[520px] p-5 space-y-3 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between"><h2 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-heading)" }}>{isNew ? "Nový posun" : "Upravit posun"}</h2><button onClick={onClose} className="btn-tactile p-1 rounded-[6px]"><X className="w-4 h-4" /></button></div>
        <input className={iCls} value={x.nazev} onChange={(e) => setX({ ...x, nazev: e.target.value })} placeholder="Název posunu (např. Dotáhnout CRM na award úroveň)" />
        <textarea className={iCls} style={{ minHeight: 60 }} value={x.popis} onChange={(e) => setX({ ...x, popis: e.target.value })} placeholder="Proč / jak / cíl" />
        <select className={iCls} value={x.horizont} onChange={(e) => setX({ ...x, horizont: e.target.value as Horizont })}>{HORIZONTY.map((h) => <option key={h} value={h}>{h}</option>)}</select>
        <div>
          <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Milníky</label>
          <div className="space-y-2 mt-1">
            {x.milniky.map((m, idx) => (
              <div key={idx} className="flex gap-2">
                <input className={iCls} value={m.text} onChange={(e) => setMil(x.milniky.map((y, j) => j === idx ? { ...y, text: e.target.value } : y))} placeholder="Krok" />
                <button onClick={() => setMil(x.milniky.filter((_, j) => j !== idx))} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => setMil([...x.milniky, { text: "", done: false }])} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat milník</button>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          {!isNew ? <button onClick={() => { onDelete(it.id); onClose(); }} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}><Trash2 className="w-3.5 h-3.5" /> Smazat</button> : <span />}
          <button onClick={() => onSave(x)} disabled={!x.nazev.trim()} className="btn-tactile px-5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Uložit</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AiModal({ existing, onClose, onAdd }: { existing: string[]; onClose: () => void; onAdd: (nazev: string, popis: string, h: Horizont) => void }) {
  const [horizont, setHorizont] = useState<Horizont>("Čtvrtletí");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<{ nazev: string; popis: string }[] | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  const gen = async () => {
    setLoading(true); setErr(null); setIdeas(null); setAdded(new Set());
    try {
      const res = await fetch("/api/gameplan/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ horizont, brief, existing }) });
      const j = await res.json();
      if (res.ok) setIdeas(j.ideas ?? []); else setErr(j.error ?? "Nepodařilo se.");
    } catch { setErr("Chyba sítě."); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-[560px] p-5 space-y-3 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between"><h2 className="text-[16px] font-bold flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}><Sparkles className="w-4 h-4" style={{ color: PRIMARY }} /> AI návrhy posunů</h2><button onClick={onClose} className="btn-tactile p-1 rounded-[6px]"><X className="w-4 h-4" /></button></div>
        <div className="flex gap-2">
          <select className={iCls} style={{ maxWidth: 140 }} value={horizont} onChange={(e) => setHorizont(e.target.value as Horizont)}>{HORIZONTY.map((h) => <option key={h} value={h}>{h}</option>)}</select>
          <input className={iCls} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Přání/kontext (nepovinné)" />
          <button onClick={gen} disabled={loading} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] text-[13px] font-semibold whitespace-nowrap disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Navrhni</button>
        </div>
        {err && <p className="text-[12px]" style={{ color: "oklch(0.65 0.22 25)" }}>{err}</p>}
        {ideas && (
          <div className="space-y-2">
            {ideas.length === 0 && <p className="text-[13px] text-[--muted-foreground]">Žádné návrhy.</p>}
            {ideas.map((idea, idx) => (
              <div key={idx} className="rounded-[10px] p-3 flex items-start gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{idea.nazev}</div>
                  <div className="text-[12px] text-[--muted-foreground]">{idea.popis}</div>
                </div>
                <button onClick={() => { onAdd(idea.nazev, idea.popis, horizont); setAdded((s) => new Set(s).add(idx)); }} disabled={added.has(idx)} className="btn-tactile flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold disabled:opacity-50" style={{ background: added.has(idx) ? "transparent" : PRIMARY, color: added.has(idx) ? GREEN : "white", border: added.has(idx) ? "1px solid var(--border)" : "none" }}>
                  {added.has(idx) ? <><Check className="w-3.5 h-3.5" /> Přidáno</> : <><Plus className="w-3.5 h-3.5" /> Přidat</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
