/**
 * Cashflow forecast — čistá, testovatelná projekce zůstatku na N měsíců.
 *
 * Dřív žila logika inline v cashflow/page.tsx. Vytažením do libu jde
 * otestovat a hlavně přidat scénáře typu „co když klient odejde" bez
 * duplikace výpočtu.
 */

export interface ForecastMonth {
  key: string;      // "YYYY-MM"
  label: string;
  prijmy: number;
  vydaje: number;
  net: number;
  zustatek: number;
}

export interface ForecastParams {
  startBalance: number;
  retainerIncome: number;          // opakující se měsíční příjem (paušály + reklama)
  monthlyExpenses: number;         // opakující se měsíční výdaje (odměny + předplatné)
  receivablesByMonth: Map<string, number>; // jednorázové pohledávky dle měsíce splatnosti
  months: number;
  /** Základ pro měsíce (default teď). Injektovatelné kvůli testům. */
  from: Date;
  monthKey: (d: Date) => string;
  monthLabel: (key: string) => string;
}

export function buildForecast(p: ForecastParams): ForecastMonth[] {
  let running = p.startBalance;
  return Array.from({ length: p.months }, (_, i) => {
    const d = new Date(p.from.getFullYear(), p.from.getMonth() + i, 1);
    const key = p.monthKey(d);
    const prijmy = p.retainerIncome + (p.receivablesByMonth.get(key) ?? 0);
    const vydaje = p.monthlyExpenses;
    const net = prijmy - vydaje;
    running += net;
    return { key, label: p.monthLabel(key), prijmy, vydaje, net, zustatek: running };
  });
}

/** Nejnižší zůstatek napříč projekcí (vč. startu) — indikátor cash gapu. */
export function minBalance(forecast: ForecastMonth[], startBalance: number): number {
  return Math.min(...forecast.map((f) => f.zustatek), startBalance);
}

/**
 * Dopad odchodu klienta: o kolik klesne měsíční příjem a jak se změní
 * nejnižší zůstatek za horizont, když daný retainer přestane platit.
 */
export function departureImpact(
  base: ForecastParams,
  lostMonthlyMrr: number
): { withClient: number; withoutClient: number; deltaMin: number } {
  const withClient = minBalance(buildForecast(base), base.startBalance);
  const withoutClient = minBalance(
    buildForecast({ ...base, retainerIncome: base.retainerIncome - lostMonthlyMrr }),
    base.startBalance
  );
  return { withClient, withoutClient, deltaMin: withoutClient - withClient };
}
