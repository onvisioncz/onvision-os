"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Download, ChevronDown, Loader2, CheckCircle2,
  AlertCircle, FileText, RefreshCw,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Constants ───────────────────────────────────────────────────────────── */
const CLIENTS = [
  "OnVision", "IMTOS", "FIRESTA", "MTB CZ",
  "BEHEJ BRNO", "TOFFI", "SENIMED", "EASTGATE BRNO", "POWERPLATE",
];

const CZECH_MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [year, mon] = month.split("-");
  return `${CZECH_MONTHS[parseInt(mon, 10) - 1]} ${year}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ReportArchiveEntry {
  id: string;
  client: string;
  month: string;
  generatedAt: string;
  filename: string;
  analystName: string;
}

/* ── Progress steps ──────────────────────────────────────────────────────── */
const STEPS = [
  { label: "Stahuju data z Meta API", icon: "⚡" },
  { label: "Vybírám příspěvek měsíce", icon: "📸" },
  { label: "AI píše komentáře...", icon: "✦" },
  { label: "Generuji PDF", icon: "📄" },
] as const;

/* ── Step indicator ──────────────────────────────────────────────────────── */
function ProgressIndicator({ step, total }: { step: number; total: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-[14px] p-5 space-y-4"
      style={{
        background: "oklch(0.62 0.27 265 / 0.06)",
        border: "1px solid oklch(0.62 0.27 265 / 0.2)",
      }}
    >
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.72 0.18 265)" }} />
        <span className="text-[13px] font-semibold" style={{ color: "oklch(0.88 0.005 265)" }}>
          Generování reportu...
        </span>
      </div>

      <div className="space-y-2.5">
        {STEPS.map((s, i) => {
          const done    = i < step;
          const active  = i === step;
          const pending = i > step;
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Icon */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] shrink-0"
                style={
                  done   ? { background: "oklch(0.68 0.18 155 / 0.2)", border: "1px solid oklch(0.68 0.18 155 / 0.4)" } :
                  active ? { background: "oklch(0.62 0.27 265 / 0.2)", border: "1px solid oklch(0.62 0.27 265 / 0.5)" } :
                           { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }
                }
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.68 0.18 155)" }} />
                ) : (
                  <span>{s.icon}</span>
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] font-medium"
                    style={{
                      color: done   ? "oklch(0.68 0.18 155)" :
                             active ? "oklch(0.88 0.005 265)" :
                                      "oklch(0.38 0.005 222)",
                    }}
                  >
                    {s.label}
                  </span>
                  {active && (
                    <motion.div
                      className="flex gap-0.5"
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      {[0, 1, 2].map(d => (
                        <div
                          key={d}
                          className="w-1 h-1 rounded-full"
                          style={{
                            background: "oklch(0.72 0.18 265)",
                            animationDelay: `${d * 0.2}s`,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Step number */}
              <span className="text-[10px]" style={{ color: pending ? "oklch(0.28 0.005 222)" : "oklch(0.42 0.005 222)" }}>
                {i + 1}/{total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.06)" }}>
        <motion.div
          className="h-1 rounded-full"
          style={{ background: "oklch(0.62 0.27 265)" }}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ── Archive row ──────────────────────────────────────────────────────────── */
function ArchiveRow({
  entry,
  onDownload,
}: {
  entry: ReportArchiveEntry;
  onDownload: (entry: ReportArchiveEntry) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3 rounded-[10px]"
      style={{
        background: "oklch(1 0 0 / 0.03)",
        border: "1px solid oklch(1 0 0 / 0.07)",
      }}
    >
      {/* PDF icon */}
      <div
        className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}
      >
        <FileText className="w-4 h-4" style={{ color: "oklch(0.72 0.18 265)" }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold" style={{ color: "oklch(0.92 0.005 265)" }}>
            {entry.client}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.72 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}
          >
            {formatMonth(entry.month)}
          </span>
        </div>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: "oklch(0.38 0.005 222)" }}>
          {entry.filename} · {formatDate(entry.generatedAt)}
          {entry.analystName && ` · ${entry.analystName}`}
        </p>
      </div>

      {/* Download */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => onDownload(entry)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold shrink-0"
        style={{
          background: "oklch(0.62 0.27 265 / 0.12)",
          color: "oklch(0.72 0.18 265)",
          border: "1px solid oklch(0.62 0.27 265 / 0.25)",
        }}
      >
        <Download className="w-3.5 h-3.5" />
        Stáhnout
      </motion.button>
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ReportyPage() {
  useUserRole(); // ensures auth redirect if not logged in
  const [archive, setArchive] = useSupabaseData<ReportArchiveEntry[]>(
    "ov-reports-archive",
    () => []
  );

  const [selectedClient, setSelectedClient] = useState(CLIENTS[0]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showClientDrop, setShowClientDrop] = useState(false);

  // Simulate progress steps while waiting for API
  async function simulateProgress(durationMs: number) {
    const stepMs = durationMs / STEPS.length;
    for (let i = 0; i < STEPS.length; i++) {
      setProgressStep(i);
      await new Promise(r => setTimeout(r, stepMs));
    }
  }

  async function handleGenerate() {
    setError(null);
    setSuccess(false);
    setGenerating(true);
    setProgressStep(0);

    // Start progress simulation (estimate ~15 seconds for full report)
    const progressPromise = simulateProgress(14000);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: selectedClient, month: selectedMonth }),
      });

      await progressPromise;

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = res.headers.get("Content-Disposition")
        ?.match(/filename="([^"]+)"/)?.[1]
        ?? `OnVision_Report_${selectedClient}_${selectedMonth}.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      // Refresh archive
      const archiveRes = await fetch("/api/sync?key=ov-reports-archive");
      const { value } = await archiveRes.json();
      if (Array.isArray(value)) {
        setArchive(value);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(entry: ReportArchiveEntry) {
    // Re-generate on demand (reports aren't stored as files, only metadata is)
    setSelectedClient(entry.client);
    setSelectedMonth(entry.month);
    await handleGenerate();
  }

  // Sorted archive — newest first
  const sortedArchive = [...archive].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <BarChart2 className="w-5 h-5" style={{ color: "oklch(0.62 0.27 265)" }} />
              <h1
                className="text-[20px] font-bold tracking-tight"
                style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}
              >
                Měsíční reporty
              </h1>
            </div>
            <p className="text-[12px] mt-0.5 pl-7" style={{ color: "oklch(0.4 0.005 222)" }}>
              Automatické PDF reporty pro klienty z Meta API + AI komentáře
            </p>
          </div>

          {/* Archive count */}
          {archive.length > 0 && (
            <div
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0"
              style={{
                background: "oklch(0.62 0.27 265 / 0.1)",
                color: "oklch(0.72 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.2)",
              }}
            >
              <FileText className="w-3 h-3" />
              {archive.length} {archive.length === 1 ? "report" : "reportů"}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 py-6 max-w-3xl space-y-6">

        {/* ── Generator card ─────────────────────────────────────────────── */}
        <div
          className="rounded-[14px] py-2"
        >
          <h2
            className="text-[14px] font-bold mb-4"
            style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}
          >
            Generovat nový report
          </h2>

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Client dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowClientDrop(p => !p)}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-[13px] font-medium min-w-[160px]"
                style={{
                  background: "oklch(1 0 0 / 0.05)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                  color: "oklch(0.88 0.005 265)",
                }}
              >
                <span className="flex-1 text-left">{selectedClient}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.45 0.005 222)" }} />
              </button>
              <AnimatePresence>
                {showClientDrop && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 top-full mt-1 z-30 rounded-[10px] overflow-hidden py-1 min-w-[180px]"
                    style={{
                      background: "oklch(0.14 0.008 222)",
                      border: "1px solid oklch(1 0 0 / 0.12)",
                      boxShadow: "0 8px 24px oklch(0 0 0 / 0.5)",
                    }}
                  >
                    {CLIENTS.map(c => (
                      <button
                        key={c}
                        onClick={() => { setSelectedClient(c); setShowClientDrop(false); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-medium hover:bg-white/5 transition-colors"
                        style={{ color: selectedClient === c ? "oklch(0.78 0.18 265)" : "oklch(0.62 0.005 222)" }}
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Month picker */}
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              disabled={generating}
              className="px-4 py-2.5 rounded-[9px] text-[13px] font-medium outline-none"
              style={{
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.12)",
                color: "oklch(0.88 0.005 265)",
                colorScheme: "dark",
              }}
            />

            {/* Generate button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[9px] text-[13px] font-semibold"
              style={{
                background: generating
                  ? "oklch(0.62 0.27 265 / 0.15)"
                  : "oklch(0.62 0.27 265)",
                color: generating ? "oklch(0.72 0.18 265)" : "oklch(0.97 0.004 265)",
                border: generating ? "1px solid oklch(0.62 0.27 265 / 0.3)" : "none",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span style={{ fontSize: 14 }}>✦</span>
              )}
              Generovat report
            </motion.button>
          </div>

          {/* Progress */}
          <AnimatePresence>
            {generating && (
              <div className="mt-5">
                <ProgressIndicator step={progressStep} total={STEPS.length} />
              </div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-start gap-3 px-4 py-3 rounded-[10px]"
                style={{ background: "oklch(0.65 0.22 25 / 0.1)", border: "1px solid oklch(0.65 0.22 25 / 0.25)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.22 25)" }} />
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "oklch(0.75 0.22 25)" }}>
                    Chyba při generování
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.55 0.15 25)" }}>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-3 px-4 py-3 rounded-[10px]"
                style={{ background: "oklch(0.68 0.18 155 / 0.1)", border: "1px solid oklch(0.68 0.18 155 / 0.25)" }}
              >
                <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.68 0.18 155)" }} />
                <p className="text-[12px] font-semibold" style={{ color: "oklch(0.78 0.18 155)" }}>
                  Report vygenerován a stažen!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Archive ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[14px] font-bold"
              style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}
            >
              Archiv reportů
            </h2>
            <button
              onClick={async () => {
                const res = await fetch("/api/sync?key=ov-reports-archive");
                const { value } = await res.json();
                if (Array.isArray(value)) setArchive(value);
              }}
              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-[7px]"
              style={{
                background: "oklch(1 0 0 / 0.04)",
                color: "oklch(0.45 0.005 222)",
                border: "1px solid oklch(1 0 0 / 0.07)",
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Obnovit
            </button>
          </div>

          {sortedArchive.length === 0 ? (
            <div
              className="py-12 rounded-[12px] flex flex-col items-center justify-center gap-3"
              style={{ background: "oklch(1 0 0 / 0.02)", border: "1px dashed oklch(1 0 0 / 0.08)" }}
            >
              <FileText className="w-8 h-8" style={{ color: "oklch(0.28 0.005 222)" }} />
              <p className="text-[13px] font-medium" style={{ color: "oklch(0.38 0.005 222)" }}>
                Zatím žádné vygenerované reporty
              </p>
              <p className="text-[11px]" style={{ color: "oklch(0.28 0.005 222)" }}>
                Vyberte klienta a měsíc a klikněte na Generovat report
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedArchive.map((entry) => (
                <ArchiveRow
                  key={entry.id}
                  entry={entry}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Info box ───────────────────────────────────────────────────── */}
        <div
          className="rounded-[12px] p-4 space-y-2"
          style={{ background: "oklch(1 0 0 / 0.02)", border: "1px solid oklch(1 0 0 / 0.06)" }}
        >
          <p className="text-[11px] font-semibold" style={{ color: "oklch(0.45 0.005 222)" }}>
            Jak to funguje
          </p>
          <div className="space-y-1.5">
            {[
              "Report automaticky stahuje data z Meta API (Instagram + Facebook)",
              "AI analytik Claude napíše profesionální komentáře v češtině",
              "Výsledkem je 3stránkový PDF report připravený pro klienta",
              "Pokud Meta API data nejsou dostupná, report se vygeneruje s demo daty",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] mt-0.5" style={{ color: "oklch(0.62 0.27 265)" }}>✦</span>
                <p className="text-[11px]" style={{ color: "oklch(0.38 0.005 222)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
