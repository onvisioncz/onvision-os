/**
 * Loajalita a hodnota klientů — jak dlouho u nás klient je (tenure) a kolik
 * nám za tu dobu přinesl (odhad LTV = MRR × počet měsíců spolupráce).
 *
 * `zacatek` je český tvar „Měsíc Rok" (např. „Červen 2025"). Čisté funkce.
 */

const CZ_MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

export interface TenureClient {
  name?: string;
  pausal?: number;
  reklama?: number;
  aktivni?: boolean;
  zacatek?: string;
}

/** "Červen 2025" → {year:2025, month:5} (0–11); nerozpoznané → null. */
export function parseCzMonthYear(raw?: string): { year: number; month: number } | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const m = s.match(/([a-zěščřžýáíéúůóďťň]+)\s+(\d{4})/i);
  if (!m) return null;
  const month = CZ_MONTHS.indexOf(m[1]);
  if (month < 0) return null;
  return { year: parseInt(m[2], 10), month };
}

/** Počet celých měsíců od začátku do `now` (min 1 pro aktivní vztah). */
export function tenureMonths(zacatek: string | undefined, now: Date): number {
  const p = parseCzMonthYear(zacatek);
  if (!p) return 0;
  const months = (now.getFullYear() - p.year) * 12 + (now.getMonth() - p.month);
  return Math.max(1, months + 1); // včetně rozjetého měsíce
}

const mrrOf = (c: TenureClient) => (c.pausal ?? 0) + (c.reklama ?? 0);

/** Odhad dosavadní hodnoty klienta = MRR × počet měsíců spolupráce. */
export function estimatedLtv(c: TenureClient, now: Date): number {
  return mrrOf(c) * tenureMonths(c.zacatek, now);
}

export interface TenureRow { name: string; mrr: number; mesicu: number; ltv: number }
export interface PortfolioTenure {
  clients: TenureRow[];            // aktivní klienti sestupně dle tenure
  prumerMesicu: number;            // průměrná délka spolupráce
  nejdeleClient: TenureRow | null; // nejloajálnější
  celkemLtv: number;              // součet odhadovaného LTV
}

/** Souhrn loajality a LTV napříč aktivními klienty. */
export function portfolioTenure(clients: TenureClient[], now: Date): PortfolioTenure {
  const active = (clients ?? []).filter((c) => c.aktivni !== false && !!c.name && mrrOf(c) > 0);
  const rows: TenureRow[] = active
    .map((c) => ({ name: c.name!, mrr: mrrOf(c), mesicu: tenureMonths(c.zacatek, now), ltv: estimatedLtv(c, now) }))
    .sort((a, b) => b.mesicu - a.mesicu);

  const withTenure = rows.filter((r) => r.mesicu > 0);
  const prumerMesicu = withTenure.length ? Math.round(withTenure.reduce((s, r) => s + r.mesicu, 0) / withTenure.length) : 0;
  const celkemLtv = rows.reduce((s, r) => s + r.ltv, 0);
  const nejdeleClient = rows[0] ?? null;

  return { clients: rows, prumerMesicu, nejdeleClient, celkemLtv };
}
