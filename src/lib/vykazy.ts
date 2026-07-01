/**
 * Výkazy hodin — hodiny per projekt/klient. Data v app_data: "ov-time-entries".
 * Krmí přehled o vytížení a podklady pro Ziskovost / odměny „podle projektů".
 */
export const TIME_KEY = "ov-time-entries";

export interface TimeEntry {
  id: number;
  kdo: string;
  klient: string;
  projekt: string;
  datum: string;   // YYYY-MM-DD
  hodiny: number;
  popis: string;
}

export function monthPrefix(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const CS_MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
export function monthLabel(prefix: string): string {
  const [y, m] = prefix.split("-").map(Number);
  return `${CS_MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function fmtHod(n: number): string {
  return `${(n || 0).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} h`;
}

/** Součet hodin per klíč (klient/osoba/projekt) pro daný měsíc. */
export function sumBy(entries: TimeEntry[], month: string, key: "klient" | "kdo" | "projekt"): { name: string; hodiny: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.datum.startsWith(month)) continue;
    const k = e[key] || "—";
    map.set(k, (map.get(k) ?? 0) + (e.hodiny || 0));
  }
  return [...map.entries()].map(([name, hodiny]) => ({ name, hodiny })).sort((a, b) => b.hodiny - a.hodiny);
}
