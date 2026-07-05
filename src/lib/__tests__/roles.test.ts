import { describe, it, expect } from "vitest";
import { canAccess } from "../roles";

describe("canAccess", () => {
  it("admin má přístup všude", () => {
    expect(canAccess(["admin"], "/ads")).toBe(true);
    expect(canAccess(["admin"], "/cokoliv")).toBe(true);
  });

  it("běžný SMM už NEMÁ /ads (přesunuto na per-e-mail)", () => {
    expect(canAccess(["smm"], "/ads")).toBe(false);
    expect(canAccess(["pm"], "/ads")).toBe(false);
  });

  it("SMM má dál své běžné routy", () => {
    expect(canAccess(["smm"], "/smm")).toBe(true);
    expect(canAccess(["smm"], "/smm-studio")).toBe(true);
  });

  it("extraRoutes povolí konkrétní routu nad rámec rolí", () => {
    expect(canAccess(["smm"], "/ads", ["/ads"])).toBe(true);
    expect(canAccess(["smm"], "/ads/detail", ["/ads"])).toBe(true); // i podcesty
  });

  it("extraRoutes nepovolí nesouvisející routu", () => {
    expect(canAccess(["smm"], "/finance", ["/ads"])).toBe(false);
  });

  it("každá non-admin role vidí /inbox (Upozornění) — kvůli notifikacím", () => {
    for (const r of ["fakturace", "ucetni", "produkce", "grafik", "smm", "pm"] as const) {
      expect(canAccess([r], "/inbox")).toBe(true);
    }
  });
});
