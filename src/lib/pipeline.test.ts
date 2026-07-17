import { describe, it, expect } from "vitest";
import {
  isOpen, weightedPipeline, openValue, wonValue, byStage, winRate,
  WON_FAZE, type PipelineDeal, type DealFaze,
} from "./pipeline";

const ORDER: DealFaze[] = ["Lead", "Nabídka", "Jednání", "Podpis", "Realizace", "Dokončeno"];

const deals: PipelineDeal[] = [
  { faze: "Lead", hodnota: 100_000, pravdepodobnost: 20 },      // weighted 20k
  { faze: "Nabídka", hodnota: 50_000, pravdepodobnost: 50 },    // weighted 25k
  { faze: "Podpis", hodnota: 200_000, pravdepodobnost: 90 },    // weighted 180k
  { faze: "Dokončeno", hodnota: 300_000, pravdepodobnost: 100 },// won — mimo forecast
];

describe("isOpen / WON_FAZE", () => {
  it("Dokončeno je uzavřený, ostatní otevřené", () => {
    expect(WON_FAZE).toBe("Dokončeno");
    expect(isOpen({ faze: "Lead" })).toBe(true);
    expect(isOpen({ faze: "Realizace" })).toBe(true);
    expect(isOpen({ faze: "Dokončeno" })).toBe(false);
  });
});

describe("weightedPipeline", () => {
  it("váží jen otevřené dealy podle pravděpodobnosti", () => {
    expect(weightedPipeline(deals)).toBe(20_000 + 25_000 + 180_000);
  });
  it("prázdný / null vstup → 0", () => {
    expect(weightedPipeline([])).toBe(0);
    expect(weightedPipeline(undefined as unknown as PipelineDeal[])).toBe(0);
  });
  it("ořízne pravděpodobnost mimo 0–100", () => {
    expect(weightedPipeline([{ faze: "Lead", hodnota: 1000, pravdepodobnost: 150 }])).toBe(1000);
    expect(weightedPipeline([{ faze: "Lead", hodnota: 1000, pravdepodobnost: -20 }])).toBe(0);
  });
});

describe("openValue / wonValue", () => {
  it("openValue sečte nevážené otevřené dealy", () => {
    expect(openValue(deals)).toBe(100_000 + 50_000 + 200_000);
  });
  it("wonValue sečte jen Dokončeno", () => {
    expect(wonValue(deals)).toBe(300_000);
  });
});

describe("byStage", () => {
  it("rozpad po fázích s počty, hodnotou a váženou hodnotou", () => {
    const stats = byStage(deals, ORDER);
    const lead = stats.find((s) => s.faze === "Lead")!;
    expect(lead).toMatchObject({ count: 1, value: 100_000, weighted: 20_000 });
    const empty = stats.find((s) => s.faze === "Jednání")!;
    expect(empty).toMatchObject({ count: 0, value: 0, weighted: 0 });
    expect(stats).toHaveLength(ORDER.length);
  });
});

describe("winRate", () => {
  it("podíl vyhraných na všech dealech v %", () => {
    expect(winRate(deals)).toBe(25); // 1 ze 4
  });
  it("prázdno → 0", () => {
    expect(winRate([])).toBe(0);
  });
});
