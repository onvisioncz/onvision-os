"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { BriefingResponse, BriefingInsight } from "@/app/api/dashboard/briefing/route";

/* ── Cache helpers ───────────────────────────────────────────────────────── */
function todayKey() {
  return `ov-briefing-${new Date().toISOString().split("T")[0]}`;
}
function loadCached(): BriefingResponse | null {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveCache(data: BriefingResponse) {
  try { localStorage.setItem(todayKey(), JSON.stringify(data)); } catch {}
}
function clearOldCache() {
  try {
    const today = todayKey();
    Object.keys(localStorage)
      .filter(k => k.startsWith("ov-briefing-") && k !== today)
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

/* ── Severity styles ─────────────────────────────────────────────────────── */
const SEV: Record<BriefingInsight["severity"], { bar: string; bg: string; text: string }> = {
  high:     { bar: "oklch(0.65 0.22 25)",      bg: "oklch(0.65 0.22 25 / 0.08)",    text: "oklch(0.78 0.18 25)" },
  medium:   { bar: "oklch(0.75 0.19 48)",      bg: "oklch(0.75 0.19 48 / 0.07)",    text: "oklch(0.82 0.14 48)" },
  low:      { bar: "oklch(0.62 0.27 265 / 0.6)", bg: "oklch(0.62 0.27 265 / 0.05)", text: "oklch(0.72 0.18 265)" },
  positive: { bar: "oklch(0.68 0.18 155)",     bg: "oklch(0.68 0.18 155 / 0.07)",   text: "oklch(0.72 0.14 155)" },
};

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-3 mt-4">
      {[85, 70, 90, 60].map((w, i) => (
        <motion.div
          key={i}
          className="h-4 rounded-full"
          style={{ width: `${w}%`, background: "oklch(1 0 0 / 0.06)" }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/* ── Insight row ─────────────────────────────────────────────────────────── */
function InsightRow({ insight, index }: { insight: BriefingInsight; index: number }) {
  const sev = SEV[insight.severity];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-3 px-3 py-2.5 rounded-[10px]"
      style={{ background: sev.bg }}
    >
      {/* Severity bar */}
      <div
        className="w-[3px] self-stretch rounded-full shrink-0 mt-0.5"
        style={{ background: sev.bar, minHeight: 16 }}
      />

      {/* Icon */}
      <span className="text-[16px] leading-none mt-0.5 shrink-0">{insight.icon}</span>

      {/* Text */}
      <p className="flex-1 text-[12px] leading-relaxed" style={{ color: sev.text }}>
        {insight.text}
      </p>

      {/* CTA link */}
      {insight.link && insight.cta && (
        <Link
          href={insight.link}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-colors"
          style={{
            color: sev.text,
            background: "oklch(1 0 0 / 0.06)",
            border: `1px solid ${sev.bar}40`,
            whiteSpace: "nowrap",
          }}
        >
          {insight.cta}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
}

/* ── Main card ───────────────────────────────────────────────────────────── */
export function BriefingCard({ userName }: { userName: string }) {
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const generate = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadCached();
      if (cached) { setBriefing(cached); return; }
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BriefingResponse = await res.json();
      saveCache(data);
      clearOldCache();
      setBriefing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se načíst briefing");
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    generate(false);
  }, [generate]);

  // Load minimized state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ov-briefing-minimized");
      if (saved === "1") setMinimized(true);
    } catch {}
  }, []);

  const toggleMinimize = () => {
    const next = !minimized;
    setMinimized(next);
    try { localStorage.setItem("ov-briefing-minimized", next ? "1" : "0"); } catch {}
  };

  const highCount = briefing?.insights.filter(i => i.severity === "high").length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-[14px] overflow-hidden"
      style={{
        background: "oklch(0.10 0.010 265)",
        border: "1px solid oklch(0.62 0.27 265 / 0.22)",
        boxShadow: "0 0 0 1px oklch(0.62 0.27 265 / 0.06), 0 4px 24px oklch(0 0 0 / 0.3)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: minimized ? "none" : "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Pulsing dot */}
          <div className="relative flex items-center justify-center w-5 h-5">
            <motion.div
              className="absolute w-5 h-5 rounded-full"
              style={{ background: "oklch(0.62 0.27 265 / 0.3)" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
            <Sparkles className="w-3.5 h-3.5 relative z-10" style={{ color: "oklch(0.78 0.18 265)" }} />
          </div>

          <span className="text-[13px] font-bold tracking-tight" style={{ color: "oklch(0.90 0.008 265)", fontFamily: "var(--font-outfit)" }}>
            AI Briefing
          </span>

          {/* High severity badge */}
          <AnimatePresence>
            {highCount > 0 && !loading && (
              <motion.span
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.65 0.22 25 / 0.2)",
                  color: "oklch(0.75 0.18 25)",
                  border: "1px solid oklch(0.65 0.22 25 / 0.3)",
                }}
              >
                {highCount} urgentní
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Timestamp */}
          {briefing && !loading && (
            <span className="text-[10px]" style={{ color: "oklch(0.32 0.005 222)" }}>
              {new Date(briefing.generatedAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="w-6 h-6 rounded-[6px] flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "oklch(0.38 0.005 222)" }}
            title="Obnovit briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Minimize */}
          <button
            onClick={toggleMinimize}
            className="w-6 h-6 rounded-[6px] flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "oklch(0.38 0.005 222)" }}
          >
            {minimized
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronUp   className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 pt-3">
              {/* Loading state */}
              {loading && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "oklch(0.62 0.27 265)" }} />
                    <span className="text-[12px]" style={{ color: "oklch(0.48 0.005 222)" }}>
                      AI analyzuje data a připravuje briefing...
                    </span>
                  </div>
                  <Skeleton />
                </div>
              )}

              {/* Error state */}
              {error && !loading && (
                <div className="flex items-center gap-2 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.65 0.22 25)" }} />
                  <p className="text-[12px]" style={{ color: "oklch(0.55 0.15 25)" }}>{error}</p>
                  <button
                    onClick={() => generate(true)}
                    className="text-[11px] font-semibold ml-auto underline"
                    style={{ color: "oklch(0.72 0.18 265)" }}
                  >
                    Zkusit znovu
                  </button>
                </div>
              )}

              {/* Briefing content */}
              {briefing && !loading && (
                <div className="space-y-3">
                  {/* Greeting + summary */}
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "oklch(0.92 0.006 265)", fontFamily: "var(--font-outfit)" }}>
                      {briefing.greeting}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.50 0.005 222)" }}>
                      {briefing.summary}
                    </p>
                  </div>

                  {/* Insights */}
                  <div className="space-y-1.5">
                    {briefing.insights.map((insight, i) => (
                      <InsightRow key={insight.id} insight={insight} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
