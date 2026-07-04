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
