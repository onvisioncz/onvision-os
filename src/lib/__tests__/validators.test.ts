import { describe, it, expect } from "vitest";
import { validateIco, validateDic, validateIban } from "../validators";

describe("validateIco", () => {
  it("přijme platná IČO (kontrolní součet sedí)", () => {
    expect(validateIco("45274649").valid).toBe(true); // ČEZ
    expect(validateIco("12345679").valid).toBe(true); // spočítané platné
    expect(validateIco("452 746 49").valid).toBe(true); // s mezerami
  });
  it("odmítne špatný kontrolní součet", () => {
    expect(validateIco("45274648").valid).toBe(false);
    expect(validateIco("12345678").valid).toBe(false);
    expect(validateIco("00000000").valid).toBe(false);
  });
  it("odmítne špatný formát/délku", () => {
    expect(validateIco("").valid).toBe(false);
    expect(validateIco("123").valid).toBe(false);
    expect(validateIco("123456789").valid).toBe(false);
    expect(validateIco("1234567a").valid).toBe(false);
  });
  it("vrací normalized bez mezer", () => {
    expect(validateIco("452 746 49").normalized).toBe("45274649");
  });
});

describe("validateDic", () => {
  it("přijme platné DIČ (8místný kmen = platné IČO)", () => {
    expect(validateDic("CZ45274649").valid).toBe(true);
    expect(validateDic("cz45274649").valid).toBe(true); // case-insensitive
    expect(validateDic("CZ 45274649").valid).toBe(true);
  });
  it("přijme 9 a 10místné DIČ (fyzické osoby / rodné číslo)", () => {
    expect(validateDic("CZ123456789").valid).toBe(true);
    expect(validateDic("CZ1234567890").valid).toBe(true);
  });
  it("odmítne bez CZ prefixu / špatnou délku", () => {
    expect(validateDic("45274649").valid).toBe(false);
    expect(validateDic("SK45274649").valid).toBe(false);
    expect(validateDic("CZ123").valid).toBe(false);
    expect(validateDic("").valid).toBe(false);
  });
  it("odmítne 8místné DIČ s neplatným IČO kmenem", () => {
    expect(validateDic("CZ99999999").valid).toBe(false);
  });
});

describe("validateIban", () => {
  it("přijme platné IBANy (mod-97)", () => {
    expect(validateIban("CZ6508000000192000145399").valid).toBe(true); // kanonický CZ test IBAN
    expect(validateIban("CZ65 0800 0000 1920 0014 5399").valid).toBe(true); // s mezerami
    expect(validateIban("GB82WEST12345698765432").valid).toBe(true); // UK test IBAN
  });
  it("odmítne špatný kontrolní součet", () => {
    expect(validateIban("CZ6508000000192000145398").valid).toBe(false);
    expect(validateIban("GB82WEST12345698765431").valid).toBe(false);
  });
  it("odmítne špatný formát / délku", () => {
    expect(validateIban("").valid).toBe(false);
    expect(validateIban("CZ12").valid).toBe(false);
    expect(validateIban("1234").valid).toBe(false);
    expect(validateIban("CZ650800000019200014539").valid).toBe(false); // 23 znaků (CZ musí 24)
  });
});
