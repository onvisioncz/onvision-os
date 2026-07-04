import { describe, it, expect } from "vitest";
import { expiryFromDays, isExpired } from "../delivery";

describe("expiryFromDays", () => {
  it("null = bez expirace", () => {
    expect(expiryFromDays(null)).toBeNull();
  });
  it("N dní od základu", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(expiryFromDays(30, from)).toBe(new Date("2026-01-31T00:00:00Z").toISOString());
    expect(expiryFromDays(7, from)).toBe(new Date("2026-01-08T00:00:00Z").toISOString());
  });
});

describe("isExpired", () => {
  const now = Date.parse("2026-06-15T12:00:00Z");
  it("bez expiresAt nikdy nevyprší", () => {
    expect(isExpired({ expiresAt: null }, now)).toBe(false);
    expect(isExpired({ expiresAt: undefined }, now)).toBe(false);
  });
  it("minulé datum = vypršelo", () => {
    expect(isExpired({ expiresAt: "2026-06-14T00:00:00Z" }, now)).toBe(true);
  });
  it("budoucí datum = platí", () => {
    expect(isExpired({ expiresAt: "2026-06-20T00:00:00Z" }, now)).toBe(false);
  });
  it("nevalidní datum = neblokovat (nevyprší)", () => {
    expect(isExpired({ expiresAt: "nesmysl" }, now)).toBe(false);
  });
});
