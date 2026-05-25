"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface OwnedItem {
  id: string;
  nazev: string;
  kategorie: string;
  misto: string;
  datum: string;
  cena?: number;
}

interface PriceOption {
  label: string;
  cena: number;
  doporuceno?: boolean;
}

interface PlannedItem {
  id: string;
  nazev: string;
  kategorie: string;
  moznosti: PriceOption[];
  alternativa?: { nazev: string; cena: number };
}

interface InvesticeData {
  vlastnene: OwnedItem[];
  planovane: PlannedItem[];
}

/* ── Seed data ─────────────────────────────────────────────────────────────── */

const SEED: InvesticeData = {
  vlastnene: [
    {
      id: "1",
      nazev: "DJI Mini 5 Pro",
      kategorie: "Drony",
      misto: "DATART",
      datum: "1. 4. 2026",
      cena: 27890,
    },
  ],
  planovane: [
    {
      id: "2",
      nazev: "Datová úložiště / NAS servery",
      kategorie: "IT infrastruktura",
      moznosti: [{ label: "Odhadovaná cena", cena: 40000, doporuceno: true }],
    },
    {
      id: "3",
      nazev: "Sony FE 135mm f/1.8 G Master",
      kategorie: "Optika",
      moznosti: [
        { label: "Nové", cena: 45000 },
        { label: "Bazar", cena: 33000, doporuceno: true },
      ],
      alternativa: { nazev: "Viltrox AF 135mm f/1.8", cena: 19000 },
    },
    {
      id: "4",
      nazev: "Sony A7 V — druhé tělo",
      kategorie: "Kamera",
      moznosti: [{ label: "Nové", cena: 70000, doporuceno: true }],
    },
  ],
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(n);

const KATEGORIE_OPTIONS = [
  "Drony",
  "Kamera",
  "Optika",
  "Osvětlení",
  "Audio",
  "IT infrastruktura",
  "Doprava",
  "Ostatní",
];

const KATEGORIE_COLOR: Record<string, { bg: string; text: string }> = {
  Drony:               { bg: "oklch(0.62 0.27 265 / 0.14)", text: "oklch(0.75 0.20 265)" },
  Optika:              { bg: "oklch(0.72 0.18 55  / 0.14)", text: "oklch(0.80 0.15 55)"  },
  Kamera:              { bg: "oklch(0.62 0.22 25  / 0.14)", text: "oklch(0.75 0.18 25)"  },
  "IT infrastruktura": { bg: "oklch(0.65 0.18 310 / 0.14)", text: "oklch(0.76 0.15 310)" },
  Osvětlení:           { bg: "oklch(0.75 0.19 80  / 0.14)", text: "oklch(0.82 0.16 80)"  },
  Audio:               { bg: "oklch(0.68 0.18 340 / 0.14)", text: "oklch(0.77 0.15 340)" },
  Doprava:             { bg: "oklch(0.70 0.16 200 / 0.14)", text: "oklch(0.78 0.14 200)" },
  Ostatní:             { bg: "oklch(1 0 0 / 0.08)",          text: "oklch(0.60 0.005 222)" },
};

function KategorieBadge({ k }: { k: string }) {
  const c = KATEGORIE_COLOR[k] ?? { bg: "oklch(1 0 0 / 0.08)", text: "oklch(0.60 0.005 222)" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase" as const,
        padding: "2px 7px",
        borderRadius: 4,
        background: c.bg,
        color: c.text,
        flexShrink: 0,
      }}
    >
      {k}
    </span>
  );
}

/* ── Shared styles ─────────────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: "rgba(12, 10, 35, 0.55)",
  backdropFilter: "blur(24px) saturate(1.3)",
  WebkitBackdropFilter: "blur(24px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 12,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "oklch(0.38 0.005 222)",
  fontFamily: "var(--font-sans)",
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  background: "oklch(0.10 0.008 222)",
  border: "1px solid oklch(1 0 0 / 0.10)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "oklch(0.90 0.005 222)",
  fontFamily: "var(--font-sans)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

const btnPrimary: React.CSSProperties = {
  background: "oklch(0.62 0.27 265)",
  color: "oklch(0.97 0.005 222)",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  flexShrink: 0,
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "oklch(0.50 0.005 222)",
  border: "1px solid oklch(1 0 0 / 0.08)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  flexShrink: 0,
};

/* ── Animation variants ────────────────────────────────────────────────────── */

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};
const panelAnim = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  show:   { opacity: 1, height: "auto", marginTop: 8, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit:   { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.18 } },
};

/* ── Delete button ─────────────────────────────────────────────────────────── */

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={onDelete}
          style={{
            background: "oklch(0.55 0.22 25 / 0.15)",
            border: "1px solid oklch(0.55 0.22 25 / 0.3)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            color: "oklch(0.75 0.18 25)",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Smazat
        </button>
        <button
          onClick={() => setConfirm(false)}
          style={{
            background: "transparent",
            border: "none",
            padding: "4px 6px",
            fontSize: 11,
            color: "oklch(0.45 0.005 222)",
            cursor: "pointer",
          }}
        >
          Zrušit
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title="Smazat"
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: "oklch(0.35 0.005 222)",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "oklch(0.65 0.18 25)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "oklch(0.35 0.005 222)")}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M6 6.5v3.5M8 6.5v3.5M3 3.5l.7 7a.5.5 0 00.5.5h5.6a.5.5 0 00.5-.5l.7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

/* ── Add owned item form ────────────────────────────────────────────────────── */

interface AddOwnedFormProps {
  onAdd: (item: Omit<OwnedItem, "id">) => void;
  onCancel: () => void;
}

function AddOwnedForm({ onAdd, onCancel }: AddOwnedFormProps) {
  const today = new Date();
  const defaultDate = `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`;

  const [nazev,     setNazev]     = useState("");
  const [kategorie, setKategorie] = useState(KATEGORIE_OPTIONS[0]);
  const [misto,     setMisto]     = useState("");
  const [datum,     setDatum]     = useState(defaultDate);
  const [cena,      setCena]      = useState("");

  function handleSubmit() {
    if (!nazev.trim()) return;
    onAdd({
      nazev:     nazev.trim(),
      kategorie,
      misto:     misto.trim() || "—",
      datum:     datum.trim() || defaultDate,
      cena:      cena ? parseInt(cena, 10) : undefined,
    });
  }

  return (
    <div
      style={{
        background: "rgba(12, 10, 35, 0.55)",
        backdropFilter: "blur(24px) saturate(1.3)",
        WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        border: "1px solid oklch(0.62 0.27 265 / 0.25)",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.62 0.27 265)", margin: 0 }}>
        Přidat pořízené vybavení
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Název *</label>
          <input
            style={inputStyle}
            placeholder="např. DJI Mini 5 Pro"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Kategorie</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
          >
            {KATEGORIE_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Cena (Kč)</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="27 890"
            value={cena}
            onChange={(e) => setCena(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Kde zakoupeno</label>
          <input
            style={inputStyle}
            placeholder="DATART, Amazon..."
            value={misto}
            onChange={(e) => setMisto(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Datum pořízení</label>
          <input
            style={inputStyle}
            placeholder={defaultDate}
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button style={btnGhost} onClick={onCancel}>Zrušit</button>
        <button
          style={{ ...btnPrimary, opacity: !nazev.trim() ? 0.4 : 1 }}
          onClick={handleSubmit}
          disabled={!nazev.trim()}
        >
          Přidat
        </button>
      </div>
    </div>
  );
}

/* ── Add planned item form ──────────────────────────────────────────────────── */

interface AddPlannedFormProps {
  onAdd: (item: Omit<PlannedItem, "id">) => void;
  onCancel: () => void;
}

function AddPlannedForm({ onAdd, onCancel }: AddPlannedFormProps) {
  const [nazev,     setNazev]     = useState("");
  const [kategorie, setKategorie] = useState(KATEGORIE_OPTIONS[0]);
  const [cena,      setCena]      = useState("");
  const [altNazev,  setAltNazev]  = useState("");
  const [altCena,   setAltCena]   = useState("");

  function handleSubmit() {
    if (!nazev.trim() || !cena) return;
    onAdd({
      nazev:     nazev.trim(),
      kategorie,
      moznosti:  [{ label: "Odhadovaná cena", cena: parseInt(cena, 10), doporuceno: true }],
      alternativa:
        altNazev.trim() && altCena
          ? { nazev: altNazev.trim(), cena: parseInt(altCena, 10) }
          : undefined,
    });
  }

  return (
    <div
      style={{
        background: "rgba(12, 10, 35, 0.55)",
        backdropFilter: "blur(24px) saturate(1.3)",
        WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        border: "1px solid oklch(0.75 0.20 265 / 0.20)",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.75 0.20 265)", margin: 0 }}>
        Přidat plánovanou investici
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Název *</label>
          <input
            style={inputStyle}
            placeholder="např. Sony A7 V"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Kategorie</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
          >
            {KATEGORIE_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Odhadovaná cena (Kč) *</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="70 000"
            value={cena}
            onChange={(e) => setCena(e.target.value)}
          />
        </div>
      </div>

      {/* Optional alternative */}
      <div>
        <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginBottom: 8 }}>
          Levnější alternativa (nepovinné)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Název alternativy</label>
            <input
              style={inputStyle}
              placeholder="např. Viltrox AF 135mm"
              value={altNazev}
              onChange={(e) => setAltNazev(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", display: "block", marginBottom: 4 }}>Cena alternativy (Kč)</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="19 000"
              value={altCena}
              onChange={(e) => setAltCena(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button style={btnGhost} onClick={onCancel}>Zrušit</button>
        <button
          style={{ ...btnPrimary, opacity: !nazev.trim() || !cena ? 0.4 : 1 }}
          onClick={handleSubmit}
          disabled={!nazev.trim() || !cena}
        >
          Přidat
        </button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function InvesticePage() {
  const [data, setData, loading] = useSupabaseData<InvesticeData>("ov-investice", () => SEED);

  const [showAddOwned,   setShowAddOwned]   = useState(false);
  const [showAddPlanned, setShowAddPlanned] = useState(false);

  const vlastnene = data.vlastnene ?? [];
  const planovane = data.planovane ?? [];

  /* ── Computed budget totals ── */
  const vlastneneTotal = vlastnene.reduce((s, i) => s + (i.cena ?? 0), 0);

  const budgetMin = planovane.reduce((s, p) => {
    const rec = p.moznosti.find((m) => m.doporuceno) ?? p.moznosti[0];
    if (!rec) return s;
    const alt = p.alternativa?.cena;
    return s + (alt && alt < rec.cena ? alt : rec.cena);
  }, 0);

  const budgetMax = planovane.reduce((s, p) => {
    if (!p.moznosti.length) return s;
    return s + Math.max(...p.moznosti.map((m) => m.cena));
  }, 0);

  /* ── Handlers ── */
  function addOwned(item: Omit<OwnedItem, "id">) {
    setData((prev) => ({
      ...prev,
      vlastnene: [...(prev.vlastnene ?? []), { ...item, id: crypto.randomUUID() }],
    }));
    setShowAddOwned(false);
  }

  function deleteOwned(id: string) {
    setData((prev) => ({
      ...prev,
      vlastnene: (prev.vlastnene ?? []).filter((i) => i.id !== id),
    }));
  }

  function addPlanned(item: Omit<PlannedItem, "id">) {
    setData((prev) => ({
      ...prev,
      planovane: [...(prev.planovane ?? []), { ...item, id: crypto.randomUUID() }],
    }));
    setShowAddPlanned(false);
  }

  function deletePlanned(id: string) {
    setData((prev) => ({
      ...prev,
      planovane: (prev.planovane ?? []).filter((i) => i.id !== id),
    }));
  }

  /* ── Render ── */
  return (
    <div
      style={{
        background: "transparent",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
        padding: "16px 16px 80px",
      }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}
      >
        {/* ── Header ── */}
        <motion.div variants={fadeUp}>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "-0.035em",
              color: "oklch(0.96 0.005 222)",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Investice
          </h1>
          <p style={{ fontSize: 13, color: "oklch(0.40 0.005 222)", marginTop: 6 }}>
            Přehled pořízeného vybavení a plánovaných investic.
          </p>
        </motion.div>

        {/* ── Budget summary bar ── */}
        <motion.div
          variants={fadeUp}
          style={{
            ...cardStyle,
            padding: "16px 18px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.38 0.005 222)", marginBottom: 5 }}>
              Plánovaný rozpočet
            </p>
            {loading ? (
              <div style={{ height: 24, width: 120, background: "oklch(1 0 0 / 0.06)", borderRadius: 6 }} />
            ) : planovane.length === 0 ? (
              <p style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "oklch(0.38 0.005 222)", lineHeight: 1 }}>
                —
              </p>
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: 24,
                  letterSpacing: "-0.03em",
                  color: "oklch(0.96 0.005 222)",
                  lineHeight: 1,
                }}
              >
                {fmt(budgetMin)}
                {budgetMin !== budgetMax && (
                  <span style={{ fontSize: 14, color: "oklch(0.45 0.005 222)", fontWeight: 500, marginLeft: 6 }}>
                    — {fmt(budgetMax)}
                  </span>
                )}
              </p>
            )}
            <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginTop: 5 }}>
              nejlevnější kombinace / maximální varianta
            </p>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {vlastneneTotal > 0 && (
              <>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginBottom: 3 }}>Hodnota majetku</p>
                  <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "oklch(0.72 0.2 155)", lineHeight: 1 }}>
                    {fmt(vlastneneTotal)}
                  </p>
                </div>
                <div style={{ width: 1, background: "oklch(1 0 0 / 0.07)", alignSelf: "stretch" }} />
              </>
            )}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginBottom: 3 }}>V majetku</p>
              <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "oklch(0.72 0.2 155)", lineHeight: 1 }}>
                {vlastnene.length}
              </p>
            </div>
            <div style={{ width: 1, background: "oklch(1 0 0 / 0.07)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginBottom: 3 }}>Plánováno</p>
              <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "oklch(0.75 0.20 265)", lineHeight: 1 }}>
                {planovane.length}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── V majetku ── */}
        <motion.div variants={fadeUp}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>V majetku</p>
            <button
              onClick={() => { setShowAddOwned(!showAddOwned); setShowAddPlanned(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: showAddOwned ? "oklch(0.62 0.27 265 / 0.15)" : "transparent",
                border: `1px solid ${showAddOwned ? "oklch(0.62 0.27 265 / 0.30)" : "oklch(1 0 0 / 0.09)"}`,
                borderRadius: 7,
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 600,
                color: showAddOwned ? "oklch(0.75 0.20 265)" : "oklch(0.50 0.005 222)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "all 0.15s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Přidat pořízené
            </button>
          </div>

          <AnimatePresence>
            {showAddOwned && (
              <motion.div
                key="add-owned"
                variants={panelAnim}
                initial="hidden"
                animate="show"
                exit="exit"
                style={{ overflow: "hidden", marginBottom: 10 }}
              >
                <AddOwnedForm
                  onAdd={addOwned}
                  onCancel={() => setShowAddOwned(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AnimatePresence mode="popLayout">
              {vlastnene.map((itm) => (
                <motion.div
                  key={itm.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{
                    ...cardStyle,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {/* Green dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "oklch(0.72 0.2 155)",
                      boxShadow: "0 0 8px 2px oklch(0.72 0.2 155 / 0.4)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                          fontSize: 15,
                          color: "oklch(0.93 0.005 222)",
                        }}
                      >
                        {itm.nazev}
                      </span>
                      <KategorieBadge k={itm.kategorie} />
                    </div>
                    <p style={{ fontSize: 12, color: "oklch(0.42 0.005 222)", marginTop: 4 }}>
                      Zakoupeno: <span style={{ color: "oklch(0.58 0.005 222)" }}>{itm.misto}</span>
                      <span style={{ margin: "0 6px", color: "oklch(0.28 0.005 222)" }}>·</span>
                      {itm.datum}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                    {itm.cena && (
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: 16,
                          letterSpacing: "-0.02em",
                          color: "oklch(0.72 0.2 155)",
                          lineHeight: 1,
                        }}
                      >
                        {fmt(itm.cena)}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase" as const,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "oklch(0.72 0.2 155 / 0.12)",
                        color: "oklch(0.72 0.2 155)",
                      }}
                    >
                      Pořízeno
                    </span>
                  </div>
                  <DeleteBtn onDelete={() => deleteOwned(itm.id)} />
                </motion.div>
              ))}
            </AnimatePresence>

            {vlastnene.length === 0 && !showAddOwned && (
              <div
                style={{
                  ...cardStyle,
                  padding: "24px 20px",
                  textAlign: "center",
                  color: "oklch(0.35 0.005 222)",
                  fontSize: 13,
                }}
              >
                Zatím žádné pořízené vybavení
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Plánujeme ── */}
        <motion.div variants={fadeUp}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Plánujeme pořídit</p>
            <button
              onClick={() => { setShowAddPlanned(!showAddPlanned); setShowAddOwned(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: showAddPlanned ? "oklch(0.75 0.20 265 / 0.12)" : "transparent",
                border: `1px solid ${showAddPlanned ? "oklch(0.75 0.20 265 / 0.25)" : "oklch(1 0 0 / 0.09)"}`,
                borderRadius: 7,
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 600,
                color: showAddPlanned ? "oklch(0.80 0.18 265)" : "oklch(0.50 0.005 222)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "all 0.15s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Přidat plánované
            </button>
          </div>

          <AnimatePresence>
            {showAddPlanned && (
              <motion.div
                key="add-planned"
                variants={panelAnim}
                initial="hidden"
                animate="show"
                exit="exit"
                style={{ overflow: "hidden", marginBottom: 10 }}
              >
                <AddPlannedForm
                  onAdd={addPlanned}
                  onCancel={() => setShowAddPlanned(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {planovane.map((inv) => {
                const rec = inv.moznosti.find((m) => m.doporuceno) ?? inv.moznosti[0];
                return (
                  <motion.div
                    key={inv.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ ...cardStyle, padding: "18px 20px" }}
                  >
                    {/* Top row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              fontSize: 15,
                              color: "oklch(0.93 0.005 222)",
                            }}
                          >
                            {inv.nazev}
                          </span>
                          <KategorieBadge k={inv.kategorie} />
                        </div>
                      </div>

                      {/* Price options + delete */}
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
                        {inv.moznosti.map((opt) => (
                          <div
                            key={opt.label}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: opt.doporuceno
                                ? "oklch(0.62 0.27 265 / 0.10)"
                                : "oklch(1 0 0 / 0.04)",
                              border: `1px solid ${opt.doporuceno ? "oklch(0.62 0.27 265 / 0.20)" : "oklch(1 0 0 / 0.06)"}`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase" as const,
                                color: opt.doporuceno ? "oklch(0.62 0.27 265)" : "oklch(0.42 0.005 222)",
                                marginBottom: 3,
                              }}
                            >
                              {opt.label}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-heading)",
                                fontWeight: 700,
                                fontSize: 16,
                                letterSpacing: "-0.02em",
                                color: opt.doporuceno ? "oklch(0.90 0.005 222)" : "oklch(0.60 0.005 222)",
                                lineHeight: 1,
                              }}
                            >
                              {fmt(opt.cena)}
                            </span>
                          </div>
                        ))}
                        <DeleteBtn onDelete={() => deletePlanned(inv.id)} />
                      </div>
                    </div>

                    {/* Alternativa */}
                    {inv.alternativa && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "8px 12px",
                          borderRadius: 7,
                          background: "oklch(1 0 0 / 0.03)",
                          border: "1px solid oklch(1 0 0 / 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.07em",
                              textTransform: "uppercase" as const,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "oklch(0.72 0.18 55 / 0.12)",
                              color: "oklch(0.78 0.15 55)",
                            }}
                          >
                            Alternativa
                          </span>
                          <span style={{ fontSize: 12, color: "oklch(0.60 0.005 222)" }}>
                            {inv.alternativa.nazev}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-heading)",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "oklch(0.78 0.15 55)",
                          }}
                        >
                          {fmt(inv.alternativa.cena)}
                        </span>
                      </div>
                    )}

                    {/* Savings note if bazar option exists */}
                    {inv.moznosti.length > 1 && rec?.label === "Bazar" && (
                      <p style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", marginTop: 8 }}>
                        Úspora oproti novému:{" "}
                        <span style={{ color: "oklch(0.72 0.2 155)", fontWeight: 600 }}>
                          {fmt(inv.moznosti.find((m) => m.label === "Nové")!.cena - rec.cena)}
                        </span>
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {planovane.length === 0 && !showAddPlanned && (
              <div
                style={{
                  ...cardStyle,
                  padding: "24px 20px",
                  textAlign: "center",
                  color: "oklch(0.35 0.005 222)",
                  fontSize: 13,
                }}
              >
                Žádné plánované investice
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
