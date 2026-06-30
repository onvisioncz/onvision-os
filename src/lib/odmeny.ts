/**
 * Modul odměn — datový model, výpočty a texty e-mailů.
 *
 * Ukládá se do app_data pod klíčem "ov-odmeny" (pole OdmenaPerson).
 * Měsíce se klíčují stringem "YYYY-MM". Částky jsou v Kč (hrubá odměna,
 * tedy "kolik od OnVision odejde" — odvody/daně řeší účetní).
 */

export const ODMENY_KEY = "ov-odmeny";

export type OdmenaTyp = "OSVČ" | "DPP";
export type OdmenaModel = "Paušál" | "Projekty" | "Ruční";

export interface OdmenaProjekt {
  nazev: string;
  castka: number;
}

export interface OdmenaMonth {
  /** model "Projekty" — jednotlivé projekty a jejich odměny za daný měsíc */
  projekty?: OdmenaProjekt[];
  /** model "Ruční" — částka zadaná ručně pro daný měsíc */
  rucni?: number;
  /** model "Paušál" — volitelné přepsání paušálu pro tento měsíc */
  pausalOverride?: number;
  /** odměna už byla vyplacena */
  vyplaceno?: boolean;
  /** mail s informací byl odeslán */
  mailOdeslan?: boolean;
  poznamka?: string;
}

export interface OdmenaPerson {
  id: number;
  jmeno: string;
  email: string;
  typ: OdmenaTyp;
  model: OdmenaModel;
  /** výchozí paušál (Kč/měsíc) — využije model "Paušál" */
  pausal: number;
  aktivni: boolean;
  /** data po měsících, klíč "YYYY-MM" */
  mesice: Record<string, OdmenaMonth>;
}

/* ── Měsíční klíče a štítky ─────────────────────────────────────────────── */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTHS_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_CS[(m ?? 1) - 1]} ${y}`;
}

/* ── Výpočet odměny osoby za daný měsíc ─────────────────────────────────── */
export function castkaZaMesic(p: OdmenaPerson, key: string): number {
  const m = p.mesice?.[key];
  switch (p.model) {
    case "Paušál":
      return m?.pausalOverride ?? p.pausal ?? 0;
    case "Projekty":
      return (m?.projekty ?? []).reduce((s, x) => s + (x.castka || 0), 0);
    case "Ruční":
      return m?.rucni ?? 0;
    default:
      return 0;
  }
}

/** Součet všech aktivních odměn za daný měsíc. */
export function celkemZaMesic(lidi: OdmenaPerson[], key: string): number {
  return lidi
    .filter((p) => p.aktivni)
    .reduce((s, p) => s + castkaZaMesic(p, key), 0);
}

/* ── Formátování ────────────────────────────────────────────────────────── */
export function fmtKc(n: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

/* ── Texty e-mailů ──────────────────────────────────────────────────────── */
/** Fakturační údaje OnVision pro výzvu k fakturaci. */
export const ONVISION_BILLING = {
  nazev: "OnVision s.r.o.",
  adresa: "Křenová 64/13, 602 00 Brno",
  ico: "23052341",
  dph: "Firma není plátce DPH",
  email: "fakturace@onvision.cz",
  splatnostDni: 14,
};

/**
 * Mail pro spolupracovníka na IČO (OSVČ) — VÝZVA K FAKTURACI.
 * Pro DPP se nepoužívá (DPP nefakturuje — jen evidence + CSV).
 */
export function mailProSpolupracovnika(p: OdmenaPerson, key: string) {
  const castka = castkaZaMesic(p, key);
  const obdobi = monthLabel(key);
  const m = p.mesice?.[key];
  const b = ONVISION_BILLING;

  const radky: string[] = [];
  if (p.model === "Projekty" && m?.projekty?.length) {
    for (const proj of m.projekty) radky.push(`• ${proj.nazev}: ${fmtKc(proj.castka)}`);
  }
  const rozpis = radky.length ? `\n\nRozpis:\n${radky.join("\n")}` : "";

  const text = `Ahoj ${p.jmeno},

za období ${obdobi} ti náleží odměna ve výši ${fmtKc(castka)}.${rozpis}

Prosím vystav na tuto částku fakturu na odběratele:
${b.nazev}
${b.adresa}
IČO: ${b.ico}
(${b.dph})

Fakturu prosím pošli na ${b.email}, splatnost ${b.splatnostDni} dní.

Děkujeme za spolupráci,
OnVision s.r.o.`;

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">
    <p>Ahoj <strong>${p.jmeno}</strong>,</p>
    <p>za období <strong>${obdobi}</strong> ti náleží odměna ve výši <strong>${fmtKc(castka)}</strong>.</p>
    ${radky.length ? `<p><strong>Rozpis:</strong></p><ul>${(m?.projekty ?? []).map((x) => `<li>${x.nazev}: ${fmtKc(x.castka)}</li>`).join("")}</ul>` : ""}
    <p>Prosím vystav na tuto částku fakturu na odběratele:</p>
    <p style="margin-left:8px">
      <strong>${b.nazev}</strong><br>${b.adresa}<br>IČO: ${b.ico}<br><span style="color:#666">${b.dph}</span>
    </p>
    <p>Fakturu prosím pošli na <a href="mailto:${b.email}">${b.email}</a>, splatnost ${b.splatnostDni} dní.</p>
    <p style="color:#666">Děkujeme za spolupráci,<br>OnVision s.r.o.</p>
  </div>`;

  return { subject: `Výzva k fakturaci — ${obdobi} (${fmtKc(castka)})`, text, html };
}

/** Souhrnný mail pro účetní / vedení — všechny odměny za měsíc. */
export function mailSouhrn(lidi: OdmenaPerson[], key: string) {
  const obdobi = monthLabel(key);
  const aktivni = lidi.filter((p) => p.aktivni && castkaZaMesic(p, key) > 0);
  const celkem = celkemZaMesic(lidi, key);

  const radkyText = aktivni
    .map((p) => `• ${p.jmeno} (${p.typ}): ${fmtKc(castkaZaMesic(p, key))}`)
    .join("\n");

  const radkyHtml = aktivni
    .map(
      (p) =>
        `<tr><td style="padding:4px 12px 4px 0">${p.jmeno}</td><td style="padding:4px 12px 4px 0;color:#666">${p.typ}</td><td style="padding:4px 0;text-align:right;font-weight:600">${fmtKc(castkaZaMesic(p, key))}</td></tr>`
    )
    .join("");

  const text = `Souhrn odměn za období ${obdobi}

${radkyText}

CELKEM: ${fmtKc(celkem)}

— OnVision OS`;

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">
    <p><strong>Souhrn odměn za období ${obdobi}</strong></p>
    <table style="border-collapse:collapse;font-size:14px">${radkyHtml}</table>
    <p style="margin-top:12px;font-size:16px"><strong>CELKEM: ${fmtKc(celkem)}</strong></p>
    <p style="color:#666">— OnVision OS</p>
  </div>`;

  return { subject: `Souhrn odměn ${obdobi} — OnVision s.r.o.`, text, html };
}
