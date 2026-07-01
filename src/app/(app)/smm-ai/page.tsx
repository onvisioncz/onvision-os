"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";

const PRIMARY = "oklch(0.62 0.27 265)";
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;
const PLATFORMY = ["Instagram", "Facebook", "LinkedIn", "TikTok"];

export default function SmmAiPage() {
  const [clients] = useSupabaseData<{ name: string }[]>("ov-monthly-clients", () => []);
  const [voices, setVoices] = useSupabaseData<Record<string, string>>("ov-client-voice", () => ({}));

  const [klient, setKlient] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<{ captions: string[]; hashtags: string[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const voice = voices[klient] ?? "";
  const setVoice = (v: string) => klient && setVoices({ ...voices, [klient]: v });
  const clientNames = [...new Set(clients.map((c) => c.name).filter(Boolean))].sort();

  const copy = (key: string, text: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  const gen = async () => {
    if (!brief.trim()) return;
    setLoading(true); setErr(null); setOut(null);
    try {
      const res = await fetch("/api/smm/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ klient, voice, brief, platform, pocet: 3 }) });
      const j = await res.json();
      if (res.ok) setOut({ captions: j.captions ?? [], hashtags: j.hashtags ?? [] });
      else setErr(j.error ?? "Nepodařilo se vygenerovat.");
    } catch { setErr("Chyba sítě."); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-5 md:p-7 max-w-[820px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>AI tvorba obsahu</h1>
        <p className="text-[13px] text-[--muted-foreground]">Captiony a hashtagy v brand voice konkrétního klienta</p>
      </div>

      <div className="rounded-[12px] p-4 md:p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Klient</label><input list="smm-clients" className={iCls} style={iStyle} value={klient} onChange={(e) => setKlient(e.target.value)} placeholder="Klient" /><datalist id="smm-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist></div>
          <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Platforma</label><select className={iCls} style={iStyle} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMY.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
        </div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Brand voice klienta {klient && <span className="normal-case text-[10px]">(uloží se pro {klient})</span>}</label><textarea className={iCls} style={{ ...iStyle, minHeight: 60 }} value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="Tón, styl, čeho se držet / vyhnout, typické fráze…" disabled={!klient} /></div>
        <div><label className="text-[11px] font-semibold text-[--muted-foreground] uppercase">Zadání příspěvku</label><textarea className={iCls} style={{ ...iStyle, minHeight: 80 }} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="O čem má příspěvek být, klíčové body, akce…" /></div>
        <button onClick={gen} disabled={loading || !brief.trim()} className="btn-tactile flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[14px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {loading ? "Generuji…" : "Vygenerovat"}
        </button>
        {err && <p className="text-[12px]" style={{ color: "oklch(0.65 0.22 25)" }}>{err}</p>}
      </div>

      {out && (
        <div className="mt-5 space-y-3">
          {out.captions.map((c, i) => (
            <div key={i} className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: PRIMARY }}>Varianta {i + 1}</span>
                <button onClick={() => copy(`c${i}`, c)} className="btn-tactile flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px]" style={{ border: "1px solid var(--border)" }}>{copied === `c${i}` ? <><Check className="w-3 h-3" /> Zkopírováno</> : <><Copy className="w-3 h-3" /> Kopírovat</>}</button>
              </div>
              <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{c}</p>
            </div>
          ))}
          {out.hashtags.length > 0 && (
            <div className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: PRIMARY }}>Hashtagy</span>
                <button onClick={() => copy("hash", out.hashtags.join(" "))} className="btn-tactile flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px]" style={{ border: "1px solid var(--border)" }}>{copied === "hash" ? <><Check className="w-3 h-3" /> Zkopírováno</> : <><Copy className="w-3 h-3" /> Kopírovat</>}</button>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: PRIMARY }}>{out.hashtags.join(" ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
