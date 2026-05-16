"use client";

import { motion } from "framer-motion";

/* ── Data ──────────────────────────────────────────────────────────────────── */

interface OwnedItem {
  id: number;
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
  id: number;
  nazev: string;
  kategorie: string;
  moznosti: PriceOption[];
  alternativa?: { nazev: string; cena: number };
}

const vlastnene: OwnedItem[] = [
  {
    id: 1,
    nazev: "DJI Mini 5 Pro",
    kategorie: "Drony",
    misto: "DATART",
    datum: "1. 4. 2026",
  },
];

const planovane: PlannedItem[] = [
  {
    id: 1,
    nazev: "Datová úložiště / NAS servery",
    kategorie: "IT infrastruktura",
    moznosti: [{ label: "Odhadovaná cena", cena: 40000, doporuceno: true }],
  },
  {
    id: 2,
    nazev: "Sony FE 135mm f/1.8 G Master",
    kategorie: "Optika",
    moznosti: [
      { label: "Nové", cena: 45000 },
      { label: "Bazar", cena: 33000, doporuceno: true },
    ],
    alternativa: { nazev: "Viltrox AF 135mm f/1.8", cena: 19000 },
  },
  {
    id: 3,
    nazev: "Sony A7 V — druhé tělo",
    kategorie: "Kamera",
    moznosti: [{ label: "Nové", cena: 70000, doporuceno: true }],
  },
];

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);

const KATEGORIE_COLOR: Record<string, { bg: string; text: string }> = {
  Drony:            { bg: "oklch(0.62 0.27 265 / 0.14)", text: "oklch(0.75 0.20 265)" },
  Optika:           { bg: "oklch(0.72 0.18 55  / 0.14)", text: "oklch(0.80 0.15 55)"  },
  Kamera:           { bg: "oklch(0.62 0.22 25  / 0.14)", text: "oklch(0.75 0.18 25)"  },
  "IT infrastruktura": { bg: "oklch(0.65 0.18 310 / 0.14)", text: "oklch(0.76 0.15 310)" },
};

function KategorieBadge({ k }: { k: string }) {
  const c = KATEGORIE_COLOR[k] ?? { bg: "oklch(1 0 0 / 0.08)", text: "oklch(0.60 0.005 222)" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
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

/* ── Animation ─────────────────────────────────────────────────────────────── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } } };

const cardStyle: React.CSSProperties = {
  background: "oklch(0.12 0.008 222)",
  border: "1px solid oklch(1 0 0 / 0.07)",
  borderRadius: 12,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "oklch(0.38 0.005 222)",
  fontFamily: "var(--font-sans)",
  marginBottom: 10,
};

/* ── Budget summary ─────────────────────────────────────────────────────────── */
// Sum of the "doporuceno" option for each planned item
const budgetMin = planovane.reduce((s, p) => {
  const rec = p.moznosti.find((m) => m.doporuceno) ?? p.moznosti[0];
  const alt = p.alternativa?.cena;
  return s + (alt && alt < rec.cena ? alt : rec.cena);
}, 0);

const budgetMax = planovane.reduce((s, p) => {
  return s + Math.max(...p.moznosti.map((m) => m.cena));
}, 0);

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function InvesticePage() {
  return (
    <div
      style={{
        background: "oklch(0.09 0.008 222)",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
        padding: "28px 24px 80px",
      }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}
      >
        {/* ── Header ── */}
        <motion.div variants={item}>
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
          variants={item}
          style={{
            ...cardStyle,
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.38 0.005 222)", marginBottom: 5 }}>
              Plánovaný rozpočet
            </p>
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
            <p style={{ fontSize: 11, color: "oklch(0.38 0.005 222)", marginTop: 5 }}>
              nejlevnější kombinace / maximální varianta
            </p>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
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
        <motion.div variants={item}>
          <p style={sectionLabel}>V majetku</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {vlastnene.map((item_) => (
              <div
                key={item_.id}
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
                      {item_.nazev}
                    </span>
                    <KategorieBadge k={item_.kategorie} />
                  </div>
                  <p style={{ fontSize: 12, color: "oklch(0.42 0.005 222)", marginTop: 4 }}>
                    Zakoupeno: <span style={{ color: "oklch(0.58 0.005 222)" }}>{item_.misto}</span>
                    <span style={{ margin: "0 6px", color: "oklch(0.28 0.005 222)" }}>·</span>
                    {item_.datum}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "oklch(0.72 0.2 155 / 0.12)",
                    color: "oklch(0.72 0.2 155)",
                    flexShrink: 0,
                  }}
                >
                  Pořízeno
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Plánujeme ── */}
        <motion.div variants={item}>
          <p style={sectionLabel}>Plánujeme pořídit</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {planovane.map((inv) => {
              const rec = inv.moznosti.find((m) => m.doporuceno) ?? inv.moznosti[0];
              return (
                <div
                  key={inv.id}
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

                    {/* Price options */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
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
                              textTransform: "uppercase",
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
                            textTransform: "uppercase",
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
                  {inv.moznosti.length > 1 && rec.label === "Bazar" && (
                    <p style={{ fontSize: 11, color: "oklch(0.42 0.005 222)", marginTop: 8 }}>
                      Úspora oproti novému:{" "}
                      <span style={{ color: "oklch(0.72 0.2 155)", fontWeight: 600 }}>
                        {fmt(inv.moznosti.find((m) => m.label === "Nové")!.cena - rec.cena)}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
