import { describe, it, expect } from "vitest";
import { pillarBalance, type BalancePost, type BalancePillar } from "../pillar-balance";

const pillars: BalancePillar[] = [
  { id: "edu", klient: "SENIMED", label: "Edukace", emoji: "📚" },
  { id: "promo", klient: "SENIMED", label: "Produkt", emoji: "💊" },
  { id: "bts", klient: "SENIMED", label: "Za oponou", emoji: "🎬" },
  { id: "other", klient: "TOFFI", label: "Jiné" },   // jiný klient
];

const posts: BalancePost[] = [
  { klient: "SENIMED", pillar: "promo", datum: "2026-07-01" },
  { klient: "SENIMED", pillar: "promo", datum: "2026-07-05" },
  { klient: "SENIMED", pillar: "promo", datum: "2026-07-10" },
  { klient: "SENIMED", pillar: "edu",   datum: "2026-07-12" },
  { klient: "SENIMED", pillar: undefined, datum: "2026-07-15" }, // nezařazeno
  { klient: "TOFFI",   pillar: "other", datum: "2026-07-02" },   // jiný klient
];

describe("pillarBalance", () => {
  const r = pillarBalance(posts, pillars, "SENIMED");

  it("počítá jen posty daného klienta", () => {
    expect(r.total).toBe(5);
  });

  it("spočítá počty a procenta per pilíř", () => {
    const promo = r.slices.find((s) => s.id === "promo")!;
    expect(promo.count).toBe(3);
    expect(promo.pct).toBe(60);
  });

  it("přidá Nezařazeno pro posty bez pilíře", () => {
    const none = r.slices.find((s) => s.id === "__none__")!;
    expect(none.count).toBe(1);
    expect(none.label).toBe("Nezařazeno");
  });

  it("označí dominantní pilíř (≥60 %)", () => {
    expect(r.dominant?.id).toBe("promo");
    expect(r.vyvazene).toBe(false);
  });

  it("najde nevyužité pilíře", () => {
    expect(r.unused.map((s) => s.id)).toContain("bts");
  });

  it("řadí Nezařazeno na konec", () => {
    expect(r.slices[r.slices.length - 1].id).toBe("__none__");
  });

  it("vyvážený plán → vyvazene true, žádný dominant", () => {
    const balanced: BalancePost[] = [
      { klient: "SENIMED", pillar: "edu" }, { klient: "SENIMED", pillar: "promo" }, { klient: "SENIMED", pillar: "bts" },
    ];
    const b = pillarBalance(balanced, pillars, "SENIMED");
    expect(b.dominant).toBeNull();
    expect(b.vyvazene).toBe(true);
  });

  it("respektuje filtr měsíce", () => {
    const r2 = pillarBalance(posts, pillars, "SENIMED", 0.6, "2026-08");
    expect(r2.total).toBe(0);
  });
});
