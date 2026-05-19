import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const BG         = "#0d1117";
const BG2        = "#161b27";
const ACCENT     = "#5353f6";
const ACCENT2    = "#7c7cf9";
const TEAL       = "#00c8ff";
const WHITE      = "#ffffff";
const WHITE70    = "#ffffffb3";
const WHITE40    = "#ffffff66";
const WHITE15    = "#ffffff26";
const WHITE08    = "#ffffff14";
const IG_GRAD    = "#e1306c";
const FB_BLUE    = "#1877f2";

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

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    backgroundColor: BG,
    fontFamily: "Helvetica",
    paddingHorizontal: 36,
    paddingVertical: 32,
    flexDirection: "column",
  },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: "column",
  },
  brand: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 7,
    color: WHITE40,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 10,
    color: ACCENT2,
    letterSpacing: 4,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  clientName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  monthLabel: {
    fontSize: 9,
    color: WHITE40,
    marginTop: 3,
    letterSpacing: 1,
  },

  divider: {
    height: 1,
    backgroundColor: WHITE15,
    marginBottom: 22,
  },
  thinDivider: {
    height: 1,
    backgroundColor: WHITE08,
    marginBottom: 14,
    marginTop: 14,
  },

  // ── Section heading
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: ACCENT2,
    letterSpacing: 5,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  // ── Two-column layout
  row2: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  col: {
    flex: 1,
    backgroundColor: BG2,
    borderRadius: 8,
    padding: 14,
  },

  // ── Network label (IG / FB)
  netLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  igLabel: { color: IG_GRAD },
  fbLabel: { color: FB_BLUE },

  bigNumber: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: -1,
  },
  bigLabel: {
    fontSize: 8,
    color: WHITE40,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Bar chart
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 52,
    marginTop: 10,
    gap: 3,
  },
  chartBar: {
    flex: 1,
    borderRadius: 2,
  },
  chartLabels: {
    flexDirection: "row",
    marginTop: 4,
    gap: 3,
  },
  chartLabel: {
    flex: 1,
    fontSize: 5.5,
    color: WHITE40,
    textAlign: "center",
  },

  // ── Pie chart (age groups)
  pieRow: {
    flexDirection: "column",
    gap: 4,
    marginTop: 10,
  },
  pieBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pieAgeLabel: {
    fontSize: 7,
    color: WHITE70,
    width: 40,
  },
  pieTrack: {
    flex: 1,
    height: 8,
    backgroundColor: WHITE08,
    borderRadius: 4,
  },
  pieFill: {
    height: 8,
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  piePct: {
    fontSize: 7,
    color: WHITE70,
    width: 24,
    textAlign: "right",
  },

  // ── AI commentary
  commentary: {
    fontSize: 8,
    color: WHITE40,
    lineHeight: 1.6,
    marginTop: 8,
    fontStyle: "italic",
  },

  // ── Content stats row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    backgroundColor: BG2,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statNum: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  statLbl: {
    fontSize: 7,
    color: WHITE40,
    marginTop: 3,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ── Best post
  bestPostRow: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: BG2,
    borderRadius: 8,
    padding: 14,
  },
  bestPostImg: {
    width: 80,
    height: 100,
    backgroundColor: WHITE08,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bestPostMetrics: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  bestPostTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: ACCENT2,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: WHITE08,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  metricNum: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  metricLbl: {
    fontSize: 6.5,
    color: WHITE40,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },

  // ── Footer
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: WHITE08,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 7,
    color: WHITE40,
    letterSpacing: 0.5,
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT2,
    letterSpacing: 1,
  },
});

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function spaced(label: string): string {
  return label.split("").join(" ");
}

/* ── Bar Chart component ─────────────────────────────────────────────────────── */
function BarChart({
  data,
  labels,
  color,
}: {
  data: number[];
  labels: string[];
  color: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <View>
      <View style={s.chartArea}>
        {data.map((v, i) => (
          <View
            key={i}
            style={[
              s.chartBar,
              {
                height: Math.max(4, (v / max) * 48),
                backgroundColor: color,
                opacity: i === data.length - 1 ? 1 : 0.45,
              },
            ]}
          />
        ))}
      </View>
      <View style={s.chartLabels}>
        {labels.map((l, i) => (
          <Text key={i} style={s.chartLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

/* ── Horizontal bar (age / pie) ────────────────────────────────────────────── */
function AgeGroups({ groups }: { groups: { label: string; pct: number }[] }) {
  return (
    <View style={s.pieRow}>
      {groups.map((g, i) => (
        <View key={i} style={s.pieBar}>
          <Text style={s.pieAgeLabel}>{g.label}</Text>
          <View style={s.pieTrack}>
            <View style={[s.pieFill, { width: `${g.pct}%` }]} />
          </View>
          <Text style={s.piePct}>{g.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

/* ── Two-column metric section ─────────────────────────────────────────────── */
function MetricSection({
  heading,
  igValue,
  igHistory,
  fbValue,
  fbHistory,
  labels,
  valueName,
  commentary,
}: {
  heading: string;
  igValue: number;
  igHistory: number[];
  fbValue: number;
  fbHistory: number[];
  labels: string[];
  valueName: string;
  commentary?: string;
}) {
  return (
    <View>
      <Text style={s.sectionHeading}>{spaced(heading)}</Text>
      <View style={s.row2}>
        {/* IG */}
        <View style={s.col}>
          <Text style={[s.netLabel, s.igLabel]}>Instagram</Text>
          <Text style={s.bigNumber}>{fmt(igValue)}</Text>
          <Text style={s.bigLabel}>{valueName}</Text>
          <BarChart data={igHistory} labels={labels} color={IG_GRAD} />
        </View>
        {/* FB */}
        <View style={s.col}>
          <Text style={[s.netLabel, s.fbLabel]}>Facebook</Text>
          <Text style={s.bigNumber}>{fmt(fbValue)}</Text>
          <Text style={s.bigLabel}>{valueName}</Text>
          <BarChart data={fbHistory} labels={labels} color={FB_BLUE} />
        </View>
      </View>
      {commentary && <Text style={s.commentary}>{commentary}</Text>}
    </View>
  );
}

/* ── Page header (repeated on each page) ────────────────────────────────────── */
function PageHeader({ client, month, report }: { client: string; month: string; report: string }) {
  // Parse month label from "2026-05" => "Květen 2026"
  const CZECH_MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
  const [year, mon] = month.split("-");
  const monthName = CZECH_MONTHS[parseInt(mon, 10) - 1] ?? mon;

  return (
    <>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.brand}>OnVision</Text>
          <Text style={s.brandSub}>Kreativní agentura</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.reportTitle}>{report}</Text>
          <Text style={s.clientName}>{client}</Text>
          <Text style={s.monthLabel}>{monthName} {year}</Text>
        </View>
      </View>
      <View style={s.divider} />
    </>
  );
}

/* ── Main PDF Document ──────────────────────────────────────────────────────── */
export function ReportPDF({ data }: { data: ReportData }) {
  const labels = data.monthLabels;

  return (
    <Document title={`OnVision Report — ${data.client} — ${data.month}`} author="OnVision">

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 1 — Cover + Content + Followers + Impressions
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader client={data.client} month={data.month} report="Měsíční report" />

        {/* ZVEŘEJNĚNÝ OBSAH */}
        <Text style={s.sectionHeading}>{spaced("Zveřejněný obsah")}</Text>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{data.postsCount}</Text>
            <Text style={s.statLbl}>Příspěvky</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{data.storiesCount}</Text>
            <Text style={s.statLbl}>Stories</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{data.reelsCount}</Text>
            <Text style={s.statLbl}>Reels</Text>
          </View>
        </View>

        {/* SLEDUJÍCÍ */}
        <Text style={s.sectionHeading}>{spaced("Sledující")}</Text>
        <View style={s.row2}>
          {/* IG */}
          <View style={s.col}>
            <Text style={[s.netLabel, s.igLabel]}>Instagram</Text>
            <Text style={s.bigNumber}>{fmt(data.igFollowers)}</Text>
            <Text style={s.bigLabel}>Sledující celkem</Text>
            <BarChart
              data={data.igFollowersHistory}
              labels={labels}
              color={IG_GRAD}
            />
          </View>
          {/* FB — age breakdown */}
          <View style={s.col}>
            <Text style={[s.netLabel, s.fbLabel]}>Facebook</Text>
            <Text style={s.bigNumber}>{fmt(data.fbFollowers)}</Text>
            <Text style={s.bigLabel}>Fanoušci celkem</Text>
            <AgeGroups groups={data.fbAgeGroups} />
          </View>
        </View>
        {data.aiFollowers && <Text style={s.commentary}>{data.aiFollowers}</Text>}

        <View style={s.thinDivider} />

        {/* ZOBRAZENÍ */}
        <MetricSection
          heading="Zobrazení"
          igValue={data.igImpressions}
          igHistory={data.igImpressionsHistory}
          fbValue={data.fbImpressions}
          fbHistory={data.fbImpressionsHistory}
          labels={labels}
          valueName="Zobrazení"
          commentary={data.aiImpressions}
        />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 2 — Reach + Interactions
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader client={data.client} month={data.month} report="Měsíční report" />

        <MetricSection
          heading="Dosah"
          igValue={data.igReach}
          igHistory={data.igReachHistory}
          fbValue={data.fbReach}
          fbHistory={data.fbReachHistory}
          labels={labels}
          valueName="Dosah"
          commentary={data.aiReach}
        />

        <View style={s.thinDivider} />

        <MetricSection
          heading="Interakce s obsahem"
          igValue={data.igInteractions}
          igHistory={data.igInteractionsHistory}
          fbValue={data.fbInteractions}
          fbHistory={data.fbInteractionsHistory}
          labels={labels}
          valueName="Interakce"
          commentary={data.aiInteractions}
        />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 3 — Visits + Best Post + Footer
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader client={data.client} month={data.month} report="Měsíční report" />

        {/* NÁVŠTĚVY */}
        <MetricSection
          heading="Návštěvy"
          igValue={data.igProfileVisits}
          igHistory={data.igProfileVisitsHistory}
          fbValue={data.fbPageVisits}
          fbHistory={data.fbPageVisitsHistory}
          labels={labels}
          valueName="Návštěvy profilu"
          commentary={data.aiVisits}
        />

        <View style={s.thinDivider} />

        {/* PŘÍSPĚVEK MĚSÍCE */}
        <Text style={s.sectionHeading}>{spaced("Příspěvek měsíce")}</Text>
        <View style={s.bestPostRow}>
          {/* Placeholder thumbnail (image URLs from Meta may not load in PDF renderer) */}
          <View style={s.bestPostImg}>
            <Text style={{ fontSize: 9, color: WHITE40, textAlign: "center" }}>
              {data.bestPostImageUrl ? "Náhled" : "Nejlepší\npost"}
            </Text>
          </View>
          <View style={s.bestPostMetrics}>
            <Text style={s.bestPostTitle}>{spaced("Nejlepší post")}</Text>
            <View style={s.metricRow}>
              <View style={s.metricBox}>
                <Text style={s.metricNum}>{fmt(data.bestPostImpressions)}</Text>
                <Text style={s.metricLbl}>Zobrazení</Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricNum}>{fmt(data.bestPostReach)}</Text>
                <Text style={s.metricLbl}>Dosah</Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricNum}>{fmt(data.bestPostLikes)}</Text>
                <Text style={s.metricLbl}>To se mi líbí</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View>
            <Text style={s.footerText}>Analytik: {data.analystName}</Text>
            <Text style={[s.footerText, { marginTop: 2 }]}>{data.analystEmail}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.footerBrand}>OnVision</Text>
            <Text style={[s.footerText, { marginTop: 2 }]}>Kreativní agentura</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
