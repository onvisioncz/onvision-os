/**
 * Ziskovost na klienta — model a pomocníci.
 *
 * Příjmy se počítají automaticky z vydaných faktur (ov-issued-invoices).
 * Náklady se evidují ručně per klient (ov-client-costs) — agentura zná
 * subdodávky/odměny/techniku na konkrétního klienta. Zisk = příjmy − náklady.
 */
export const CLIENT_COSTS_KEY = "ov-client-costs";

export const COST_TYPY = ["Odměny", "Subdodávka", "Technika", "Licence", "Ostatní"] as const;
export type CostTyp = (typeof COST_TYPY)[number];

export interface ClientCost {
  id: number;
  klient: string;
  rok: number;
  typ: CostTyp;
  popis: string;
  castka: number;
}

export interface InvoiceLite {
  klient: string;
  castka: number;
  datumVystaveni: string;
  rokSluzby: number;
  stav: string; // "Zaplacena" | "Čeká na platbu"
}

export { fmtKc } from "./format";

/** Efektivní rok faktury: rokSluzby, jinak rok z data vystavení. */
export function invoiceYear(inv: InvoiceLite): number {
  if (inv.rokSluzby && inv.rokSluzby > 1900) return inv.rokSluzby;
  const m = (inv.datumVystaveni || "").match(/(\d{4})/);
  return m ? Number(m[1]) : 0;
}

export interface ClientProfit {
  klient: string;
  prijmy: number;
  naklady: number;
  zisk: number;
  marze: number; // %
}

/** Sestaví ziskovost per klient pro daný rok. */
export function buildProfit(
  invoices: InvoiceLite[],
  costs: ClientCost[],
  rok: number,
  jenZaplacene: boolean,
  /** volitelný náklad práce (z výkazů) per klient — přičte se k nákladům */
  labor?: Map<string, number>
): ClientProfit[] {
  const rev = new Map<string, number>();
  for (const inv of invoices) {
    if (invoiceYear(inv) !== rok) continue;
    if (jenZaplacene && inv.stav !== "Zaplacena") continue;
    if (!inv.klient) continue;
    rev.set(inv.klient, (rev.get(inv.klient) ?? 0) + (inv.castka || 0));
  }

  const cost = new Map<string, number>();
  for (const c of costs) {
    if (c.rok !== rok || !c.klient) continue;
    cost.set(c.klient, (cost.get(c.klient) ?? 0) + (c.castka || 0));
  }

  const clients = new Set<string>([...rev.keys(), ...cost.keys(), ...(labor?.keys() ?? [])]);
  const rows: ClientProfit[] = [];
  for (const klient of clients) {
    const prijmy = rev.get(klient) ?? 0;
    const naklady = (cost.get(klient) ?? 0) + (labor?.get(klient) ?? 0);
    const zisk = prijmy - naklady;
    const marze = prijmy > 0 ? (zisk / prijmy) * 100 : (naklady > 0 ? -100 : 0);
    rows.push({ klient, prijmy, naklady, zisk, marze });
  }
  return rows.sort((a, b) => b.zisk - a.zisk);
}
