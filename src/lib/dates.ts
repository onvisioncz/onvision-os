/**
 * Sdílené parsování a formátování termínů. Úkoly vznikají z více zdrojů
 * (ruční "25. 5.", quick-add / Telegram "2026-05-29"), takže parser musí
 * zvládnout český i ISO zápis. Zobrazujeme vždy česky.
 */

/** "25. 5." / "25. 5. 2026" / "2026-05-25" → Date, jinak null. */
export function parseDeadline(str: string): Date | null {
  if (!str) return null;
  // ISO: YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  // Česky: D. M. [RRRR]
  const m = str.match(/(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(\d{4}))?/);
  if (!m) return null;
  const d = new Date(m[3] ? +m[3] : new Date().getFullYear(), +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

/** Celé dny od dneška (záporné = po termínu). */
export function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Kontrola, že český zápis data existuje v kalendáři.
 * "31.6.2026" JS tiše přeteče na 1.7. — tady to odhalíme porovnáním dne.
 */
export function isValidCzDate(str: string): boolean {
  const m = (str || "").match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (!m) return false;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 && d.getFullYear() === +m[3];
}

/** Zobrazení termínu vždy česky: "25. 5." (jiný rok → "25. 5. 2027"). */
export function fmtDeadline(str: string): string {
  const d = parseDeadline(str);
  if (!d) return str;
  const base = `${d.getDate()}. ${d.getMonth() + 1}.`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
