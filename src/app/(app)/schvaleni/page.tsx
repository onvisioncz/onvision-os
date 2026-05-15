"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardCheck, CheckCircle, XCircle, Clock, FileText, Palette, FileCheck, ScrollText, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type SchvaleniTyp = "Faktura" | "Kreativa" | "Nabídka" | "Smlouva";
type SchvaleniStatus = "Čeká" | "Schváleno" | "Zamítnuto";

interface SchvaleniItem {
  id: number;
  typ: SchvaleniTyp;
  klient: string;
  popis: string;
  castka?: number;
  status: SchvaleniStatus;
  datum: string;
  poznamka?: string;
}

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const SEED: SchvaleniItem[] = [
  { id: 1,  typ: "Faktura",  klient: "IMTOS",                 popis: "FV-2026-015 za OPENHOUSE vizuál",       castka: 4000,   status: "Čeká",     datum: "14. 5." },
  { id: 2,  typ: "Kreativa", klient: "Mo.one",                popis: "Úvodní pracovní zadání — Monika Kudličková", castka: 17500, status: "Čeká",    datum: "13. 5." },
  { id: 3,  typ: "Nabídka",  klient: "EFFECT Clinic",         popis: "Komplexní spolupráce Q3 2026",           castka: 85000,  status: "Čeká",     datum: "12. 5." },
  { id: 4,  typ: "Smlouva",  klient: "YONEX Česká republika", popis: "Roční content smlouva 2026",             castka: 120000, status: "Čeká",     datum: "15. 5." },
  { id: 5,  typ: "Faktura",  klient: "EASTGATE Brno",         popis: "Měsíční aktualizace Monika — duben",     castka: 1000,   status: "Čeká",     datum: "10. 5." },
  { id: 6,  typ: "Faktura",  klient: "TEKMA",                 popis: "FV-2026-014 promo video",               castka: 60000,  status: "Schváleno", datum: "8. 5." },
  { id: 7,  typ: "Kreativa", klient: "SK Brno Extraliga",     popis: "FINAL 4 dokumenty k prezentaci",         castka: 5000,   status: "Schváleno", datum: "7. 5." },
  { id: 8,  typ: "Nabídka",  klient: "Wellness ZENIQ",        popis: "Sociální sítě balíček",                  castka: 35000,  status: "Zamítnuto", datum: "5. 5.", poznamka: "Příliš vysoká cena" },
  { id: 9,  typ: "Faktura",  klient: "SENIMED",               popis: "FV-2026-012 za březen",                  castka: 47500,  status: "Schváleno", datum: "3. 5." },
  { id: 10, typ: "Smlouva",  klient: "BehejBrno",             popis: "Roční spolupráce content",               castka: 55000,  status: "Schváleno", datum: "1. 5." },
];

const ACCENT = "oklch(0.75 0.18 45)";

/* ── Type icon ──────────────────────────────────────────────────────────────── */
function TypIcon({ typ }: { typ: SchvaleniTyp }) {
  const map: Record<SchvaleniTyp, React.ElementType> = {
    Faktura: FileText,
    Kreativa: Palette,
    Nabídka: FileCheck,
    Smlouva: ScrollText,
  };
  const Icon = map[typ];
  return <Icon className="w-4 h-4" style={{ color: ACCENT }} />;
}

/* ── Reject modal ───────────────────────────────────────────────────────────── */
function RejectModal({ item, onClose, onConfirm }: { item: SchvaleniItem; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "oklch(0 0 0 / 0.6)" }} onClick={onClose} />
      <motion.div
        className="card relative w-full max-w-sm p-5 space-y-4"
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>
            Zamítnout položku
          </h2>
          <button onClick={onClose} className="btn-tactile p-1 rounded-[5px]" style={{ color: "oklch(0.45 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[12px] text-[--muted-foreground]">
          <span className="font-semibold text-[--foreground]">{item.klient}</span> · {item.popis}
        </p>
        <div>
          <label className="block text-[11px] font-semibold text-[--muted-foreground] mb-1.5 uppercase tracking-[0.05em]">Důvod zamítnutí</label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Uveďte důvod..."
            autoFocus
            className="w-full px-3 py-2 rounded-[8px] text-[13px] text-[--foreground] outline-none"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", fontFamily: "var(--font-jakarta)" }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[12px] font-medium"
            style={{ color: "oklch(0.45 0.005 222)", background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)" }}
          >
            Zrušit
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="btn-tactile px-4 py-2 rounded-[8px] text-[12px] font-semibold"
            style={{ background: "oklch(0.55 0.22 25)", color: "#fff" }}
          >
            Zamítnout
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function SchvaleniPage() {
  const [items, setItems] = useState<SchvaleniItem[]>(SEED);
  const [rejecting, setRejecting] = useState<SchvaleniItem | null>(null);

  const approve = (id: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "Schváleno" as SchvaleniStatus } : i));
  };

  const reject = (id: number, reason: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "Zamítnuto" as SchvaleniStatus, poznamka: reason || i.poznamka } : i));
  };

  const pending = items.filter(i => i.status === "Čeká");
  const history = items.filter(i => i.status !== "Čeká");
  const pendingValue = pending.reduce((s, i) => s + (i.castka ?? 0), 0);
  const approvedThisMonth = history.filter(i => i.status === "Schváleno").length;

  return (
    <div
      className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{
        background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.75 0.18 45 / 0.04) 0%, transparent 70%), var(--background)`,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1
          className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
        >
          Schválení
        </h1>
        <p className="text-[12px] md:text-[13px] text-[--muted-foreground] mt-1.5">
          OnVision s.r.o. · Fronty ke schválení
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
      >
        {[
          { label: "Čeká na schválení",     value: String(pending.length),                         unit: "",   color: ACCENT },
          { label: "Schváleno tento měsíc",  value: String(approvedThisMonth),                      unit: "",   color: "oklch(0.67 0.155 155)" },
          { label: "Hodnota ke schválení",   value: pendingValue.toLocaleString("cs-CZ"),           unit: "Kč", color: "oklch(0.81 0.155 200)" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="px-5 py-4" style={{ background: "var(--card)" }}>
            <p className="text-[11px] text-[--muted-foreground] uppercase tracking-[0.06em] font-medium mb-1">{label}</p>
            <p style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 26, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {value}
              {unit && <span style={{ fontSize: 13, fontWeight: 400, color: "oklch(0.40 0.005 222)", marginLeft: 4 }}>{unit}</span>}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Pending section */}
      <div>
        <p className="section-label mb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          Čeká na schválení
          {pending.length > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
              style={{ background: ACCENT, color: "oklch(0.09 0.008 222)" }}
            >
              {pending.length}
            </span>
          )}
        </p>

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {pending.length === 0 && (
              <motion.div
                key="empty-pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card py-8 flex flex-col items-center text-[--muted-foreground]"
              >
                <ClipboardCheck className="w-7 h-7 mb-2 opacity-30" />
                <p className="text-[13px] font-medium">Vše schváleno — fronta je prázdná</p>
              </motion.div>
            )}
            {pending.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <div
                  className="card p-4 flex items-center gap-4"
                  style={{ borderLeft: `3px solid ${ACCENT}` }}
                >
                  <div
                    className="w-10 h-10 rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.75 0.18 45 / 0.12)", border: "1px solid oklch(0.75 0.18 45 / 0.2)" }}
                  >
                    <TypIcon typ={item.typ} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[3px]"
                        style={{ color: ACCENT, background: "oklch(0.75 0.18 45 / 0.1)", border: "1px solid oklch(0.75 0.18 45 / 0.2)" }}
                      >
                        {item.typ}
                      </span>
                      <span className="text-[11px] text-[--muted-foreground]">{item.datum}</span>
                    </div>
                    <p
                      className="text-[13px] font-semibold text-[--foreground] leading-snug"
                      style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}
                    >
                      {item.klient}
                    </p>
                    <p className="text-[11px] text-[--muted-foreground] leading-snug">{item.popis}</p>
                    {item.castka !== undefined && (
                      <p className="text-[13px] font-bold mt-0.5" style={{ fontFamily: "var(--font-outfit)", color: ACCENT }}>
                        {item.castka.toLocaleString("cs-CZ")} Kč
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      onClick={() => setRejecting(item)}
                      className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: "oklch(0.55 0.22 25 / 0.1)", color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.55 0.22 25 / 0.2)" }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Zamítnout
                    </motion.button>
                    <motion.button
                      onClick={() => approve(item.id)}
                      className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: "oklch(0.67 0.155 155 / 0.12)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.25)" }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Schválit
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* History section */}
      <div>
        <p className="section-label mb-3">Historie</p>
        <div className="card overflow-hidden">
          <AnimatePresence initial={false}>
            {history.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-[7px] flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.75 0.18 45 / 0.08)", border: "1px solid oklch(0.75 0.18 45 / 0.15)" }}
                >
                  <TypIcon typ={item.typ} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-[--foreground] truncate" style={{ fontFamily: "var(--font-outfit)" }}>
                      {item.klient}
                    </span>
                    <span className="text-[10px] text-[--muted-foreground]">· {item.typ}</span>
                  </div>
                  <p className="text-[11px] text-[--muted-foreground] truncate">{item.popis}</p>
                  {item.poznamka && (
                    <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.65 0.22 25)" }}>{item.poznamka}</p>
                  )}
                </div>

                {item.castka !== undefined && (
                  <span className="num text-[12px] font-bold shrink-0" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.50 0.005 222)" }}>
                    {item.castka.toLocaleString("cs-CZ")} Kč
                  </span>
                )}

                <span className="text-[10px] text-[--muted-foreground] shrink-0">{item.datum}</span>

                <span
                  className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-1 rounded-[4px] shrink-0"
                  style={
                    item.status === "Schváleno"
                      ? { color: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.22)" }
                      : { color: "oklch(0.65 0.22 25)", background: "oklch(0.55 0.22 25 / 0.1)", border: "1px solid oklch(0.55 0.22 25 / 0.2)" }
                  }
                >
                  {item.status}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {history.length === 0 && (
            <div className="py-8 flex flex-col items-center text-[--muted-foreground]">
              <p className="text-[13px]">Žádná historie</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejecting && (
          <RejectModal
            item={rejecting}
            onClose={() => setRejecting(null)}
            onConfirm={(reason) => {
              reject(rejecting.id, reason);
              setRejecting(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
