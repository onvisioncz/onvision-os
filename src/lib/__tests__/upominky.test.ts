import { describe, it, expect } from "vitest";
import { upominkaLevel, buildUpominka } from "../upominky";

describe("upominkaLevel", () => {
  it("stupňuje podle dní po splatnosti", () => {
    expect(upominkaLevel(1)).toBe(1);
    expect(upominkaLevel(14)).toBe(1);
    expect(upominkaLevel(15)).toBe(2);
    expect(upominkaLevel(30)).toBe(2);
    expect(upominkaLevel(31)).toBe(3);
    expect(upominkaLevel(120)).toBe(3);
  });
});

describe("buildUpominka", () => {
  const inv = { cislo: "2601000016", klient: "IMTOS", castka: 12345, dnuPoSplatnosti: 20, iban: "CZ6055000000001638537004", vs: "2601000016" };

  it("úroveň 2 pro 20 dní, předmět obsahuje číslo faktury", () => {
    const u = buildUpominka(inv);
    expect(u.level).toBe(2);
    expect(u.subject).toContain("2601000016");
    expect(u.subject).toContain("upomínka");
  });

  it("text obsahuje částku, dny a platební údaje", () => {
    const u = buildUpominka(inv);
    // fmtKc používá nezlomitelnou mezeru — porovnávej bez mezer
    expect(u.text.replace(/\s/g, "")).toContain("12345Kč");
    expect(u.text).toContain("20 dní");
    expect(u.text).toContain("CZ6055000000001638537004");
    expect(u.text).toContain("2601000016");
  });

  it("mírný tón u úrovně 1 (možnost že už zaplatili)", () => {
    const u = buildUpominka({ ...inv, dnuPoSplatnosti: 3 });
    expect(u.level).toBe(1);
    expect(u.text.toLowerCase()).toContain("připomen");
    expect(u.text.toLowerCase()).toContain("bezpředmětn");
  });

  it("ostrý tón u úrovně 3", () => {
    const u = buildUpominka({ ...inv, dnuPoSplatnosti: 45 });
    expect(u.level).toBe(3);
    expect(u.text.toLowerCase()).toContain("okamžit");
  });

  it("forceLevel přebije výpočet", () => {
    expect(buildUpominka(inv, 3).level).toBe(3);
  });

  it("HTML je validní branded e-mail", () => {
    const u = buildUpominka(inv);
    expect(u.html).toContain("<!DOCTYPE html>");
    expect(u.html).toContain("2601000016");
  });

  it("escapuje HTML v klientovi/číslech (bez injektáže)", () => {
    const u = buildUpominka({ ...inv, cislo: "<b>x</b>" });
    expect(u.html).not.toContain("<b>x</b>");
    expect(u.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
