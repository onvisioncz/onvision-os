"use client";

import {
  Document, Page, View, Text, StyleSheet, Image, Link, Font,
} from "@react-pdf/renderer";
import { type InvoiceData, DODAVATEL, fmtKc } from "@/lib/invoice";

/* ─────────────────────────────────────────────────────────────────────────
   Full Roboto TTF — all chars incl. Czech diacritics.
   Absolute URL so react-pdf can fetch via XHR in the browser.
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
const BLUE   = "#1852c9";   // OnVision invoice blue
const BLACK  = "#111111";
const MUTED  = "#555555";
const BORDER = "#aaaaaa";
const LIGHT  = "#f4f4f4";

/* ── Column flex values — must match table exactly ───────────────────────── */
const COL = {
  desc:   3.5,
  qty:    0.7,
  price:  1.1,
  disc:   0.7,
  total:  1.1,
  vat:    0.6,
  vatAmt: 0.7,
  final:  1.1,
} as const;

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

  /* ── Header ── */
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  headerBrand: { fontSize: 17, fontWeight: 700, color: BLUE },
  headerTitle: { fontSize: 12, fontWeight: 700, color: BLUE, textAlign: "right" },

  /* ── Main info box ── */
  infoBox:   { flexDirection: "row", borderWidth: 1, borderColor: BORDER },
  infoLeft:  { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 7 },
  infoRight: { flex: 1, padding: 7 },

  /* ── Logo ── */
  logoBox:   { backgroundColor: BLUE, width: 100, height: 38, marginBottom: 8, justifyContent: "center", alignItems: "center" },
  logoImage: { width: 82, height: 30, objectFit: "contain" },

  /* ── Supplier ── */
  labelGray:    { color: MUTED, marginBottom: 5 },
  supplierName: { fontWeight: 700, fontSize: 9, marginBottom: 2 },
  supplierLine: { color: MUTED, fontSize: 8.5, marginBottom: 1.5 },
  supplierBlue: { color: BLUE, fontSize: 8.5, marginBottom: 1.5 },
  noVat:        { fontWeight: 700, fontSize: 8.5, marginTop: 5 },

  /* ── Right column ── */
  varRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  varLabel:   { color: MUTED },
  varValue:   { fontWeight: 700 },
  divH:       { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 5 },
  clientName: { fontWeight: 700, fontSize: 9, marginBottom: 2 },
  clientLine: { color: MUTED, marginBottom: 1.5 },
  icoLine:    { color: MUTED, marginBottom: 1.5 },

  /* ── Bank section ── */
  bankBox:   { borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingHorizontal: 6, paddingVertical: 5 },
  bankRow:   { flexDirection: "row", marginBottom: 2 },
  bLabel:    { color: MUTED, width: 65 },
  bValue:    { fontWeight: 700 },

  /* ── Dates ── */
  datesBox:  { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER },
  datesL:    { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 6 },
  datesR:    { flex: 1, padding: 6 },
  dRow:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  dLabel:    { color: MUTED },
  dLabelBlue:{ color: BLUE },
  dValue:    { fontWeight: 700 },

  /* ── Items table ── */
  tableHeader: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    backgroundColor: LIGHT, paddingVertical: 4, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingVertical: 5, paddingHorizontal: 4, minHeight: 40,
  },
  thText:  { fontWeight: 700, fontSize: 7.5, color: MUTED },
  tdBlue:  { fontWeight: 700, color: BLUE },
  tdDesc:  { color: MUTED, fontSize: 7.5, marginTop: 2 },
  tdRight: { textAlign: "right" },
  tdCenter:{ textAlign: "center" },

  /* ── Totals ── */
  totalsRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingVertical: 3, paddingHorizontal: 4,
  },

  /* ── Issued by ── */
  issuedRow: {
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    paddingHorizontal: 6, paddingVertical: 6, minHeight: 100,
  },

  /* ── Notes ── */
  notesBox: { marginTop: 8 },
  noteText: { color: MUTED, fontSize: 7, marginBottom: 3, lineHeight: 1.5 },

  /* ── DPH recap ── */
  dphTitle:  { fontWeight: 700, fontSize: 8, marginBottom: 4, marginTop: 10, textAlign: "center" },
  dphWrap:   { marginHorizontal: 20 },
  dphRow:    { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  dphCellL:  { flex: 1, textAlign: "left",  color: MUTED, fontSize: 8 },
  dphCell:   { flex: 1, textAlign: "right", color: MUTED, fontSize: 8 },
  dphHdr:    { fontWeight: 700, color: BLACK },

  /* ── Bottom ── */
  bottomRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 5, borderTopWidth: 1, borderTopColor: BORDER },
  bottomLabel: { color: MUTED },
});

/* ── Table header ────────────────────────────────────────────────────────── */
function TH() {
  return (
    <View style={s.tableHeader}>
      <Text style={[{ flex: COL.desc  }, s.thText]}>{"Označení dodávky"}</Text>
      <Text style={[{ flex: COL.qty   }, s.thText, s.tdCenter]}>{"Množství"}</Text>
      <Text style={[{ flex: COL.price }, s.thText, s.tdRight]}>{"J.cena"}</Text>
      <Text style={[{ flex: COL.disc  }, s.thText, s.tdCenter]}>{"Sleva"}</Text>
      <Text style={[{ flex: COL.total }, s.thText, s.tdRight]}>{"Cena"}</Text>
      <Text style={[{ flex: COL.vat   }, s.thText, s.tdCenter]}>{"%DPH"}</Text>
      <Text style={[{ flex: COL.vatAmt}, s.thText, s.tdRight]}>{"DPH"}</Text>
      <Text style={[{ flex: COL.final }, s.thText, s.tdRight]}>{"Kč Celkem"}</Text>
    </View>
  );
}

/* ── PDF Document ────────────────────────────────────────────────────────── */
export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { odberatel } = data;
  const castkaFmt  = fmtKc(odberatel.castka);
  const mm         = String(data.mesicSluzby).padStart(2, "0");
  const descDetail = `pro ${odberatel.nazev} (${mm}/${data.rokSluzby})`;

  // Spacer flex for totals rows (all columns except from certain point onward)
  const spacerSoucet  = COL.desc + COL.qty + COL.price + COL.disc; // before Cena
  const spacerCelkem  = COL.desc + COL.qty + COL.price + COL.disc + COL.total + COL.vat + COL.vatAmt; // before final

  return (
    <Document title={`Faktura ${data.cislo}`} author="OnVision s.r.o.">
      <Page size="A4" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <Text style={s.headerBrand}>{"ONVISION"}</Text>
          <Text style={s.headerTitle}>{"FAKTURA – DAŇOVÝ DOKLAD č. "}{data.cislo}</Text>
        </View>

        {/* ── INFO BOX ── */}
        <View style={s.infoBox}>

          {/* LEFT: Dodavatel */}
          <View style={s.infoLeft}>
            <Text style={s.labelGray}>{"Dodavatel:"}</Text>

            {/* Logo */}
            <View style={s.logoBox}>
              <Image src={`${origin}/onvision-mark.png`} style={s.logoImage} />
            </View>

            <Text style={s.supplierName}>{DODAVATEL.nazev}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.ulice}</Text>
            <Text style={s.supplierLine}>{DODAVATEL.psc} {DODAVATEL.mesto}</Text>
            <Link src={`https://rejstrik.penize.cz/${DODAVATEL.ico}`} style={s.supplierBlue}>
              {"IČ: "}{DODAVATEL.ico}
            </Link>
            <Text style={{ height: 4 }} />
            <Link src={`tel:+420${DODAVATEL.telefon.replace(/\s/g, "")}`} style={s.supplierLine}>
              {"Telefon: "}{DODAVATEL.telefon}
            </Link>
            <Link src={`mailto:${DODAVATEL.email}`} style={s.supplierBlue}>
              {"E-mail: "}{DODAVATEL.email}
            </Link>
            <Link src={`https://${DODAVATEL.web}`} style={s.supplierBlue}>
              {DODAVATEL.web}
            </Link>
            <Text style={s.noVat}>{"Firma není plátce DPH"}</Text>
          </View>

          {/* RIGHT: VS + Odběratel */}
          <View style={s.infoRight}>
            <View style={s.varRow}>
              <Text style={s.varLabel}>{"Variabilní symbol:"}</Text>
              <Text style={s.varValue}>{data.variabilniSymbol}</Text>
            </View>
            <View style={s.varRow}>
              <Text style={s.varLabel}>{"Konstantní symbol:"}</Text>
              <Text style={s.varValue}>{DODAVATEL.konstantniSymbol}</Text>
            </View>
            <View style={s.varRow}>
              <Text style={s.varLabel}>{"Objednávka č.:"}</Text>
              <Text style={s.varLabel}>{"ze dne:"}</Text>
            </View>

            <View style={s.divH} />

            <Text style={s.labelGray}>{"Odběratel:"}</Text>
            <Text style={s.icoLine}>{"IČ: "}{odberatel.ico}</Text>
            {odberatel.dic && <Text style={s.icoLine}>{"DIČ: "}{odberatel.dic}</Text>}
            <Text style={{ height: 4 }} />
            <Text style={s.clientName}>{odberatel.nazev}</Text>
            <Text style={s.clientLine}>{odberatel.ulice}</Text>
            <Text style={s.clientLine}>{odberatel.psc} {odberatel.mesto}</Text>
            <Text style={s.clientLine}>{odberatel.zeme}</Text>
          </View>

        </View>

        {/* ── BANK ── */}
        <View style={s.bankBox}>
          <View style={s.bankRow}>
            <Text style={s.bLabel}>{"Banka:"}</Text>
            <Text style={[s.bValue, { flex: 1 }]}>{DODAVATEL.banka}</Text>
            <Text style={[s.bLabel, { width: 50 }]}>{"SWIFT:"}</Text>
            <Text style={s.bValue}>{DODAVATEL.swift}</Text>
          </View>
          <View style={s.bankRow}>
            <Text style={s.bLabel}>{"IBAN:"}</Text>
            <Text style={s.bValue}>{DODAVATEL.iban}</Text>
          </View>
          <View style={[s.bankRow, { marginBottom: 0 }]}>
            <Text style={s.bLabel}>{"Číslo účtu:"}</Text>
            <Text style={[s.bValue, { flex: 1 }]}>{DODAVATEL.cisloUctu}</Text>
            <Text style={[s.bLabel, { width: 70 }]}>{"Kód banky:"}</Text>
            <Text style={s.bValue}>{DODAVATEL.kodBanky}</Text>
          </View>
        </View>

        {/* ── DATES ── */}
        <View style={s.datesBox}>
          <View style={s.datesL}>
            <View style={s.dRow}>
              <Text style={s.dLabel}>{"Datum vystavení:"}</Text>
              <Text style={s.dValue}>{data.datumVystaveni}</Text>
            </View>
            <View style={s.dRow}>
              <Text style={s.dLabel}>{"Datum splatnosti:"}</Text>
              <Text style={s.dValue}>{data.datumSplatnosti}</Text>
            </View>
            <View style={s.dRow}>
              <Text style={s.dLabelBlue}>{"Datum uskutečnění plnění:"}</Text>
              <Text style={s.dValue}>{data.datumPlneni}</Text>
            </View>
            <View style={[s.dRow, { marginBottom: 0 }]}>
              <Text style={s.dLabel}>{"Forma úhrady:"}</Text>
              <Text style={s.dValue}>{"Příkazem"}</Text>
            </View>
          </View>
          <View style={s.datesR}>
            <Text style={s.labelGray}>{"Konečný příjemce:"}</Text>
          </View>
        </View>

        {/* ── ITEMS TABLE ── */}
        <TH />
        <View style={s.tableRow}>
          <View style={{ flex: COL.desc }}>
            <Text style={s.tdBlue}>{"Fakturujeme Vám:"}</Text>
            <Text style={s.tdDesc}>{odberatel.popisSluzby}</Text>
            <Text style={s.tdDesc}>{descDetail}</Text>
          </View>
          <Text style={[{ flex: COL.qty   }, s.tdCenter]}>{"1"}</Text>
          <Text style={[{ flex: COL.price }, s.tdRight]}>{castkaFmt}</Text>
          <Text style={[{ flex: COL.disc  }, s.tdCenter]}>{""}</Text>
          <Text style={[{ flex: COL.total }, s.tdRight]}>{castkaFmt}</Text>
          <Text style={[{ flex: COL.vat   }, s.tdCenter]}>{"0%"}</Text>
          <Text style={[{ flex: COL.vatAmt}, s.tdRight]}>{"0,00"}</Text>
          <Text style={[{ flex: COL.final }, s.tdRight]}>{castkaFmt}</Text>
        </View>

        {/* ── SOUČET POLOŽEK — aligned with table columns ── */}
        <View style={s.totalsRow}>
          <View style={{ flex: spacerSoucet }}>
            <Text style={{ textAlign: "right", color: MUTED }}>{"Součet položek"}</Text>
          </View>
          <Text style={[{ flex: COL.total  }, s.tdRight, { color: MUTED }]}>{castkaFmt}</Text>
          <Text style={[{ flex: COL.vat    }, s.tdCenter]}>{""}</Text>
          <Text style={[{ flex: COL.vatAmt }, s.tdRight, { color: MUTED }]}>{"0,00"}</Text>
          <Text style={[{ flex: COL.final  }, s.tdRight]}>{castkaFmt}</Text>
        </View>

        {/* ── CELKEM K ÚHRADĚ — aligned with last column only ── */}
        <View style={[s.totalsRow, { borderTopWidth: 0 }]}>
          <View style={{ flex: spacerCelkem }}>
            <Text style={{ textAlign: "right", fontWeight: 700 }}>{"CELKEM K ÚHRADĚ"}</Text>
          </View>
          <Text style={[{ flex: COL.final }, s.tdRight, { fontWeight: 700, fontSize: 10 }]}>
            {castkaFmt}
          </Text>
        </View>

        {/* ── VYSTAVIL ── */}
        <View style={s.issuedRow}>
          <Text style={s.labelGray}>{"Vystavil:"}</Text>
        </View>

        {/* ── POZNÁMKY ── */}
        <View style={s.notesBox}>
          <Text style={s.noteText}>
            {"*Děkujeme za úhradu faktury v datu splatnosti. Pomáhá nám to udržovat stabilní cashflow a plně se soustředit na naši práci pro Vás."}
          </Text>
          <Text style={s.noteText}>
            {"*Dovolujeme si Vás upozornit, že v případě nedodržení data splatnosti uvedeného na faktuře Vám budeme účtovat úrok z prodlení v dohodnuté, resp. zákonné výši a smluvní pokutu (byla-li sjednána)."}
          </Text>
        </View>

        {/* ── DPH REKAPITULACE ── */}
        <Text style={s.dphTitle}>{"Rekapitulace DPH v Kč:"}</Text>
        <View style={s.dphWrap}>
          <View style={s.dphRow}>
            <Text style={[s.dphCellL, s.dphHdr]}>{"Základ v Kč"}</Text>
            <Text style={[s.dphCell,  s.dphHdr]}>{"Sazba"}</Text>
            <Text style={[s.dphCell,  s.dphHdr]}>{"DPH v Kč"}</Text>
            <Text style={[s.dphCell,  s.dphHdr]}>{"Celkem s DPH v Kč"}</Text>
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

        {/* ── PŘEVZAL / RAZÍTKO ── */}
        <View style={s.bottomRow}>
          <Text style={s.bottomLabel}>{"Převzal:"}</Text>
          <Text style={s.bottomLabel}>{"Razítko:"}</Text>
        </View>

      </Page>
    </Document>
  );
}
