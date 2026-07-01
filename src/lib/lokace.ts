/**
 * Databáze lokací — místa k natáčení s ukázkami, sdílitelné klientům.
 * Data v app_data: "ov-lokace". Veřejná galerie/detail na /l/[publicId].
 */
export { newPublicId } from "@/lib/delivery";

export const LOKACE_KEY = "ov-lokace";
export const LOKACE_TYPY = ["Exteriér", "Interiér", "Studio", "Příroda", "Město", "Sport", "Industriál", "Ostatní"] as const;
export type LokaceTyp = (typeof LOKACE_TYPY)[number];

export interface Location {
  id: number;
  publicId: string;
  nazev: string;
  typ: LokaceTyp;
  adresa: string;
  popis: string;
  tags: string;        // čárkami oddělené
  previews: string[];  // URL náhledů (pár v CRM)
  driveUrl: string;    // odkaz na víc ukázek
  verejne: boolean;    // zobrazit ve veřejné galerii pro klienty
  createdAt: string;
}

export function mapsLink(adresa: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresa)}`;
}
