import { describe, it, expect } from "vitest";
import {
  isAbsentOn, absencesInRange, absenceDays, absenceCollisions, rangeOverlap, type Absence,
} from "../absence";

const A = (o: Partial<Absence>): Absence => ({ id: 1, name: "Matěj Hořák", typ: "dovolená", od: "2026-07-10", do: "2026-07-20", ...o });

describe("rangeOverlap", () => {
  it("detekuje překryv i dotyk konců", () => {
    expect(rangeOverlap("2026-07-01", "2026-07-10", "2026-07-10", "2026-07-15")).toBe(true);
    expect(rangeOverlap("2026-07-01", "2026-07-05", "2026-07-06", "2026-07-10")).toBe(false);
  });
});

describe("isAbsentOn", () => {
  const abs = [A({})];
  it("najde absenci v rozsahu (case-insensitive jméno)", () => {
    expect(isAbsentOn(abs, "matěj hořák", "2026-07-15")?.typ).toBe("dovolená");
    expect(isAbsentOn(abs, "Matěj Hořák", "2026-07-10")).not.toBeNull(); // včetně od
    expect(isAbsentOn(abs, "Matěj Hořák", "2026-07-20")).not.toBeNull(); // včetně do
  });
  it("mimo rozsah / jiný člověk → null", () => {
    expect(isAbsentOn(abs, "Matěj Hořák", "2026-07-21")).toBeNull();
    expect(isAbsentOn(abs, "Adam Mendrek", "2026-07-15")).toBeNull();
  });
});

describe("absenceDays", () => {
  it("počítá včetně obou konců", () => {
    expect(absenceDays(A({ od: "2026-07-10", do: "2026-07-10" }))).toBe(1);
    expect(absenceDays(A({ od: "2026-07-10", do: "2026-07-20" }))).toBe(11);
  });
  it("nevalidní rozsah → 0", () => {
    expect(absenceDays(A({ od: "2026-07-20", do: "2026-07-10" }))).toBe(0);
  });
});

describe("absencesInRange", () => {
  it("vrátí protínající se absence", () => {
    const abs = [A({ id: 1, od: "2026-07-10", do: "2026-07-20" }), A({ id: 2, od: "2026-08-01", do: "2026-08-05" })];
    expect(absencesInRange(abs, "2026-07-15", "2026-07-16").map((a) => a.id)).toEqual([1]);
  });
});

describe("absenceCollisions", () => {
  const abs = [A({ name: "Matěj Hořák", od: "2026-07-10", do: "2026-07-20" })];

  it("nachytá natáčení během dovolené", () => {
    const shooting = [{ datum: "2026-07-15", klient: "EASTGATE", clenove: ["Matěj Hořák", "Adam Mendrek"] }];
    const c = absenceCollisions(abs, shooting, [], "2026-07-01");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: "shooting", name: "Matěj Hořák", detail: "EASTGATE" });
  });

  it("nachytá rezervaci techniky během dovolené", () => {
    const res = [{ kdo: "Matěj Hořák", od: "2026-07-18", do: "2026-07-19", projekt: "Sony FX3" }];
    const c = absenceCollisions(abs, [], res, "2026-07-01");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: "gear", name: "Matěj Hořák" });
  });

  it("ignoruje minulé dění a jiné lidi", () => {
    const shooting = [
      { datum: "2026-06-15", klient: "STARÉ", clenove: ["Matěj Hořák"] },  // minulost
      { datum: "2026-07-15", klient: "OK", clenove: ["Adam Mendrek"] },     // není v absenci
    ];
    expect(absenceCollisions(abs, shooting, [], "2026-07-01")).toHaveLength(0);
  });
});
