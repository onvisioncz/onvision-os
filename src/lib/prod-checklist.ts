/**
 * Pre-produkční checklist — šablony podle typu natáčení + výpočet postupu.
 *
 * Audit: chybí kontrola před natáčením (povolení, počasí, záložní lokace,
 * potvrzená technika, model release…). Tady jsou šablony, ze kterých se
 * vygeneruje odškrtávací seznam. Čisté funkce + data, plně testovatelné.
 */

export type ShootType = "studio" | "exterier" | "rozhovor" | "produkt" | "dron";
export type ChecklistCat = "pravni" | "bezpecnost" | "logistika" | "kreativa" | "technika";

export interface ChecklistItem {
  id: string;
  text: string;
  cat: ChecklistCat;
  done: boolean;
}

export interface Checklist {
  id: number;
  nazev: string;
  type: ShootType;
  datum?: string;
  createdAt: string;
  items: ChecklistItem[];
}

export const SHOOT_TYPES: { value: ShootType; label: string; emoji: string }[] = [
  { value: "studio", label: "Reklama / studio", emoji: "🎬" },
  { value: "exterier", label: "Exteriér / event", emoji: "🌤️" },
  { value: "rozhovor", label: "Rozhovor / testimonial", emoji: "🎙️" },
  { value: "produkt", label: "Produktové foto/video", emoji: "📦" },
  { value: "dron", label: "Dron / letecké", emoji: "🚁" },
];

export const CAT_LABEL: Record<ChecklistCat, string> = {
  pravni: "Právní",
  bezpecnost: "Bezpečnost",
  logistika: "Logistika",
  kreativa: "Kreativa",
  technika: "Technika",
};

// Společné položky pro každé natáčení
const COMMON: [string, ChecklistCat][] = [
  ["Potvrzený termín a čas srazu s klientem i crew", "logistika"],
  ["Call sheet rozeslaný všem", "logistika"],
  ["Potvrzená a rezervovaná technika (viz Technika)", "technika"],
  ["Nabité baterie + prázdné karty / záložní úložiště", "technika"],
  ["Schválený scénář / shot list / moodboard", "kreativa"],
  ["Doprava a parkování vyřešené", "logistika"],
];

const BY_TYPE: Record<ShootType, [string, ChecklistCat][]> = {
  studio: [
    ["Rezervace studia potvrzená", "logistika"],
    ["Světla, gripy a pozadí připravené", "technika"],
    ["Vizážista / stylista domluvený", "logistika"],
    ["Catering a občerstvení pro crew", "logistika"],
  ],
  exterier: [
    ["Předpověď počasí zkontrolovaná (a den před)", "bezpecnost"],
    ["Záložní vnitřní lokace pro nepřízeň počasí", "logistika"],
    ["Povolení k natáčení na lokaci / zábor", "pravni"],
    ["Pojištění a lékárnička na place", "bezpecnost"],
    ["Přístup k elektřině / záložní baterie", "technika"],
  ],
  rozhovor: [
    ["Potvrzený respondent + náhradní termín", "logistika"],
    ["Otázky odsouhlasené klientem", "kreativa"],
    ["Tichá místnost (bez ruchů, klima, telefonů)", "technika"],
    ["Klopové mikrofony + záložní zvuk", "technika"],
    ["Souhlas se zpracováním obrazu (model release)", "pravni"],
  ],
  produkt: [
    ["Produkty fyzicky k dispozici a čisté", "logistika"],
    ["Reference / packshot brief od klienta", "kreativa"],
    ["Makro / produktová optika a stativ", "technika"],
    ["Light box / pozadí / rekvizity", "technika"],
  ],
  dron: [
    ["Pilot s platnou licencí (EU A1/A3/A2)", "pravni"],
    ["Registrace letu / povolení v dané zóně (ÚCL/dronview)", "pravni"],
    ["Kontrola bezletové zóny a počasí (vítr, srážky)", "bezpecnost"],
    ["Pojištění odpovědnosti za provoz dronu", "pravni"],
    ["Nabité baterie dronu + kontrola vrtulí", "technika"],
  ],
};

/** Vytvoří čerstvý checklist (všechny položky nezaškrtnuté). */
export function buildChecklist(type: ShootType, nazev: string, id: number, createdAt: string): Checklist {
  const rows = [...(BY_TYPE[type] ?? []), ...COMMON];
  const items: ChecklistItem[] = rows.map(([text, cat], i) => ({
    id: `${type}-${i}`,
    text,
    cat,
    done: false,
  }));
  return { id, nazev: nazev || SHOOT_TYPES.find((t) => t.value === type)?.label || "Natáčení", type, createdAt, items };
}

/** Postup odškrtávání. */
export function checklistProgress(items: ChecklistItem[]): { done: number; total: number; pct: number } {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Kolik kritických (právní/bezpečnost) položek zbývá. */
export function criticalRemaining(items: ChecklistItem[]): number {
  return items.filter((i) => !i.done && (i.cat === "pravni" || i.cat === "bezpecnost")).length;
}
