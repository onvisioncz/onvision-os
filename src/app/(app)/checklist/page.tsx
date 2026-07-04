"use client";

/**
 * Pre-produkční checklist — před každým natáčením si vygeneruješ odškrtávací
 * seznam podle typu (studio/exteriér/rozhovor/produkt/dron). Hlídá kritické
 * položky (povolení, počasí, bezpečnost). Data v ov-shoot-checklists.
 */
import { useState } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import {
  buildChecklist, checklistProgress, criticalRemaining,
  SHOOT_TYPES, CAT_LABEL, type Checklist, type ShootType, type ChecklistCat,
} from "@/lib/prod-checklist";
import { ClipboardList, Plus, Trash2, AlertTriangle, Check, ChevronLeft } from "lucide-react";

const CAT_ORDER: ChecklistCat[] = ["pravni", "bezpecnost", "logistika", "technika", "kreativa"];
const CAT_COLOR: Record<ChecklistCat, string> = {
  pravni: "oklch(0.65 0.2 25)", bezpecnost: "oklch(0.75 0.15 60)",
  logistika: "#5B5EFF", technika: "oklch(0.7 0.14 195)", kreativa: "oklch(0.7 0.17 300)",
};

export default function ChecklistPage() {
  const [lists, setLists] = useSupabaseData<Checklist[]>("ov-shoot-checklists", () => []);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<ShootType>("studio");
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  const create = () => {
    const c = buildChecklist(newType, newName.trim(), Date.now(), new Date().toISOString());
    if (newDate) c.datum = newDate;
    setLists((prev) => [c, ...prev]);
    setCreating(false); setNewName(""); setNewDate(""); setOpenId(c.id);
  };
  const toggle = (listId: number, itemId: string) =>
    setLists((prev) => prev.map((l) => l.id === listId
      ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, done: !i.done } : i) } : l));
  const del = (id: number) => { setLists((prev) => prev.filter((l) => l.id !== id)); if (openId === id) setOpenId(null); };

  const open = lists.find((l) => l.id === openId) ?? null;

  /* ── Detail jednoho checklistu ── */
  if (open) {
    const prog = checklistProgress(open.items);
    const crit = criticalRemaining(open.items);
    return (
      <div className="p-5 md:p-7 max-w-[760px] mx-auto">
        <button onClick={() => setOpenId(null)} className="btn-tactile inline-flex items-center gap-1 text-[13px] text-[--muted-foreground] mb-3">
          <ChevronLeft className="w-4 h-4" /> Zpět na seznam
        </button>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-heading)" }}>{open.nazev}</h1>
            <p className="text-[12px] text-[--muted-foreground]">
              {SHOOT_TYPES.find((t) => t.value === open.type)?.emoji} {SHOOT_TYPES.find((t) => t.value === open.type)?.label}
              {open.datum ? ` · ${open.datum}` : ""}
            </p>
          </div>
          <button onClick={() => del(open.id)} className="btn-tactile p-2 rounded-[8px]" style={{ color: "oklch(0.6 0.2 25)" }}><Trash2 className="w-4 h-4" /></button>
        </div>

        <div className="glass-card p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold">{prog.done} / {prog.total} hotovo</span>
            <span className="text-[13px] font-bold" style={{ color: prog.pct === 100 ? "oklch(0.7 0.17 155)" : "#5B5EFF" }}>{prog.pct} %</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${prog.pct}%`, background: prog.pct === 100 ? "oklch(0.7 0.17 155)" : "#5B5EFF" }} />
          </div>
          {crit > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: "oklch(0.75 0.15 60)" }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Zbývá {crit} kritických (právní/bezpečnost)
            </div>
          )}
        </div>

        {CAT_ORDER.filter((cat) => open.items.some((i) => i.cat === cat)).map((cat) => (
          <div key={cat} className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: CAT_COLOR[cat] }}>{CAT_LABEL[cat]}</p>
            <div className="glass-card divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {open.items.filter((i) => i.cat === cat).map((it) => (
                <button key={it.id} onClick={() => toggle(open.id, it.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0"
                    style={{ border: it.done ? "none" : "1.5px solid var(--border)", background: it.done ? "oklch(0.7 0.17 155)" : "transparent" }}>
                    {it.done && <Check className="w-3.5 h-3.5 text-white" />}
                  </span>
                  <span className="text-[13px]" style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? "var(--muted-foreground)" : "var(--foreground)" }}>{it.text}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── Seznam checklistů ── */
  return (
    <div className="p-5 md:p-7 max-w-[820px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <ClipboardList className="w-5 h-5" style={{ color: "#5B5EFF" }} /> Pre-produkční checklist
          </h1>
          <p className="text-[13px] text-[--muted-foreground]">Před natáčením si projeď, že nic nechybí — povolení, počasí, technika, release.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: "#5B5EFF", color: "white" }}>
          <Plus className="w-4 h-4" /> Nový checklist
        </button>
      </div>

      {creating && (
        <div className="glass-card p-4 mb-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            {SHOOT_TYPES.map((t) => (
              <button key={t.value} onClick={() => setNewType(t.value)}
                className="btn-tactile px-3 py-2 rounded-[8px] text-[12px] font-semibold text-left"
                style={newType === t.value
                  ? { background: "rgba(91,94,255,0.16)", color: "#5B5EFF", border: "1px solid rgba(91,94,255,0.4)" }
                  : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Název (např. SK Brno — zápas)"
              className="px-3 py-2 rounded-[8px] text-[13px] outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 rounded-[8px] text-[13px] outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn-tactile px-3.5 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: "#5B5EFF", color: "white" }}>Vytvořit</button>
            <button onClick={() => setCreating(false)} className="btn-tactile px-3.5 py-2 rounded-[8px] text-[13px] text-[--muted-foreground]">Zrušit</button>
          </div>
        </div>
      )}

      {lists.length === 0 && !creating ? (
        <div className="glass-card p-10 text-center">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-[14px] font-semibold">Zatím žádný checklist</p>
          <p className="text-[12px] text-[--muted-foreground] mt-1">Vytvoř první před nejbližším natáčením.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((l) => {
            const prog = checklistProgress(l.items);
            const crit = criticalRemaining(l.items);
            const t = SHOOT_TYPES.find((x) => x.value === l.type);
            return (
              <button key={l.id} onClick={() => setOpenId(l.id)} className="glass-card p-4 text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold truncate">{l.nazev}</p>
                    <p className="text-[11px] text-[--muted-foreground]">{t?.emoji} {t?.label}{l.datum ? ` · ${l.datum}` : ""}</p>
                  </div>
                  {crit > 0 && <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.15 60)" }} />}
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, background: prog.pct === 100 ? "oklch(0.7 0.17 155)" : "#5B5EFF" }} />
                </div>
                <p className="text-[11px] text-[--muted-foreground] mt-1.5">{prog.done}/{prog.total} · {prog.pct} %</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
