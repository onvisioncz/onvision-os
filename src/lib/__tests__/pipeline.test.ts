import { describe, it, expect } from "vitest";
import { weightedPipeline, openValue, wonValue, byStage, winRate, isOpen, type PipelineDeal, type DealFaze } from "../pipeline";

const ORDER: DealFaze[] = ["Lead", "Nabídka", "Jednání", "Podpis", "Realizace", "Dokončeno"];

const deals: PipelineDeal[] = [
  { faze: "Lead", hodnota: 100000, pravdepodobnost: 20 },      // 20000
  { faze: "Jednání", hodnota: 50000, pravdepodobnost: 70 },    // 35000
  { faze: "Podpis", hodnota: 200000, pravdepodobnost: 90 },    // 180000
  { faze: "Dokončeno", hodnota: 80000, pravdepodobnost: 100 }, // won, ne open
];

describe("isOpen", () => {
  it("Dokončeno není otevřený", () => {
    expect(isOpen({ faze: "Dokončeno" })).toBe(false);
    expect(isOpen({ faze: "Lead" })).toBe(true);
  });
});

describe("weightedPipeline", () => {
  it("váží otevřené dealy pravděpodobností a vynechá vyhrané", () => {
    expect(weightedPipeline(deals)).toBe(20000 + 35000 + 180000);
  });
  it("ořízne pravděpodobnost mimo 0–100", () => {
    expect(weightedPipeline([{ faze: "Lead", hodnota: 1000, pravdepodobnost: 150 }])).toBe(1000);
    expect(weightedPipeline([{ faze: "Lead", hodnota: 1000, pravdepodobnost: -10 }])).toBe(0);
  });
  it("prázdné → 0", () => expect(weightedPipeline([])).toBe(0));
});

describe("openValue / wonValue", () => {
  it("openValue je nevážená suma otevřených", () => {
    expect(openValue(deals)).toBe(100000 + 50000 + 200000);
  });
  it("wonValue je suma Dokončeno", () => {
    expect(wonValue(deals)).toBe(80000);
  });
});

describe("byStage", () => {
  it("rozpad po fázích s hodnotou i váženou hodnotou", () => {
    const s = byStage(deals, ORDER);
    const podpis = s.find((x) => x.faze === "Podpis")!;
    expect(podpis.count).toBe(1);
    expect(podpis.value).toBe(200000);
    expect(podpis.weighted).toBe(180000);
    expect(s.find((x) => x.faze === "Realizace")!.count).toBe(0);
    expect(s).toHaveLength(ORDER.length);
  });
});

describe("winRate", () => {
  it("podíl vyhraných na všech", () => {
    expect(winRate(deals)).toBe(25); // 1 ze 4
  });
  it("prázdné → 0", () => expect(winRate([])).toBe(0));
});
