"use client";

import { useState } from "react";
import { Sparkles, Loader2, Plus, Trash2, Check } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { DEFAULT_USERS } from "@/lib/roles";

const PRIMARY = "oklch(0.62 0.27 265)";
const PRIORITY = ["Nízká", "Střední", "Vysoká", "Urgentní"];
const iCls = "px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

interface Task { id: number; nazev: string; projekt: string; prirazeno: string; priorita: string; status: string; deadline: string }
interface Draft { nazev: string; prirazeno: string; priorita: string; deadline: string }

export default function ZapisPage() {
  const [, setTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", () => []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [added, setAdded] = useState(false);

  const team = DEFAULT_USERS.filter((u) => u.aktivni).map((u) => u.displayName);

  const extract = async () => {
    if (!text.trim()) return;
    setLoading(true); setErr(null); setDrafts(null); setAdded(false);
    try {
      const res = await fetch("/api/tasks/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const j = await res.json();
      if (res.ok) setDrafts((j.tasks ?? []).map((t: Record<string, string>) => ({ nazev: t.nazev ?? "", prirazeno: t.prirazeno ?? "", priorita: "Střední", deadline: t.deadline ?? "" })));
      else setErr(j.error ?? "Nepodařilo se.");
    } catch { setErr("Chyba sítě."); }
    finally { setLoading(false); }
  };

  const setDraft = (i: number, patch: Partial<Draft>) => setDrafts((prev) => prev!.map((d, j) => j === i ? { ...d, ...patch } : d));
  const delDraft = (i: number) => setDrafts((prev) => prev!.filter((_, j) => j !== i));

  const addAll = () => {
    if (!drafts?.length) return;
    let id = Date.now();
    const nove: Task[] = drafts.filter((d) => d.nazev.trim()).map((d) => ({ id: id++, nazev: d.nazev.trim(), projekt: "", prirazeno: d.prirazeno, priorita: d.priorita, status: "Nové", deadline: d.deadline }));
    setTasks((prev) => [...prev, ...nove]);
    setAdded(true); setDrafts(null); setText("");
  };

  return (
    <div className="p-5 md:p-7 max-w-[820px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Zápis z porady → úkoly</h1>
        <p className="text-[13px] text-[--muted-foreground]">Vlož zápis, AI z něj vytáhne úkoly a přiřadí je</p>
      </div>

      <textarea className="w-full rounded-[10px] p-3 text-[14px] outline-none" style={{ ...iStyle, minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Vlož poznámky z porady… (např. Zdeněk natočí promo pro Firestu do pátku, Adam pošle nabídku IMTOSu do středy…)"} />
      <div className="flex items-center gap-3 mt-3">
        <button onClick={extract} disabled={loading || !text.trim()} className="btn-tactile flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[14px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {loading ? "Analyzuji…" : "Vytáhnout úkoly"}
        </button>
        {added && <span className="text-[13px] flex items-center gap-1.5" style={{ color: "oklch(0.67 0.155 155)" }}><Check className="w-4 h-4" /> Úkoly přidány do modulu Úkoly</span>}
      </div>
      {err && <p className="text-[12px] mt-2" style={{ color: "oklch(0.65 0.22 25)" }}>{err}</p>}

      {drafts && (
        <div className="mt-5 rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3"><h3 className="text-[13px] font-bold" style={{ color: PRIMARY }}>Navržené úkoly ({drafts.length})</h3>
            <button onClick={addAll} disabled={!drafts.some((d) => d.nazev.trim())} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}><Plus className="w-3.5 h-3.5" /> Přidat vše do úkolů</button>
          </div>
          {drafts.length === 0 ? <p className="text-[13px] text-[--muted-foreground]">AI nenašla žádné úkoly.</p> : (
            <div className="space-y-2">
              {drafts.map((d, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <input className={iCls} style={{ ...iStyle, flex: 1, minWidth: 180 }} value={d.nazev} onChange={(e) => setDraft(i, { nazev: e.target.value })} placeholder="Úkol" />
                  <input list="zp-team" className={iCls} style={{ ...iStyle, width: 130 }} value={d.prirazeno} onChange={(e) => setDraft(i, { prirazeno: e.target.value })} placeholder="Komu" />
                  <select className={iCls} style={iStyle} value={d.priorita} onChange={(e) => setDraft(i, { priorita: e.target.value })}>{PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                  <input className={iCls} style={{ ...iStyle, width: 90 }} value={d.deadline} onChange={(e) => setDraft(i, { deadline: e.target.value })} placeholder="Termín" />
                  <button onClick={() => delDraft(i)} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <datalist id="zp-team">{team.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
