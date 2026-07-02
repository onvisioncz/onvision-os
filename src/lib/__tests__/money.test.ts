/**
 * Testy na peníze (roadmap #22) — čisté funkce, na kterých stojí čísla
 * ve firmě: parsování termínů, faktury po splatnosti, ziskovost, výkazy,
 * číslování faktur a QR platby. Kdykoli se něco z tohohle rozbije,
 * jednatelé uvidí špatná čísla — proto testy.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseDeadline, daysUntil, fmtDeadline, isValidCzDate } from "../dates";
import { overdueInvoices } from "../overdue";
import { buildProfit, invoiceYear } from "../ziskovost";
import { laborByClient, sumBy, type TimeEntry } from "../vykazy";
import { buildCisloFaktury, buildSpdString, addDays, lastDayOfMonth, firstWorkday, type Dodavatel } from "../invoice";

/* ── Pevné „dnes" pro deterministické testy ─────────────────────────── */
const NOW = new Date(2026, 6, 3, 10, 0, 0); // 3. 7. 2026, 10:00

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

/* ── dates ──────────────────────────────────────────────────────────── */
describe("parseDeadline", () => {
  it("parsuje český krátký zápis (rok = aktuální)", () => {
    const d = parseDeadline("25. 5.")!;
    expect([d.getDate(), d.getMonth(), d.getFullYear()]).toEqual([25, 4, 2026]);
  });
  it("parsuje český zápis s rokem i bez mezer", () => {
    const d = parseDeadline("8.7.2027")!;
    expect([d.getDate(), d.getMonth(), d.getFullYear()]).toEqual([8, 6, 2027]);
  });
  it("parsuje ISO (quick-add / Telegram)", () => {
    const d = parseDeadline("2026-05-29")!;
    expect([d.getDate(), d.getMonth(), d.getFullYear()]).toEqual([29, 4, 2026]);
  });
  it("vrací null pro nesmysl", () => {
    expect(parseDeadline("")).toBeNull();
    expect(parseDeadline("zítra")).toBeNull();
  });
});

describe("daysUntil", () => {
  it("dnes = 0, včera = -1, zítra = +1 (celé dny, bez vlivu času)", () => {
    expect(daysUntil(new Date(2026, 6, 3, 23, 59))).toBe(0);
    expect(daysUntil(new Date(2026, 6, 2))).toBe(-1);
    expect(daysUntil(new Date(2026, 6, 4, 0, 1))).toBe(1);
  });
});

describe("isValidCzDate", () => {
  it("odhalí neexistující datum (31. 6.) — JS by tiše přetekl", () => {
    expect(isValidCzDate("31.6.2026")).toBe(false);
  });
  it("přestupný rok: 29.2.2024 ano, 29.2.2026 ne", () => {
    expect(isValidCzDate("29.2.2024")).toBe(true);
    expect(isValidCzDate("29.2.2026")).toBe(false);
  });
  it("platné datum projde", () => {
    expect(isValidCzDate("8.7.2026")).toBe(true);
    expect(isValidCzDate("8. 7. 2026")).toBe(true);
  });
});

describe("fmtDeadline", () => {
  it("aktuální rok bez roku, jiný rok s rokem", () => {
    expect(fmtDeadline("2026-05-29")).toBe("29. 5.");
    expect(fmtDeadline("29. 5. 2027")).toBe("29. 5. 2027");
  });
});

/* ── overdue (jeden zdroj pravdy pro dluhy) ─────────────────────────── */
describe("overdueInvoices", () => {
  it("slučuje oba sklady a deduplikuje podle čísla", () => {
    const issued = [{ cislo: "FV-1", klient: "A", castka: 100, stav: "Čeká na platbu", datumSplatnosti: "1.6.2026" }];
    const finance = [
      { cislo: "FV-1", klient: "A", castka: 100, stav: "Po splatnosti", splatnost: "1.6.2026" }, // duplicitní
      { cislo: "FV-2", klient: "B", castka: 200, stav: "Po splatnosti", splatnost: "1.5.2026" },
    ];
    const r = overdueInvoices(issued, finance);
    expect(r.count).toBe(2);
    expect(r.total).toBe(300);
  });
  it("Zaplacena a Storno se nepočítají", () => {
    const r = overdueInvoices([
      { cislo: "a", klient: "A", castka: 5, stav: "Zaplacena", datumSplatnosti: "1.1.2026" },
      { cislo: "b", klient: "B", castka: 7, stav: "Storno", datumSplatnosti: "1.1.2026" },
    ]);
    expect(r.count).toBe(0);
  });
  it("splatnost dnes ještě nehoří, včera ano", () => {
    const r = overdueInvoices([
      { cislo: "dnes", klient: "A", castka: 1, stav: "Čeká na platbu", datumSplatnosti: "3.7.2026" },
      { cislo: "vcera", klient: "B", castka: 2, stav: "Čeká na platbu", datumSplatnosti: "2.7.2026" },
    ]);
    expect(r.count).toBe(1);
    expect(r.items[0].cislo).toBe("vcera");
    expect(r.items[0].dnuPoSplatnosti).toBe(1);
  });
  it("bez splatnosti: fallback vystavení + 14 dní", () => {
    const r = overdueInvoices([
      { cislo: "old", klient: "A", castka: 47000, stav: "Čeká na platbu", datumVystaveni: "1.5.2026" },
      { cislo: "fresh", klient: "B", castka: 1, stav: "Čeká na platbu", datumVystaveni: "1.7.2026" },
    ]);
    expect(r.count).toBe(1);
    expect(r.items[0].cislo).toBe("old");
  });
  it("řadí od největší částky a sčítá total", () => {
    const r = overdueInvoices([
      { cislo: "m", klient: "A", castka: 10, stav: "Čeká na platbu", datumSplatnosti: "1.6.2026" },
      { cislo: "v", klient: "B", castka: 99, stav: "Čeká na platbu", datumSplatnosti: "1.6.2026" },
    ]);
    expect(r.items[0].castka).toBe(99);
    expect(r.total).toBe(109);
  });
});

/* ── ziskovost ──────────────────────────────────────────────────────── */
describe("invoiceYear", () => {
  it("preferuje rokSluzby, fallback rok z data vystavení", () => {
    expect(invoiceYear({ klient: "A", castka: 1, datumVystaveni: "1.5.2026", rokSluzby: 2025, stav: "x" })).toBe(2025);
    expect(invoiceYear({ klient: "A", castka: 1, datumVystaveni: "1.5.2026", rokSluzby: 0, stav: "x" })).toBe(2026);
  });
});

describe("buildProfit", () => {
  const inv = (klient: string, castka: number, stav = "Zaplacena", rok = 2026) =>
    ({ klient, castka, stav, rokSluzby: rok, datumVystaveni: `1.1.${rok}` });
  it("zisk = příjmy − náklady, marže v %", () => {
    const rows = buildProfit(
      [inv("A", 1000)],
      [{ id: 1, klient: "A", rok: 2026, typ: "Odměny", popis: "", castka: 400 }],
      2026, false
    );
    expect(rows[0]).toMatchObject({ klient: "A", prijmy: 1000, naklady: 400, zisk: 600, marze: 60 });
  });
  it("jenZaplacene vynechá čekající faktury", () => {
    const rows = buildProfit([inv("A", 1000, "Čeká na platbu")], [], 2026, true);
    expect(rows.length).toBe(0);
  });
  it("filtruje podle roku", () => {
    const rows = buildProfit([inv("A", 1000, "Zaplacena", 2025)], [], 2026, false);
    expect(rows.length).toBe(0);
  });
  it("labor (výkazy) se přičítá k nákladům", () => {
    const rows = buildProfit([inv("A", 1000)], [], 2026, false, new Map([["A", 300]]));
    expect(rows[0].naklady).toBe(300);
    expect(rows[0].zisk).toBe(700);
  });
  it("klient jen s náklady = marže -100 %", () => {
    const rows = buildProfit([], [{ id: 1, klient: "X", rok: 2026, typ: "Ostatní", popis: "", castka: 50 }], 2026, false);
    expect(rows[0].marze).toBe(-100);
  });
});

/* ── vykazy ─────────────────────────────────────────────────────────── */
describe("laborByClient", () => {
  const e = (kdo: string, klient: string, datum: string, hodiny: number): TimeEntry =>
    ({ id: 1, kdo, klient, projekt: "", datum, hodiny, popis: "" });
  it("hodiny × sazba, filtr roku, bez sazby se nepočítá", () => {
    const m = laborByClient(
      [e("Adam", "A", "2026-05-01", 10), e("Adam", "A", "2025-05-01", 99), e("Bez", "A", "2026-05-01", 5)],
      { Adam: 500 }, 2026
    );
    expect(m.get("A")).toBe(5000);
  });
});

describe("sumBy", () => {
  it("sčítá hodiny za měsíc podle klíče a řadí sestupně", () => {
    const es: TimeEntry[] = [
      { id: 1, kdo: "Adam", klient: "A", projekt: "", datum: "2026-07-01", hodiny: 2, popis: "" },
      { id: 2, kdo: "Adam", klient: "B", projekt: "", datum: "2026-07-02", hodiny: 5, popis: "" },
      { id: 3, kdo: "Adam", klient: "A", projekt: "", datum: "2026-06-30", hodiny: 9, popis: "" },
    ];
    const r = sumBy(es, "2026-07", "klient");
    expect(r).toEqual([{ name: "B", hodiny: 5 }, { name: "A", hodiny: 2 }]);
  });
});

/* ── invoice ────────────────────────────────────────────────────────── */
describe("buildCisloFaktury", () => {
  it("YY + řada(2) + měsíc(5) — formát 261500004", () => {
    expect(buildCisloFaktury(2026, 15, 4)).toBe("261500004");
    expect(buildCisloFaktury(2026, 2, 12)).toBe("260200012");
  });
});

describe("buildSpdString", () => {
  it("QR platba: IBAN bez mezer, částka na 2 desetinná místa, VS", () => {
    const dod = { iban: "CZ12 3456 7890" } as unknown as Dodavatel;
    const s = buildSpdString(dod, 18000, "202600020", "Faktura 202600020");
    expect(s).toBe("SPD*1.0*ACC:CZ1234567890*AM:18000.00*CC:CZK*MSG:Faktura 202600020*X-VS:202600020");
  });
});

describe("date math (kalendář se nerozbije)", () => {
  it("addDays přetéká měsíc správně (26.6. + 5 = 1.7.)", () => {
    const d = addDays(new Date(2026, 5, 26), 5);
    expect([d.getDate(), d.getMonth()]).toEqual([1, 6]);
  });
  it("lastDayOfMonth: červen 30, únor 2026 28", () => {
    expect(lastDayOfMonth(2026, 6).getDate()).toBe(30);
    expect(lastDayOfMonth(2026, 2).getDate()).toBe(28);
  });
  it("firstWorkday přeskočí víkend (1.3.2026 je neděle → 2.3.)", () => {
    const d = firstWorkday(2026, 3);
    expect(d.getDate()).toBe(2);
  });
});
