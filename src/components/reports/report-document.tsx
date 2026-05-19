"use client";

import { useEffect } from "react";
import { X, Printer } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
export interface IGMetrics {
  followers: string; followersGrowth: string; reach: string; impressions: string;
  engagement: string; posts: string; stories: string; reels: string;
  reelViews: string; topPost: string;
}
export interface MetaAdsMetrics {
  enabled: boolean; spend: string; impressions: string; reach: string;
  clicks: string; ctr: string; cpc: string; conversions: string; convValue: string;
}
export interface ReportDocumentProps {
  klient: string; mesic: string; rok: number;
  ig: IGMetrics; meta: MetaAdsMetrics;
  aiReport: string; generatedAt: string;
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const FMT = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v.replace(/\s/g, "").replace(",", ".")) : v;
  return isNaN(n) ? String(v) : n.toLocaleString("cs-CZ");
};

const NUM = (v: string): number => {
  const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const hasValue = (v: string) => v && v.trim() !== "" && v.trim() !== "0";

/* Number highlighter — makes digits pop in paragraphs */
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\b\d[\d\s]*(?:[,.]?\d+)?(?:\s*(?:%|Kč|tis\.|mil\.|followers|zobrazení|sledujících|interakcí))?)/);
  return (
    <>
      {parts.map((part, i) =>
        /^\d/.test(part)
          ? <strong key={i} style={{ color: "#4f46e5", fontWeight: 700 }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

/* Parse AI markdown into sections */
function parseReport(text: string) {
  const sections: { heading: string | null; items: Array<{ type: "p" | "ul"; lines: string[] }> }[] = [];
  let current: typeof sections[0] = { heading: null, items: [] };

  for (const raw of text.split(/\n\n+/)) {
    const line = raw.trim();
    if (!line) continue;

    const isHeading = line.startsWith("## ") || (line.startsWith("**") && line.endsWith("**") && !line.includes("\n"));
    if (isHeading) {
      if (current.items.length || current.heading) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, "").replace(/\*\*/g, ""), items: [] };
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      current.items.push({ type: "ul", lines: line.split("\n").filter(Boolean) });
    } else {
      current.items.push({ type: "p", lines: [line] });
    }
  }
  if (current.items.length || current.heading) sections.push(current);
  return sections;
}

/* ── Progress bar metric card ────────────────────────────────────────────────── */
function ProgressCard({
  label, value, suffix = "", color = "#4f46e5", benchmark,
}: {
  label: string; value: string; suffix?: string; color?: string; benchmark?: number;
}) {
  if (!hasValue(value)) return null;
  const num = NUM(value);
  const pct = benchmark && benchmark > 0 ? Math.min(100, Math.round((num / benchmark) * 100)) : null;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 10,
      padding: "16px 18px 14px",
      border: "1px solid #e8e5ff",
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      <p style={{
        fontSize: 8.5, fontWeight: 700, letterSpacing: "0.13em",
        textTransform: "uppercase", color: "#a09dc0", margin: "0 0 10px",
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
      }}>{label}</p>
      <p style={{
        fontSize: 26, fontWeight: 800, color, margin: 0, lineHeight: 1,
        letterSpacing: "-0.03em",
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>
        {FMT(value)}
        {suffix && <span style={{ fontSize: 12, fontWeight: 500, color: "#b8b5d8", marginLeft: 3 }}>{suffix}</span>}
      </p>
      {pct !== null && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 4, borderRadius: 4, background: "#f0edff", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 4,
              background: color,
              transition: "width 0.6s ease",
            }} />
          </div>
          <p style={{
            fontSize: 9, color: "#b0aed0", margin: "4px 0 0",
            fontFamily: "var(--font-jakarta, sans-serif)",
          }}>{pct}% z benchmarku</p>
        </div>
      )}
    </div>
  );
}

/* ── Cover metric pill ───────────────────────────────────────────────────────── */
function CoverMetric({
  label, value, suffix = "", growth,
}: {
  label: string; value: string; suffix?: string; growth?: string;
}) {
  if (!hasValue(value)) return null;
  const isPos = growth?.startsWith("+");
  const isNeg = growth?.startsWith("-");
  return (
    <div style={{
      flex: 1,
      minWidth: 110,
      padding: "18px 20px 16px",
      borderRight: "1px solid rgba(255,255,255,0.07)",
    }}>
      <p style={{
        fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
        textTransform: "uppercase", color: "#6460a8",
        margin: "0 0 8px",
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
      }}>{label}</p>
      <p style={{
        fontSize: 28, fontWeight: 800, color: "#ffffff",
        letterSpacing: "-0.04em", margin: 0, lineHeight: 1,
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>
        {FMT(value)}
        {suffix && <span style={{ fontSize: 13, fontWeight: 400, color: "#6460a8", marginLeft: 2 }}>{suffix}</span>}
      </p>
      {growth && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          marginTop: 8,
          fontSize: 9.5, fontWeight: 700,
          color: isPos ? "#4ade80" : isNeg ? "#f87171" : "#9ca3af",
          background: isPos ? "rgba(74,222,128,0.12)" : isNeg ? "rgba(248,113,113,0.12)" : "rgba(156,163,175,0.12)",
          padding: "3px 8px", borderRadius: 20,
        }}>
          {isPos ? "▲" : isNeg ? "▼" : "—"} {growth}
        </span>
      )}
    </div>
  );
}

/* ── Meta ads row ────────────────────────────────────────────────────────────── */
function MetaRow({
  label, value, suffix = "", color = "#4f46e5",
}: {
  label: string; value: string; suffix?: string; color?: string;
}) {
  if (!hasValue(value)) return null;
  return (
    <div style={{
      background: "#fff",
      borderRadius: 10,
      padding: "14px 18px",
      border: "1px solid #e8e5ff",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <p style={{
        fontSize: 8.5, fontWeight: 700, letterSpacing: "0.13em",
        textTransform: "uppercase", color: "#a09dc0", margin: 0,
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
      }}>{label}</p>
      <p style={{
        fontSize: 22, fontWeight: 800, color, margin: 0, lineHeight: 1,
        letterSpacing: "-0.03em",
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>
        {FMT(value)}
        {suffix && <span style={{ fontSize: 11, fontWeight: 500, color: "#b8b5d8", marginLeft: 3 }}>{suffix}</span>}
      </p>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export function ReportDocument({ klient, mesic, rok, ig, meta, aiReport, generatedAt, onClose }: ReportDocumentProps) {
  const sections = parseReport(aiReport);
  const prepDate = new Date(generatedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

  const hasIG   = hasValue(ig.followers) || hasValue(ig.reach) || hasValue(ig.engagement);
  const hasMeta = meta.enabled && (hasValue(meta.spend) || hasValue(meta.impressions));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ov-report-doc, #ov-report-doc * { visibility: visible !important; }
          #ov-report-doc {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100% !important; height: auto !important;
            overflow: visible !important; background: #0a0819 !important;
            z-index: 99999 !important; padding: 0 !important;
          }
          .ov-chrome { display: none !important; }
          .ov-scroll { overflow: visible !important; padding: 0 !important; background: #0a0819 !important; }
          .ov-paper {
            box-shadow: none !important; border-radius: 0 !important;
            max-width: 100% !important; margin: 0 !important;
          }
        }
        @keyframes ov-in { from { opacity:0; transform:translateY(10px) scale(0.99); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      <div id="ov-report-doc" style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "oklch(0.07 0.015 265 / 0.97)",
        display: "flex", flexDirection: "column",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }}>

        {/* Top chrome bar */}
        <div className="ov-chrome" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", flexShrink: 0,
          borderBottom: "1px solid oklch(1 0 0 / 0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/onvision-mark.png" alt="" width={24} height={24} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.82 0.005 222)", fontFamily: "var(--font-outfit, sans-serif)", letterSpacing: "-0.02em" }}>
              Report
            </span>
            <span style={{ fontSize: 11, color: "oklch(0.38 0.005 222)" }}>
              {klient} · {mesic} {rok}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              fontSize: 11, color: "oklch(0.50 0.005 222)",
              background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)",
              padding: "6px 12px", borderRadius: 7,
            }}>
              V dialogu vyber <strong style={{ color: "oklch(0.72 0.005 222)" }}>Uložit jako PDF</strong>
            </div>
            <button onClick={() => window.print()} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 8,
              background: "#4f46e5", color: "#fff",
              fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              fontFamily: "var(--font-outfit, sans-serif)",
            }}>
              <Printer width={13} height={13} />
              Uložit jako PDF
            </button>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.12)",
              color: "oklch(0.55 0.005 222)", cursor: "pointer",
            }}>
              <X width={14} height={14} />
            </button>
          </div>
        </div>

        {/* Scrollable area */}
        <div className="ov-scroll" style={{
          flex: 1, overflowY: "auto",
          padding: "28px 20px 60px",
          display: "flex", flexDirection: "column", alignItems: "center",
          background: "oklch(0.09 0.01 265)",
        }}>
          {/* The document */}
          <div className="ov-paper" style={{
            width: "100%", maxWidth: 800,
            background: "#ffffff",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            animation: "ov-in 0.3s ease both",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            color: "#1e1b3e",
          }}>

            {/* ═══════════ DARK COVER ═══════════ */}
            <div style={{ background: "#0d0b22" }}>

              {/* Logo row */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "32px 44px 0",
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/onvision-mark.png" alt="OnVision" width={42} height={42}
                    style={{ borderRadius: "50%", display: "block", flexShrink: 0 }} />
                  <div>
                    <p style={{
                      fontSize: 17, fontWeight: 800, color: "#eeeaff",
                      letterSpacing: "-0.03em", margin: 0, lineHeight: 1,
                      fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                    }}>OnVision</p>
                    <p style={{
                      fontSize: 7.5, fontWeight: 700, color: "#4e4a7a",
                      letterSpacing: "0.22em", textTransform: "uppercase",
                      margin: "5px 0 0",
                      fontFamily: "var(--font-jakarta, sans-serif)",
                    }}>Kreativní Agentura</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase", color: "#4e4a7a",
                    margin: "0 0 6px",
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>Social Media Report</p>
                  <p style={{
                    fontSize: 22, fontWeight: 800, color: "#9d98e8",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.025em", margin: 0,
                  }}>{mesic} {rok}</p>
                </div>
              </div>

              {/* Client name block */}
              <div style={{ padding: "28px 44px 30px" }}>
                <p style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#4e4a7a",
                  margin: "0 0 10px",
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Klient</p>
                <h1 style={{
                  fontSize: 42, fontWeight: 900, color: "#ffffff",
                  fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                  letterSpacing: "-0.045em", margin: "0 0 6px", lineHeight: 1,
                }}>{klient}</h1>
                <p style={{
                  fontSize: 14, fontWeight: 600, color: "#7c6ff5",
                  fontFamily: "var(--font-outfit, sans-serif)",
                  margin: 0, letterSpacing: "-0.01em",
                }}>Social Media Report</p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 44px" }} />

              {/* Key metrics row */}
              {hasIG && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  padding: "0 44px",
                }}>
                  <CoverMetric label="Followers" value={ig.followers} growth={ig.followersGrowth || undefined} />
                  <CoverMetric label="Reach" value={ig.reach} />
                  <CoverMetric label="Interactions" value={ig.engagement} suffix={hasValue(ig.engagement) ? "%" : ""} />
                  <CoverMetric label="Impressions" value={ig.impressions} />
                </div>
              )}

              {/* Bottom bar */}
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "14px 44px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <p style={{
                  fontSize: 10, color: "#383560", margin: 0,
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Zpracováno {prepDate}</p>
                <p style={{
                  fontSize: 10, color: "#383560", margin: 0,
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Důvěrné</p>
              </div>
            </div>

            {/* Accent stripe */}
            <div style={{ height: 4, background: "#4f46e5" }} />

            {/* ═══════════ INSTAGRAM METRICS ═══════════ */}
            {hasIG && (
              <div style={{ padding: "32px 44px 36px", background: "#f8f7ff", borderBottom: "1px solid #ede8ff" }}>
                {/* Section label */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: "#4f46e5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {/* Instagram icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                  <div>
                    <p style={{
                      fontSize: 15, fontWeight: 800, color: "#0d0b20",
                      fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                      letterSpacing: "-0.025em", margin: 0, lineHeight: 1,
                    }}>Instagram — Výkon</p>
                    <p style={{ fontSize: 10, color: "#a09dc0", margin: "3px 0 0" }}>Organická data za sledované období</p>
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}>
                  <ProgressCard label="Followers" value={ig.followers} color="#4f46e5" benchmark={10000} />
                  <ProgressCard label="Reach" value={ig.reach} color="#7c3aed" benchmark={40000} />
                  <ProgressCard label="Impressions" value={ig.impressions} color="#6d28d9" benchmark={60000} />
                  <ProgressCard label="Engagement rate" value={ig.engagement} suffix="%" color="#db2777" benchmark={5} />
                  <ProgressCard label="Příspěvky" value={ig.posts} color="#0891b2" benchmark={20} />
                  <ProgressCard label="Stories" value={ig.stories} color="#0284c7" benchmark={40} />
                  <ProgressCard label="Reels" value={ig.reels} color="#7c3aed" benchmark={10} />
                  <ProgressCard label="Zobrazení Reels" value={ig.reelViews} color="#4f46e5" benchmark={80000} />
                </div>

                {hasValue(ig.topPost) && (
                  <div style={{
                    marginTop: 16, padding: "14px 18px",
                    background: "#fff", borderRadius: 10,
                    border: "1px solid #e8e4ff",
                    display: "flex", gap: 14, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: "#4f46e5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" /></svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em",
                        textTransform: "uppercase", color: "#9b98c8", margin: "0 0 5px",
                        fontFamily: "var(--font-jakarta, sans-serif)",
                      }}>Nejlepší příspěvek</p>
                      <p style={{ fontSize: 13, color: "#2d2a55", lineHeight: 1.65, margin: 0 }}>
                        {ig.topPost}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ META ADS METRICS ═══════════ */}
            {hasMeta && (
              <div style={{ padding: "32px 44px 36px", background: "#fdfbff", borderBottom: "1px solid #ede8ff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: "#1877f2",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{
                      fontSize: 15, fontWeight: 800, color: "#0d0b20",
                      fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                      letterSpacing: "-0.025em", margin: 0, lineHeight: 1,
                    }}>Meta Ads — Výsledky kampaní</p>
                    <p style={{ fontSize: 10, color: "#a09dc0", margin: "3px 0 0" }}>Placená inzerce za sledované období</p>
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}>
                  <MetaRow label="Výdaje" value={meta.spend} suffix="Kč" color="#1877f2" />
                  <MetaRow label="Impressions" value={meta.impressions} color="#6d28d9" />
                  <MetaRow label="Reach" value={meta.reach} color="#4f46e5" />
                  <MetaRow label="Kliknutí" value={meta.clicks} color="#0891b2" />
                  <MetaRow label="CTR" value={meta.ctr} suffix="%" color="#0284c7" />
                  <MetaRow label="CPC" value={meta.cpc} suffix="Kč" color="#db2777" />
                  <MetaRow label="Konverze" value={meta.conversions} color="#16a34a" />
                  <MetaRow label="Hodnota konverzí" value={meta.convValue} suffix="Kč" color="#15803d" />
                </div>
              </div>
            )}

            {/* ═══════════ AI ANALYSIS ═══════════ */}
            <div style={{ padding: "36px 44px 44px", background: "#ffffff" }}>
              {/* AI label */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: "#4f46e5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" /></svg>
                </div>
                <div>
                  <p style={{
                    fontSize: 16, fontWeight: 800, color: "#0d0b20",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.025em", margin: 0, lineHeight: 1,
                  }}>AI Analýza & Doporučení</p>
                  <p style={{ fontSize: 10.5, color: "#a09dc0", margin: "4px 0 0" }}>
                    Vygenerováno OnVision AI · {prepDate}
                  </p>
                </div>
              </div>

              {/* Sections */}
              {sections.map((sec, si) => (
                <div key={si} style={{ marginBottom: 28 }}>
                  {sec.heading && (
                    <div style={{
                      display: "flex", alignItems: "center",
                      marginBottom: 16,
                      borderLeft: "3px solid #4f46e5",
                      paddingLeft: 14,
                      paddingTop: 10,
                      paddingBottom: 10,
                      background: "#f0eeff",
                      borderRadius: "0 8px 8px 0",
                    }}>
                      <p style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "#4f46e5", margin: 0,
                        fontFamily: "var(--font-outfit, sans-serif)",
                      }}>{sec.heading}</p>
                    </div>
                  )}
                  {sec.items.map((item, ii) => {
                    if (item.type === "ul") {
                      return (
                        <ul key={ii} style={{ margin: "6px 0 12px", padding: 0, listStyle: "none" }}>
                          {item.lines.map((line, li) => (
                            <li key={li} style={{
                              display: "flex", alignItems: "flex-start", gap: 11,
                              marginBottom: 8,
                            }}>
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#4f46e5", flexShrink: 0, marginTop: 9,
                              }} />
                              <span style={{
                                fontSize: 13.5, lineHeight: 1.8, color: "#2d2a55",
                                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                              }}>
                                <HighlightedText text={line.replace(/^[-•]\s*/, "")} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={ii} style={{
                        fontSize: 13.5, lineHeight: 1.82, color: "#2d2a55",
                        margin: "0 0 12px",
                        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                      }}>
                        <HighlightedText text={item.lines[0]} />
                      </p>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ═══════════ FOOTER ═══════════ */}
            <div style={{
              background: "#0d0b22",
              padding: "18px 44px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onvision-mark.png" alt="" width={20} height={20}
                  style={{ borderRadius: "50%", opacity: 0.5 }} />
                <div>
                  <p style={{
                    fontSize: 10.5, fontWeight: 700, color: "#eeeaff",
                    margin: 0,
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.01em",
                  }}>OnVision</p>
                  <p style={{
                    fontSize: 9, color: "#383560", margin: "1px 0 0",
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>onvision.cz</p>
                </div>
              </div>
              <p style={{
                fontSize: 9.5, color: "#383560", margin: 0,
                fontFamily: "var(--font-jakarta, sans-serif)",
              }}>
                {mesic} {rok} · Důvěrné · OnVision Kreativní Agentura
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
