import { describe, it, expect } from "vitest";
import { buildSpdString, buildCisloFaktury } from "../invoice";

const dod = { iban: "CZ60 5500 0000 0016 3853 7004" } as Parameters<typeof buildSpdString>[0];

describe("buildSpdString", () => {
  it("sestaví validní SPD řetězec bez mezer v IBANu, částka na 2 desetiny", () => {
    const s = buildSpdString(dod, 12345, "2026001", "Faktura 2026001");
    expect(s).toContain("SPD*1.0*ACC:CZ6055000000001638537004");
    expect(s).toContain("*AM:12345.00*CC:CZK");
    expect(s).toContain("*X-VS:2026001");
    expect(s).toContain("*MSG:Faktura 2026001");
  });
  it("odstraní '*' ze zprávy (jinak by rozbil oddělovač)", () => {
    const s = buildSpdString(dod, 100, "1", "A*B*C");
    expect(s).not.toContain("MSG:A*B*C");
    expect(s).toContain("MSG:A B C");
    // stále validní počet polí (rozdělení nemá vytvořit falešná pole)
    expect(s.split("*").filter((p) => p.startsWith("MSG:")).length).toBe(1);
  });
  it("VS jen číslice, max 10", () => {
    expect(buildSpdString(dod, 1, "abc123def", "")).toContain("X-VS:123");
    expect(buildSpdString(dod, 1, "123456789012", "")).toContain("X-VS:1234567890");
  });
  it("vynechá prázdné MSG i VS", () => {
    const s = buildSpdString(dod, 500, "", "");
    expect(s).toBe("SPD*1.0*ACC:CZ6055000000001638537004*AM:500.00*CC:CZK");
  });
  it("záporná/NaN částka → 0.00", () => {
    expect(buildSpdString(dod, -5, "", "")).toContain("AM:0.00");
    expect(buildSpdString(dod, NaN, "", "")).toContain("AM:0.00");
  });
});

describe("buildCisloFaktury", () => {
  it("YY + řada(2) + měsíc(5)", () => {
    expect(buildCisloFaktury(2026, 1, 16)).toBe("2601" + "00016");
    expect(buildCisloFaktury(2026, 12, 3)).toBe("2612" + "00003");
  });
});
