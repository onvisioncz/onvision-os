/* ── Invoice types & helpers ─────────────────────────────────────────────── */

export interface InvoiceClient {
  nazev: string;        // "IMTOS, spol. s r.o."
  ulice: string;        // "Technická 818/4"
  psc: string;          // "664 48"
  mesto: string;        // "Moravany"
  zeme: string;         // "Česká republika"
  ico: string;          // "46967079"
  dic?: string;         // "CZ46967079"
  fakturaRada: number;  // 14
  castka: number;       // 35000
  popisSluzby: string;  // "Kreativní produkce a digitální strategie obsahu: LinkedIn, Facebook & Instagram"
}

export interface InvoiceData {
  cislo: string;
  variabilniSymbol: string;
  datumVystaveni: string;
  datumSplatnosti: string;
  datumPlneni: string;
  odberatel: InvoiceClient;
  mesicSluzby: number;   // 4
  rokSluzby: number;     // 2026
  popisDetail: string;   // editable second description line, e.g. "pro IMTOS (04/2026)"
  qrDataUrl?: string;    // pre-generated QR Platba data URL
}

/* ── Build Czech SPD QR payment string ──────────────────────────────────── */
export function buildSpdString(castka: number, vs: string, msg: string): string {
  const iban = DODAVATEL.iban.replace(/\s/g, "");
  const amount = castka.toFixed(2);
  return `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*MSG:${msg}*X-VS:${vs}`;
}

/* ── OnVision fixed supplier data ───────────────────────────────────────── */
export const DODAVATEL = {
  nazev: "OnVision s.r.o.",
  ulice: "Křenová 64/13",
  psc: "602 00",
  mesto: "Brno",
  ico: "23052341",
  telefon: "603 398 994",
  email: "info@onvision.cz",
  web: "www.onvision.cz",
  banka: "Raiffeisenbank a.s.",
  swift: "",
  iban: "CZ60 5500 0000 0016 3853 7004",
  cisloUctu: "1638537004",
  kodBanky: "5500",
  konstantniSymbol: "0308",
} as const;

/* ── Invoice number: YY + clientCode(2) + month(5-zero-padded) ─────────── */
export function buildCisloFaktury(rok: number, rada: number, mesic: number): string {
  const yy = String(rok).slice(-2);
  const cc = String(rada).padStart(2, "0");
  const mm = String(mesic).padStart(5, "0");
  return `${yy}${cc}${mm}`;
}

/* ── Date helpers ───────────────────────────────────────────────────────── */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isWorkday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export function firstWorkday(year: number, month: number): Date {
  const d = new Date(year, month - 1, 1);
  while (!isWorkday(d)) d.setDate(d.getDate() + 1);
  return d;
}

export function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // day 0 of next month = last day of this month
}

export function fmtDate(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

const MONTHS_CS = [
  "ledna","února","března","dubna","května","června",
  "července","srpna","září","října","listopadu","prosince",
];
const MONTHS_LONG = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];

export function mesicCsShort(m: number): string {
  return `${String(m).padStart(2,"0")}/${new Date().getFullYear()}`;
}

export function mesicGenitiv(m: number): string {
  return MONTHS_CS[m - 1] ?? "";
}

export function mesicNominativ(m: number): string {
  return MONTHS_LONG[m - 1] ?? "";
}

/* ── Build full InvoiceData from client + service month ─────────────────── */
export function buildInvoice(
  client: InvoiceClient,
  mesicSluzby: number,
  rokSluzby: number,
): InvoiceData {
  // Invoice is issued in the month AFTER the service month
  const invoiceMonth = mesicSluzby === 12 ? 1 : mesicSluzby + 1;
  const invoiceYear  = mesicSluzby === 12 ? rokSluzby + 1 : rokSluzby;

  const vystaveni  = firstWorkday(invoiceYear, invoiceMonth);
  const splatnost  = addDays(vystaveni, 7);
  const plneni     = lastDayOfMonth(rokSluzby, mesicSluzby);

  const cislo = buildCisloFaktury(rokSluzby, client.fakturaRada, mesicSluzby);

  const mm = String(mesicSluzby).padStart(2, "0");

  return {
    cislo,
    variabilniSymbol: cislo,
    datumVystaveni: fmtDate(vystaveni),
    datumSplatnosti: fmtDate(splatnost),
    datumPlneni: fmtDate(plneni),
    odberatel: client,
    mesicSluzby,
    rokSluzby,
    popisDetail: `pro ${client.nazev} (${mm}/${rokSluzby})`,
  };
}

export function fmtKc(n: number): string {
  return n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
