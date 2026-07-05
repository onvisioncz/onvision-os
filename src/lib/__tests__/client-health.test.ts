import { describe, it, expect } from "vitest";
import { clientHealth } from "../client-health";

describe("clientHealth", () => {
  it("perfektní klient = vysoké skóre / zdravý", () => {
    const r = clientHealth(
      { name: "A", pausal: 30000, deliverables: [{ done: true }, { done: true }], hodinMesic: 20, hodinOdpracovano: 20 },
      0
    );
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.band).toBe("zdravý");
  });

  it("dluh ve výši měsíce sráží platby i celkové skóre", () => {
    const zdravy = clientHealth({ name: "A", pausal: 30000, deliverables: [{ done: true }], hodinMesic: 10, hodinOdpracovano: 10 }, 0);
    const dluznik = clientHealth({ name: "A", pausal: 30000, deliverables: [{ done: true }], hodinMesic: 10, hodinOdpracovano: 10 }, 30000);
    expect(dluznik.score).toBeLessThan(zdravy.score);
    const platby = dluznik.factors.find((f) => f.key === "platby")!;
    expect(platby.score).toBeLessThanOrEqual(35); // ~100 - 70
    expect(platby.note).toContain("po splatnosti");
  });

  it("nedodělané deliverables snižují dodávky", () => {
    const r = clientHealth({ name: "A", pausal: 30000, deliverables: [{ done: false }, { done: false }, { done: false }, { done: true }] }, 0);
    const dod = r.factors.find((f) => f.key === "dodavky")!;
    expect(dod.score).toBe(25); // 1/4
    expect(dod.note).toBe("1/4 hotovo");
  });

  it("nízká odpracovanost snižuje aktivitu", () => {
    const r = clientHealth({ name: "A", pausal: 30000, hodinMesic: 40, hodinOdpracovano: 8 }, 0);
    const akt = r.factors.find((f) => f.key === "aktivita")!;
    expect(akt.score).toBe(20); // 8/40
  });

  it("chybějící data = neutrální (nespadne, rozumný default)", () => {
    const r = clientHealth({ name: "A", pausal: 30000 }, 0);
    expect(r.factors.find((f) => f.key === "dodavky")!.score).toBe(80);
    expect(r.factors.find((f) => f.key === "aktivita")!.score).toBe(75);
    expect(r.score).toBeGreaterThan(0);
  });

  it("velký dluh + nic hotovo = riziko (červená)", () => {
    const r = clientHealth(
      { name: "A", pausal: 20000, deliverables: [{ done: false }, { done: false }], hodinMesic: 20, hodinOdpracovano: 2 },
      50000
    );
    expect(r.band).toBe("riziko");
    expect(r.score).toBeLessThan(60);
  });

  it("skóre je vždy v 0–100", () => {
    const r = clientHealth({ name: "A", pausal: 1000 }, 9_999_999);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
