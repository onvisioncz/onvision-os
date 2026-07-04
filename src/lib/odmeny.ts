/**
 * Modul odměn — datový model, výpočty a texty e-mailů.
 *
 * Ukládá se do app_data pod klíčem "ov-odmeny" (pole OdmenaPerson).
 * Měsíce se klíčují stringem "YYYY-MM". Částky jsou v Kč (hrubá odměna,
 * tedy "kolik od OnVision odejde" — odvody/daně řeší účetní).
 */

import { brandedEmailHtml, accentChip, billingBox } from "@/lib/email/template";
import { fmtKc } from "./format";

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

/* ── Formátování (jeden zdroj pravdy v lib/format) ──────────────────────── */
export { fmtKc };

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

  const bodyHtml = `
    <p style="margin:0 0 14px;">Ahoj <strong style="color:#fff;">${p.jmeno}</strong>,</p>
    <p style="margin:0 0 14px;">za období <strong style="color:#fff;">${obdobi}</strong> ti náleží odměna ve výši ${accentChip(fmtKc(castka))}.</p>
    ${radky.length ? `<p style="margin:0 0 6px;">Rozpis:</p><ul style="margin:0 0 14px;padding-left:18px;">${(m?.projekty ?? []).map((x) => `<li>${x.nazev}: ${fmtKc(x.castka)}</li>`).join("")}</ul>` : ""}
    <p style="margin:0 0 4px;">Prosím vystav na tuto částku fakturu na odběratele:</p>
    ${billingBox([`<strong style="color:#fff;">${b.nazev}</strong>`, b.adresa, `IČO: ${b.ico}`, b.dph])}
    <p style="margin:14px 0 0;">Fakturu prosím pošli na <a href="mailto:${b.email}" style="color:#5B5EFF;text-decoration:none;">${b.email}</a>, splatnost ${b.splatnostDni} dní.</p>
    <p style="margin:18px 0 0;">Děkujeme za spolupráci.</p>`;

  const html = brandedEmailHtml({
    preheader: `Výzva k fakturaci za ${obdobi} — ${fmtKc(castka)}`,
    heading: `Výzva k fakturaci · ${obdobi}`,
    bodyHtml,
  });

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
        `<tr>
          <td style="padding:7px 12px 7px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#fff;">${p.jmeno}</td>
          <td style="padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);">${p.typ}</td>
          <td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;font-weight:600;color:#fff;">${fmtKc(castkaZaMesic(p, key))}</td>
        </tr>`
    )
    .join("");

  const text = `Souhrn odměn za období ${obdobi}

${radkyText}

CELKEM: ${fmtKc(celkem)}

— OnVision OS`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Přehled odměn za období <strong style="color:#fff;">${obdobi}</strong> (OSVČ i DPP):</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">${radkyHtml}</table>
    <p style="margin:16px 0 0;font-size:16px;">Celkem odejde: ${accentChip(fmtKc(celkem))}</p>`;

  const html = brandedEmailHtml({
    preheader: `Souhrn odměn ${obdobi} — celkem ${fmtKc(celkem)}`,
    heading: `Souhrn odměn · ${obdobi}`,
    bodyHtml,
  });

  return { subject: `Souhrn odměn ${obdobi} — OnVision s.r.o.`, text, html };
}
