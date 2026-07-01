/**
 * Gameplán — motivační plán posunu firmy (ne úkoly).
 * Iniciativy podle horizontu: Měsíc / Čtvrtletí / Rok. Data: "ov-gameplan".
 */
export const GAMEPLAN_KEY = "ov-gameplan";

export const HORIZONTY = ["Měsíc", "Čtvrtletí", "Rok"] as const;
export type Horizont = (typeof HORIZONTY)[number];

export interface Milnik { text: string; done: boolean }

export interface Initiative {
  id: number;
  nazev: string;
  popis: string;
  horizont: Horizont;
  milniky: Milnik[];
  hotovo: boolean;       // ruční „splněno" (i bez milníků)
  createdAt: string;
}

export function emptyInitiative(horizont: Horizont): Initiative {
  return { id: Date.now(), nazev: "", popis: "", horizont, milniky: [], hotovo: false, createdAt: new Date().toISOString() };
}

/** Postup 0–100 z milníků (nebo ruční „hotovo"). */
export function progress(i: Initiative): number {
  if (i.hotovo) return 100;
  if (!i.milniky.length) return 0;
  return Math.round(i.milniky.filter((m) => m.done).length / i.milniky.length * 100);
}

export function statusLabel(i: Initiative): string {
  const p = progress(i);
  return p >= 100 ? "Hotovo" : p > 0 ? "Probíhá" : "Plán";
}
