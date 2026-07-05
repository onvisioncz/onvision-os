/**
 * Evidence smluv a dohod (DPP/DPČ/smlouvy o dílo/NDA…) — s hlídáním doby
 * platnosti. Jedno místo, kde je vidět, s kým máme co podepsané a co brzy
 * vyprší. Čisté funkce, plně testovatelné.
 */

export type ContractStrana = "klient" | "freelancer" | "dodavatel" | "jiné";
export type ContractTyp =
  | "Smlouva o dílo" | "DPP" | "DPČ" | "Rámcová smlouva" | "NDA" | "Licenční" | "Jiné";
export type ContractStav = "aktivní" | "návrh" | "ukončená";

export const CONTRACT_TYPY: ContractTyp[] = [
  "Smlouva o dílo", "DPP", "DPČ", "Rámcová smlouva", "NDA", "Licenční", "Jiné",
];
export const CONTRACT_STRANY: ContractStrana[] = ["klient", "freelancer", "dodavatel", "jiné"];

export interface Contract {
  id: number;
  strana: ContractStrana;
  nazev: string;          // koho se týká (klient / jméno freelancera / dodavatel)
  typ: ContractTyp;
  od: string;             // ISO YYYY-MM-DD (platnost od)
  do?: string;            // ISO YYYY-MM-DD (platnost do; prázdné = na dobu neurčitou)
  castka?: number;        // hodnota / měsíční sazba (volitelné)
  stav: ContractStav;
  soubor?: string;        // odkaz na PDF / úložiště
  poznamka?: string;
  createdAt?: string;
}

export type ExpiryBand = "neurčito" | "platná" | "brzy" | "vypršela" | "neaktivní";

export interface ExpiryInfo {
  band: ExpiryBand;
  daysLeft: number | null;   // null = na dobu neurčitou / bez data
  label: string;
}

const DAY = 86_400_000;

/**
 * Stav platnosti smlouvy vůči „dnešku". `soonDays` = kolik dní předem
 * považujeme za „brzy vyprší" (default 30).
 */
export function expiryInfo(c: Contract, today: Date, soonDays = 30): ExpiryInfo {
  if (c.stav === "ukončená") return { band: "neaktivní", daysLeft: null, label: "ukončená" };
  if (c.stav === "návrh")     return { band: "neaktivní", daysLeft: null, label: "návrh" };
  if (!c.do) return { band: "neurčito", daysLeft: null, label: "na dobu neurčitou" };

  const end = Date.parse(c.do + "T00:00:00Z");
  const now = Date.parse(today.toISOString().slice(0, 10) + "T00:00:00Z");
  if (!Number.isFinite(end)) return { band: "neurčito", daysLeft: null, label: "bez platného data" };

  const daysLeft = Math.round((end - now) / DAY);
  if (daysLeft < 0)         return { band: "vypršela", daysLeft, label: `vypršela před ${Math.abs(daysLeft)} dny` };
  if (daysLeft <= soonDays) return { band: "brzy", daysLeft, label: daysLeft === 0 ? "vyprší dnes" : `vyprší za ${daysLeft} dní` };
  return { band: "platná", daysLeft, label: `platná ještě ${daysLeft} dní` };
}

/** Smlouvy, které brzy vyprší nebo už vypršely (pro upozornění / self-check). */
export function expiringContracts(contracts: Contract[], today: Date, soonDays = 30): Array<Contract & { expiry: ExpiryInfo }> {
  return (contracts ?? [])
    .map((c) => ({ ...c, expiry: expiryInfo(c, today, soonDays) }))
    .filter((c) => c.expiry.band === "brzy" || c.expiry.band === "vypršela")
    .sort((a, b) => (a.expiry.daysLeft ?? 0) - (b.expiry.daysLeft ?? 0));
}

export interface ContractSummary { celkem: number; aktivnich: number; brzy: number; vyprsele: number }

export function contractSummary(contracts: Contract[], today: Date, soonDays = 30): ContractSummary {
  let aktivnich = 0, brzy = 0, vyprsele = 0;
  for (const c of contracts ?? []) {
    const e = expiryInfo(c, today, soonDays);
    if (c.stav === "aktivní") aktivnich++;
    if (e.band === "brzy") brzy++;
    if (e.band === "vypršela") vyprsele++;
  }
  return { celkem: (contracts ?? []).length, aktivnich, brzy, vyprsele };
}
