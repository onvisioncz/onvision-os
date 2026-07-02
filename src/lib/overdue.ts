/**
 * Jediný zdroj pravdy pro "faktury po splatnosti".
 *
 * Faktury žijí ve dvou skladech: ov-issued-invoices (generátor Fakturace,
 * pole datumSplatnosti) a ov-finance-faktury (evidence ve Finance, pole
 * splatnost). Upozornění četla jen Finance, Nervové centrum jen Fakturaci,
 * takže každé místo hlásilo jiná čísla. Tady se oba sklady sloučí a
 * deduplikují podle čísla faktury.
 */
import { parseDeadline, daysUntil } from "./dates";

export interface AnyInvoice {
  cislo?: string;
  klient?: string;
  klientNazev?: string;
  castka?: number;
  stav?: string;
  splatnost?: string;       // ov-finance-faktury
  datumSplatnosti?: string; // ov-issued-invoices
}

export interface OverdueItem { cislo: string; klient: string; castka: number; dnuPoSplatnosti: number }

export function overdueInvoices(...sources: AnyInvoice[][]): { count: number; total: number; items: OverdueItem[] } {
  const seen = new Set<string>();
  const items: OverdueItem[] = [];
  for (const list of sources) {
    for (const inv of list ?? []) {
      const stav = inv.stav ?? "";
      if (stav === "Zaplacena" || stav === "Storno") continue;
      const d = parseDeadline(inv.datumSplatnosti ?? inv.splatnost ?? "");
      if (!d) continue;
      const days = daysUntil(d);
      if (days >= 0) continue; // splatnost dnes/v budoucnu = ještě nehoří
      const key = (inv.cislo || `${inv.klient ?? ""}|${inv.castka ?? 0}`).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        cislo: inv.cislo ?? "",
        klient: inv.klientNazev ?? inv.klient ?? "?",
        castka: inv.castka ?? 0,
        dnuPoSplatnosti: Math.abs(days),
      });
    }
  }
  items.sort((a, b) => b.castka - a.castka);
  return { count: items.length, total: items.reduce((s, i) => s + i.castka, 0), items };
}
