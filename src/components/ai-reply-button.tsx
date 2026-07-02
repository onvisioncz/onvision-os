"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";

const PRIMARY = "#5B5EFF";

/** Tlačítko, které navrhne odpověď klientovi na jeho komentář/námitku. */
export function AiReplyButton({ comment, context }: { comment: string; context?: string }) {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true); setReply(null);
    try {
      const res = await fetch("/api/ai/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment, context }) });
      const data = await res.json();
      setReply(res.ok ? data.reply : (data.error || "Nepodařilo se navrhnout odpověď."));
    } catch {
      setReply("Chyba spojení.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!reply) return;
    try { await navigator.clipboard.writeText(reply); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="mt-1.5">
      {!reply && (
        <button onClick={generate} disabled={loading}
          className="btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold disabled:opacity-50"
          style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.28)", color: PRIMARY }}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? "Píšu…" : "AI navrhni odpověď"}
        </button>
      )}
      {reply && (
        <div className="rounded-[8px] p-2.5 mt-1" style={{ background: "rgba(91,94,255,0.06)", border: "1px solid rgba(91,94,255,0.16)" }}>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--foreground)" }}>{reply}</p>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={copy} className="btn-tactile inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: PRIMARY }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Zkopírováno" : "Kopírovat"}
            </button>
            <button onClick={generate} className="btn-tactile text-[11px] text-[--muted-foreground]">Znovu</button>
          </div>
        </div>
      )}
    </div>
  );
}
