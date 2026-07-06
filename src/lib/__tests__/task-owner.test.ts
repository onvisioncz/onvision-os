import { describe, it, expect } from "vitest";
import { isMine, firstName, canSeeAllTasks } from "../task-owner";

describe("firstName / isMine", () => {
  it("porovná křestní jméno bez ohledu na velikost a příjmení", () => {
    expect(firstName("Dominika Mendrek")).toBe("dominika");
    expect(isMine("Dominika", "dominika")).toBe(true);
    expect(isMine("Dominika Mendrek", "dominika")).toBe(true);
    expect(isMine("Zdeněk", "dominika")).toBe(false);
  });
  it("zná přezdívku Jan = Honza", () => {
    expect(isMine("Honza", "jan")).toBe(true);
    expect(isMine("Jan Kříž", "jan")).toBe(true);
  });
});

describe("canSeeAllTasks", () => {
  it("admin a PM vidí vše", () => {
    expect(canSeeAllTasks(["admin"])).toBe(true);
    expect(canSeeAllTasks(["pm"])).toBe(true);
    expect(canSeeAllTasks(["fakturace", "pm"])).toBe(true);
  });
  it("fakturace/produkce/grafik/smm vidí jen svoje", () => {
    expect(canSeeAllTasks(["fakturace"])).toBe(false);
    expect(canSeeAllTasks(["produkce"])).toBe(false);
    expect(canSeeAllTasks(["grafik"])).toBe(false);
    expect(canSeeAllTasks(["smm"])).toBe(false);
    expect(canSeeAllTasks([])).toBe(false);
    expect(canSeeAllTasks(undefined)).toBe(false);
  });
});
