/**
 * Klient Health Score — jedno číslo 0–100, které řekne, o koho je potřeba
 * pečovat, dřív než odejde. Kombinuje tři signály z dat, která už máme:
 *
 *   Platby (45 %)   — kolik peněz je po splatnosti vůči měsíčnímu paušálu
 *   Dodávky (30 %)  — kolik měsíčních deliverables je hotových
 *   Aktivita (25 %) — kolik alokovaných hodin se skutečně odpracovalo
 *
 * Čistá funkce → plně testovatelná, žádné side-effecty.
 */

export interface HealthDeliverable { done: boolean }
export interface HealthClient {
  name: string;
  pausal?: number;
  reklama?: number;
  aktivni?: boolean;
  deliverables?: HealthDeliverable[];
  hodinMesic?: number;
  hodinOdpracovano?: number;
}

export interface HealthFactor { key: "platby" | "dodavky" | "aktivita"; label: string; score: number; note: string }
export interface HealthResult {
  score: number;               // 0–100
  band: "zdravý" | "ok" | "riziko";
  color: string;
  factors: HealthFactor[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * @param overdueSum  součet částek po splatnosti pro daného klienta (z faktur)
 */
export function clientHealth(c: HealthClient, overdueSum: number): HealthResult {
  const mrr = (c.pausal ?? 0) + (c.reklama ?? 0);

  // ── Platby: 100 když nic po splatnosti; klesá s poměrem dluhu k MRR ──
  let platby = 100;
  let platbyNote = "vše zaplaceno";
  if (overdueSum > 0) {
    const ratio = mrr > 0 ? overdueSum / mrr : 1; // bez MRR bereme dluh jako plný
    platby = clamp(100 - ratio * 70); // 1 měsíc dluhu ≈ −70 bodů
    platbyNote = `${Math.round(overdueSum).toLocaleString("cs-CZ")} Kč po splatnosti`;
  }

  // ── Dodávky: podíl hotových deliverables tento měsíc ──
  const delivs = c.deliverables ?? [];
  let dodavky: number;
  let dodavkyNote: string;
  if (delivs.length === 0) {
    dodavky = 80; // nic nedefinováno → neutrální, mírně pozitivní
    dodavkyNote = "žádné deliverables";
  } else {
    const done = delivs.filter((d) => d.done).length;
    dodavky = clamp((done / delivs.length) * 100);
    dodavkyNote = `${done}/${delivs.length} hotovo`;
  }

  // ── Aktivita: odpracované / alokované hodiny ──
  let aktivita: number;
  let aktivitaNote: string;
  if (!c.hodinMesic || c.hodinMesic <= 0) {
    aktivita = 75; // nesledované hodiny → neutrální
    aktivitaNote = "hodiny nesledovány";
  } else {
    const pct = (c.hodinOdpracovano ?? 0) / c.hodinMesic;
    aktivita = clamp(pct * 100);
    aktivitaNote = `${Math.round(pct * 100)} % alokace`;
  }

  const score = clamp(platby * 0.45 + dodavky * 0.3 + aktivita * 0.25);
  const band: HealthResult["band"] = score >= 80 ? "zdravý" : score >= 60 ? "ok" : "riziko";
  const color = band === "zdravý" ? "oklch(0.7 0.17 155)" : band === "ok" ? "oklch(0.78 0.16 75)" : "oklch(0.62 0.24 25)";

  return {
    score,
    band,
    color,
    factors: [
      { key: "platby", label: "Platby", score: platby, note: platbyNote },
      { key: "dodavky", label: "Dodávky", score: dodavky, note: dodavkyNote },
      { key: "aktivita", label: "Aktivita", score: aktivita, note: aktivitaNote },
    ],
  };
}
