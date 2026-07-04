/**
 * Upomínky k nezaplaceným fakturám — čisté generátory textu (plně testované).
 *
 * Audit hlásil, že chybí upomínky. Tohle NEODESÍLÁ e-maily — jen připraví
 * zdvořilý český text (předmět + prostý text + branded HTML), který si člověk
 * projde a odešle (mailto / kopie). Tón se stupňuje podle dní po splatnosti.
 */
import { brandedEmailHtml, accentChip, billingBox } from "./email/template";
import { fmtKc } from "./format";

export type UpominkaLevel = 1 | 2 | 3;

export interface UpominkaInput {
  cislo: string;
  klient: string;
  castka: number;
  dnuPoSplatnosti: number;
  datumSplatnosti?: string;
  iban?: string;
  vs?: string;
}

/** Úroveň upomínky dle dní po splatnosti: 1 do 14 dní, 2 do 30, 3 nad 30. */
export function upominkaLevel(dnuPoSplatnosti: number): UpominkaLevel {
  if (dnuPoSplatnosti > 30) return 3;
  if (dnuPoSplatnosti > 14) return 2;
  return 1;
}

const TITLES: Record<UpominkaLevel, string> = {
  1: "Připomenutí platby",
  2: "2. upomínka — nezaplacená faktura",
  3: "Poslední výzva k úhradě",
};

function bodyLines(inv: UpominkaInput, level: UpominkaLevel): string[] {
  const kc = fmtKc(inv.castka);
  const splat = inv.datumSplatnosti ? ` se splatností ${inv.datumSplatnosti}` : "";
  const intro: Record<UpominkaLevel, string> = {
    1: `dovolujeme si zdvořile připomenout, že evidujeme dosud neuhrazenou fakturu č. ${inv.cislo}${splat} na částku ${kc}. Je možné, že platba se právě míjí — pokud jste již uhradili, berte prosím tuto zprávu za bezpředmětnou.`,
    2: `upozorňujeme, že faktura č. ${inv.cislo} na částku ${kc} je již ${inv.dnuPoSplatnosti} dní po splatnosti. Prosíme o její brzkou úhradu.`,
    3: `faktura č. ${inv.cislo} na částku ${kc} je ${inv.dnuPoSplatnosti} dní po splatnosti a přes předchozí upomínky zůstává neuhrazena. Žádáme o okamžitou úhradu, jinak budeme nuceni přistoupit k dalším krokům.`,
  };
  const lines = [`Dobrý den,`, intro[level]];
  if (inv.iban || inv.vs) {
    const pay: string[] = [];
    if (inv.iban) pay.push(`Účet (IBAN): ${inv.iban}`);
    if (inv.vs) pay.push(`Variabilní symbol: ${inv.vs}`);
    pay.push(`Částka: ${kc}`);
    lines.push(pay.join("\n"));
  }
  lines.push(`Děkujeme za spolupráci a jsme s pozdravem,\nOnVision s.r.o.`);
  return lines;
}

export interface UpominkaOutput {
  level: UpominkaLevel;
  subject: string;
  text: string;
  html: string;
}

export function buildUpominka(inv: UpominkaInput, forceLevel?: UpominkaLevel): UpominkaOutput {
  const level = forceLevel ?? upominkaLevel(inv.dnuPoSplatnosti);
  const title = TITLES[level];
  const subject = `${title} — faktura ${inv.cislo}`;
  const lines = bodyLines(inv, level);
  const text = `${title}\n\n${lines.join("\n\n")}`;

  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeCislo = escapeHtml(inv.cislo);
  const bodyHtml = lines.map((l, i) => {
    // řádek s platebními údaji vykresli jako billing box
    if (l.includes("IBAN") || l.startsWith("Účet")) {
      return billingBox(l.split("\n").map(escapeHtml));
    }
    const html = escapeHtml(l).replace(/\n/g, "<br>");
    return `<p style="margin:0 0 14px;${i === 0 ? "" : ""}">${html}</p>`;
  }).join("");

  const html = brandedEmailHtml({
    preheader: `${title} — ${fmtKc(inv.castka)}`,
    heading: `${title} ${accentChip(safeCislo)}`,
    bodyHtml,
  });

  return { level, subject, text, html };
}
