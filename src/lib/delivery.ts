/**
 * Delivery — veřejný sdílený odkaz pro klienta (bez loginu do CRM).
 * Data v app_data: "ov-deliveries". Veřejná stránka na /d/[publicId].
 */
export const DELIVERY_KEY = "ov-deliveries";

export interface Delivery {
  id: number;
  publicId: string;   // token v URL
  klient: string;
  nazev: string;      // název zakázky
  popis: string;      // zpráva pro klienta
  driveUrl: string;   // odkaz ke stažení (Drive / WeTransfer)
  previews: string[]; // URL náhledových obrázků
  createdAt: string;
  views: number;
}

/** Náhodný token do veřejné URL. */
export function newPublicId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}
