/**
 * Call sheet (produkční list) — datový model a pomocníci.
 * Ukládá se do app_data pod klíčem "ov-call-sheets".
 */
export const CALLSHEET_KEY = "ov-call-sheets";

export type ShootTyp = "VIDEO" | "FOTO" | "VIDEO + FOTO" | "BTS" | "REKLAMA";
export type CallStatus = "Plán" | "Potvrzeno" | "Hotovo";

export interface CrewMember { jmeno: string; role: string; prichod: string; }
export interface RentalItem { nazev: string; odkud: string; cena: string; vraceni: string; }
export interface ScheduleBlock { cas: string; co: string; }
export interface TalentItem { jmeno: string; kontakt: string; }

export interface CallSheet {
  id: number;
  nazev: string;
  klient: string;
  datum: string;          // "D. M. YYYY" nebo volný text
  typ: ShootTyp;
  status: CallStatus;

  // čas & místo
  casSrazu: string;
  konec: string;
  adresa: string;
  sraz: string;           // sraz / parkování
  kontaktMisto: string;   // kontakt na místě (jméno + tel)

  // tým
  crew: CrewMember[];
  talent: TalentItem[];
  klientPritomen: boolean;

  // technika
  technika: string;             // vlastní technika (volný seznam)
  pujcenaTechnika: RentalItem[]; // půjčená technika

  // plán
  harmonogram: ScheduleBlock[];
  shotList: string;

  // podmínky (venku / sport)
  pocasi: string;
  golden: string;         // východ / západ slunce
  planB: string;          // náhradní plán při dešti

  // logistika
  catering: string;
  rekvizity: string;
  dressCode: string;
  doprava: string;

  // ostatní
  moodboard: string;
  deadlineVystup: string;
  poznamka: string;
}

export const SHOOT_TYPY: ShootTyp[] = ["VIDEO", "FOTO", "VIDEO + FOTO", "BTS", "REKLAMA"];
export const CALL_STATUSY: CallStatus[] = ["Plán", "Potvrzeno", "Hotovo"];

export function emptyCallSheet(id: number): CallSheet {
  return {
    id, nazev: "", klient: "", datum: "", typ: "VIDEO", status: "Plán",
    casSrazu: "", konec: "", adresa: "", sraz: "", kontaktMisto: "",
    crew: [], talent: [], klientPritomen: false,
    technika: "", pujcenaTechnika: [],
    harmonogram: [], shotList: "",
    pocasi: "", golden: "", planB: "",
    catering: "", rekvizity: "", dressCode: "", doprava: "",
    moodboard: "", deadlineVystup: "", poznamka: "",
  };
}

/** Odkaz na Google Maps pro danou adresu. */
export function mapsLink(adresa: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresa)}`;
}

/** Pole, která AI umí vyplnit z volného textu (pro system prompt). */
export const AI_FILLABLE_FIELDS = [
  "nazev", "klient", "datum", "typ", "casSrazu", "konec", "adresa", "sraz",
  "kontaktMisto", "crew", "talent", "technika", "pujcenaTechnika",
  "harmonogram", "shotList", "pocasi", "golden", "planB", "catering",
  "rekvizity", "dressCode", "doprava", "moodboard", "deadlineVystup", "poznamka",
] as const;
