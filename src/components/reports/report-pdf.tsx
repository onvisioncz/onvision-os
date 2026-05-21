import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  Rect,
  Line,
  Polyline,
  Circle,
  G,
  StyleSheet,
} from "@react-pdf/renderer";

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface ReportData {
  client: string;
  month: string;           // "2026-05"
  analystName: string;
  analystEmail: string;

  // Published content
  postsCount: number;
  storiesCount: number;
  reelsCount: number;

  // Followers
  igFollowers: number;
  igFollowersHistory: number[];   // 6 months, oldest first
  fbFollowers: number;
  fbAgeGroups: { label: string; pct: number }[];

  // Impressions
  igImpressions: number;
  igImpressionsHistory: number[];
  fbImpressions: number;
  fbImpressionsHistory: number[];

  // Reach
  igReach: number;
  igReachHistory: number[];
  fbReach: number;
  fbReachHistory: number[];

  // Interactions
  igInteractions: number;
  igInteractionsHistory: number[];
  fbInteractions: number;
  fbInteractionsHistory: number[];

  // Profile visits
  igProfileVisits: number;
  igProfileVisitsHistory: number[];
  fbPageVisits: number;
  fbPageVisitsHistory: number[];

  // Best post
  bestPostImageUrl?: string;
  bestPostImpressions: number;
  bestPostReach: number;
  bestPostLikes: number;

  // AI commentaries
  aiFollowers?: string;
  aiImpressions?: string;
  aiReach?: string;
  aiInteractions?: string;
  aiVisits?: string;

  // Month labels for x-axis (6 abbreviated Czech months)
  monthLabels: string[];
}

/* ── Czech number formatter ─────────────────────────────────────────────────── */
function czFmt(n: number): string {
  const s = Math.round(n).toString();
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) result += " ";
    result += s[i];
  }
  return result;
}

/* ── Month name helper ──────────────────────────────────────────────────────── */
const CZECH_MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function parseMonth(month: string): { monthName: string; year: string } {
  const [year, mon] = month.split("-");
  const monthName = CZECH_MONTHS[parseInt(mon, 10) - 1] ?? mon;
  return { monthName, year };
}

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const HEADER_BG    = "#1a1470";
const CARD_BG      = "#ffffff";
const SECTION_CLR  = "#3333cc";
const BAR_CLR      = "#5555f0";
const LINE_CLR     = "#3333cc";
const BODY_TEXT    = "#333333";
const LABEL_CLR    = "#888888";
const GRID_CLR     = "#e8e8e8";
const DONUT_COLORS = ["#5858f5", "#ff6633", "#22cc77", "#aa44ee", "#ffbb22", "#11cccc"];

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  // Section heading
  sectionHeadingText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: SECTION_CLR,
    letterSpacing: 3,
    marginBottom: 4,
  },
  sectionUnderline: {
    height: 1.5,
    backgroundColor: SECTION_CLR,
    marginBottom: 10,
  },
  // Explanatory paragraph
  explainerText: {
    fontSize: 8,
    color: BODY_TEXT,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  // Column header
  colHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    marginBottom: 3,
  },
  // Chart subtitle
  chartSubtitle: {
    fontSize: 7,
    color: LABEL_CLR,
    marginBottom: 5,
    textAlign: "center",
  },
  // Two-column row
  row2: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  col: {
    flex: 1,
    flexDirection: "column",
  },
  // AI commentary
  commentary: {
    fontSize: 8,
    color: "#555555",
    lineHeight: 1.5,
    marginTop: 8,
    fontStyle: "italic",
  },
  // Best post left card
  bestPostLeft: {
    flex: 0,
    width: 185,
    backgroundColor: "#f5f7ff",
    borderRadius: 10,
    padding: 16,
  },
  bestPostMetricLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: SECTION_CLR,
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 2,
  },
  bestPostMetricValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  // Best post right image placeholder
  bestPostRight: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    borderRadius: 10,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  bestPostPlaceholderText: {
    fontSize: 9,
    color: LABEL_CLR,
    textAlign: "center",
  },
  // Footer
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
  },
  footerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SECTION_CLR,
    alignItems: "center",
    justifyContent: "center",
  },
  footerAvatarText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  footerSeparator: {
    width: 1,
    height: 44,
    backgroundColor: "#cccccc",
  },
  footerLabel: {
    fontSize: 7,
    color: LABEL_CLR,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
});

/* ── SVG Bar Chart ──────────────────────────────────────────────────────────── */
const BAR_W  = 240;
const BAR_H  = 110;
const PAD_L  = 32;
const PAD_B  = 20;
const PAD_T  = 8;
const PAD_R  = 6;

function SvgBarChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1);
  const chartW = BAR_W - PAD_L - PAD_R;
  const chartH = BAR_H - PAD_T - PAD_B;
  const mid = Math.round(max / 2);
  const slotW = chartW / data.length;
  const barW = slotW * 0.6;

  // Grid y positions
  const y0 = PAD_T + chartH;         // bottom (value 0)
  const y50 = PAD_T + chartH / 2;    // mid
  const yMax = PAD_T;                 // top (max)

  return (
    <Svg width={BAR_W} height={BAR_H}>
      {/* Grid lines */}
      <Line x1={PAD_L} y1={y0}   x2={BAR_W - PAD_R} y2={y0}   stroke={GRID_CLR} strokeWidth={0.5} />
      <Line x1={PAD_L} y1={y50}  x2={BAR_W - PAD_R} y2={y50}  stroke={GRID_CLR} strokeWidth={0.5} />
      <Line x1={PAD_L} y1={yMax} x2={BAR_W - PAD_R} y2={yMax} stroke={GRID_CLR} strokeWidth={0.5} />

      {/* Y-axis labels */}
      <Text x={PAD_L - 4} y={y0 + 3}   style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "end" }}>0</Text>
      <Text x={PAD_L - 4} y={y50 + 3}  style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "end" }}>{czFmt(mid)}</Text>
      <Text x={PAD_L - 4} y={yMax + 3} style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "end" }}>{czFmt(max)}</Text>

      {/* Bars and X labels */}
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * chartH);
        const x = PAD_L + i * slotW + (slotW - barW) / 2;
        const y = PAD_T + chartH - barH;
        const isLast = i === data.length - 1;
        const opacity = isLast ? 1 : 0.6;
        const labelX = PAD_L + i * slotW + slotW / 2;
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={color}
              opacity={opacity}
              rx={2}
              ry={2}
            />
            <Text
              x={labelX}
              y={BAR_H - 4}
              style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "middle" }}
            >
              {labels[i] ?? ""}
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}

/* ── SVG Line Chart ─────────────────────────────────────────────────────────── */
function SvgLineChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const chartW = BAR_W - PAD_L - PAD_R;
  const chartH = BAR_H - PAD_T - PAD_B;
  const mid = Math.round((max + min) / 2);

  // Grid y positions
  const y0   = PAD_T + chartH;                                  // bottom (min)
  const y50  = PAD_T + chartH / 2;                              // mid
  const yMax = PAD_T;                                            // top (max)

  const n = data.length;
  const pts = data.map((v, i) => {
    const x = PAD_L + (i / (n - 1 || 1)) * chartW;
    const y = PAD_T + chartH - ((v - min) / range) * chartH;
    return { x, y };
  });

  const polylinePoints = pts.map(p => `${p.x},${p.y}`).join(" ");

  // Fill area path
  const fillPath =
    `M ${pts[0].x},${PAD_T + chartH} ` +
    pts.map(p => `L ${p.x},${p.y}`).join(" ") +
    ` L ${pts[n - 1].x},${PAD_T + chartH} Z`;

  return (
    <Svg width={BAR_W} height={BAR_H}>
      {/* Grid lines */}
      <Line x1={PAD_L} y1={y0}   x2={BAR_W - PAD_R} y2={y0}   stroke={GRID_CLR} strokeWidth={0.5} />
      <Line x1={PAD_L} y1={y50}  x2={BAR_W - PAD_R} y2={y50}  stroke={GRID_CLR} strokeWidth={0.5} />
      <Line x1={PAD_L} y1={yMax} x2={BAR_W - PAD_R} y2={yMax} stroke={GRID_CLR} strokeWidth={0.5} />

      {/* Y-axis labels */}
      <Text x={PAD_L - 4} y={y0 + 3}   style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "end" }}>{czFmt(min)}</Text>
      <Text x={PAD_L - 4} y={y50 + 3}  style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "end" }}>{czFmt(mid)}</Text>
      <Text x={PAD_L - 4} y={yMax + 3} style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "end" }}>{czFmt(max)}</Text>

      {/* Fill area */}
      <Path d={fillPath} fill={color} opacity={0.1} />

      {/* Line */}
      <Polyline
        points={polylinePoints}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />

      {/* Dots and X labels */}
      {pts.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={3} fill={color} />
          <Text
            x={PAD_L + (i / (n - 1 || 1)) * chartW}
            y={BAR_H - 4}
            style={{ fontSize: 6, fill: LABEL_CLR, textAnchor: "middle" }}
          >
            {labels[i] ?? ""}
          </Text>
        </G>
      ))}
    </Svg>
  );
}

/* ── SVG Donut Chart ────────────────────────────────────────────────────────── */
const DONUT_W  = 240;
const DONUT_H  = 120;
const CX       = 58;
const CY       = 60;
const OUTER_R  = 50;
const INNER_R  = 30;

function piePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function donutSlicePath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const ox1 = cx + outerR * Math.cos(toRad(startAngle));
  const oy1 = cy + outerR * Math.sin(toRad(startAngle));
  const ox2 = cx + outerR * Math.cos(toRad(endAngle));
  const oy2 = cy + outerR * Math.sin(toRad(endAngle));
  const ix1 = cx + innerR * Math.cos(toRad(endAngle));
  const iy1 = cy + innerR * Math.sin(toRad(endAngle));
  const ix2 = cx + innerR * Math.cos(toRad(startAngle));
  const iy2 = cy + innerR * Math.sin(toRad(startAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return (
    `M ${ox1} ${oy1} ` +
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} ` +
    `L ${ix1} ${iy1} ` +
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} ` +
    `Z`
  );
}

function SvgDonutChart({ groups }: { groups: { label: string; pct: number }[] }) {
  // Normalise to 360 degrees
  const total = groups.reduce((acc, g) => acc + g.pct, 0) || 1;
  let angle = -90; // start from top
  const slices = groups.map((g, i) => {
    const sweep = (g.pct / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...g, start, end, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });

  // Legend starts at x=120
  const legendX = 118;
  const legendRowH = 14;

  return (
    <Svg width={DONUT_W} height={DONUT_H}>
      {/* Donut slices */}
      {slices.map((sl, i) => (
        <Path
          key={i}
          d={donutSlicePath(CX, CY, OUTER_R, INNER_R, sl.start, sl.end)}
          fill={sl.color}
        />
      ))}

      {/* Legend */}
      {slices.map((sl, i) => {
        const y = 10 + i * legendRowH;
        return (
          <G key={i}>
            <Rect x={legendX} y={y} width={8} height={8} fill={sl.color} rx={2} ry={2} />
            <Text x={legendX + 12} y={y + 7} style={{ fontSize: 6.5, fill: BODY_TEXT }}>
              {sl.label}
            </Text>
            <Text x={DONUT_W - 4} y={y + 7} style={{ fontSize: 6.5, fill: LABEL_CLR, textAnchor: "end" }}>
              {Math.round(sl.pct)}%
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}

/* ── Page Header ────────────────────────────────────────────────────────────── */
function PageHeader({ client, monthName, year }: { client: string; monthName: string; year: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {/* Row 1 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {/* Left: OnVision brand */}
        <View style={{ flexDirection: "column" }}>
          <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: "white" }}>OnVision</Text>
          <Text style={{ fontSize: 7, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>
            {"Kreativní\nagentura"}
          </Text>
        </View>

        {/* Center: pill badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: "rgba(255,255,255,0.7)",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            gap: 8,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: HEADER_BG }}>On</Text>
          </View>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "white", letterSpacing: 2 }}>
            MESICNI REPORT
          </Text>
        </View>

        {/* Right: client name */}
        <Text style={{ fontSize: 24, color: "rgba(255,255,255,0.45)", fontFamily: "Helvetica-Bold" }}>
          {client}
        </Text>
      </View>

      {/* Row 2: client + month info */}
      <View style={{ flexDirection: "row", gap: 24, marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: "white" }}>Klient: {client}</Text>
        <Text style={{ fontSize: 10, color: "white" }}>Mesic: {monthName} {year}</Text>
      </View>
    </View>
  );
}

/* ── Section Heading ────────────────────────────────────────────────────────── */
function SectionHeading({ text }: { text: string }) {
  return (
    <>
      <Text style={s.sectionHeadingText}>{text}</Text>
      <View style={s.sectionUnderline} />
    </>
  );
}

/* ── Main PDF Document ──────────────────────────────────────────────────────── */
export function ReportPDF({ data }: { data: ReportData }) {
  const labels = data.monthLabels;
  const { monthName, year } = parseMonth(data.month);
  const analystInitial = data.analystName ? data.analystName.charAt(0).toUpperCase() : "A";

  const pageStyle = {
    backgroundColor: HEADER_BG,
    flexDirection: "column" as const,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 0,
  };

  const whiteCard = {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  };

  return (
    <Document title={`OnVision Report — ${data.client} — ${data.month}`} author="OnVision">

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 — Content + Followers + Impressions
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <PageHeader client={data.client} monthName={monthName} year={year} />
        <View style={whiteCard}>

          {/* ZVEREJNENY OBSAH */}
          <SectionHeading text="ZVEREJNENY OBSAH" />
          <Text style={s.explainerText}>
            {"PRISPEVKY: " + czFmt(data.postsCount) + "   |   PRIBEHY: " + czFmt(data.storiesCount) + "   |   VIDEA A REELS: " + czFmt(data.reelsCount)}
          </Text>

          {/* SLEDUJICI */}
          <SectionHeading text="SLEDUJICI" />
          <Text style={s.explainerText}>
            {"Sledujici (followers) jsou uzivatele, kteri se rozhodli odobivat obsah konkretniho uctu na Facebooku nebo Instagramu. Tim, ze ucet sledujI, se jim pravidelne zobrazuji nove prispevky a pribehy tohoto uctu v jejich zdi prispevku (feedu) nebo v sekci pribehu (stories). Sledujici reprezentuji komunitu, ktera ma zajem o obsah a znacku daneho uctu."}
          </Text>
          <View style={s.row2}>
            {/* IG line chart */}
            <View style={s.col}>
              <Text style={s.colHeader}>1. INSTAGRAM: {czFmt(data.igFollowers)}</Text>
              <Text style={s.chartSubtitle}>Krivka vyvoje sledujicich za poslednich 6 mesicu</Text>
              <SvgLineChart data={data.igFollowersHistory} labels={labels} color={LINE_CLR} />
            </View>
            {/* FB donut */}
            <View style={s.col}>
              <Text style={s.colHeader}>2. FACEBOOK: {czFmt(data.fbFollowers)}</Text>
              <Text style={s.chartSubtitle}>Vekove skupiny fanousku</Text>
              <SvgDonutChart groups={data.fbAgeGroups} />
            </View>
          </View>
          {data.aiFollowers && <Text style={s.commentary}>{data.aiFollowers}</Text>}

          {/* ZOBRAZENI */}
          <View style={{ marginTop: 12 }}>
            <SectionHeading text="ZOBRAZENI" />
            <Text style={s.explainerText}>
              {"Zobrazeni (Impressions) oznacuje pocet celkovych zhlédnuti obsahu (reely, prispevky, pribehy a reklamy). Jedna se o pocet, kolikrat byl obsah zobrazen na obrazovkach uzivatelu – muze zahrnovat opakovana zhlédnuti od stejneho uzivatele."}
            </Text>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.colHeader}>1. INSTAGRAM: {czFmt(data.igImpressions)}</Text>
                <Text style={s.chartSubtitle}>Vyvoj zobrazeni za poslednich 6 mesicu</Text>
                <SvgBarChart data={data.igImpressionsHistory} labels={labels} color={BAR_CLR} />
              </View>
              <View style={s.col}>
                <Text style={s.colHeader}>2. FACEBOOK: {czFmt(data.fbImpressions)}</Text>
                <Text style={s.chartSubtitle}>Vyvoj zobrazeni za poslednich 6 mesicu</Text>
                <SvgBarChart data={data.fbImpressionsHistory} labels={labels} color={BAR_CLR} />
              </View>
            </View>
            {data.aiImpressions && <Text style={s.commentary}>{data.aiImpressions}</Text>}
          </View>

        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2 — Reach + Interactions
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <PageHeader client={data.client} monthName={monthName} year={year} />
        <View style={whiteCard}>

          {/* DOSAH */}
          <SectionHeading text="DOSAH" />
          <Text style={s.explainerText}>
            {"Dosah (reach) na Facebooku a Instagramu vyjadruje pocet unikatnich uzivatelu, kteri videli nejaky obsah dane stranky alespon jednou. Pocita se sem dosah jak placene, tak organicke distribuce obsahu stranky. Metrika je pouze odhadovana."}
          </Text>
          <View style={s.row2}>
            <View style={s.col}>
              <Text style={s.colHeader}>1. INSTAGRAM: {czFmt(data.igReach)}</Text>
              <Text style={s.chartSubtitle}>Vyvoj dosahu za poslednich 6 mesicu</Text>
              <SvgBarChart data={data.igReachHistory} labels={labels} color={BAR_CLR} />
            </View>
            <View style={s.col}>
              <Text style={s.colHeader}>2. FACEBOOK: {czFmt(data.fbReach)}</Text>
              <Text style={s.chartSubtitle}>Vyvoj dosahu za poslednich 6 mesicu</Text>
              <SvgBarChart data={data.fbReachHistory} labels={labels} color={BAR_CLR} />
            </View>
          </View>
          {data.aiReach && <Text style={s.commentary}>{data.aiReach}</Text>}

          {/* INTERAKCE S OBSAHEM */}
          <View style={{ marginTop: 16 }}>
            <SectionHeading text="INTERAKCE S OBSAHEM" />
            <Text style={s.explainerText}>
              {"Interakce na Facebooku a Instagramu zahrnuji jakoukoliv akci, kterou uzivatele provedou s prispevkem nebo uctem. Patri sem napriklad pocet To se mi libi, reakci, ulozeni, komentaru, sdileni a odpovedi u daneho obsahu, vcetne reklam. Interakce jsou vsechny zpusoby, jak lide reagujI na vas obsah."}
            </Text>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.colHeader}>1. INSTAGRAM: {czFmt(data.igInteractions)}</Text>
                <Text style={s.chartSubtitle}>Vyvoj interakci za poslednich 6 mesicu</Text>
                <SvgBarChart data={data.igInteractionsHistory} labels={labels} color={BAR_CLR} />
              </View>
              <View style={s.col}>
                <Text style={s.colHeader}>2. FACEBOOK: {czFmt(data.fbInteractions)}</Text>
                <Text style={s.chartSubtitle}>Vyvoj interakci za poslednich 6 mesicu</Text>
                <SvgBarChart data={data.fbInteractionsHistory} labels={labels} color={BAR_CLR} />
              </View>
            </View>
            {data.aiInteractions && <Text style={s.commentary}>{data.aiInteractions}</Text>}
          </View>

        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3 — Visits + Best Post + Footer
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <PageHeader client={data.client} monthName={monthName} year={year} />
        <View style={whiteCard}>

          {/* NAVSTEVY */}
          <SectionHeading text="NAVSTEVY" />
          <Text style={s.explainerText}>
            {"Navstevy (page visits) vyjadrujI, kolikrat byla stranka zobrazena, napriklad ze zdi prispevku, reklam nebo vysledku vyhledavani."}
          </Text>
          <View style={s.row2}>
            <View style={s.col}>
              <Text style={s.colHeader}>1. INSTAGRAM: {czFmt(data.igProfileVisits)}</Text>
              <Text style={s.chartSubtitle}>Vyvoj navstev profilu za poslednich 6 mesicu</Text>
              <SvgBarChart data={data.igProfileVisitsHistory} labels={labels} color={BAR_CLR} />
            </View>
            <View style={s.col}>
              <Text style={s.colHeader}>2. FACEBOOK: {czFmt(data.fbPageVisits)}</Text>
              <Text style={s.chartSubtitle}>Vyvoj navstev stranky za poslednich 6 mesicu</Text>
              <SvgBarChart data={data.fbPageVisitsHistory} labels={labels} color={BAR_CLR} />
            </View>
          </View>
          {data.aiVisits && <Text style={s.commentary}>{data.aiVisits}</Text>}

          {/* PRISPEVEK MESICE */}
          <View style={{ marginTop: 16 }}>
            <SectionHeading text="PRISPEVEK MESICE" />
            <View style={{ flexDirection: "row", gap: 16 }}>
              {/* Left card */}
              <View style={s.bestPostLeft}>
                <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: SECTION_CLR, letterSpacing: 2, marginBottom: 4 }}>
                  {"PRISPEVEK\nMESICE"}
                </Text>
                <View style={{ height: 1.5, backgroundColor: SECTION_CLR, marginBottom: 8 }} />

                <Text style={s.bestPostMetricLabel}>ZOBRAZENI</Text>
                <Text style={s.bestPostMetricValue}>{czFmt(data.bestPostImpressions)}</Text>

                <Text style={s.bestPostMetricLabel}>DOSAH</Text>
                <Text style={s.bestPostMetricValue}>{czFmt(data.bestPostReach)}</Text>

                <Text style={s.bestPostMetricLabel}>TO SE MI LIBI</Text>
                <Text style={s.bestPostMetricValue}>{czFmt(data.bestPostLikes)}</Text>
              </View>

              {/* Right image placeholder */}
              <View style={s.bestPostRight}>
                <Text style={s.bestPostPlaceholderText}>
                  {data.bestPostImageUrl ? "Nahled prispevku" : "Obrazek prispevku\nneni k dispozici"}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={s.footerRow}>
            <View style={s.footerAvatar}>
              <Text style={s.footerAvatarText}>{analystInitial}</Text>
            </View>
            <View style={s.footerSeparator} />
            <View>
              <Text style={s.footerLabel}>Analytik</Text>
              <Text style={s.footerValue}>{data.analystName}</Text>
            </View>
            <View style={s.footerSeparator} />
            <View>
              <Text style={s.footerLabel}>E-mail:</Text>
              <Text style={s.footerValue}>{data.analystEmail}</Text>
            </View>
          </View>

        </View>
      </Page>

    </Document>
  );
}
