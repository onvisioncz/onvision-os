"use client";

import { useEffect } from "react";
import { X, Printer, TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
export interface IGMetrics {
  followers: string;
  followersGrowth: string;
  reach: string;
  impressions: string;
  engagement: string;
  posts: string;
  stories: string;
  reels: string;
  reelViews: string;
  topPost: string;
}

export interface MetaAdsMetrics {
  enabled: boolean;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpc: string;
  conversions: string;
  convValue: string;
}

export interface ReportDocumentProps {
  klient: string;
  mesic: string;
  rok: number;
  ig: IGMetrics;
  meta: MetaAdsMetrics;
  aiReport: string;
  generatedAt: string;
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fmtNum(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v.replace(/\s/g, "")) : v;
  if (isNaN(n)) return v;
  return n.toLocaleString("cs-CZ");
}

function growthBadge(raw: string) {
  const clean = raw.trim();
  if (!clean) return null;
  const isPositive = clean.startsWith("+") || (!clean.startsWith("-") && parseFloat(clean) > 0);
  const isNegative = clean.startsWith("-");
  const color = isPositive ? "#16a34a" : isNegative ? "#dc2626" : "#6b7280";
  const bg    = isPositive ? "#dcfce7"  : isNegative ? "#fee2e2"  : "#f3f4f6";
  const Icon  = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 20, background: bg,
      color, fontSize: 10, fontWeight: 700, letterSpacing: "0.03em",
    }}>
      <Icon width={9} height={9} />
      {clean}
    </span>
  );
}

/* ── Text parser: turns Claude markdown into structured JSX ───────────────── */
function parseReport(text: string) {
  const sections: { heading: string | null; paragraphs: string[] }[] = [];
  let current: { heading: string | null; paragraphs: string[] } = { heading: null, paragraphs: [] };

  for (const raw of text.split(/\n\n+/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("## ") || line.startsWith("**") && line.endsWith("**")) {
      if (current.paragraphs.length > 0 || current.heading) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, "").replace(/\*\*/g, ""), paragraphs: [] };
    } else {
      current.paragraphs.push(line);
    }
  }
  if (current.paragraphs.length > 0 || current.heading) sections.push(current);
  return sections;
}

function RenderParagraph({ text }: { text: string }) {
  if (text.startsWith("- ") || text.startsWith("• ")) {
    const lines = text.split("\n").filter(Boolean);
    return (
      <ul style={{ margin: "8px 0", paddingLeft: 0, listStyle: "none" }}>
        {lines.map((ln, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
            <span style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: "#5353f6", flexShrink: 0, marginTop: 7,
            }} />
            <span style={{ fontSize: 13, lineHeight: 1.75, color: "#2d2b52" }}>
              {ln.replace(/^[-•]\s*/, "")}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#2d2b52", margin: "6px 0" }}>
      {text}
    </p>
  );
}

/* ── Metric cell ─────────────────────────────────────────────────────────────── */
function MetricCell({
  label, value, suffix = "", growth, color = "#5353f6", light = false,
}: {
  label: string; value: string; suffix?: string; growth?: string;
  color?: string; light?: boolean;
}) {
  if (!value) return null;
  return (
    <div style={{
      background: light ? "#faf9ff" : "#fff",
      border: "1px solid #ede9ff",
      borderRadius: 10,
      padding: "16px 18px",
    }}>
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "#8b87b0", marginBottom: 8,
        fontFamily: "var(--font-jakarta, sans-serif)",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em",
        color, lineHeight: 1, fontFamily: "var(--font-outfit, sans-serif)",
        marginBottom: growth ? 8 : 0,
      }}>
        {fmtNum(value)}
        {suffix && (
          <span style={{ fontSize: 13, fontWeight: 500, color: "#a09dcc", marginLeft: 3 }}>
            {suffix}
          </span>
        )}
      </p>
      {growth && growthBadge(growth)}
    </div>
  );
}

/* ── Section heading ──────────────────────────────────────────────────────────── */
function DocSection({ title, children, accent = "#5353f6" }: {
  title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 3, height: 16, borderRadius: 3, background: accent, flexShrink: 0 }} />
        <p style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: accent,
          fontFamily: "var(--font-outfit, sans-serif)",
        }}>
          {title}
        </p>
        <div style={{ flex: 1, height: 1, background: `${accent}28` }} />
      </div>
      {children}
    </div>
  );
}

/* ── Main document ────────────────────────────────────────────────────────────── */
export function ReportDocument({
  klient, mesic, rok, ig, meta, aiReport, generatedAt, onClose,
}: ReportDocumentProps) {
  const sections = parseReport(aiReport);
  const preparedDate = new Date(generatedAt).toLocaleDateString("cs-CZ", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print CSS injected via style tag */}
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #ov-report-doc, #ov-report-doc * { visibility: visible !important; }
          #ov-report-doc {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important; height: auto !important;
            overflow: visible !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
          }
          .report-doc-scroll { overflow: visible !important; }
          .report-doc-chrome { display: none !important; }
          .report-doc-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        @keyframes ov-fadein {
          from { opacity: 0; transform: scale(0.98) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Overlay backdrop */}
      <div
        id="ov-report-doc"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "oklch(0.06 0.01 265 / 0.97)",
          display: "flex", flexDirection: "column",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Chrome: top bar with actions */}
        <div
          className="report-doc-chrome"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px", flexShrink: 0,
            borderBottom: "1px solid oklch(1 0 0 / 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/onvision-mark.png" alt="" width={26} height={26} style={{ borderRadius: "50%" }} />
            <span style={{
              fontSize: 13, fontWeight: 700, color: "oklch(0.82 0.005 222)",
              fontFamily: "var(--font-outfit, sans-serif)", letterSpacing: "-0.02em",
            }}>
              Náhled reportu
            </span>
            <span style={{
              fontSize: 11, color: "oklch(0.40 0.005 222)",
              fontFamily: "var(--font-jakarta, sans-serif)",
            }}>
              {klient} · {mesic} {rok}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 18px", borderRadius: 8,
                background: "#5353f6", color: "#fff",
                fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                fontFamily: "var(--font-outfit, sans-serif)",
                letterSpacing: "-0.01em",
              }}
            >
              <Printer width={13} height={13} />
              Uložit jako PDF
            </button>
            <button
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 8,
                background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.12)",
                color: "oklch(0.55 0.005 222)", cursor: "pointer",
              }}
            >
              <X width={14} height={14} />
            </button>
          </div>
        </div>

        {/* Scrollable document area */}
        <div
          className="report-doc-scroll"
          style={{
            flex: 1, overflowY: "auto", padding: "32px 24px 60px",
            display: "flex", flexDirection: "column", alignItems: "center",
          }}
        >
          {/* The A4-ish document paper */}
          <div
            className="report-doc-paper"
            style={{
              width: "100%", maxWidth: 794,
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 32px 80px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(1 0 0 / 0.06)",
              overflow: "hidden",
              animation: "ov-fadein 0.3s ease both",
              fontFamily: "var(--font-jakarta, sans-serif)",
            }}
          >

            {/* ── PAGE 1: HEADER + METRICS ──────────────────────────────────── */}

            {/* Top banner: dark with OnVision branding */}
            <div style={{
              background: "linear-gradient(135deg, #0e0c22 0%, #1a1440 60%, #0e0c22 100%)",
              padding: "28px 40px 26px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              {/* Left: logo + agency */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/onvision-mark.png" alt="OnVision"
                  width={40} height={40}
                  style={{ borderRadius: "50%", display: "block" }}
                />
                <div>
                  <p style={{
                    fontSize: 17, fontWeight: 800, color: "#f0eeff",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.03em", lineHeight: 1,
                  }}>
                    OnVision
                  </p>
                  <p style={{
                    fontSize: 8.5, fontWeight: 600, color: "#5353f6",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    fontFamily: "var(--font-jakarta, sans-serif)", marginTop: 3,
                  }}>
                    Kreativní Agentura
                  </p>
                </div>
              </div>

              {/* Right: document type label */}
              <div style={{ textAlign: "right" }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "#7b78b8", marginBottom: 4,
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>
                  Social Media Report
                </p>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: "#a8a4d8",
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>
                  {mesic} {rok}
                </p>
              </div>
            </div>

            {/* Thin accent line */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #5353f6, #8b5cf6, #5353f6)" }} />

            {/* Client identity block */}
            <div style={{
              padding: "32px 40px 28px",
              background: "#fdfcff",
              borderBottom: "1px solid #ede9ff",
            }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                  <p style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "#9c99cc", marginBottom: 8,
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>
                    Klient
                  </p>
                  <h1 style={{
                    fontSize: 30, fontWeight: 800, color: "#0d0c22",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.035em", lineHeight: 1.1, margin: 0,
                  }}>
                    {klient}
                  </h1>
                  <p style={{
                    fontSize: 12, color: "#7b78b8", marginTop: 8,
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>
                    Zpracováno: {preparedDate}
                  </p>
                </div>

                {/* Period badge */}
                <div style={{
                  textAlign: "right", padding: "14px 20px",
                  background: "#f2f0ff", borderRadius: 10,
                  border: "1px solid #ddd9ff",
                }}>
                  <p style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#9c99cc", marginBottom: 4,
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>
                    Období
                  </p>
                  <p style={{
                    fontSize: 18, fontWeight: 800, color: "#5353f6",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.02em",
                  }}>
                    {mesic} {rok}
                  </p>
                </div>
              </div>
            </div>

            {/* ── METRICS SECTION ──────────────────────────────────────────── */}
            <div style={{ padding: "28px 40px 32px", background: "#fff" }}>

              {/* Instagram metrics */}
              {(ig.followers || ig.reach || ig.engagement || ig.impressions) && (
                <DocSection title="Instagram — Výkon">
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                    marginBottom: 10,
                  }}>
                    <MetricCell
                      label="Followers"
                      value={ig.followers}
                      growth={ig.followersGrowth || undefined}
                      color="#5353f6"
                    />
                    <MetricCell label="Reach" value={ig.reach} color="#7c3aed" />
                    <MetricCell label="Impressions" value={ig.impressions} color="#6d28d9" />
                    <MetricCell
                      label="Engagement"
                      value={ig.engagement}
                      suffix="%"
                      color="#db2777"
                    />
                    <MetricCell label="Příspěvky" value={ig.posts} color="#0891b2" />
                    <MetricCell label="Stories" value={ig.stories} color="#0284c7" />
                    <MetricCell label="Reels" value={ig.reels} color="#7c3aed" />
                    <MetricCell
                      label="Zobrazení Reels"
                      value={ig.reelViews}
                      color="#5353f6"
                    />
                  </div>

                  {ig.topPost && (
                    <div style={{
                      background: "#f8f7ff", borderRadius: 8,
                      padding: "12px 16px",
                      border: "1px solid #ede9ff",
                      display: "flex", alignItems: "flex-start", gap: 10,
                      marginTop: 6,
                    }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: "#5353f6", flexShrink: 0, marginTop: 6,
                      }} />
                      <div>
                        <p style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                          textTransform: "uppercase", color: "#9c99cc", marginBottom: 4,
                          fontFamily: "var(--font-jakarta, sans-serif)",
                        }}>
                          Nejlepší příspěvek
                        </p>
                        <p style={{ fontSize: 12, color: "#2d2b52", lineHeight: 1.6 }}>
                          {ig.topPost}
                        </p>
                      </div>
                    </div>
                  )}
                </DocSection>
              )}

              {/* Meta Ads metrics */}
              {meta.enabled && (meta.spend || meta.impressions || meta.reach) && (
                <DocSection title="Meta Ads — Výsledky kampaní" accent="#7c3aed">
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                  }}>
                    {meta.spend && (
                      <MetricCell label="Výdaje" value={meta.spend} suffix="Kč" color="#7c3aed" />
                    )}
                    {meta.impressions && (
                      <MetricCell label="Impressions" value={meta.impressions} color="#6d28d9" />
                    )}
                    {meta.reach && (
                      <MetricCell label="Reach" value={meta.reach} color="#5353f6" />
                    )}
                    {meta.clicks && (
                      <MetricCell label="Kliknutí" value={meta.clicks} color="#0891b2" />
                    )}
                    {meta.ctr && (
                      <MetricCell label="CTR" value={meta.ctr} suffix="%" color="#0284c7" />
                    )}
                    {meta.cpc && (
                      <MetricCell label="CPC" value={meta.cpc} suffix="Kč" color="#db2777" />
                    )}
                    {meta.conversions && (
                      <MetricCell label="Konverze" value={meta.conversions} color="#16a34a" />
                    )}
                    {meta.convValue && (
                      <MetricCell label="Hodnota konverzí" value={meta.convValue} suffix="Kč" color="#15803d" />
                    )}
                  </div>
                </DocSection>
              )}

            </div>

            {/* ── PAGE 2: AI ANALYSIS ──────────────────────────────────────── */}
            <div style={{
              background: "#f9f8ff",
              borderTop: "1px solid #ede9ff",
              padding: "32px 40px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "linear-gradient(135deg, #5353f6, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {/* Spark icon inline */}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z"/>
                  </svg>
                </div>
                <div>
                  <p style={{
                    fontSize: 14, fontWeight: 800, color: "#0d0c22",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.02em", lineHeight: 1,
                  }}>
                    AI Analýza
                  </p>
                  <p style={{
                    fontSize: 10, color: "#9c99cc", marginTop: 2,
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>
                    Generováno OnVision AI · {preparedDate}
                  </p>
                </div>
              </div>

              {sections.length > 0 ? (
                <div>
                  {sections.map((sec, si) => (
                    <div key={si} style={{ marginBottom: 24 }}>
                      {sec.heading && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                        }}>
                          <p style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "#5353f6",
                            fontFamily: "var(--font-outfit, sans-serif)",
                          }}>
                            {sec.heading}
                          </p>
                          <div style={{ flex: 1, height: 1, background: "#ede9ff" }} />
                        </div>
                      )}
                      {sec.paragraphs.map((p, pi) => (
                        <RenderParagraph key={pi} text={p} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#6b6b85", fontStyle: "italic" }}>
                  AI analýza bude zobrazena zde.
                </p>
              )}
            </div>

            {/* ── FOOTER ───────────────────────────────────────────────────── */}
            <div style={{
              background: "#0e0c22",
              padding: "18px 40px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/onvision-mark.png" alt=""
                  width={18} height={18}
                  style={{ borderRadius: "50%", opacity: 0.7 }}
                />
                <p style={{
                  fontSize: 10, color: "#5e5b84",
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>
                  OnVision Kreativní Agentura · onvision.cz
                </p>
              </div>
              <p style={{
                fontSize: 10, color: "#3e3c60",
                fontFamily: "var(--font-jakarta, sans-serif)",
              }}>
                {mesic} {rok} · Důvěrné
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
