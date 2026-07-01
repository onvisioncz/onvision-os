"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, ExternalLink, ArrowLeft, Check, Share2, Star } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import {
  SHARES_KEY, APPROVALS_KEY, NPS_KEY, newToken,
  type ClientShare, type ClientApproval, type NpsRating,
} from "@/lib/clientshare";

const PRIMARY = "oklch(0.62 0.27 265)";
const GREEN = "oklch(0.67 0.155 155)";
const AMBER = "oklch(0.74 0.165 75)";
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

export default function KlientSharePage() {
  const [shares, setShares] = useSupabaseData<ClientShare[]>(SHARES_KEY, () => []);
  const [approvals, setApprovals] = useSupabaseData<ClientApproval[]>(APPROVALS_KEY, () => []);
  const [nps] = useSupabaseData<NpsRating[]>(NPS_KEY, () => []);
  const [clients] = useSupabaseData<{ name: string }[]>("ov-monthly-clients", () => []);
  const [outputs] = useSupabaseData<{ id: string; nazev: string; projektNazev?: string; mediaUrl?: string }[]>("ov-output-messages", () => []);
  const [sel, setSel] = useState<ClientShare | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newKlient, setNewKlient] = useState("");

  const clientNames = [...new Set([...clients.map((c) => c.name), ...shares.map((s) => s.klient)].filter(Boolean))].sort();
  const url = (t: string) => (typeof window !== "undefined" ? `${window.location.origin}/k/${t}` : `/k/${t}`);
  const copy = (t: string) => { navigator.clipboard?.writeText(url(t)); setCopied(t); setTimeout(() => setCopied(null), 2000); };

  const createShare = () => {
    if (!newKlient.trim()) return;
    const s: ClientShare = { id: Date.now(), token: newToken(), klient: newKlient.trim(), reportLinks: [], createdAt: new Date().toISOString() };
    setShares((prev) => [...prev, s]); setNewKlient(""); setSel(s);
  };
  const saveShare = (s: ClientShare) => setShares((prev) => prev.map((x) => x.id === s.id ? s : x));
  const delShare = (id: number) => { setShares((prev) => prev.filter((x) => x.id !== id)); setSel(null); };

  if (sel) {
    const share = shares.find((s) => s.id === sel.id) ?? sel;
    const clientApprovals = approvals.filter((a) => a.klient === share.klient);
    const clientNps = nps.filter((n) => n.klient === share.klient);

    const addApproval = () => setApprovals((prev) => [...prev, { id: Date.now(), klient: share.klient, nazev: "Nový obsah", videoUrl: "", popis: "", status: "Čeká", comments: [], createdAt: new Date().toISOString() }]);
    const addFromOutput = (id: string) => { const o = outputs.find((x) => x.id === id); if (!o) return; setApprovals((prev) => [...prev, { id: Date.now(), klient: share.klient, nazev: o.nazev || "Obsah", videoUrl: o.mediaUrl || "", popis: "", status: "Čeká", comments: [], createdAt: new Date().toISOString() }]); };
    const relevantOutputs = [...outputs].reverse().sort((a) => (a.projektNazev === share.klient ? -1 : 0)).slice(0, 40);
    const setApproval = (id: number, patch: Partial<ClientApproval>) => setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
    const delApproval = (id: number) => setApprovals((prev) => prev.filter((a) => a.id !== id));

    return (
      <div className="p-5 md:p-7 max-w-[760px] mx-auto space-y-4">
        <button onClick={() => setSel(null)} className="btn-tactile flex items-center gap-1.5 text-[13px] text-[--muted-foreground]"><ArrowLeft className="w-4 h-4" /> Zpět</button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-[22px] font-bold" style={{ fontFamily: "var(--font-heading)" }}>{share.klient}</h1>
          <div className="flex gap-2">
            <button onClick={() => copy(share.token)} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: PRIMARY, color: "white" }}>{copied === share.token ? <><Check className="w-3.5 h-3.5" /> Zkopírováno</> : <><Copy className="w-3.5 h-3.5" /> Kopírovat odkaz</>}</button>
            <a href={url(share.token)} target="_blank" rel="noopener noreferrer" className="btn-tactile flex items-center gap-1 px-3 py-2 rounded-[8px] text-[12px]" style={{ border: "1px solid var(--border)" }}><ExternalLink className="w-3.5 h-3.5" /> Náhled</a>
          </div>
        </div>

        {/* Obsah ke schválení */}
        <div className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2"><h3 className="text-[13px] font-bold" style={{ color: PRIMARY }}>Obsah ke schválení</h3>
            <div className="flex items-center gap-2">
              {relevantOutputs.length > 0 && (
                <select className="glass-input px-2.5 py-1.5 text-[12px]" defaultValue="" onChange={(e) => { addFromOutput(e.target.value); e.target.value = ""; }}>
                  <option value="">+ z výstupu</option>
                  {relevantOutputs.map((o) => <option key={o.id} value={o.id}>{o.nazev}{o.projektNazev ? ` · ${o.projektNazev}` : ""}</option>)}
                </select>
              )}
              <button onClick={addApproval} className="btn-tactile flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat</button>
            </div>
          </div>
          {clientApprovals.length === 0 ? <p className="text-[12px] text-[--muted-foreground]">Zatím nic. Přidej video/obsah ke schválení.</p> : (
            <div className="space-y-3">
              {clientApprovals.map((a) => (
                <div key={a.id} className="rounded-[8px] p-3" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                  <div className="flex gap-2 mb-2">
                    <input className={iCls} style={iStyle} value={a.nazev} placeholder="Název" onChange={(e) => setApproval(a.id, { nazev: e.target.value })} />
                    <span className="px-2 py-1.5 rounded-[6px] text-[11px] font-bold whitespace-nowrap" style={{ color: a.status === "Schváleno" ? GREEN : a.status === "Vráceno" ? AMBER : "var(--muted-foreground)", background: "var(--card)" }}>{a.status}</span>
                    <button onClick={() => delApproval(a.id)} className="btn-tactile p-2 rounded-[6px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <input className={`${iCls} mb-2`} style={iStyle} value={a.videoUrl} placeholder="Odkaz na video (YouTube/Vimeo/Drive)" onChange={(e) => setApproval(a.id, { videoUrl: e.target.value })} />
                  <input className={iCls} style={iStyle} value={a.popis} placeholder="Popis (nepovinné)" onChange={(e) => setApproval(a.id, { popis: e.target.value })} />
                  {a.comments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {a.comments.map((c) => (<div key={c.id} className="text-[12px]"><span className="font-semibold" style={{ color: PRIMARY }}>{c.autor}{c.cas ? ` · ${c.cas}` : ""}</span> <span className="text-[--muted-foreground]">— {c.text}</span></div>))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reporty */}
        <div className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-[13px] font-bold mb-3" style={{ color: PRIMARY }}>Reporty (odkazy)</h3>
          <div className="space-y-2">
            {share.reportLinks.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className={iCls} style={iStyle} value={r.title} placeholder="Název" onChange={(e) => saveShare({ ...share, reportLinks: share.reportLinks.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
                <input className={iCls} style={iStyle} value={r.url} placeholder="https://…" onChange={(e) => saveShare({ ...share, reportLinks: share.reportLinks.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />
                <button onClick={() => saveShare({ ...share, reportLinks: share.reportLinks.filter((_, j) => j !== i) })} className="btn-tactile p-2 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => saveShare({ ...share, reportLinks: [...share.reportLinks, { title: "", url: "" }] })} className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}><Plus className="w-3.5 h-3.5" /> Přidat report</button>
          </div>
          <p className="text-[11px] text-[--muted-foreground] mt-2">Faktury se klientovi zobrazí automaticky (z fakturace, podle jména klienta).</p>
        </div>

        {/* NPS */}
        {clientNps.length > 0 && (
          <div className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 className="text-[13px] font-bold mb-3 flex items-center gap-1.5" style={{ color: PRIMARY }}><Star className="w-3.5 h-3.5" /> Spokojenost</h3>
            {clientNps.map((n) => (<div key={n.id} className="text-[13px] mb-1"><span className="font-bold" style={{ color: n.score >= 9 ? GREEN : n.score >= 7 ? AMBER : "oklch(0.65 0.22 25)" }}>{n.score}/10</span> {n.comment && <span className="text-[--muted-foreground]">— {n.comment}</span>}</div>))}
          </div>
        )}

        <button onClick={() => delShare(share.id)} className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold" style={{ color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}><Trash2 className="w-3.5 h-3.5" /> Smazat sdílení</button>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Klientská sdílení</h1>
        <p className="text-[13px] text-[--muted-foreground]">Jeden odkaz na klienta — schvalování, reporty, faktury, spokojenost. Bez loginu.</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <input list="ks-clients" className={iCls} style={{ ...iStyle, maxWidth: 240 }} value={newKlient} onChange={(e) => setNewKlient(e.target.value)} placeholder="Klient" />
        <datalist id="ks-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist>
        <button onClick={createShare} disabled={!newKlient.trim()} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}><Plus className="w-4 h-4" /> Vytvořit sdílení</button>
      </div>

      {shares.length === 0 ? (
        <div className="rounded-[12px] p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Share2 className="w-8 h-8 mx-auto mb-3" style={{ color: PRIMARY, opacity: 0.6 }} />
          <p className="text-[14px] text-[--muted-foreground]">Zatím žádná sdílení. Vytvoř první pro klienta výše.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[...shares].sort((a, b) => b.id - a.id).map((s) => (
            <div key={s.id} onClick={() => setSel(s)} className="cursor-pointer rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[15px] font-bold">{s.klient}</div>
              <div className="text-[12px] text-[--muted-foreground] mt-1">{approvals.filter((a) => a.klient === s.klient).length} ke schválení · {s.reportLinks.length} reportů</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
