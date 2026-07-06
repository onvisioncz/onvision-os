import { describe, it, expect } from "vitest";
import {
  privacyNoticeText, modelReleaseText, gdprStatusForClients, gdprSummary,
  type ConsentRecord,
} from "../gdpr";

const mk = (o: Partial<ConsentRecord>): ConsentRecord => ({
  id: 1, klient: "SENIMED s.r.o.", stav: "informovan", datum: "2026-07-01",
  zpusob: "e-mail", updatedAt: "2026-07-01T10:00:00Z", ...o,
});

describe("privacyNoticeText", () => {
  it("obsahuje správce, IČO a jméno klienta", () => {
    const t = privacyNoticeText("SENIMED s.r.o.");
    expect(t).toContain("OnVision s.r.o.");
    expect(t).toContain("23052341");
    expect(t).toContain("SENIMED s.r.o.");
    expect(t).toContain("ochranu osobních údajů");
  });
});

describe("modelReleaseText", () => {
  it("předvyplní osobu a účel", () => {
    const t = modelReleaseText({ osoba: "Jan Novák", ucel: "kampaň XY" });
    expect(t).toContain("Jan Novák");
    expect(t).toContain("kampaň XY");
    expect(t).toContain("odvolat");
  });
  it("bez osoby dá prázdné pole", () => {
    expect(modelReleaseText({})).toContain("____");
  });
});

describe("gdprStatusForClients", () => {
  it("označí pokryté a chybějící klienty", () => {
    const records = [mk({ klient: "SENIMED s.r.o.", stav: "souhlas" })];
    const st = gdprStatusForClients(["SENIMED s.r.o.", "IMTOS"], records);
    expect(st[0].covered).toBe(true);
    expect(st[1].covered).toBe(false);
    expect(st[1].record).toBeNull();
  });

  it("odmítnuto se nepočítá jako pokryté", () => {
    const records = [mk({ klient: "IMTOS", stav: "odmitnuto" })];
    const st = gdprStatusForClients(["IMTOS"], records);
    expect(st[0].covered).toBe(false);
  });

  it("bere nejnovější záznam", () => {
    const records = [
      mk({ id: 1, klient: "X", stav: "nevyrizeno", updatedAt: "2026-01-01T00:00:00Z" }),
      mk({ id: 2, klient: "X", stav: "souhlas", updatedAt: "2026-06-01T00:00:00Z" }),
    ];
    const st = gdprStatusForClients(["X"], records);
    expect(st[0].record?.id).toBe(2);
    expect(st[0].covered).toBe(true);
  });
});

describe("gdprSummary", () => {
  it("spočítá pokryté a chybějící", () => {
    const st = gdprStatusForClients(
      ["A", "B", "C"],
      [mk({ klient: "A", stav: "souhlas" })]
    );
    const sum = gdprSummary(st);
    expect(sum.total).toBe(3);
    expect(sum.covered).toBe(1);
    expect(sum.missing).toBe(2);
    expect(sum.missingNames).toEqual(["B", "C"]);
  });
});
