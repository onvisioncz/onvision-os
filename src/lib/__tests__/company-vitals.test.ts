import { describe, it, expect } from "vitest";
import { companyVitals, type VitalsInput } from "../company-vitals";

const base = (o: Partial<VitalsInput> = {}): VitalsInput => ({
  mrr: 250000, monthlyExpenses: 180000, balance: 500000, cashGap: false,
  overdueTotal: 0, clientsActive: 9, clientsAtRisk: 0, mrrTrendPct: 2,
  weightedPipeline: 300000, openTasks: 20, lateTasks: 2, ...o,
});

describe("companyVitals", () => {
  it("zdravá firma → vysoké skóre, pásmo výborně/dobře", () => {
    const r = companyVitals(base());
    expect(r.score).toBeGreaterThan(70);
    expect(["výborně", "dobře"]).toContain(r.band);
  });

  it("cash gap výrazně srazí skóre peněz + přidá negativní tahák", () => {
    const good = companyVitals(base());
    const bad = companyVitals(base({ cashGap: true }));
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.drivers.some((d) => !d.positive && /cash gap/i.test(d.text))).toBe(true);
  });

  it("klienti v riziku srazí pilíř Klienti", () => {
    const r = companyVitals(base({ clientsAtRisk: 5, clientsActive: 9 }));
    const klienti = r.pillars.find((p) => p.key === "klienti")!;
    expect(klienti.score).toBeLessThan(50);
    expect(r.drivers.some((d) => /riziku churnu/.test(d.text))).toBe(true);
  });

  it("propad MRR se projeví v Růstu i tahácích", () => {
    const r = companyVitals(base({ mrrTrendPct: -12 }));
    expect(r.drivers.some((d) => /MRR kleslo/.test(d.text))).toBe(true);
  });

  it("kritická firma → pásmo kriticky", () => {
    const r = companyVitals(base({
      mrr: 100000, monthlyExpenses: 160000, cashGap: true,
      overdueTotal: 120000, clientsAtRisk: 7, clientsActive: 9,
      mrrTrendPct: -15, weightedPipeline: 0, lateTasks: 15, openTasks: 20,
    }));
    expect(r.band).toBe("kriticky");
    expect(r.score).toBeLessThan(40);
  });

  it("skóre je vážený průměr pilířů", () => {
    const r = companyVitals(base());
    const manual = r.pillars.reduce((s, p) => s + p.score * p.weight, 0);
    expect(Math.abs(r.score - Math.round(manual))).toBeLessThanOrEqual(1);
  });

  it("pásma mají barvu a nespadnou mimo 0–100", () => {
    const r = companyVitals(base());
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.color).toMatch(/oklch/);
  });
});
