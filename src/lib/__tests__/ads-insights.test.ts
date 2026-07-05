import { describe, it, expect } from "vitest";
import { parseCastka, adsSummary, byFormat, byClient, bestFormat, type AdLike } from "../ads-insights";

describe("parseCastka", () => {
  it("parsuje české částky", () => {
    expect(parseCastka("2 795 Kč")).toBe(2795);
    expect(parseCastka("12 500 Kč")).toBe(12500);
    expect(parseCastka(3000)).toBe(3000);
    expect(parseCastka("")).toBe(0);
    expect(parseCastka(undefined)).toBe(0);
  });
});

const ads: AdLike[] = [
  { klient: "EASTGATE", format: "VIDEO",   castka: "3 000 Kč", dosah: 10000, kliky: 200, konverze: 10 },
  { klient: "EASTGATE", format: "GRAFIKA", castka: "2 000 Kč", dosah: 8000,  kliky: 100, konverze: 4 },
  { klient: "SENIMED",  format: "VIDEO",   castka: "5 000 Kč", dosah: 20000, kliky: 100, konverze: 12 },
];

describe("adsSummary", () => {
  it("sečte spend/dosah/kliky a spočítá CPC/CPM/CTR", () => {
    const s = adsSummary(ads);
    expect(s.pocet).toBe(3);
    expect(s.spend).toBe(10000);
    expect(s.dosah).toBe(38000);
    expect(s.kliky).toBe(400);
    expect(s.cpc).toBe(25);                 // 10000 / 400
    expect(Math.round(s.ctr * 100) / 100).toBeCloseTo((400 / 38000) * 100, 2);
  });
  it("nedělí nulou", () => {
    const s = adsSummary([{ castka: "1 000 Kč" }]);
    expect(s.cpc).toBe(0);
    expect(s.cpm).toBe(0);
  });
});

describe("byFormat / byClient", () => {
  it("seskupí a seřadí dle spendu", () => {
    const f = byFormat(ads);
    expect(f[0].key).toBe("VIDEO");   // 8000 spend > GRAFIKA 2000
    expect(f.find((x) => x.key === "VIDEO")!.spend).toBe(8000);
    const c = byClient(ads);
    expect(c).toHaveLength(2);
    expect(c.find((x) => x.key === "EASTGATE")!.spend).toBe(5000);
    expect(c.find((x) => x.key === "SENIMED")!.spend).toBe(5000);
  });
});

describe("bestFormat", () => {
  it("vybere formát s nejnižším CPC", () => {
    // VIDEO: 8000/300 = 26.7 ; GRAFIKA: 2000/100 = 20 → GRAFIKA
    expect(bestFormat(ads)!.key).toBe("GRAFIKA");
  });
  it("null bez kliků", () => {
    expect(bestFormat([{ format: "VIDEO", castka: "1 000 Kč" }])).toBeNull();
  });
});
