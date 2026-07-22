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

export type DodavatelKlic = "onvision" | "jan" | "adam";

export interface Dodavatel {
  nazev: string;
  ulice: string;
  psc: string;
  mesto: string;
  ico: string;
  telefon: string;
  email?: string;
  web?: string;
  banka: string;
  swift?: string;
  iban: string;
  cisloUctu: string;
  kodBanky: string;
  konstantniSymbol?: string;
  showLogo: boolean;     // true only for onvision
  vatText: string;       // "Firma není plátce DPH" or "Nejsem plátce DPH"
  /** Zápis v obchodním rejstříku — na obchodních listinách vyžaduje § 435 OZ.
   *  Jen u s.r.o.; OSVČ (Jan, Adam) zapsané nejsou, proto volitelné. */
  rejstrik?: string;
}

export const DODAVATELE: Record<DodavatelKlic, Dodavatel> = {
  onvision: {
    nazev: "OnVision s.r.o.",
    ulice: "Palackého třída 659/11, Královo Pole",
    psc: "612 00",
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
    showLogo: true,
    vatText: "Firma není plátce DPH",
    rejstrik: "C 144176 vedená u Krajského soudu v Brně",
  },
  jan: {
    nazev: "Jan Kříž",
    ulice: "Koutného 2270/5",
    psc: "628 00",
    mesto: "Brno 28",
    ico: "08953775",
    telefon: "731 768 605",
    banka: "Fio banka, a.s.",
    iban: "CZ05 2010 0000 0020 0176 9793",
    cisloUctu: "2001769793",
    kodBanky: "2010",
    konstantniSymbol: "0308",
    showLogo: false,
    vatText: "Nejsem plátce DPH",
  },
  adam: {
    nazev: "Adam Mendrek, OLY",
    ulice: "Pazourková 2207/15",
    psc: "644 34",
    mesto: "Kuřim",
    ico: "05667445",
    telefon: "+420 603 398 994",
    email: "adam@mendrek.cz",
    web: "www.adammendrek.cz",
    banka: "Raiffeisenbank a.s.",
    swift: "RZBCCZPP",
    iban: "CZ68 5500 0000 0085 3151 0217",
    cisloUctu: "5831320227",
    kodBanky: "5500",
    showLogo: false,
    vatText: "Nejsem plátce DPH",
  },
};

// Keep backward compat
export const DODAVATEL = DODAVATELE.onvision;

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
  dodavatel: Dodavatel;  // issuer
  qrDataUrl?: string;    // pre-generated QR Platba data URL
}

/* ── Build Czech SPD QR payment string ──────────────────────────────────── */
// Pozn.: '*' je oddělovač polí SPD — v hodnotách být nesmí, jinak se QR platba
// rozbije. MSG spec doporučuje max 60 znaků, VS jen číslice (max 10).
export function buildSpdString(dodavatel: Dodavatel, castka: number, vs: string, msg: string): string {
  const iban = (dodavatel.iban ?? "").replace(/\s/g, "").toUpperCase();
  const amount = (Number.isFinite(castka) ? Math.max(0, castka) : 0).toFixed(2);
  const cleanVs = (vs ?? "").replace(/\D/g, "").slice(0, 10);
  const cleanMsg = (msg ?? "").replace(/\*/g, " ").trim().slice(0, 60);
  let s = `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK`;
  if (cleanMsg) s += `*MSG:${cleanMsg}`;
  if (cleanVs) s += `*X-VS:${cleanVs}`;
  return s;
}

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
  dodavatelKlic: DodavatelKlic = "onvision",
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
    dodavatel: DODAVATELE[dodavatelKlic],
  };
}

/* ── Build a one-time ad-hoc invoice with explicit dates ─────────────────── */
export function buildOneTimeInvoice(
  cislo: string,
  odberatel: InvoiceClient,
  dodavatelKlic: DodavatelKlic,
  datumVystaveni: string,
  datumSplatnosti: string,
  datumPlneni: string,
  popisDetail: string,
): InvoiceData {
  return {
    cislo,
    variabilniSymbol: cislo,
    datumVystaveni,
    datumSplatnosti,
    datumPlneni,
    odberatel,
    mesicSluzby: 0,
    rokSluzby: 0,
    popisDetail,
    dodavatel: DODAVATELE[dodavatelKlic],
  };
}

export function fmtKc(n: number): string {
  return n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
