"use client";

import {
  Document, Page, View, Text, StyleSheet, Font, Image, Link,
} from "@react-pdf/renderer";
import { type InvoiceData, DODAVATEL, fmtKc } from "@/lib/invoice";

/* ─────────────────────────────────────────────────────────────────────────
   Full Roboto TTF fonts served as static files from /public/fonts/.
   Full (non-subsetted) fonts → all Latin + Czech diacritics supported.
   Uses window.location.origin for absolute URL (module only loads client-side).
───────────────────────────────────────────────────────────────────────── */
const origin = typeof window !== "undefined" ? window.location.origin : "";
Font.register({
  family: "Roboto",
  fonts: [
    { src: `${origin}/fonts/Roboto-Regular.ttf`, fontWeight: 400 },
    { src: `${origin}/fonts/Roboto-Bold.ttf`,    fontWeight: 700 },
  ],
});

/* ── Colors ──────────────────────────────────────────────────────────────── */
const BLUE   = "#1a52c9";
const BLACK  = "#111111";
const MUTED  = "#555555";
const BORDER = "#999999";
const LIGHT  = "#f2f2f2";

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontWeight: 400,
    fontSize: 8.5,
    color: BLACK,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
  },

  /* Header */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  headerBrand: { fontSize: 17, fontWeight: 700, color: BLUE },
  headerTitle: { fontSize: 12, fontWeight: 700, color: BLUE, textAlign: "right" },

  /* Main info box */
  infoBox:   { flexDirection: "row", borderWidth: 1, borderColor: BORDER },
  infoLeft:  { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 7 },
  infoRight: { flex: 1, padding: 7 },

  /* Logo — PNG image, square, matching brand mark */
  logoBox:  { width: 80, height: 80, marginBottom: 7 },
  logoImg:  { width: 80, height: 80 },

  /* Supplier */
  labelMuted:   { color: MUTED, marginBottom: 4 },
  supplierName: { fontWeight: 700, fontSize: 9, marginBottom: 2 },
  supplierLine: { color: MUTED, marginBottom: 1.5 },
  supplierIco:  { color: BLUE, marginBottom: 1.5 },
  noVat:        { fontWeight: 700, fontSize: 8, marginTop: 4 },

  /* Right column */
  varRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  varLabel:   { color: MUTED },
  varValue:   { fontWeight: 700 },
  dividerH:   { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 5 },
  clientName: { fontWeight: 700, fontSize: 9, marginBottom: 2 },
  clientLine: { color: MUTED, marginBottom: 1.5 },
  icoRow:     { color: MUTED, marginBottom: 1.5 },

  /* Bank */
  bankSection: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingHorizontal: 6, paddingVertical: 5,
  },
  bankRows:  { flex: 1 },
  bankRow:   { flexDirection: "row", marginBottom: 2 },
  bankLabel: { color: MUTED, width: 70 },
  bankValue: { fontWeight: 700 },
  qrBox:     { width: 62, height: 62, alignSelf: "center", marginLeft: 8 },
  qrImg:     { width: 62, height: 62 },
  qrCaption: { fontSize: 6, color: MUTED, textAlign: "center", marginTop: 2 },

  /* Dates */
  datesRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
  },
  datesLeft:     { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 6 },
  datesRight:    { flex: 1, padding: 6 },
  dateRow:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 2.5 },
  dateLabel:     { color: MUTED },
  dateLabelBlue: { color: BLUE },
  dateValue:     { fontWeight: 700 },

  /* Table */
  tableHeader: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    backgroundColor: LIGHT, paddingVertical: 4, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingVertical: 5, paddingHorizontal: 4, minHeight: 36,
  },
  colDesc:   { flex: 3.5 },
  colQty:    { flex: 0.7,  textAlign: "center" },
  colPrice:  { flex: 1.1,  textAlign: "right" },
  colDisc:   { flex: 0.7,  textAlign: "center" },
  colTotal:  { flex: 1.1,  textAlign: "right" },
  colVat:    { flex: 0.6,  textAlign: "center" },
  colVatAmt: { flex: 0.7,  textAlign: "right" },
  colFinal:  { flex: 1.1,  textAlign: "right" },
  thText:    { fontWeight: 700, fontSize: 7.5, color: MUTED },
  tdBlue:    { fontWeight: 700, color: BLUE },
  tdDesc:    { color: MUTED, fontSize: 7.5, marginTop: 2 },

  /* Totals */
  totalsRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingVertical: 4, paddingHorizontal: 4,
  },
  totalSpacer:    { flex: 1 },
  totalLabelCell: { width: 90, textAlign: "right", color: MUTED, paddingRight: 6 },
  totalValueCell: { width: 55, textAlign: "right", color: MUTED },
  totalVatCell:   { width: 45, textAlign: "right", color: MUTED },
  totalFinalCell: { width: 70, textAlign: "right" },
  grandLabelCell: { width: 90, textAlign: "right", fontWeight: 700, paddingRight: 6 },

  /* Issued by */
  issuedRow: {
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingHorizontal: 6, paddingVertical: 8, minHeight: 100,
  },

  /* Notes */
  notesBox: { marginTop: 8 },
  noteText: { color: MUTED, fontSize: 7, marginBottom: 3, lineHeight: 1.5 },

  /* DPH recap */
  dphTitle:  { fontWeight: 700, fontSize: 8, marginBottom: 4, marginTop: 10, textAlign: "center" },
  dphWrap:   { marginHorizontal: 30 },
  dphRow:    { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  dphCellL:  { flex: 1, textAlign: "left",  color: MUTED, fontSize: 8 },
  dphCell:   { flex: 1, textAlign: "right", color: MUTED, fontSize: 8 },
  dphHeader: { fontWeight: 700, color: BLACK },

  /* Bottom */
  bottomRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER },
  bottomLabel: { color: MUTED },
});

/* ── Table header ────────────────────────────────────────────────────────── */
function TableHeaderRow() {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.colDesc,   s.thText]}>{"Označení dodávky"}</Text>
      <Text style={[s.colQty,    s.thText]}>{"Množství"}</Text>
      <Text style={[s.colPrice,  s.thText]}>{"J.cena"}</Text>
      <Text style={[s.colDisc,   s.thText]}>{"Sleva"}</Text>
      <Text style={[s.colTotal,  s.thText]}>{"Cena"}</Text>
      <Text style={[s.colVat,    s.thText]}>{"%DPH"}</Text>
      <Text style={[s.colVatAmt, s.thText]}>{"DPH"}</Text>
      <Text style={[s.colFinal,  s.thText]}>{"Kč Celkem"}</Text>
    </View>
  );
}

/* ── PDF Document ────────────────────────────────────────────────────────── */
export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { odberatel } = data;
  const castkaFmt  = fmtKc(odberatel.castka);
  const mm         = String(data.mesicSluzby).padStart(2, "0");
  const descDetail = `pro ${odberatel.nazev} (${mm}/${data.rokSluzby})`;

  return (
    <Document title={`Faktura ${data.cislo}`} author="OnVision s.r.o.">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerBrand}>{"ONVISION"}</Text>
          <Text style={s.headerTitle}>{"FAKTURA – DAŇOVÝ DOKLAD č. "}{data.cislo}</Text>
        </View>

        {/* ── Info box ── */}
        <View style={s.infoBox}>

          {/* Dodavatel */}
          <View style={s.infoLeft}>
            <Text style={s.labelMuted}>{"Dodavatel:"}</Text>
            <View style={s.logoBox}>
              <Image src={`${origin}/onvision-invoice-logo.png`} style={s.logoImg} />
            </View>
            <Text style={s.supplierName}>{DODAVATEL.nazev}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.ulice}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.psc} {DODAVATEL.mesto}</Text>
            <Text style={s.supplierIco}>{"IČ: "}{DODAVATEL.ico}</Text>
            <Text style={{ height: 5 }} />
            <Link src={`tel:+420${DODAVATEL.telefon.replace(/\s/g, "")}`} style={s.supplierLine}>
              <Text>{"Telefon: "}{DODAVATEL.telefon}</Text>
            </Link>
            <Link src={`mailto:${DODAVATEL.email}`} style={s.supplierLine}>
              <Text>{"E-mail: "}{DODAVATEL.email}</Text>
            </Link>
            <Link src={`https://${DODAVATEL.web}`} style={s.supplierLine}>
              <Text>{DODAVATEL.web}</Text>
            </Link>
            <Text style={s.noVat}>{"Firma není plátce DPH"}</Text>
          </View>

          {/* Odběratel */}
          <View style={s.infoRight}>
            <View style={s.varRow}>
              <Text style={s.varLabel}>{"Variabilní symbol:"}</Text>
              <Text style={s.varValue}>{data.variabilniSymbol}</Text>
            </View>
            <View style={s.varRow}>
              <Text style={s.varLabel}>{"Konstantní symbol:"}</Text>
              <Text style={s.varValue}>{DODAVATEL.konstantniSymbol}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={s.varLabel}>{"Objednávka č.:"}</Text>
              <Text style={{ flex: 1 }} />
              <Text style={s.varLabel}>{"ze dne:"}</Text>
              <Text style={{ width: 55 }} />
            </View>
            <View style={s.dividerH} />
            <Text style={s.labelMuted}>{"Odběratel:"}</Text>
            <Text style={s.icoRow}>{"IČ: "}{odberatel.ico}</Text>
            {odberatel.dic && <Text style={s.icoRow}>{"DIČ: "}{odberatel.dic}</Text>}
            <Text style={{ height: 4 }} />
            <Text style={s.clientName}>{odberatel.nazev}</Text>
            <Text style={s.clientLine}>{odberatel.ulice}</Text>
            <Text style={s.clientLine}>{odberatel.psc} {odberatel.mesto}</Text>
            <Text style={s.clientLine}>{odberatel.zeme}</Text>
          </View>

        </View>

        {/* ── Banka ── */}
        <View style={s.bankSection}>
          <View style={s.bankRows}>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>{"Banka:"}</Text>
              <Text style={s.bankValue}>{DODAVATEL.banka}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>{"SWIFT:"}</Text>
              <Text style={s.bankValue}>{DODAVATEL.swift}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>{"IBAN:"}</Text>
              <Text style={s.bankValue}>{DODAVATEL.iban}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>{"Číslo účtu:"}</Text>
              <Text style={s.bankValue}>{DODAVATEL.cisloUctu}</Text>
            </View>
            <View style={[s.bankRow, { marginBottom: 0 }]}>
              <Text style={s.bankLabel}>{"Kód banky:"}</Text>
              <Text style={s.bankValue}>{DODAVATEL.kodBanky}</Text>
            </View>
          </View>
          {data.qrDataUrl && (
            <View>
              <Image src={data.qrDataUrl} style={s.qrImg} />
              <Text style={s.qrCaption}>{"QR Platba"}</Text>
            </View>
          )}
        </View>

        {/* ── Datumy ── */}
        <View style={s.datesRow}>
          <View style={s.datesLeft}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{"Datum vystavení:"}</Text>
              <Text style={s.dateValue}>{data.datumVystaveni}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{"Datum splatnosti:"}</Text>
              <Text style={s.dateValue}>{data.datumSplatnosti}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabelBlue}>{"Datum uskutečnění plnění:"}</Text>
              <Text style={s.dateValue}>{data.datumPlneni}</Text>
            </View>
            <View style={[s.dateRow, { marginBottom: 0 }]}>
              <Text style={s.dateLabel}>{"Forma úhrady:"}</Text>
              <Text style={s.dateValue}>{"Příkazem"}</Text>
            </View>
          </View>
          <View style={s.datesRight}>
            <Text style={s.labelMuted}>{"Konečný příjemce:"}</Text>
          </View>
        </View>

        {/* ── Tabulka položek ── */}
        <TableHeaderRow />
        <View style={s.tableRow}>
          <View style={s.colDesc}>
            <Text style={s.tdBlue}>{"Fakturujeme Vám:"}</Text>
            <Text style={s.tdDesc}>{odberatel.popisSluzby}</Text>
            <Text style={s.tdDesc}>{descDetail}</Text>
          </View>
          <Text style={s.colQty}>{"1"}</Text>
          <Text style={s.colPrice}>{castkaFmt}</Text>
          <Text style={s.colDisc}>{""}</Text>
          <Text style={s.colTotal}>{castkaFmt}</Text>
          <Text style={s.colVat}>{"0%"}</Text>
          <Text style={s.colVatAmt}>{"0,00"}</Text>
          <Text style={s.colFinal}>{castkaFmt}</Text>
        </View>

        {/* ── Součty — label vlevo, hodnoty zarovnané pod sloupce tabulky ── */}
        <View style={s.totalsRow}>
          <View style={s.colDesc}>
            <Text style={{ color: MUTED }}>{"Součet položek"}</Text>
          </View>
          <Text style={s.colQty}>{""}</Text>
          <Text style={s.colPrice}>{""}</Text>
          <Text style={s.colDisc}>{""}</Text>
          <Text style={[s.colTotal, { color: MUTED }]}>{castkaFmt}</Text>
          <Text style={s.colVat}>{""}</Text>
          <Text style={[s.colVatAmt, { color: MUTED }]}>{"0,00"}</Text>
          <Text style={[s.colFinal, { color: MUTED }]}>{castkaFmt}</Text>
        </View>
        <View style={[s.totalsRow, { borderTopWidth: 0 }]}>
          <View style={{ flex: 3.5 + 0.7 + 1.1 + 0.7 + 1.1 + 0.6 + 0.7 }}>
            <Text style={{ fontWeight: 700 }}>{"CELKEM K ÚHRADĚ"}</Text>
          </View>
          <Text style={[s.colFinal, { fontWeight: 700, fontSize: 10 }]}>{castkaFmt}</Text>
        </View>

        {/* ── Vystavil ── */}
        <View style={s.issuedRow}>
          <Text style={s.labelMuted}>{"Vystavil:"}</Text>
        </View>

        {/* ── Poznámky ── */}
        <View style={s.notesBox}>
          <Text style={s.noteText}>
            {"*Děkujeme za úhradu faktury v datu splatnosti. Pomáhá nám to udržovat stabilní cashflow a plně se soustředit na naši práci pro Vás."}
          </Text>
          <Text style={s.noteText}>
            {"*Dovolujeme si Vás upozornit, že v případě nedodržení data splatnosti uvedeného na faktuře Vám budeme účtovat úrok z prodlení v dohodnuté, resp. zákonné výši a smluvní pokutu (byla-li sjednána)."}
          </Text>
        </View>

        {/* ── DPH rekapitulace ── */}
        <Text style={s.dphTitle}>{"Rekapitulace DPH v Kč:"}</Text>
        <View style={s.dphWrap}>
          <View style={s.dphRow}>
            <Text style={[s.dphCellL, s.dphHeader]}>{"Základ v Kč"}</Text>
            <Text style={[s.dphCell,  s.dphHeader]}>{"Sazba"}</Text>
            <Text style={[s.dphCell,  s.dphHeader]}>{"DPH v Kč"}</Text>
            <Text style={[s.dphCell,  s.dphHeader]}>{"Celkem s DPH v Kč"}</Text>
          </View>
          <View style={s.dphRow}>
            <Text style={s.dphCellL}>{castkaFmt}</Text>
            <Text style={s.dphCell}>{"0%"}</Text>
            <Text style={s.dphCell}>{""}</Text>
            <Text style={s.dphCell}>{""}</Text>
          </View>
          {(["10%", "15%", "21%"] as const).map(rate => (
            <View key={rate} style={s.dphRow}>
              <Text style={s.dphCellL}>{"0,00"}</Text>
              <Text style={s.dphCell}>{rate}</Text>
              <Text style={s.dphCell}>{"0,00"}</Text>
              <Text style={s.dphCell}>{"0,00"}</Text>
            </View>
          ))}
        </View>

        {/* ── Dno ── */}
        <View style={s.bottomRow}>
          <Text style={s.bottomLabel}>{"Převzal:"}</Text>
          <Text style={s.bottomLabel}>{"Razítko:"}</Text>
        </View>

      </Page>
    </Document>
  );
}
