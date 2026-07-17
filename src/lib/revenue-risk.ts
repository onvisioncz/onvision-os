/**
 * Koncentrace obratu — jak moc firma visí na jednom klientovi.
 *
 * Když jeden klient dělá velkou část MRR, jeho odchod bolí nejvíc. Tahle
 * knihovna spočítá podíl největšího klienta, top 3 a Herfindahlův index
 * (HHI) jako míru koncentrace. Čisté funkce, plně testovatelné.
 */

export interface RevenueClient {
  name?: string;
  pausal?: number;
  reklama?: number;
  aktivni?: boolean;
}

export interface ClientShare { name: string; mrr: number; share: number } // share 0–100

export interface ConcentrationResult {
  totalMrr: number;
  clients: ClientShare[];        // aktivní klienti seřazení sestupně dle MRR
  topClient: ClientShare | null;
  topShare: number;              // podíl největšího klienta (0–100)
  top3Share: number;             // podíl top 3 (0–100)
  hhi: number;                   // Herfindahlův index (0–10000)
  band: "zdravé" | "pozor" | "riziko";
}

const mrrOf = (c: RevenueClient) => (c.pausal ?? 0) + (c.reklama ?? 0);

/**
 * Spočítá koncentraci obratu z aktivních paušálních klientů.
 * band: riziko když jeden klient ≥ 40 %, pozor při ≥ 25 %, jinak zdravé.
 */
export function clientConcentration(clients: RevenueClient[]): ConcentrationResult {
  const active = (clients ?? []).filter((c) => c.aktivni !== false && !!c.name && mrrOf(c) > 0);
  const totalMrr = active.reduce((s, c) => s + mrrOf(c), 0);

  const shares: ClientShare[] = active
    .map((c) => ({ name: c.name!, mrr: mrrOf(c), share: totalMrr > 0 ? (mrrOf(c) / totalMrr) * 100 : 0 }))
    .sort((a, b) => b.mrr - a.mrr);

  const topClient = shares[0] ?? null;
  const topShare = topClient?.share ?? 0;
  const top3Share = shares.slice(0, 3).reduce((s, c) => s + c.share, 0);
  // HHI = Σ (podíl v %)²  → 10000 = monopol (1 klient), nízké = rozloženo.
  const hhi = Math.round(shares.reduce((s, c) => s + c.share * c.share, 0));

  const band: ConcentrationResult["band"] = topShare >= 40 ? "riziko" : topShare >= 25 ? "pozor" : "zdravé";

  return { totalMrr, clients: shares, topClient, topShare, top3Share, hhi, band };
}
