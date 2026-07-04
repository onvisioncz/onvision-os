import { describe, it, expect } from "vitest";
import { invoicingStatus, type ClientLite, type IssuedLite } from "../invoicing-status";

const clients: ClientLite[] = [
  { name: "IMTOS", aktivni: true, pausal: 35000 },
  { name: "SENIMED", aktivni: true, pausal: 50000 },
  { name: "TEKMA", aktivni: true },
  { name: "Starý klient", aktivni: false },
];

describe("invoicingStatus", () => {
  it("rozdělí aktivní klienty na vyfakturované a chybějící (dle mesicSluzby)", () => {
    const invoices: IssuedLite[] = [
      { klient: "IMTOS", mesicSluzby: 6, rokSluzby: 2026 },
      { klientNazev: "SENIMED", mesicSluzby: 6, rokSluzby: 2026 },
    ];
    const s = invoicingStatus(clients, invoices, 6, 2026);
    expect(s.invoiced.map((c) => c.name).sort()).toEqual(["IMTOS", "SENIMED"]);
    expect(s.pending.map((c) => c.name)).toEqual(["TEKMA"]);
  });

  it("ignoruje neaktivní klienty", () => {
    const s = invoicingStatus(clients, [], 6, 2026);
    expect(s.pending.map((c) => c.name)).not.toContain("Starý klient");
    expect(s.pending.length).toBe(3);
  });

  it("nezapočítá fakturu z jiného měsíce", () => {
    const invoices: IssuedLite[] = [{ klient: "IMTOS", mesicSluzby: 5, rokSluzby: 2026 }];
    const s = invoicingStatus(clients, invoices, 6, 2026);
    expect(s.pending.map((c) => c.name)).toContain("IMTOS");
  });

  it("fallback dle data vystavení (ISO i CZ)", () => {
    const invoices: IssuedLite[] = [
      { klient: "IMTOS", datumVystaveni: "2026-06-15" },
      { klient: "TEKMA", datumVystaveni: "3. 6. 2026" },
    ];
    const s = invoicingStatus(clients, invoices, 6, 2026);
    expect(s.invoiced.map((c) => c.name).sort()).toEqual(["IMTOS", "TEKMA"]);
  });

  it("match podle jména case/trim-insensitive", () => {
    const invoices: IssuedLite[] = [{ klient: "  imtos  ", mesicSluzby: 6, rokSluzby: 2026 }];
    const s = invoicingStatus(clients, invoices, 6, 2026);
    expect(s.invoiced.map((c) => c.name)).toContain("IMTOS");
  });
});
