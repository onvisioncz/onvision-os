import { describe, it, expect } from "vitest";
import { mergeInvoices, csvCell, invoicesToCsv } from "../exports";

describe("mergeInvoices", () => {
  it("dedupuje podle čísla faktury napříč sklady", () => {
    const a = [{ cislo: "2026001", klient: "IMTOS", castka: 10000 }];
    const b = [
      { cislo: "2026001", klientNazev: "IMTOS s.r.o.", castka: 10000 }, // duplicita
      { cislo: "2026002", klient: "SENIMED", castka: 5000 },
    ];
    const rows = mergeInvoices(a, b);
    expect(rows.map((r) => r.cislo).sort()).toEqual(["2026001", "2026002"]);
  });
  it("bez čísla dedupuje dle klient|částka", () => {
    const rows = mergeInvoices(
      [{ klient: "X", castka: 100 }],
      [{ klient: "X", castka: 100 }, { klient: "Y", castka: 100 }]
    );
    expect(rows.length).toBe(2);
  });
});

describe("csvCell", () => {
  it("obalí buňku s oddělovačem/uvozovkou/newline", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("normal")).toBe("normal");
    expect(csvCell(1234)).toBe("1234");
  });
});

describe("invoicesToCsv", () => {
  it("začíná BOM a hlavičkou, řádky oddělené CRLF", () => {
    const csv = invoicesToCsv([{ cislo: "1", klient: "A", castka: 500, stav: "Vystavena" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("Číslo;Klient;Částka;Stav;Datum vystavení;Datum splatnosti");
    expect(lines[1]).toBe("1;A;500;Vystavena;;");
  });
  it("escapuje klienta s ; v názvu", () => {
    const csv = invoicesToCsv([{ cislo: "2", klient: "A; s.r.o.", castka: 0 }]);
    expect(csv).toContain('"A; s.r.o."');
  });
});
