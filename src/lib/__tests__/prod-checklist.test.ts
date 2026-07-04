import { describe, it, expect } from "vitest";
import { buildChecklist, checklistProgress, criticalRemaining, SHOOT_TYPES } from "../prod-checklist";

describe("buildChecklist", () => {
  it("vygeneruje položky specifické pro typ + společné, vše nezaškrtnuté", () => {
    const c = buildChecklist("exterier", "SK Brno zápas", 1, "2026-06-01");
    expect(c.items.length).toBeGreaterThan(6);
    expect(c.items.every((i) => i.done === false)).toBe(true);
    // exteriér má počasí a záložní lokaci
    expect(c.items.some((i) => i.text.toLowerCase().includes("počasí"))).toBe(true);
    expect(c.items.some((i) => i.text.toLowerCase().includes("záložní"))).toBe(true);
    // společná: call sheet
    expect(c.items.some((i) => i.text.toLowerCase().includes("call sheet"))).toBe(true);
  });

  it("dron má právní položky (licence, povolení, pojištění)", () => {
    const c = buildChecklist("dron", "", 2, "2026-06-01");
    const legal = c.items.filter((i) => i.cat === "pravni");
    expect(legal.length).toBeGreaterThanOrEqual(3);
  });

  it("prázdný název → doplní se dle typu", () => {
    const c = buildChecklist("studio", "", 3, "2026-06-01");
    expect(c.nazev).toBe("Reklama / studio");
  });

  it("id položek jsou unikátní", () => {
    const c = buildChecklist("rozhovor", "x", 4, "2026-06-01");
    const ids = new Set(c.items.map((i) => i.id));
    expect(ids.size).toBe(c.items.length);
  });
});

describe("checklistProgress", () => {
  it("počítá done/total/pct", () => {
    const c = buildChecklist("studio", "x", 1, "2026-06-01");
    expect(checklistProgress(c.items)).toEqual({ done: 0, total: c.items.length, pct: 0 });
    c.items[0].done = true;
    c.items[1].done = true;
    const p = checklistProgress(c.items);
    expect(p.done).toBe(2);
    expect(p.pct).toBe(Math.round((2 / c.items.length) * 100));
  });
  it("prázdný seznam = 0 %", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe("criticalRemaining", () => {
  it("počítá nezaškrtnuté právní/bezpečnostní", () => {
    const c = buildChecklist("exterier", "x", 1, "2026-06-01");
    const before = criticalRemaining(c.items);
    expect(before).toBeGreaterThan(0);
    c.items.filter((i) => i.cat === "pravni" || i.cat === "bezpecnost").forEach((i) => (i.done = true));
    expect(criticalRemaining(c.items)).toBe(0);
  });
});

describe("SHOOT_TYPES", () => {
  it("má 5 typů s unikátními hodnotami", () => {
    expect(SHOOT_TYPES.length).toBe(5);
    expect(new Set(SHOOT_TYPES.map((t) => t.value)).size).toBe(5);
  });
});
