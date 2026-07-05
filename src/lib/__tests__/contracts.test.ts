import { describe, it, expect } from "vitest";
import { expiryInfo, expiringContracts, contractSummary, type Contract } from "../contracts";

const TODAY = new Date("2026-07-05T12:00:00Z");
const mk = (o: Partial<Contract>): Contract => ({
  id: 1, strana: "klient", nazev: "SENIMED s.r.o.", typ: "Rámcová smlouva",
  od: "2026-01-01", stav: "aktivní", ...o,
});

describe("expiryInfo", () => {
  it("na dobu neurčitou (bez do)", () => {
    expect(expiryInfo(mk({ do: undefined }), TODAY).band).toBe("neurčito");
  });
  it("platná (>30 dní)", () => {
    const e = expiryInfo(mk({ do: "2026-12-31" }), TODAY);
    expect(e.band).toBe("platná");
    expect(e.daysLeft).toBeGreaterThan(30);
  });
  it("brzy vyprší (≤30 dní)", () => {
    const e = expiryInfo(mk({ do: "2026-07-20" }), TODAY);
    expect(e.band).toBe("brzy");
    expect(e.daysLeft).toBe(15);
  });
  it("vyprší dnes", () => {
    expect(expiryInfo(mk({ do: "2026-07-05" }), TODAY).label).toBe("vyprší dnes");
  });
  it("vypršela", () => {
    const e = expiryInfo(mk({ do: "2026-06-01" }), TODAY);
    expect(e.band).toBe("vypršela");
    expect(e.daysLeft).toBeLessThan(0);
  });
  it("ukončená / návrh → neaktivní bez ohledu na datum", () => {
    expect(expiryInfo(mk({ do: "2026-07-10", stav: "ukončená" }), TODAY).band).toBe("neaktivní");
    expect(expiryInfo(mk({ do: "2026-07-10", stav: "návrh" }), TODAY).band).toBe("neaktivní");
  });
});

describe("expiringContracts", () => {
  const list: Contract[] = [
    mk({ id: 1, do: "2026-12-31" }),           // platná
    mk({ id: 2, do: "2026-07-20" }),           // brzy
    mk({ id: 3, do: "2026-06-01" }),           // vypršela
    mk({ id: 4, do: undefined }),              // neurčito
    mk({ id: 5, do: "2026-07-10", stav: "ukončená" }), // neaktivní
  ];
  it("vrátí jen brzy + vypršelé, seřazené dle daysLeft", () => {
    const r = expiringContracts(list, TODAY);
    expect(r.map((c) => c.id)).toEqual([3, 2]); // vypršelá (nejnižší daysLeft) první
  });
});

describe("contractSummary", () => {
  it("sečte stavy", () => {
    const s = contractSummary([
      mk({ id: 1, do: "2026-12-31" }),
      mk({ id: 2, do: "2026-07-20" }),
      mk({ id: 3, do: "2026-06-01" }),
      mk({ id: 4, stav: "návrh", do: "2026-08-01" }),
    ], TODAY);
    expect(s.celkem).toBe(4);
    expect(s.aktivnich).toBe(3);
    expect(s.brzy).toBe(1);
    expect(s.vyprsele).toBe(1);
  });
});
