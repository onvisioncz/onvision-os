"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, ExternalLink, Eye, Package, ArrowLeft, Check } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { DELIVERY_KEY, newPublicId, EXPIRY_OPTIONS, expiryFromDays, isExpired, type Delivery } from "@/lib/delivery";

const PRIMARY = "oklch(0.62 0.27 265)";
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

function empty(): Delivery {
  // Nové delivery mají výchozí expiraci 30 dní (bezpečnější než navždy).
  return { id: Date.now(), publicId: newPublicId(), klient: "", nazev: "", popis: "", driveUrl: "", previews: [], createdAt: new Date().toISOString(), views: 0, expiresAt: expiryFromDays(30) };
}

function expiryLabel(d: Delivery): { text: string; expired: boolean } {
  if (!d.expiresAt) return { text: "bez expirace", expired: false };
  if (isExpired(d)) return { text: "vypršelo", expired: true };
  const days = Math.ceil((Date.parse(d.expiresAt) - Date.now()) / 86_400_000);
  return { text: `platí ${days} dní`, expired: false };
}

export default function DeliveryPage() {
  const [items, setItems] = useSupabaseData<Delivery[]>(DELIVERY_KEY, () => []);
  const [clients] = useSupabaseData<{ name: string }[]>("ov-monthly-clients", () => []);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const clientNames = [...new Set([...clients.map((c) => c.name), ...items.map((i) => i.klient)].filter(Boolean))].sort();

  const publicUrl = (id: string) => (typeof window !== "undefined" ? `${window.location.origin}/d/${id}` : `/d/${id}`);
  const copy = (id: string) => { navigator.clipboard?.writeText(publicUrl(id)); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const save = (d: Delivery) => {
    setItems((prev) => prev.some((x) => x.id === d.id) ? prev.map((x) => x.id === d.id ? d : x) : [...prev, d]);
    setEditing(null);
  };
  const del = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  if (editing) return <Editor delivery={editing} clientNames={clientNames} onSave={save} onCancel={() => setEditing(null)} onDelete={del} />;

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Delivery</h1>
          <p className="text-[13px] text-[--muted-foreground]">Sdílené odkazy pro klienty — bez přihlášení, s náhledem a stažením</p>
        </div>
        <button onClick={() => setEditing(empty())} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: PRIMARY, color: "white" }}>
          <Plus className="w-4 h-4" /> Nová delivery
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[12px] p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Package className="w-8 h-8 mx-auto mb-3" style={{ color: PRIMARY, opacity: 0.6 }} />
          <p className="text-[14px] text-[--muted-foreground]">Zatím žádné delivery. Vytvoř první — pak klientovi jen pošleš odkaz.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[...items].sort((a, b) => b.id - a.id).map((d) => (
            <div key={d.id} className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="cursor-pointer flex-1" onClick={() => setEditing({ ...d })}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em]" style={{ color: PRIMARY }}>{d.klient || "—"}</div>
                  <div className="text-[15px] font-bold">{d.nazev || "Bez názvu"}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="flex items-center gap-1 text-[11px] text-[--muted-foreground]"><Eye className="w-3 h-3" />{d.views || 0}</span>
                  {(() => { const e = expiryLabel(d); return (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px]"
                      style={{ background: e.expired ? "rgba(229,72,77,0.14)" : "rgba(255,255,255,0.05)", color: e.expired ? "oklch(0.65 0.2 25)" : "var(--muted-foreground)" }}>
                      {e.text}
                    </span>
                  ); })()}
                </div>
              </div>
              {d.accessLog?.length ? (
                <div className="text-[10px] text-[--muted-foreground] mt-1.5">
                  Poslední otevření: {new Date(d.accessLog[d.accessLog.length - 1]).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              ) : null}
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => copy(d.publicId)} className="btn-tactile flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                  {copied === d.publicId ? <><Check className="w-3 h-3" style={{ color: "oklch(0.67 0.155 155)" }} /> Zkopírováno</> : <><Copy className="w-3 h-3" /> Kopírovat odkaz</>}
                </button>
                <a href={publicUrl(d.publicId)} target="_blank" rel="noopener noreferrer" className="btn-tactile flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[11px]" style={{ border: "1px solid var(--border)" }}><ExternalLink className="w-3 h-3" /> Otevřít</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface OutputLite { id: string; nazev: string; projektNazev?: string; mediaUrl?: string; thumbnail?: string }

function Editor({ delivery, clientNames, onSave, onCancel, onDelete }: {
  delivery: Delivery; clientNames: string[]; onSave: (d: Delivery) => void; onCancel: () => void; onDelete: (id: number) => void;
}) {
  const [d, setD] = useState<Delivery>(delivery);
  const [outputs] = useSupabaseData<OutputLite[]>("ov-output-messages", () => []);
  const isNew = !delivery.nazev;
  const setPreview = (i: number, v: string) => setD({ ...d, previews: d.previews.map((p, j) => j === i ? v : p) });

  const fromOutput = (id: string) => {
    const o = outputs.find((x) => x.id === id);
    if (!o) return;
    setD((p) => ({ ...p, klient: o.projektNazev || p.klient, nazev: o.nazev || p.nazev, driveUrl: o.mediaUrl || p.driveUrl, previews: o.thumbnail ? [...p.previews.filter(Boolean), o.thumbnail] : p.previews }));
  };

  return (
    <div className="p-5 md:p-7 max-w-[720px] mx-auto space-y-4">
      <button onClick={onCancel} className="btn-tactile flex items-center gap-1.5 text-[13px] text-[--muted-foreground]"><ArrowLeft className="w-4 h-4" /> Zpět</button>

      <div className="rounded-[12px] p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {outputs.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Načíst z výstupu (rychlé předvyplnění)</label>
            <select className={iCls} style={iStyle} defaultValue="" onChange={(e) => { fromOutput(e.target.value); e.target.value = ""; }}>
              <option value="">— vyber hotový výstup —</option>
              {[...outputs].reverse().slice(0, 40).map((o) => <option key={o.id} value={o.id}>{o.nazev}{o.projektNazev ? ` · ${o.projektNazev}` : ""}</option>)}
            </select>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Klient</label><input list="dl-clients" className={iCls} style={iStyle} value={d.klient} onChange={(e) => setD({ ...d, klient: e.target.value })} /><datalist id="dl-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist></div>
          <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Název zakázky</label><input className={iCls} style={iStyle} value={d.nazev} onChange={(e) => setD({ ...d, nazev: e.target.value })} placeholder="Promo video — červen" /></div>
        </div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Zpráva pro klienta</label><textarea className={iCls} style={{ ...iStyle, minHeight: 70 }} value={d.popis} onChange={(e) => setD({ ...d, popis: e.target.value })} placeholder="Ahoj, tady jsou finální výstupy…" /></div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Odkaz ke stažení (Drive / WeTransfer)</label><input className={iCls} style={iStyle} value={d.driveUrl} onChange={(e) => setD({ ...d, driveUrl: e.target.value })} placeholder="https://drive.google.com/…" /></div>
        <div>
          <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Platnost odkazu</label>
          <select className={iCls} style={iStyle}
            value={d.expiresAt === null || d.expiresAt === undefined ? "null" : String(EXPIRY_OPTIONS.find((o) => o.days != null && d.expiresAt && Math.abs(Date.parse(d.expiresAt) - (Date.now() + o.days * 86400000)) < 2 * 86400000)?.days ?? "custom")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "null") setD({ ...d, expiresAt: null });
              else if (v !== "custom") setD({ ...d, expiresAt: expiryFromDays(Number(v)) });
            }}>
            {EXPIRY_OPTIONS.map((o) => <option key={o.label} value={o.days == null ? "null" : String(o.days)}>{o.label}</option>)}
            <option value="custom" disabled>zachovat stávající</option>
          </select>
          <p className="text-[10px] text-[--muted-foreground] mt-1">Po vypršení klient uvidí hlášku, že odkaz už neplatí. Změnou se nastaví od teď.</p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Náhledové obrázky (URL)</label>
          <div className="space-y-2 mt-1">
            {d.previews.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className={iCls} style={iStyle} value={p} placeholder="https://…/nahled.jpg" onChange={(e) => setPreview(i, e.target.value)} />
                <button onClick={() => setD({ ...d, previews: d.previews.filter((_, j) => j !== i) })} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => setD({ ...d, previews: [...d.previews, ""] })} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat náhled</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {!isNew ? <button onClick={() => { onDelete(d.id); onCancel(); }} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}><Trash2 className="w-3.5 h-3.5" /> Smazat</button> : <span />}
        <button onClick={() => onSave(d)} disabled={!d.nazev.trim()} className="btn-tactile px-5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>Uložit</button>
      </div>
    </div>
  );
}
