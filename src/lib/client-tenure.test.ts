import { describe, it, expect } from "vitest";
import { parseCzMonthYear, tenureMonths, estimatedLtv, portfolioTenure, type TenureClient } from "./client-tenure";

const NOW = new Date(2026, 6, 1); // červenec 2026 (month index 6)

describe("parseCzMonthYear", () => {
  it("rozpozná český měsíc a rok", () => {
    expect(parseCzMonthYear("Červen 2025")).toEqual({ year: 2025, month: 5 });
    expect(parseCzMonthYear("leden 2026")).toEqual({ year: 2026, month: 0 });
  });
  it("nerozpoznané → null", () => {
    expect(parseCzMonthYear("")).toBeNull();
    expect(parseCzMonthYear("2025")).toBeNull();
    expect(parseCzMonthYear(undefined)).toBeNull();
  });
});

describe("tenureMonths", () => {
  it("počítá celé měsíce včetně rozjetého", () => {
    expect(tenureMonths("Červenec 2026", NOW)).toBe(1); // stejný měsíc
    expect(tenureMonths("Červen 2026", NOW)).toBe(2);
    expect(tenureMonths("Červenec 2025", NOW)).toBe(13);
  });
  it("neznámý začátek → 0", () => {
    expect(tenureMonths(undefined, NOW)).toBe(0);
  });
});

describe("estimatedLtv", () => {
  it("MRR × počet měsíců", () => {
    const c: TenureClient = { name: "A", pausal: 30_000, reklama: 5_000, aktivni: true, zacatek: "Červenec 2025" };
    expect(estimatedLtv(c, NOW)).toBe(35_000 * 13);
  });
});

describe("portfolioTenure", () => {
  it("souhrn: řazení dle tenure, průměr, nejdéle, celkem LTV", () => {
    const clients: TenureClient[] = [
      { name: "Stary", pausal: 20_000, aktivni: true, zacatek: "Leden 2025" },   // 19 měsíců
      { name: "Novy", pausal: 40_000, aktivni: true, zacatek: "Červen 2026" },    // 2 měsíce
      { name: "Neaktivni", pausal: 99_000, aktivni: false, zacatek: "Leden 2020" },
    ];
    const r = portfolioTenure(clients, NOW);
    expect(r.clients.map((c) => c.name)).toEqual(["Stary", "Novy"]);
    expect(r.nejdeleClient?.name).toBe("Stary");
    expect(r.prumerMesicu).toBe(Math.round((19 + 2) / 2));
    expect(r.celkemLtv).toBe(20_000 * 19 + 40_000 * 2);
  });
  it("prázdný vstup → nuly", () => {
    const r = portfolioTenure([], NOW);
    expect(r.clients).toHaveLength(0);
    expect(r.prumerMesicu).toBe(0);
    expect(r.nejdeleClient).toBeNull();
    expect(r.celkemLtv).toBe(0);
  });
});
