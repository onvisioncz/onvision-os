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
  expiresAt?: string | null; // ISO — po tomto datu odkaz nefunguje (null/undefined = navždy)
  accessLog?: string[];      // ISO časy zobrazení (posledních MAX_ACCESS_LOG)
}

export const MAX_ACCESS_LOG = 100;

/** Možnosti expirace v UI. */
export const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: "7 dní", days: 7 },
  { label: "30 dní", days: 30 },
  { label: "90 dní", days: 90 },
  { label: "Bez expirace", days: null },
];

/** Spočítá ISO datum expirace za N dní (null = bez expirace). */
export function expiryFromDays(days: number | null, from = new Date()): string | null {
  if (days == null) return null;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

/** Je delivery po expiraci? */
export function isExpired(d: Pick<Delivery, "expiresAt">, now = Date.now()): boolean {
  if (!d.expiresAt) return false;
  const t = Date.parse(d.expiresAt);
  return Number.isFinite(t) && t < now;
}

/**
 * Náhodný token do veřejné URL (delivery i klientský share).
 *
 * Bezpečnostní oprava: Math.random() je nekryptografický PRNG (V8 xorshift128+) —
 * s dostatkem vzorků z jiných volání jde jeho vnitřní stav rekonstruovat a další
 * výstupy predikovat. Tenhle token přitom chrání neveřejná data (faktury,
 * schvalování, komentáře klienta) bez přihlášení, takže musí být kryptograficky
 * bezpečný. crypto.randomUUID() je dostupné v prohlížeči (secure context / HTTPS)
 * i v Node.js runtime; odstraníme jen pomlčky, ať je token kompaktnější v URL.
 */
export function newPublicId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
