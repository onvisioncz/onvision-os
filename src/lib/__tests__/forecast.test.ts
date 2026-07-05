import { describe, it, expect } from "vitest";
import { buildForecast, minBalance, departureImpact, type ForecastParams } from "../forecast";

const mk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const label = (k: string) => k;

function base(overrides: Partial<ForecastParams> = {}): ForecastParams {
  return {
    startBalance: 100_000,
    retainerIncome: 50_000,
    monthlyExpenses: 40_000,
    receivablesByMonth: new Map(),
    months: 6,
    from: new Date(2026, 0, 1), // leden 2026
    monthKey: mk,
    monthLabel: label,
    ...overrides,
  };
}

describe("buildForecast", () => {
  it("kumuluje zůstatek: start + (příjmy - výdaje) po měsících", () => {
    const f = buildForecast(base());
    // net = 50k - 40k = 10k/měsíc
    expect(f[0].net).toBe(10_000);
    expect(f[0].zustatek).toBe(110_000);
    expect(f[5].zustatek).toBe(160_000); // 100k + 6*10k
    expect(f.length).toBe(6);
  });

  it("započítá jednorázové pohledávky v měsíci splatnosti", () => {
    const rec = new Map<string, number>([["2026-02", 25_000]]);
    const f = buildForecast(base({ receivablesByMonth: rec }));
    expect(f[1].prijmy).toBe(75_000); // 50k retainer + 25k pohledávka v únoru
    expect(f[0].prijmy).toBe(50_000); // leden bez pohledávky
  });
});

describe("minBalance", () => {
  it("odhalí cash gap (nejnižší zůstatek pod nulou)", () => {
    const f = buildForecast(base({ startBalance: 5_000, retainerIncome: 10_000, monthlyExpenses: 40_000 }));
    // net = -30k/měsíc → hluboko do mínusu
    expect(minBalance(f, 5_000)).toBeLessThan(0);
  });
});

describe("departureImpact", () => {
  it("odchod klienta sníží nejnižší zůstatek o (MRR × horizont)", () => {
    const p = base({ startBalance: 0, retainerIncome: 50_000, monthlyExpenses: 40_000, months: 6 });
    const r = departureImpact(p, 20_000);
    expect(r.withClient).toBeGreaterThan(r.withoutClient);
    // bez klienta: net = 30k-40k = -10k, nejnižší = 6. měsíc = -60k
    expect(r.deltaMin).toBeLessThan(0);
  });

  it("odchod klienta může vytvořit cash gap tam, kde předtím nebyl", () => {
    const p = base({ startBalance: 10_000, retainerIncome: 45_000, monthlyExpenses: 40_000, months: 6 });
    const withGap = departureImpact(p, 20_000);
    expect(withGap.withClient).toBeGreaterThanOrEqual(0); // s klientem v pohodě
    expect(withGap.withoutClient).toBeLessThan(0);        // bez klienta cash gap
  });
});
