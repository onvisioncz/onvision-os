"use client";

/* ─────────────────────────────────────────────────────────────────────────
   DESIGN LAB — veřejný náhled editorial dashboardu s mock daty.
   Slouží jen k vizuálnímu ladění (screenshot v preview). Po dokončení
   se komponenta přesune do ostrého dashboardu a tato routa se smaže.
───────────────────────────────────────────────────────────────────────── */

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const HEAD = "var(--font-outfit)"; // Space Grotesk
const BODY = "var(--font-jakarta)"; // Inter
const INK = "oklch(0.96 0.004 265)";
const INK2 = "oklch(0.72 0.01 265)";
const INK3 = "oklch(0.55 0.012 265)";
const ACCENT = "oklch(0.66 0.26 265)";
const POS = "oklch(0.74 0.14 158)";
const NEG = "oklch(0.68 0.2 25)";

/* Mock */
const NAME = "Adame";
const stats = [
  { k: "Příjmy · červenec", v: "242 500", u: "Kč", delta: -20, deltaLabel: "vs. červen" },
  { k: "Čistý zisk · YTD", v: "776 700", u: "Kč", delta: +12, deltaLabel: "vs. loni" },
  { k: "Aktivní klienti", v: "9", u: "", sub: "6 jednorázových" },
  { k: "Otevřené úkoly", v: "14", u: "", sub: "6 po termínu", warn: true },
];

const fires = [
  { label: "1 faktura po splatnosti", detail: "18 000 Kč", tone: NEG },
  { label: "6 úkolů po termínu", detail: "", tone: "oklch(0.78 0.15 80)" },
  { label: "1 čeká na schválení", detail: "EFFECT Clinic", tone: ACCENT },
];

export default function DesignLab() {
  return (
    <div style={{ minHeight: "100vh", background: "oklch(0.115 0.014 265)", fontFamily: BODY, color: INK }}>
      {/* jemný horní glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(1200px 480px at 82% -8%, oklch(0.62 0.27 265 / 0.20), transparent 60%)" }} />

      <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto", padding: "72px 40px 80px" }}>

        {/* Eyebrow */}
        <p style={{ fontFamily: HEAD, fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: INK3, margin: 0 }}>
          Čtvrtek 2. července · OnVision
        </p>

        {/* Headline — editorial, žádný gradient */}
        <h1 style={{ fontFamily: HEAD, fontWeight: 500, fontSize: "clamp(40px, 6vw, 74px)", letterSpacing: "-0.03em",
          lineHeight: 1.02, margin: "18px 0 0", color: INK, maxWidth: 15 + "ch" }}>
          Dobré ráno,<br /><span style={{ color: INK }}>{NAME}.</span>
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.5, color: INK2, margin: "20px 0 0", maxWidth: "46ch" }}>
          Firma jede. Dnes tě čekají <strong style={{ color: INK, fontWeight: 600 }}>tři věci, co hoří</strong>.
          Zbytek počká.
        </p>

        {/* Fires — jeden řádek, hairline oddělení, žádné boxy */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, marginTop: 40,
          borderTop: "1px solid oklch(1 0 0 / 0.09)", borderBottom: "1px solid oklch(1 0 0 / 0.09)" }}>
          {fires.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 26px 18px 0",
              marginRight: 26, borderRight: i < fires.length - 1 ? "1px solid oklch(1 0 0 / 0.09)" : "none" }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: f.tone, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{f.label}</span>
              {f.detail && <span style={{ fontFamily: HEAD, fontSize: 13, color: INK3 }}>{f.detail}</span>}
            </div>
          ))}
        </div>

        {/* Stat masthead — velká čísla, hairline, žádné karty */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 56 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: i === 0 ? "0 28px 0 0" : "0 28px",
              borderLeft: i > 0 ? "1px solid oklch(1 0 0 / 0.08)" : "none" }}>
              <p style={{ fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: INK3, margin: 0, fontWeight: 600 }}>
                {s.k}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 16 }}>
                <span style={{ fontFamily: HEAD, fontWeight: 500, fontSize: "clamp(30px, 3.4vw, 44px)",
                  letterSpacing: "-0.03em", lineHeight: 1, color: INK }}>{s.v}</span>
                {s.u && <span style={{ fontFamily: HEAD, fontSize: 18, color: INK3 }}>{s.u}</span>}
              </div>
              <div style={{ marginTop: 12, minHeight: 20 }}>
                {typeof s.delta === "number" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600,
                    color: s.delta >= 0 ? POS : NEG }}>
                    {s.delta >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    {Math.abs(s.delta)} % <span style={{ color: INK3, fontWeight: 400 }}>{s.deltaLabel}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: s.warn ? "oklch(0.78 0.15 80)" : INK3 }}>{s.sub}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 80, fontSize: 12, color: INK3, letterSpacing: "0.04em" }}>
          — design-lab náhled · editorial směr —
        </p>
      </div>
    </div>
  );
}
