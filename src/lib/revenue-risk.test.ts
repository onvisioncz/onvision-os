import { describe, it, expect } from "vitest";
import { clientConcentration, type RevenueClient } from "./revenue-risk";

describe("clientConcentration", () => {
  it("spočítá podíly, top klienta a HHI", () => {
    const clients: RevenueClient[] = [
      { name: "A", pausal: 60_000, aktivni: true },
      { name: "B", pausal: 30_000, reklama: 10_000, aktivni: true }, // 40k
      { name: "C", pausal: 20_000, aktivni: true },
      { name: "Neaktivní", pausal: 100_000, aktivni: false },        // ignoruje se
    ];
    const r = clientConcentration(clients);
    expect(r.totalMrr).toBe(120_000);
    expect(r.topClient?.name).toBe("A");
    expect(r.topShare).toBeCloseTo(50, 5);       // 60k / 120k
    expect(r.top3Share).toBeCloseTo(100, 5);
    expect(r.clients).toHaveLength(3);           // neaktivní vynechán
    // HHI = 50² + 33.33² + 16.67² ≈ 2500 + 1111 + 278 = 3889
    expect(r.hhi).toBeGreaterThan(3800);
    expect(r.hhi).toBeLessThan(3950);
  });

  it("band = riziko když jeden klient ≥ 40 %", () => {
    const r = clientConcentration([
      { name: "Velký", pausal: 50_000, aktivni: true },
      { name: "Malý", pausal: 50_000, aktivni: true },
    ]);
    expect(r.topShare).toBe(50);
    expect(r.band).toBe("riziko");
  });

  it("band = pozor při 25–40 %", () => {
    const r = clientConcentration([
      { name: "A", pausal: 30_000, aktivni: true },
      { name: "B", pausal: 25_000, aktivni: true },
      { name: "C", pausal: 25_000, aktivni: true },
      { name: "D", pausal: 20_000, aktivni: true },
    ]);
    expect(r.topShare).toBe(30);
    expect(r.band).toBe("pozor");
  });

  it("band = zdravé při rozloženém portfoliu", () => {
    const r = clientConcentration(
      Array.from({ length: 10 }, (_, i) => ({ name: `K${i}`, pausal: 10_000, aktivni: true }))
    );
    expect(r.topShare).toBe(10);
    expect(r.band).toBe("zdravé");
  });

  it("prázdný vstup → nuly, žádný pád", () => {
    const r = clientConcentration([]);
    expect(r.totalMrr).toBe(0);
    expect(r.topClient).toBeNull();
    expect(r.topShare).toBe(0);
    expect(r.hhi).toBe(0);
    expect(r.band).toBe("zdravé");
  });
});
