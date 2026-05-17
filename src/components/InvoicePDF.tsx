"use client";

import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";
import { type InvoiceData, DODAVATEL, fmtKc } from "@/lib/invoice";

/* ── Colors ──────────────────────────────────────────────────────────────── */
const BLUE   = "#1a52c9";
const BLACK  = "#111111";
const MUTED  = "#444444";
const BORDER = "#aaaaaa";
const LIGHT  = "#f4f4f4";

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: BLACK,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
  },

  /* ── Header ── */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  headerBrand: { fontSize: 17, fontFamily: "Helvetica-Bold", color: BLUE },
  headerTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLUE, textAlign: "right" },

  /* ── Main info box ── */
  infoBox: { flexDirection: "row", borderWidth: 1, borderColor: BORDER, marginBottom: 0 },
  infoLeft: { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 7 },
  infoRight: { flex: 1, padding: 7 },

  /* ── OnVision logo box ── */
  logoBox: { backgroundColor: BLUE, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6, width: 90 },
  logoText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 13 },

  /* ── Supplier fields ── */
  supplierName: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 2 },
  supplierLine: { color: MUTED, marginBottom: 1 },
  noVat: { fontFamily: "Helvetica-Bold", fontSize: 8, marginTop: 4 },

  /* ── Right side ── */
  varRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  varLabel: { color: MUTED },
  varValue: { fontFamily: "Helvetica-Bold" },
  dividerH: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 5 },
  clientName: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 2 },
  clientLine: { color: MUTED, marginBottom: 1 },
  icoRow: { marginBottom: 1, color: MUTED },

  /* ── Bank row ── */
  bankRow: { flexDirection: "row", borderWidth: 1, borderTopWidth: 0, borderColor: BORDER, padding: 6, gap: 20 },
  bankCol: { flex: 1 },
  bankLabel: { color: MUTED, marginRight: 4 },
  bankValue: { fontFamily: "Helvetica-Bold" },

  /* ── Dates row ── */
  datesRow: { flexDirection: "row", borderWidth: 1, borderTopWidth: 0, borderColor: BORDER },
  datesLeft: { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 6 },
  datesRight: { flex: 1, padding: 6 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  dateLabel: { color: MUTED },
  dateLabelBlue: { color: BLUE },
  dateValue: { fontFamily: "Helvetica-Bold" },

  /* ── Items table ── */
  tableHeader: {
    flexDirection: "row",
    borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
    backgroundColor: LIGHT,
    paddingVertical: 4, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
    paddingVertical: 4, paddingHorizontal: 4,
  },

  // Column widths
  colDesc:   { flex: 3.5 },
  colQty:    { flex: 0.7, textAlign: "center" },
  colPrice:  { flex: 1.1, textAlign: "right" },
  colDisc:   { flex: 0.7, textAlign: "center" },
  colTotal:  { flex: 1.1, textAlign: "right" },
  colVat:    { flex: 0.6, textAlign: "center" },
  colVatAmt: { flex: 0.7, textAlign: "right" },
  colFinal:  { flex: 1.1, textAlign: "right" },

  thText: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED },
  tdBlue: { fontFamily: "Helvetica-Bold", color: BLUE },
  tdDesc: { color: MUTED, fontSize: 7.5, marginTop: 2 },

  /* ── Totals ── */
  totalsRow: {
    flexDirection: "row",
    borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
    paddingVertical: 4, paddingHorizontal: 4,
    justifyContent: "flex-end",
  },
  totalLabel: { color: MUTED, marginRight: 8, width: 90, textAlign: "right" },
  totalValue: { width: 70, textAlign: "right" },
  grandLabel: { fontFamily: "Helvetica-Bold", marginRight: 8, width: 90, textAlign: "right" },
  grandValue: { fontFamily: "Helvetica-Bold", width: 70, textAlign: "right", fontSize: 10 },

  /* ── Issued by ── */
  issuedRow: {
    borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
    paddingHorizontal: 6, paddingVertical: 8, minHeight: 30,
  },
  issuedLabel: { color: MUTED },

  /* ── Notes ── */
  notesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  noteText: { color: MUTED, fontSize: 7, marginBottom: 3, lineHeight: 1.5 },

  /* ── DPH recap ── */
  dphTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 4, marginTop: 6, textAlign: "center" },
  dphTable: { flexDirection: "column", marginHorizontal: 40 },
  dphRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  dphCell: { flex: 1, textAlign: "right", color: MUTED },
  dphHeader: { fontFamily: "Helvetica-Bold", color: BLACK },

  /* ── Bottom ── */
  bottomRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 4, borderTopWidth: 1, borderTopColor: BORDER },
  bottomLabel: { color: MUTED },
});

/* ── Row component ───────────────────────────────────────────────────────── */
function TableHeaderRow() {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.colDesc,   s.thText]}>Označení dodávky</Text>
      <Text style={[s.colQty,    s.thText]}>Množství</Text>
      <Text style={[s.colPrice,  s.thText]}>J.cena</Text>
      <Text style={[s.colDisc,   s.thText]}>Sleva</Text>
      <Text style={[s.colTotal,  s.thText]}>Cena</Text>
      <Text style={[s.colVat,    s.thText]}>%DPH</Text>
      <Text style={[s.colVatAmt, s.thText]}>DPH</Text>
      <Text style={[s.colFinal,  s.thText]}>Kč Celkem</Text>
    </View>
  );
}

/* ── PDF Document ────────────────────────────────────────────────────────── */
export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { odberatel } = data;
  const castka = odberatel.castka;
  const castkaFmt = fmtKc(castka);

  // Description line: "... pro IMTOS, spol. s r.o. (MM/YYYY)"
  const mm = String(data.mesicSluzby).padStart(2, "0");
  const descDetail = `pro ${odberatel.nazev} (${mm}/${data.rokSluzby})`;

  return (
    <Document title={`Faktura ${data.cislo}`} author="OnVision s.r.o.">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerBrand}>ONVISION</Text>
          <Text style={s.headerTitle}>FAKTURA – DAŇOVÝ DOKLAD č. {data.cislo}</Text>
        </View>

        {/* ── Info box ── */}
        <View style={s.infoBox}>
          {/* Left: Dodavatel */}
          <View style={s.infoLeft}>
            <Text style={{ color: MUTED, marginBottom: 4 }}>Dodavatel:</Text>
            <View style={s.logoBox}>
              <Text style={s.logoText}>OnVision</Text>
            </View>
            <Text style={s.supplierName}>{DODAVATEL.nazev}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.ulice}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.psc} {DODAVATEL.mesto}</Text>
            <Text style={s.supplierLine}>IČ: {DODAVATEL.ico}</Text>
            <Text style={{ height: 5 }} />
            <Text style={s.supplierLine}>Telefon: {DODAVATEL.telefon}</Text>
            <Text style={s.supplierLine}>E-mail: {DODAVATEL.email}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.web}</Text>
            <Text style={s.noVat}>Firma není plátce DPH</Text>
          </View>

          {/* Right: VS + Odběratel */}
          <View style={s.infoRight}>
            <View style={s.varRow}>
              <Text style={s.varLabel}>Variabilní symbol:</Text>
              <Text style={s.varValue}>{data.variabilniSymbol}</Text>
            </View>
            <View style={s.varRow}>
              <Text style={s.varLabel}>Konstantní symbol:</Text>
              <Text style={s.varValue}>{DODAVATEL.konstantniSymbol}</Text>
            </View>
            <View style={s.varRow}>
              <Text style={s.varLabel}>Objednávka č.:</Text>
              <Text style={s.varLabel}>ze dne:</Text>
            </View>

            <View style={s.dividerH} />

            <Text style={{ color: MUTED, marginBottom: 4 }}>Odběratel:</Text>
            <Text style={s.icoRow}>IČ: {odberatel.ico}</Text>
            {odberatel.dic && <Text style={s.icoRow}>DIČ: {odberatel.dic}</Text>}
            <Text style={{ height: 4 }} />
            <Text style={s.clientName}>{odberatel.nazev}</Text>
            <Text style={s.clientLine}>{odberatel.ulice}</Text>
            <Text style={s.clientLine}>{odberatel.psc} {odberatel.mesto}</Text>
            <Text style={s.clientLine}>{odberatel.zeme}</Text>
          </View>
        </View>

        {/* ── Bank row ── */}
        <View style={s.bankRow}>
          <View style={s.bankCol}>
            <Text><Text style={s.bankLabel}>Banka:</Text><Text style={s.bankValue}> {DODAVATEL.banka}</Text></Text>
          </View>
          <View style={s.bankCol}>
            <Text><Text style={s.bankLabel}>SWIFT:</Text><Text style={s.bankValue}> {DODAVATEL.swift}</Text></Text>
          </View>
        </View>
        <View style={[s.bankRow, { borderTopWidth: 0 }]}>
          <View style={s.bankCol}>
            <Text><Text style={s.bankLabel}>IBAN:</Text><Text style={s.bankValue}> {DODAVATEL.iban}</Text></Text>
          </View>
        </View>
        <View style={[s.bankRow, { borderTopWidth: 0 }]}>
          <View style={s.bankCol}>
            <Text><Text style={s.bankLabel}>Číslo účtu:</Text><Text style={s.bankValue}> {DODAVATEL.cisloUctu}</Text></Text>
          </View>
          <View style={s.bankCol}>
            <Text><Text style={s.bankLabel}>Kód banky:</Text><Text style={s.bankValue}> {DODAVATEL.kodBanky}</Text></Text>
          </View>
        </View>

        {/* ── Dates row ── */}
        <View style={s.datesRow}>
          <View style={s.datesLeft}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>Datum vystavení:</Text>
              <Text style={s.dateValue}>{data.datumVystaveni}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>Datum splatnosti:</Text>
              <Text style={s.dateValue}>{data.datumSplatnosti}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabelBlue}>Datum uskutečnění plnění:</Text>
              <Text style={s.dateValue}>{data.datumPlneni}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>Forma úhrady:</Text>
              <Text style={s.dateValue}>Příkazem</Text>
            </View>
          </View>
          <View style={s.datesRight}>
            <Text style={s.dateLabel}>Konečný příjemce:</Text>
          </View>
        </View>

        {/* ── Items table ── */}
        <TableHeaderRow />
        <View style={s.tableRow}>
          <View style={s.colDesc}>
            <Text style={s.tdBlue}>Fakturujeme Vám:</Text>
            <Text style={s.tdDesc}>{odberatel.popisSluzby}</Text>
            <Text style={s.tdDesc}>{descDetail}</Text>
          </View>
          <Text style={s.colQty}>1</Text>
          <Text style={s.colPrice}>{castkaFmt}</Text>
          <Text style={s.colDisc}></Text>
          <Text style={s.colTotal}>{castkaFmt}</Text>
          <Text style={s.colVat}>0%</Text>
          <Text style={s.colVatAmt}>0,00</Text>
          <Text style={s.colFinal}>{castkaFmt}</Text>
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsRow}>
          <Text style={s.totalLabel}>Součet položek</Text>
          <Text style={[s.totalValue, { width: 110, textAlign: "right" }]}>{castkaFmt}         0,00       {castkaFmt}</Text>
        </View>
        <View style={[s.totalsRow, { borderTopWidth: 0 }]}>
          <Text style={s.grandLabel}>CELKEM K ÚHRADĚ</Text>
          <Text style={s.grandValue}>{castkaFmt}</Text>
        </View>

        {/* ── Issued by ── */}
        <View style={s.issuedRow}>
          <Text style={s.issuedLabel}>Vystavil:</Text>
        </View>

        {/* ── Notes ── */}
        <View style={s.notesBox}>
          <Text style={s.noteText}>
            *Děkujeme za úhradu faktury v datu splatnosti. Pomáhá nám to udržovat stabilní cashflow a plně se soustředit na naši práci pro Vás.
          </Text>
          <Text style={s.noteText}>
            *Dovolujeme si Vás upozornit, že v případě nedodržení data splatnosti uvedeného na faktuře Vám budeme účtovat úrok z prodlení v dohodnuté, resp. zákonné výši a smluvní pokutu (byla-li sjednána).
          </Text>
        </View>

        {/* ── DPH rekapitulace ── */}
        <Text style={s.dphTitle}>Rekapitulace DPH v Kč:</Text>
        <View style={s.dphTable}>
          <View style={s.dphRow}>
            <Text style={[s.dphCell, s.dphHeader]}>Základ v Kč</Text>
            <Text style={[s.dphCell, s.dphHeader]}>Sazba</Text>
            <Text style={[s.dphCell, s.dphHeader]}>DPH v Kč</Text>
            <Text style={[s.dphCell, s.dphHeader]}>Celkem s DPH v Kč</Text>
          </View>
          <View style={s.dphRow}>
            <Text style={s.dphCell}>{castkaFmt}</Text>
            <Text style={s.dphCell}>0%</Text>
            <Text style={s.dphCell}></Text>
            <Text style={s.dphCell}></Text>
          </View>
          {[{ rate: "10%"}, { rate: "15%"}, { rate: "21%"}].map(({ rate }) => (
            <View key={rate} style={s.dphRow}>
              <Text style={s.dphCell}>0,00</Text>
              <Text style={s.dphCell}>{rate}</Text>
              <Text style={s.dphCell}>0,00</Text>
              <Text style={s.dphCell}>0,00</Text>
            </View>
          ))}
        </View>

        {/* ── Bottom ── */}
        <View style={s.bottomRow}>
          <Text style={s.bottomLabel}>Převzal:</Text>
          <Text style={s.bottomLabel}>Razítko:</Text>
        </View>

      </Page>
    </Document>
  );
}
