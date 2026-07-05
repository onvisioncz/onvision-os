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

/**
 * Lehký sanitizer pro HTML, které SMÍ obsahovat formátování (např. výstup
 * AI, který má vrátit HTML fragment), ale nesmí spustit skript. Odstraní
 * nebezpečné tagy, event-handler atributy (on*) a javascript:/data: URL.
 * NEnahrazuje escapeHtml pro čistě textová pole — tam vždy escapuj.
 */
export function sanitizeHtml(s: string): string {
  return String(s ?? "")
    // celé nebezpečné bloky i s obsahem
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    // osamocené otevírací nebezpečné tagy (bez uzavření)
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base)\b[^>]*>/gi, "")
    // event-handler atributy: onclick=, onerror=, onload=…
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // javascript: / data: v href/src
    .replace(/(href|src)\s*=\s*("|')?\s*(javascript|data)\s*:/gi, "$1=$2#");
}
