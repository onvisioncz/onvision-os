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

const hasValue = (v: string) => v && v.trim() !== "";

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

/* ── Metric Card ─────────────────────────────────────────────────────────────── */
function MetCard({ label, value, sub, color = "#4f46e5", suffix = "" }: {
  label: string; value: string; sub?: string; color?: string; suffix?: string;
}) {
  if (!hasValue(value)) return null;
  const isPositive = sub?.startsWith("+");
  const isNegative = sub?.startsWith("-");
  return (
    <div style={{
      background: "#fff",
      borderRadius: 10,
      padding: "16px 18px",
      border: "1px solid #e8e5ff",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "#9b98c8", margin: 0,
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
      }}>{label}</p>
      <p style={{
        fontSize: 28, fontWeight: 800, color, margin: 0, lineHeight: 1,
        letterSpacing: "-0.035em",
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>
        {FMT(value)}
        {suffix && <span style={{ fontSize: 13, fontWeight: 500, color: "#bbb8e0", marginLeft: 3 }}>{suffix}</span>}
      </p>
      {sub && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: 10, fontWeight: 700,
          color: isPositive ? "#16a34a" : isNegative ? "#dc2626" : "#6b7280",
          background: isPositive ? "#dcfce7" : isNegative ? "#fee2e2" : "#f3f4f6",
          padding: "2px 8px", borderRadius: 20, width: "fit-content",
        }}>
          {isPositive ? "↑" : isNegative ? "↓" : "→"} {sub}
        </span>
      )}
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────────────────────── */
function SecHead({ title, accent = "#4f46e5" }: { title: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px" }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <p style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em",
        textTransform: "uppercase", color: accent, margin: 0,
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>{title}</p>
      <div style={{ flex: 1, height: 1, background: `${accent}30` }} />
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
            overflow: visible !important; background: white !important;
            z-index: 99999 !important; padding: 0 !important;
          }
          .ov-chrome { display: none !important; }
          .ov-scroll { overflow: visible !important; padding: 0 !important; background: white !important; }
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
              💡 V dialogu vyber <strong style={{ color: "oklch(0.72 0.005 222)" }}>Uložit jako PDF</strong>
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
            width: "100%", maxWidth: 780,
            background: "#ffffff",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            animation: "ov-in 0.3s ease both",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            color: "#1e1b3e",
          }}>

            {/* ═══════════ HEADER ═══════════ */}
            <div style={{
              background: "linear-gradient(135deg, #0f0d24 0%, #1c1840 50%, #130f2a 100%)",
              padding: "30px 40px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onvision-mark.png" alt="OnVision" width={44} height={44}
                  style={{ borderRadius: "50%", display: "block", flexShrink: 0 }} />
                <div>
                  <p style={{
                    fontSize: 19, fontWeight: 800, color: "#eeeaff",
                    letterSpacing: "-0.035em", margin: 0, lineHeight: 1,
                    fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                  }}>OnVision</p>
                  <p style={{
                    fontSize: 8, fontWeight: 700, color: "#6460a8",
                    letterSpacing: "0.22em", textTransform: "uppercase",
                    marginTop: 5, fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>Kreativní Agentura</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{
                  fontSize: 8.5, fontWeight: 700, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#5c5898", marginBottom: 5,
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Social Media Report</p>
                <p style={{
                  fontSize: 16, fontWeight: 800, color: "#a5a0f0",
                  fontFamily: "var(--font-outfit, sans-serif)", letterSpacing: "-0.02em",
                }}>{mesic} {rok}</p>
              </div>
            </div>

            {/* Accent stripe */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #4f46e5 100%)" }} />

            {/* ═══════════ CLIENT IDENTITY ═══════════ */}
            <div style={{
              padding: "28px 40px 24px",
              background: "#faf9ff",
              borderBottom: "1px solid #ede8ff",
              display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            }}>
              <div>
                <p style={{
                  fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "#9b98c8", margin: "0 0 8px",
                }}>Klient</p>
                <h1 style={{
                  fontSize: 32, fontWeight: 800, color: "#0d0b20",
                  fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                  letterSpacing: "-0.04em", margin: 0, lineHeight: 1.05,
                }}>{klient}</h1>
                <p style={{ fontSize: 11.5, color: "#8480b8", margin: "10px 0 0" }}>
                  Zpracováno {prepDate}
                </p>
              </div>
              <div style={{
                padding: "14px 22px",
                background: "#f0eeff",
                borderRadius: 12,
                border: "1px solid #ddd8ff",
                textAlign: "center", flexShrink: 0,
              }}>
                <p style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.13em",
                  textTransform: "uppercase", color: "#9b98c8", margin: "0 0 5px",
                }}>Období</p>
                <p style={{
                  fontSize: 20, fontWeight: 800, color: "#4f46e5",
                  fontFamily: "var(--font-outfit, sans-serif)", letterSpacing: "-0.025em", margin: 0,
                }}>{mesic} {rok}</p>
              </div>
            </div>

            {/* ═══════════ INSTAGRAM METRICS ═══════════ */}
            {hasIG && (
              <div style={{ padding: "26px 40px 28px", background: "#fff", borderBottom: "1px solid #f0edff" }}>
                <SecHead title="Instagram — Výkon" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
                  gap: 10,
                }}>
                  <MetCard label="Followers" value={ig.followers} sub={ig.followersGrowth || undefined} color="#4f46e5" />
                  <MetCard label="Reach" value={ig.reach} color="#7c3aed" />
                  <MetCard label="Impressions" value={ig.impressions} color="#6d28d9" />
                  <MetCard label="Engagement" value={ig.engagement} suffix="%" color="#db2777" />
                  <MetCard label="Příspěvky" value={ig.posts} color="#0891b2" />
                  <MetCard label="Stories" value={ig.stories} color="#0284c7" />
                  <MetCard label="Reels" value={ig.reels} color="#7c3aed" />
                  <MetCard label="Zobrazení Reels" value={ig.reelViews} color="#4f46e5" />
                </div>
                {hasValue(ig.topPost) && (
                  <div style={{
                    marginTop: 12, padding: "12px 16px",
                    background: "#f8f6ff", borderRadius: 9,
                    border: "1px solid #e8e4ff",
                    display: "flex", gap: 12,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" /></svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em",
                        textTransform: "uppercase", color: "#9b98c8", margin: "0 0 4px",
                      }}>Nejlepší příspěvek</p>
                      <p style={{ fontSize: 12.5, color: "#2d2a55", lineHeight: 1.6, margin: 0 }}>
                        {ig.topPost}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ META ADS METRICS ═══════════ */}
            {hasMeta && (
              <div style={{ padding: "26px 40px 28px", background: "#fdfbff", borderBottom: "1px solid #f0edff" }}>
                <SecHead title="Meta Ads — Výsledky kampaní" accent="#7c3aed" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
                  gap: 10,
                }}>
                  <MetCard label="Výdaje" value={meta.spend} suffix="Kč" color="#7c3aed" />
                  <MetCard label="Impressions" value={meta.impressions} color="#6d28d9" />
                  <MetCard label="Reach" value={meta.reach} color="#4f46e5" />
                  <MetCard label="Kliknutí" value={meta.clicks} color="#0891b2" />
                  <MetCard label="CTR" value={meta.ctr} suffix="%" color="#0284c7" />
                  <MetCard label="CPC" value={meta.cpc} suffix="Kč" color="#db2777" />
                  <MetCard label="Konverze" value={meta.conversions} color="#16a34a" />
                  <MetCard label="Hodnota konverzí" value={meta.convValue} suffix="Kč" color="#15803d" />
                </div>
              </div>
            )}

            {/* ═══════════ AI ANALYSIS ═══════════ */}
            <div style={{ padding: "30px 40px 36px", background: "#f9f8ff" }}>
              {/* AI label */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" /></svg>
                </div>
                <div>
                  <p style={{
                    fontSize: 14, fontWeight: 800, color: "#0d0b20",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.02em", margin: 0, lineHeight: 1,
                  }}>AI Analýza</p>
                  <p style={{ fontSize: 10.5, color: "#9b98c8", margin: "3px 0 0" }}>
                    Vygenerováno OnVision AI · {prepDate}
                  </p>
                </div>
              </div>

              {/* Sections */}
              {sections.map((sec, si) => (
                <div key={si} style={{ marginBottom: 24 }}>
                  {sec.heading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: "#4f46e5", flexShrink: 0 }} />
                      <p style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
                        textTransform: "uppercase", color: "#4f46e5", margin: 0,
                        fontFamily: "var(--font-outfit, sans-serif)",
                      }}>{sec.heading}</p>
                      <div style={{ flex: 1, height: 1, background: "#e8e4ff" }} />
                    </div>
                  )}
                  {sec.items.map((item, ii) => {
                    if (item.type === "ul") {
                      return (
                        <ul key={ii} style={{ margin: "6px 0 10px", padding: 0, listStyle: "none" }}>
                          {item.lines.map((line, li) => (
                            <li key={li} style={{
                              display: "flex", alignItems: "flex-start", gap: 9,
                              marginBottom: 6,
                            }}>
                              <div style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: "#4f46e5", flexShrink: 0, marginTop: 8,
                              }} />
                              <span style={{ fontSize: 13, lineHeight: 1.75, color: "#2d2a55" }}>
                                <HighlightedText text={line.replace(/^[-•]\s*/, "")} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={ii} style={{
                        fontSize: 13, lineHeight: 1.82, color: "#2d2a55",
                        margin: "0 0 10px",
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
              padding: "16px 40px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onvision-mark.png" alt="" width={18} height={18}
                  style={{ borderRadius: "50%", opacity: 0.6 }} />
                <p style={{ fontSize: 10, color: "#4e4b70", margin: 0 }}>
                  OnVision Kreativní Agentura · onvision.cz
                </p>
              </div>
              <p style={{ fontSize: 10, color: "#343160", margin: 0 }}>
                {mesic} {rok} · Důvěrné
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
