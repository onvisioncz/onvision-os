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
const FMT = (v: string | number, decimals?: number) => {
  const n = typeof v === "string" ? parseFloat(v.replace(/\s/g, "").replace(",", ".")) : v;
  if (isNaN(n)) return String(v);
  if (decimals !== undefined) return n.toLocaleString("cs-CZ", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return n.toLocaleString("cs-CZ");
};

const NUM = (v: string): number => {
  const n = parseFloat((v || "").replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const hasValue = (v: string) => v && v.trim() !== "" && v.trim() !== "0";

/* ── SVG Radial Progress ─────────────────────────────────────────────────────── */
function RadialChart({
  value, max, color, bg = "#e8e4ff", size = 90, strokeW = 9,
  label, sublabel,
}: {
  value: number; max: number; color: string; bg?: string; size?: number; strokeW?: number;
  label: string; sublabel: string;
}) {
  const r = (size - strokeW * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value / Math.max(max, 1), 0), 1);
  const offset = circ * (1 - pct);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={strokeW} />
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: size < 70 ? 13 : 16, fontWeight: 800, color,
            lineHeight: 1, fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
            letterSpacing: "-0.03em",
          }}>{label}</span>
          {sublabel && (
            <span style={{
              fontSize: 8, fontWeight: 600, color: "#a09dc0", marginTop: 2,
              fontFamily: "var(--font-jakarta, sans-serif)",
              letterSpacing: "0.02em",
            }}>{sublabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── SVG Bar Chart ────────────────────────────────────────────────────────────── */
function BarChart({
  bars, color, height = 56,
}: {
  bars: { label: string; value: number }[]; color: string; height?: number;
}) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: height + 20 }}>
      {bars.map((b, i) => {
        const barH = Math.round((b.value / max) * height);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%", height: barH,
              background: i === bars.length - 1 ? color : `${color}55`,
              borderRadius: "3px 3px 0 0",
              minHeight: 2,
            }} />
            <span style={{
              fontSize: 8, color: "#a09dc0", textAlign: "center",
              fontFamily: "var(--font-jakarta, sans-serif)",
              whiteSpace: "nowrap",
            }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Metric tile (cover row) ─────────────────────────────────────────────────── */
function CoverTile({
  label, value, suffix = "", growth, small = false,
}: {
  label: string; value: string; suffix?: string; growth?: string; small?: boolean;
}) {
  if (!hasValue(value)) return null;
  const isPos = growth?.startsWith("+");
  const isNeg = growth?.startsWith("-");
  return (
    <div style={{
      flex: 1, minWidth: 110,
      padding: small ? "14px 16px 12px" : "18px 20px 16px",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      <p style={{
        fontSize: 7.5, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: "#4e4880",
        margin: "0 0 8px",
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
      }}>{label}</p>
      <p style={{
        fontSize: small ? 24 : 30, fontWeight: 900, color: "#ffffff",
        letterSpacing: "-0.04em", margin: 0, lineHeight: 1,
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>
        {FMT(value)}
        {suffix && <span style={{ fontSize: small ? 11 : 13, fontWeight: 400, color: "#4e4880", marginLeft: 2 }}>{suffix}</span>}
      </p>
      {growth && hasValue(growth) && growth !== "+0" && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          marginTop: 9, width: "fit-content",
          fontSize: 9, fontWeight: 700,
          color: isPos ? "#4ade80" : isNeg ? "#f87171" : "#9ca3af",
          background: isPos ? "rgba(74,222,128,0.10)" : isNeg ? "rgba(248,113,113,0.10)" : "rgba(156,163,175,0.10)",
          padding: "3px 8px", borderRadius: 20,
        }}>
          {isPos ? "▲" : isNeg ? "▼" : "—"} {growth}
        </span>
      )}
    </div>
  );
}

/* ── Metric card (body sections) ─────────────────────────────────────────────── */
function MetricCard({
  label, value, suffix = "", color = "#4f46e5", sub,
}: {
  label: string; value: string; suffix?: string; color?: string; sub?: string;
}) {
  if (!hasValue(value)) return null;
  return (
    <div style={{
      background: "#fff", borderRadius: 10,
      padding: "15px 16px 13px",
      border: "1px solid #e8e4ff",
      display: "flex", flexDirection: "column",
    }}>
      <p style={{
        fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "#b0adcc", margin: "0 0 8px",
        fontFamily: "var(--font-jakarta, sans-serif)",
      }}>{label}</p>
      <p style={{
        fontSize: 24, fontWeight: 800, color, margin: 0, lineHeight: 1,
        letterSpacing: "-0.03em",
        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
      }}>
        {FMT(value)}
        {suffix && <span style={{ fontSize: 11, fontWeight: 500, color: "#c0bde0", marginLeft: 3 }}>{suffix}</span>}
      </p>
      {sub && (
        <p style={{
          fontSize: 9, color: "#b0adcc", margin: "5px 0 0",
          fontFamily: "var(--font-jakarta, sans-serif)",
        }}>{sub}</p>
      )}
    </div>
  );
}

/* ── Featured metric with radial chart ──────────────────────────────────────── */
function FeaturedMetric({
  label, value, suffix = "", color, chartMax, description, sublabel,
}: {
  label: string; value: string; suffix?: string; color: string; chartMax: number; description?: string; sublabel?: string;
}) {
  if (!hasValue(value)) return null;
  const num = NUM(value);
  const displayVal = suffix === "%" ? FMT(value, 2) : FMT(value);
  const pctLabel = `${Math.round(Math.min(num / Math.max(chartMax, 1), 1) * 100)}%`;

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      padding: "20px 20px 18px",
      border: "1px solid #e8e4ff",
      display: "flex", alignItems: "center", gap: 18,
    }}>
      <RadialChart
        value={num} max={chartMax} color={color} size={80} strokeW={8}
        label={suffix === "%" ? `${displayVal}%` : pctLabel}
        sublabel={sublabel ?? "z cíle"}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#b0adcc", margin: "0 0 6px",
          fontFamily: "var(--font-jakarta, sans-serif)",
        }}>{label}</p>
        <p style={{
          fontSize: 30, fontWeight: 900, color, margin: 0, lineHeight: 1,
          letterSpacing: "-0.04em",
          fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
        }}>
          {displayVal}
          {suffix && suffix !== "%" && <span style={{ fontSize: 13, fontWeight: 400, color: "#c0bde0", marginLeft: 3 }}>{suffix}</span>}
          {suffix === "%" && <span style={{ fontSize: 15, fontWeight: 500, color, marginLeft: 2 }}>%</span>}
        </p>
        {description && (
          <p style={{
            fontSize: 10, color: "#9b98c0", margin: "6px 0 0", lineHeight: 1.5,
            fontFamily: "var(--font-jakarta, sans-serif)",
          }}>{description}</p>
        )}
      </div>
    </div>
  );
}

/* ── Number highlighter ──────────────────────────────────────────────────────── */
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

/* ── Parse AI markdown ───────────────────────────────────────────────────────── */
function parseReport(text: string) {
  const sections: {
    heading: string | null;
    items: Array<{ type: "p" | "ul"; lines: string[] }>;
  }[] = [];
  let current: typeof sections[0] = { heading: null, items: [] };

  for (const raw of text.split(/\n\n+/)) {
    const line = raw.trim();
    if (!line || line === "#") continue;

    const isH2 = line.startsWith("## ");
    const isBold = line.startsWith("**") && line.endsWith("**") && !line.includes("\n");
    const isH1 = line.startsWith("# ") && !line.startsWith("## ");

    if (isH2 || isBold || isH1) {
      if (current.items.length || current.heading) sections.push(current);
      current = {
        heading: line.replace(/^#+\s*/, "").replace(/\*\*/g, ""),
        items: [],
      };
    } else if (line.startsWith("- ") || line.startsWith("• ") || /^\d+\.\s/.test(line)) {
      const multiLine = line.split("\n").filter(Boolean);
      current.items.push({ type: "ul", lines: multiLine });
    } else {
      current.items.push({ type: "p", lines: [line] });
    }
  }
  if (current.items.length || current.heading) sections.push(current);
  return sections;
}

/* ── Section heading pill ────────────────────────────────────────────────────── */
function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      marginBottom: 18,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: "#4f46e5",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: "#fff",
        fontFamily: "var(--font-outfit, sans-serif)",
      }}>{n}</div>
      <p style={{
        fontSize: 12, fontWeight: 800, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "#1e1b3e", margin: 0,
        fontFamily: "var(--font-outfit, sans-serif)",
      }}>{title}</p>
      <div style={{ flex: 1, height: 1, background: "#ede8ff" }} />
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export function ReportDocument({
  klient, mesic, rok, ig, meta, aiReport, generatedAt, onClose,
}: ReportDocumentProps) {
  const sections = parseReport(aiReport);
  const prepDate = new Date(generatedAt).toLocaleDateString("cs-CZ", {
    day: "numeric", month: "long", year: "numeric",
  });

  const hasIG   = hasValue(ig.followers) || hasValue(ig.reach) || hasValue(ig.engagement);
  const hasMeta = meta.enabled && (hasValue(meta.spend) || hasValue(meta.impressions));
  const hasAI   = aiReport && aiReport.length > 20;

  // Build BarChart data from whatever we have
  const igBarData = [
    hasValue(ig.followers) ? { label: "Followers", value: NUM(ig.followers) } : null,
    hasValue(ig.reach)     ? { label: "Reach",     value: NUM(ig.reach) }     : null,
    hasValue(ig.impressions) ? { label: "Impr.",   value: NUM(ig.impressions) } : null,
  ].filter(Boolean) as { label: string; value: number }[];

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
            overflow: visible !important;
            z-index: 99999 !important; padding: 0 !important;
          }
          .ov-chrome { display: none !important; }
          .ov-scroll {
            overflow: visible !important; padding: 0 !important;
            background: transparent !important;
          }
          .ov-paper {
            box-shadow: none !important; border-radius: 0 !important;
            max-width: 100% !important; margin: 0 !important;
          }
        }
        @keyframes ov-in {
          from { opacity:0; transform:translateY(12px) scale(0.985); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
      `}</style>

      <div id="ov-report-doc" style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "oklch(0.07 0.015 265 / 0.97)",
        display: "flex", flexDirection: "column",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>

        {/* ── Top chrome ───────────────────────────────────────────────────── */}
        <div className="ov-chrome" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 18px", flexShrink: 0,
          borderBottom: "1px solid oklch(1 0 0 / 0.07)",
          background: "oklch(0.09 0.012 265)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/onvision-mark.png" alt="" width={22} height={22} style={{ borderRadius: "50%" }} />
            <span style={{
              fontSize: 12.5, fontWeight: 700, color: "oklch(0.82 0.005 222)",
              fontFamily: "var(--font-outfit, sans-serif)", letterSpacing: "-0.02em",
            }}>
              Report — {klient}
            </span>
            <span style={{ fontSize: 11, color: "oklch(0.35 0.005 222)" }}>{mesic} {rok}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              fontSize: 10.5, color: "oklch(0.45 0.005 222)",
              background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)",
              padding: "5px 10px", borderRadius: 6,
            }}>
              V dialogu vyber <strong style={{ color: "oklch(0.68 0.005 222)" }}>Uložit jako PDF</strong>
            </span>
            <button onClick={() => window.print()} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 7,
              background: "#4f46e5", color: "#fff",
              fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              fontFamily: "var(--font-outfit, sans-serif)",
            }}>
              <Printer width={12} height={12} />
              Uložit jako PDF
            </button>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 7, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)",
              color: "oklch(0.5 0.005 222)", cursor: "pointer",
            }}>
              <X width={13} height={13} />
            </button>
          </div>
        </div>

        {/* ── Scrollable viewport ───────────────────────────────────────────── */}
        <div className="ov-scroll" style={{
          flex: 1, overflowY: "auto",
          padding: "24px 16px 56px",
          background: "oklch(0.085 0.01 265)",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>

          {/* ═══════════════════════════════════════
              THE DOCUMENT PAPER
          ═══════════════════════════════════════ */}
          <div className="ov-paper" style={{
            width: "100%", maxWidth: 820,
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 48px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
            animation: "ov-in 0.32s cubic-bezier(0.23,1,0.32,1) both",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            color: "#1e1b3e",
          }}>

            {/* ╔═══════════════════════════════════╗
                ║         DARK COVER PAGE           ║
                ╚═══════════════════════════════════╝ */}
            <div style={{
              background: "#0a0818",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Geometric background decoration */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 80% 60% at 90% 40%, rgba(79,70,229,0.12) 0%, transparent 70%)",
              }} />
              <div style={{
                position: "absolute", top: -60, right: -60,
                width: 300, height: 300, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(109,40,217,0.07) 0%, transparent 65%)",
                pointerEvents: "none",
              }} />

              {/* ── Top bar ── */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "28px 44px 0",
                position: "relative",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/onvision-mark.png" alt="OnVision" width={38} height={38}
                    style={{ borderRadius: "50%", display: "block", flexShrink: 0 }} />
                  <div>
                    <p style={{
                      fontSize: 15, fontWeight: 800, color: "#eeeaff",
                      letterSpacing: "-0.03em", margin: 0, lineHeight: 1,
                      fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                    }}>OnVision</p>
                    <p style={{
                      fontSize: 7.5, fontWeight: 700, color: "#3d396c",
                      letterSpacing: "0.22em", textTransform: "uppercase",
                      margin: "5px 0 0",
                      fontFamily: "var(--font-jakarta, sans-serif)",
                    }}>Kreativní Agentura</p>
                  </div>
                </div>
                {/* Month badge */}
                <div style={{
                  background: "rgba(79,70,229,0.15)",
                  border: "1px solid rgba(79,70,229,0.3)",
                  borderRadius: 8, padding: "8px 16px", textAlign: "right",
                }}>
                  <p style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase", color: "#5c59a0",
                    margin: "0 0 3px",
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>Social Media Report</p>
                  <p style={{
                    fontSize: 18, fontWeight: 800, color: "#9d98e8",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.025em", margin: 0, lineHeight: 1,
                  }}>{mesic} {rok}</p>
                </div>
              </div>

              {/* ── Hero: client name ── */}
              <div style={{ padding: "32px 44px 28px", position: "relative" }}>
                <p style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "#3d396c",
                  margin: "0 0 12px",
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Zpracováno pro klienta</p>
                <h1 style={{
                  fontSize: 52, fontWeight: 900, color: "#ffffff",
                  fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                  letterSpacing: "-0.048em", margin: 0, lineHeight: 0.95,
                  wordBreak: "break-word",
                }}>{klient}</h1>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginTop: 16,
                }}>
                  <div style={{ height: 2, width: 36, background: "#4f46e5", borderRadius: 1 }} />
                  <p style={{
                    fontSize: 12, fontWeight: 600, color: "#6360a0",
                    fontFamily: "var(--font-outfit, sans-serif)",
                    margin: 0, letterSpacing: "-0.01em",
                  }}>Měsíční analýza výkonu na sociálních sítích</p>
                </div>
              </div>

              {/* ── Key Metrics band ── */}
              {hasIG && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 44px" }} />
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    <CoverTile label="Followers"      value={ig.followers}   growth={ig.followersGrowth || undefined} />
                    <CoverTile label="Reach (30 dní)" value={ig.reach} />
                    <CoverTile label="Engagement"     value={ig.engagement}  suffix="%" />
                    <CoverTile label="Příspěvky"      value={ig.posts}       small />
                  </div>
                </>
              )}

              {/* ── Bottom strip ── */}
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.05)",
                padding: "12px 44px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 4,
              }}>
                <p style={{
                  fontSize: 9.5, color: "#2e2b56", margin: 0,
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Zpracováno: {prepDate}</p>
                <p style={{
                  fontSize: 9.5, color: "#2e2b56", margin: 0,
                  fontFamily: "var(--font-jakarta, sans-serif)",
                }}>Důvěrný dokument — interní použití</p>
              </div>
            </div>

            {/* Accent line */}
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 40%, #db2777 100%)",
            }} />

            {/* ╔═══════════════════════════════════╗
                ║    INSTAGRAM PERFORMANCE          ║
                ╚═══════════════════════════════════╝ */}
            {hasIG && (
              <div style={{ padding: "36px 44px 38px", background: "#f8f7ff" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: 16, fontWeight: 800, color: "#0e0b28",
                      fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                      letterSpacing: "-0.025em", margin: 0, lineHeight: 1,
                    }}>Instagram — Výkon</p>
                    <p style={{ fontSize: 10, color: "#9b98c0", margin: "3px 0 0" }}>
                      Organická data za posledních 30 dní
                    </p>
                  </div>
                  {/* Mini bar chart if we have data */}
                  {igBarData.length >= 2 && (
                    <div style={{ opacity: 0.6 }}>
                      <BarChart bars={igBarData} color="#4f46e5" height={44} />
                    </div>
                  )}
                </div>

                {/* Featured metrics row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: hasValue(ig.reach) && hasValue(ig.engagement)
                    ? "1fr 1fr" : "1fr",
                  gap: 12, marginBottom: 12,
                }}>
                  <FeaturedMetric
                    label="Celkový Reach"
                    value={ig.reach}
                    color="#4f46e5"
                    chartMax={50000}
                    description="Počet unikátních uživatelů, kteří viděli obsah"
                    sublabel="z cíle 50K"
                  />
                  <FeaturedMetric
                    label="Engagement Rate"
                    value={ig.engagement}
                    suffix="%"
                    color="#7c3aed"
                    chartMax={5}
                    description="Interakce / Reach × 100 — benchmark: 1–5 %"
                    sublabel="z benchmarku"
                  />
                </div>

                {/* Secondary metrics grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 10,
                }}>
                  <MetricCard label="Followers celkem" value={ig.followers} color="#4f46e5"
                    sub={hasValue(ig.followersGrowth) ? `Nárůst: ${ig.followersGrowth}` : undefined} />
                  <MetricCard label="Impressions" value={ig.impressions} color="#6d28d9"
                    sub="Celkové zobrazení" />
                  <MetricCard label="Příspěvky" value={ig.posts} color="#0891b2"
                    sub="Celkem na profilu" />
                  <MetricCard label="Stories" value={ig.stories} color="#0284c7"
                    sub="Za sledované období" />
                  <MetricCard label="Reels" value={ig.reels} color="#7c3aed"
                    sub="Počet zveřejněných" />
                  <MetricCard label="Zobrazení Reels" value={ig.reelViews} color="#9333ea"
                    sub="Organická videa" />
                </div>

                {/* Best post */}
                {hasValue(ig.topPost) && (
                  <div style={{
                    marginTop: 14,
                    padding: "16px 20px",
                    background: "#fff",
                    borderRadius: 10,
                    border: "1px solid #e8e4ff",
                    display: "flex", gap: 16, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: "#4f46e5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em",
                        textTransform: "uppercase", color: "#9b98c8", margin: "0 0 5px",
                        fontFamily: "var(--font-jakarta, sans-serif)",
                      }}>Nejlepší příspěvek měsíce</p>
                      <p style={{
                        fontSize: 13.5, color: "#2d2a55", lineHeight: 1.6, margin: 0,
                      }}>{ig.topPost}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ╔═══════════════════════════════════╗
                ║        META ADS                   ║
                ╚═══════════════════════════════════╝ */}
            {hasMeta && (
              <>
                <div style={{ height: 1, background: "#ede8ff" }} />
                <div style={{ padding: "36px 44px 38px", background: "#fdfbff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: "#1877f2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 16, fontWeight: 800, color: "#0e0b28",
                        fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
                        letterSpacing: "-0.025em", margin: 0, lineHeight: 1,
                      }}>Meta Ads — Výsledky kampaní</p>
                      <p style={{ fontSize: 10, color: "#9b98c0", margin: "3px 0 0" }}>
                        Placená inzerce za sledované období
                      </p>
                    </div>
                  </div>

                  {/* Ads featured row */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: 10,
                  }}>
                    <MetricCard label="Výdaje" value={meta.spend} suffix=" Kč" color="#1877f2" />
                    <MetricCard label="Impressions" value={meta.impressions} color="#6d28d9" />
                    <MetricCard label="Reach" value={meta.reach} color="#4f46e5" />
                    <MetricCard label="Kliknutí" value={meta.clicks} color="#0891b2" />
                    <MetricCard label="CTR" value={meta.ctr} suffix=" %" color="#0284c7" />
                    <MetricCard label="CPC" value={meta.cpc} suffix=" Kč" color="#db2777" />
                    <MetricCard label="Konverze" value={meta.conversions} color="#16a34a" />
                    <MetricCard label="Hodnota konverzí" value={meta.convValue} suffix=" Kč" color="#15803d" />
                  </div>
                </div>
              </>
            )}

            {/* ╔═══════════════════════════════════╗
                ║        AI ANALYSIS                ║
                ╚═══════════════════════════════════╝ */}
            {hasAI && (
              <>
                {/* Section separator */}
                <div style={{
                  display: "flex", alignItems: "center",
                  background: "#4f46e5",
                  padding: "14px 44px",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" style={{ marginRight: 10, flexShrink: 0 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <p style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "rgba(255,255,255,0.7)",
                    margin: 0,
                    fontFamily: "var(--font-outfit, sans-serif)",
                  }}>AI Analýza & Strategická doporučení</p>
                  <div style={{ flex: 1 }} />
                  <p style={{
                    fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0,
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>OnVision AI · {prepDate}</p>
                </div>

                <div style={{ padding: "36px 44px 48px", background: "#ffffff" }}>
                  {sections.map((sec, si) => (
                    <div key={si} style={{ marginBottom: 30 }}>
                      {sec.heading && (
                        <SectionHeading n={si + 1} title={sec.heading} />
                      )}

                      {sec.items.map((item, ii) => {
                        if (item.type === "ul") {
                          return (
                            <ul key={ii} style={{ margin: "4px 0 14px", padding: 0, listStyle: "none" }}>
                              {item.lines.map((line, li) => (
                                <li key={li} style={{
                                  display: "flex", alignItems: "flex-start", gap: 12,
                                  marginBottom: 9,
                                }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: 6,
                                    background: "#f0edff", flexShrink: 0, marginTop: 2,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    <div style={{
                                      width: 6, height: 6, borderRadius: "50%",
                                      background: "#4f46e5",
                                    }} />
                                  </div>
                                  <span style={{
                                    fontSize: 13, lineHeight: 1.8, color: "#2d2a55",
                                    fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                                  }}>
                                    <HighlightedText text={line.replace(/^[-•\d.]\s*/, "").replace(/^\d+\.\s*/, "")} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          );
                        }

                        // Detect "recommendation" paragraphs (contain doporučujeme, navrhujeme, etc.)
                        const isRec = /doporučuj|navrhuj|zaměř|zvyš|snižte|optimali/i.test(item.lines[0]);

                        return isRec ? (
                          <div key={ii} style={{
                            background: "#f8f7ff",
                            border: "1px solid #e2dfff",
                            borderLeft: "3px solid #4f46e5",
                            borderRadius: "0 8px 8px 0",
                            padding: "12px 18px",
                            marginBottom: 14,
                          }}>
                            <p style={{
                              fontSize: 13, lineHeight: 1.78, color: "#2d2a55",
                              margin: 0,
                              fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                            }}>
                              <HighlightedText text={item.lines[0]} />
                            </p>
                          </div>
                        ) : (
                          <p key={ii} style={{
                            fontSize: 13, lineHeight: 1.82, color: "#2d2a55",
                            margin: "0 0 13px",
                            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                          }}>
                            <HighlightedText text={item.lines[0]} />
                          </p>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ╔═══════════════════════════════════╗
                ║           FOOTER                  ║
                ╚═══════════════════════════════════╝ */}
            <div style={{
              background: "#0a0818",
              padding: "20px 44px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onvision-mark.png" alt="" width={22} height={22}
                  style={{ borderRadius: "50%", opacity: 0.45 }} />
                <div>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: "#eeeaff",
                    margin: 0, fontFamily: "var(--font-outfit, sans-serif)",
                    letterSpacing: "-0.01em",
                  }}>OnVision</p>
                  <p style={{
                    fontSize: 9, color: "#2e2b56", margin: "2px 0 0",
                    fontFamily: "var(--font-jakarta, sans-serif)",
                  }}>onvision.cz</p>
                </div>
              </div>
              <p style={{
                fontSize: 9.5, color: "#2e2b56", margin: 0,
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
