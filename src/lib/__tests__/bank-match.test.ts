import { describe, it, expect } from "vitest";
import { parseAmount, parseBankCsv, matchPayments, type BankTx } from "../bank-match";
import type { AnyInvoice } from "../overdue";

describe("parseAmount", () => {
  it("český formát s čárkou", () => {
    expect(parseAmount("1 234,56")).toBe(1234.56);
    expect(parseAmount("12345")).toBe(12345);
    expect(parseAmount("1234,00 Kč")).toBe(1234);
  });
  it("anglický formát s tečkou / tisíci", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("1234.5")).toBe(1234.5);
  });
  it("nevalidní → NaN", () => {
    expect(Number.isNaN(parseAmount(""))).toBe(true);
    expect(Number.isNaN(parseAmount("-"))).toBe(true);
  });
});

describe("parseBankCsv", () => {
  it("rozparsuje ; CSV s českými hlavičkami, jen příchozí platby", () => {
    const csv = [
      "Datum;Částka;Variabilní symbol;Zpráva;Protistrana",
      "01.06.2026;12 345,00;2601000016;Faktura;IMTOS s.r.o.",
      "02.06.2026;-500,00;;Poplatek;Banka",           // odchozí → vynechat
      "03.06.2026;5000;2601000017;;SENIMED",
    ].join("\n");
    const txs = parseBankCsv(csv);
    expect(txs.length).toBe(2);
    expect(txs[0]).toMatchObject({ amount: 12345, vs: "2601000016" });
    expect(txs[1]).toMatchObject({ amount: 5000, vs: "2601000017" });
  });
  it("zvládne , oddělovač", () => {
    const csv = "amount,vs,date\n1000,123,2026-06-01";
    const txs = parseBankCsv(csv);
    expect(txs[0]).toMatchObject({ amount: 1000, vs: "123" });
  });
  it("prázdné / bez částky → []", () => {
    expect(parseBankCsv("")).toEqual([]);
    expect(parseBankCsv("datum;protistrana\n01.06.2026;X")).toEqual([]);
  });
});

describe("matchPayments", () => {
  const invoices: AnyInvoice[] = [
    { cislo: "2601000016", klient: "IMTOS", castka: 12345, stav: "Vystavena" },
    { cislo: "2601000017", klient: "SENIMED", castka: 5000, stav: "Vystavena" },
    { cislo: "2601000018", klient: "TEKMA", castka: 5000, stav: "Vystavena" },
    { cislo: "2601000019", klient: "Placená", castka: 999, stav: "Zaplacena" },
  ];

  it("VS + částka = high", () => {
    const tx: BankTx = { amount: 12345, vs: "2601000016", date: "", message: "", counterparty: "" };
    const [m] = matchPayments([tx], invoices);
    expect(m.confidence).toBe("high");
    expect(m.invoiceCislo).toBe("2601000016");
  });

  it("jen částka jednoznačná (bez VS) = medium", () => {
    const tx: BankTx = { amount: 12345, vs: "", date: "", message: "", counterparty: "" };
    const [m] = matchPayments([tx], invoices);
    expect(m.confidence).toBe("medium");
    expect(m.invoiceCislo).toBe("2601000016");
  });

  it("částka nejednoznačná (2 faktury po 5000) bez VS → žádný medium", () => {
    const tx: BankTx = { amount: 5000, vs: "", date: "", message: "", counterparty: "" };
    const res = matchPayments([tx], invoices);
    expect(res.length).toBe(0);
  });

  it("VS sedí, částka ne = low", () => {
    const tx: BankTx = { amount: 9999, vs: "2601000017", date: "", message: "", counterparty: "" };
    const [m] = matchPayments([tx], invoices);
    expect(m.confidence).toBe("low");
    expect(m.invoiceCislo).toBe("2601000017");
  });

  it("nepáruje na už zaplacené faktury", () => {
    const tx: BankTx = { amount: 999, vs: "2601000019", date: "", message: "", counterparty: "" };
    expect(matchPayments([tx], invoices).length).toBe(0);
  });
});
