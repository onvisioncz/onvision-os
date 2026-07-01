"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, ExternalLink, MapPin, ArrowLeft, Check, Images } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { LOKACE_KEY, LOKACE_TYPY, newPublicId, mapsLink, type Location, type LokaceTyp } from "@/lib/lokace";

const PRIMARY = "oklch(0.62 0.27 265)";
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

function empty(): Location {
  return { id: Date.now(), publicId: newPublicId(), nazev: "", typ: "Exteriér", adresa: "", popis: "", tags: "", previews: [], driveUrl: "", verejne: true, createdAt: new Date().toISOString() };
}

export default function LokacePage() {
  const [items, setItems] = useSupabaseData<Location[]>(LOKACE_KEY, () => []);
  const [editing, setEditing] = useState<Location | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const url = (id: string) => (typeof window !== "undefined" ? `${window.location.origin}/l/${id}` : `/l/${id}`);
  const copy = (id: string) => { navigator.clipboard?.writeText(url(id)); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const save = (l: Location) => { setItems((prev) => prev.some((x) => x.id === l.id) ? prev.map((x) => x.id === l.id ? l : x) : [...prev, l]); setEditing(null); };
  const del = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  if (editing) return <Editor loc={editing} onSave={save} onCancel={() => setEditing(null)} onDelete={del} />;

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Lokace</h1>
          <p className="text-[13px] text-[--muted-foreground]">Místa k natáčení s ukázkami — sdílitelné klientům jako galerie variant</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => copy("all")} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            {copied === "all" ? <><Check className="w-3.5 h-3.5" style={{ color: "oklch(0.67 0.155 155)" }} /> Zkopírováno</> : <><Images className="w-3.5 h-3.5" /> Galerie pro klienty</>}
          </button>
          <button onClick={() => setEditing(empty())} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: PRIMARY, color: "white" }}><Plus className="w-4 h-4" /> Nová lokace</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[12px] p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <MapPin className="w-8 h-8 mx-auto mb-3" style={{ color: PRIMARY, opacity: 0.6 }} />
          <p className="text-[14px] text-[--muted-foreground]">Zatím žádné lokace. Přidej první — pak je můžeš sdílet klientům.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...items].sort((a, b) => b.id - a.id).map((l) => (
            <div key={l.id} className="rounded-[12px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-[130px] cursor-pointer" onClick={() => setEditing({ ...l })} style={{ background: l.previews?.[0] ? `center/cover url(${l.previews[0]})` : "rgba(255,255,255,0.04)" }} />
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: PRIMARY }}>{l.typ}</div>
                  {!l.verejne && <span className="text-[9px] px-1.5 py-0.5 rounded-[4px]" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>skryté</span>}
                </div>
                <div className="text-[14px] font-bold mb-2 cursor-pointer" onClick={() => setEditing({ ...l })}>{l.nazev || "Bez názvu"}</div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copy(l.publicId)} className="btn-tactile flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>{copied === l.publicId ? <Check className="w-3 h-3" style={{ color: "oklch(0.67 0.155 155)" }} /> : <Copy className="w-3 h-3" />} Odkaz</button>
                  <a href={url(l.publicId)} target="_blank" rel="noopener noreferrer" className="btn-tactile p-1.5 rounded-[6px]" style={{ border: "1px solid var(--border)" }}><ExternalLink className="w-3 h-3" /></a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ loc, onSave, onCancel, onDelete }: { loc: Location; onSave: (l: Location) => void; onCancel: () => void; onDelete: (id: number) => void }) {
  const [l, setL] = useState<Location>(loc);
  const isNew = !loc.nazev;
  const setPrev = (i: number, v: string) => setL({ ...l, previews: l.previews.map((p, j) => j === i ? v : p) });

  return (
    <div className="p-5 md:p-7 max-w-[720px] mx-auto space-y-4">
      <button onClick={onCancel} className="btn-tactile flex items-center gap-1.5 text-[13px] text-[--muted-foreground]"><ArrowLeft className="w-4 h-4" /> Zpět</button>
      <div className="rounded-[12px] p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Název</label><input className={iCls} style={iStyle} value={l.nazev} onChange={(e) => setL({ ...l, nazev: e.target.value })} placeholder="Stadion za Lužánkami" /></div>
          <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Typ</label><select className={iCls} style={iStyle} value={l.typ} onChange={(e) => setL({ ...l, typ: e.target.value as LokaceTyp })}>{LOKACE_TYPY.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Adresa</label><input className={iCls} style={iStyle} value={l.adresa} onChange={(e) => setL({ ...l, adresa: e.target.value })} placeholder="Ulice, město" />{l.adresa && <a href={mapsLink(l.adresa)} target="_blank" rel="noopener noreferrer" className="text-[11px] mt-1 inline-block" style={{ color: PRIMARY }}>Otevřít v mapách →</a>}</div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Popis</label><textarea className={iCls} style={{ ...iStyle, minHeight: 60 }} value={l.popis} onChange={(e) => setL({ ...l, popis: e.target.value })} placeholder="Vhodné pro lifestyle, portréty…" /></div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Tagy (čárkami)</label><input className={iCls} style={iStyle} value={l.tags} onChange={(e) => setL({ ...l, tags: e.target.value })} placeholder="lifestyle, portrét, sport" /></div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Odkaz na víc ukázek (Drive)</label><input className={iCls} style={iStyle} value={l.driveUrl} onChange={(e) => setL({ ...l, driveUrl: e.target.value })} placeholder="https://drive.google.com/…" /></div>
        <div>
          <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Náhledové obrázky (URL)</label>
          <div className="space-y-2 mt-1">
            {l.previews.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className={iCls} style={iStyle} value={p} placeholder="https://…/foto.jpg" onChange={(e) => setPrev(i, e.target.value)} />
                <button onClick={() => setL({ ...l, previews: l.previews.filter((_, j) => j !== i) })} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => setL({ ...l, previews: [...l.previews, ""] })} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat náhled</button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer pt-1"><input type="checkbox" checked={l.verejne} onChange={(e) => setL({ ...l, verejne: e.target.checked })} /> Zobrazit ve veřejné galerii pro klienty</label>
      </div>
      <div className="flex items-center justify-between">
        {!isNew ? <button onClick={() => { onDelete(l.id); onCancel(); }} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}><Trash2 className="w-3.5 h-3.5" /> Smazat</button> : <span />}
        <button onClick={() => onSave(l)} disabled={!l.nazev.trim()} className="btn-tactile px-5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Uložit</button>
      </div>
    </div>
  );
}
