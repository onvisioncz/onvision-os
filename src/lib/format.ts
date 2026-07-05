/**
 * Sdílené formátovače — jeden zdroj pravdy.
 * Dřív byl fmtKc duplikovaný v odmeny.ts i ziskovost.ts.
 */

/** Částka v Kč bez desetinných míst: 12 345 Kč */
export function fmtKc(n: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

/** Číslo s tisícovými mezerami: 12 345 */
export function fmtNum(n: number): string {
  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(n || 0);
}

/**
 * Escapuje text před vložením do HTML e-mailu/reportu.
 * Jakékoli jméno/název editovatelné uživatelem (jméno kolegy, název projektu,
 * poznámka…) musí projít tímhle dřív, než skončí v `bodyHtml` — jinak jde
 * o stored-XSS v e-mailovém klientovi příjemce.
 */
export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
