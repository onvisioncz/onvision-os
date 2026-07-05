/**
 * Týdenní výhled obsahu — SMM správci každý týden vyplní, co plánují pro své
 * klienty (typ příspěvku + popis). Jednatelům se to propíše (read-only, Adam
 * může opravit). Deadline: neděle 18:00. Kdo nevyplní, dostane push upomínku.
 *
 * Čisté funkce, plně testovatelné.
 */

export type PostTyp =
  | "video" | "foto" | "grafika" | "carousel" | "grid"
  | "recenze" | "reels" | "story" | "text" | "ostatní";

export const POST_TYPY: PostTyp[] = [
  "video", "foto", "grafika", "carousel", "grid", "recenze", "reels", "story", "text", "ostatní",
];

export interface OutlookEntry {
  id: number;
  weekKey: string;        // ISO týden "YYYY-Www"
  autorEmail: string;
  autorName: string;
  klient: string;
  typ: PostTyp;
  popis: string;
  createdAt: string;
}

/** Kdo výhled odevzdává. Klíč = "weekKey|email", hodnota = ISO čas odeslání. */
export type OutlookSubmits = Record<string, string>;

/** Správci, kterých se týdenní výhled týká (e-maily). Snadno rozšiřitelné. */
export const OUTLOOK_AUTHORS = [
  "zdenek@onvision.cz",
  "tereza@onvision.cz",
  "david@onvision.cz",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO 8601 číslo týdne + rok → "YYYY-Www" (týden začíná pondělím). */
export function isoWeekKey(d: Date): string {
  // kopie, ať nemutujeme vstup; přesun na čtvrtek daného ISO týdne
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;            // Ne=0 → 7
  date.setUTCDate(date.getUTCDate() + 4 - day); // čtvrtek
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}

/** Pondělí až neděle daného ISO týdne (lokální datumy). */
export function weekRange(weekKey: string): { from: Date; to: Date } | null {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]), week = Number(m[2]);
  // 4. leden je vždy v 1. ISO týdnu
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - day + 1);
  const from = new Date(week1Mon);
  from.setDate(week1Mon.getDate() + (week - 1) * 7);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from, to };
}

export const submitKey = (weekKey: string, email: string) => `${weekKey}|${email.toLowerCase()}`;

export interface AuthorStatus {
  email: string;
  entryCount: number;
  submitted: boolean;
  submittedAt: string | null;
}

/** Stav odevzdání per autor pro daný týden. */
export function outlookStatus(
  entries: OutlookEntry[],
  submits: OutlookSubmits,
  weekKey: string,
  authors: string[] = OUTLOOK_AUTHORS
): AuthorStatus[] {
  return authors.map((email) => {
    const e = email.toLowerCase();
    const entryCount = (entries ?? []).filter((x) => x.weekKey === weekKey && x.autorEmail.toLowerCase() === e).length;
    const submittedAt = (submits ?? {})[submitKey(weekKey, email)] ?? null;
    return { email, entryCount, submitted: !!submittedAt, submittedAt };
  });
}

/** Autoři, kteří pro daný týden ještě neodevzdali — vstup pro push upomínku. */
export function missingAuthors(
  entries: OutlookEntry[],
  submits: OutlookSubmits,
  weekKey: string,
  authors: string[] = OUTLOOK_AUTHORS
): string[] {
  return outlookStatus(entries, submits, weekKey, authors)
    .filter((s) => !s.submitted)
    .map((s) => s.email);
}

/**
 * Je „teď" po nedělní deadline 18:00 v Praze? Kontrola pro cron, aby
 * neupomínal před termínem (cron může běžet dřív kvůli UTC/DST posunu).
 */
export function pastSundayDeadline(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", weekday: "short", hour: "2-digit", hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return weekday === "Sun" && hour >= 18;
}
