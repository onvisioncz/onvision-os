import { describe, it, expect } from "vitest";
import {
  isoWeekKey, weekRange, outlookStatus, missingAuthors, submitKey, pastSundayDeadline,
  type OutlookEntry, type OutlookSubmits,
} from "../weekly-outlook";

const AUTHORS = ["zdenek@onvision.cz", "tereza@onvision.cz", "david@onvision.cz"];

describe("isoWeekKey", () => {
  it("spočítá ISO týden", () => {
    expect(isoWeekKey(new Date(2026, 6, 8))).toBe("2026-W28"); // středa 8.7.2026
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe("2026-W01"); // 1.1.2026 (čtvrtek)
  });
  it("konec roku patří do správného ISO týdne", () => {
    // 31.12.2024 je úterý → ISO týden 1 roku 2025
    expect(isoWeekKey(new Date(2024, 11, 31))).toBe("2025-W01");
  });
});

describe("weekRange", () => {
  it("vrátí pondělí–neděli", () => {
    const r = weekRange("2026-W28")!;
    expect(r.from.getDay()).toBe(1); // pondělí
    expect(r.to.getDay()).toBe(0);   // neděle
    expect((r.to.getTime() - r.from.getTime()) / 86400000).toBe(6);
  });
  it("nevalidní klíč → null", () => {
    expect(weekRange("blah")).toBeNull();
  });
});

const mk = (o: Partial<OutlookEntry>): OutlookEntry => ({
  id: 0, weekKey: "2026-W28", autorEmail: "zdenek@onvision.cz", autorName: "Zdeněk",
  klient: "SENIMED s.r.o.", datum: "", typ: "VIDEO", popis: "", copywriter: "", vizual: "", createdAt: "", ...o,
});
const entries: OutlookEntry[] = [
  mk({ id: 1, klient: "DIAM s.r.o. (Toffi)", typ: "CAROUSEL", popis: "novinka" }),
  mk({ id: 2, klient: "SENIMED s.r.o.", typ: "GRAFIKA", popis: "akce" }),
  mk({ id: 3, weekKey: "2026-W27", autorEmail: "tereza@onvision.cz", autorName: "Tereza", klient: "Nali Vital s.r.o. (POWERPLATE)", typ: "VIDEO", popis: "x" }),
];

describe("outlookStatus", () => {
  const submits: OutlookSubmits = { [submitKey("2026-W28", "zdenek@onvision.cz")]: "2026-07-05T17:00:00Z" };
  const st = outlookStatus(entries, submits, "2026-W28", AUTHORS);

  it("spočítá počty a submit stav per autor", () => {
    const z = st.find((s) => s.email === "zdenek@onvision.cz")!;
    expect(z.entryCount).toBe(2);
    expect(z.submitted).toBe(true);
    const t = st.find((s) => s.email === "tereza@onvision.cz")!;
    expect(t.entryCount).toBe(0);       // její záznam je v jiném týdnu
    expect(t.submitted).toBe(false);
  });
});

describe("missingAuthors", () => {
  it("vrátí neodevzdané autory", () => {
    const submits: OutlookSubmits = { [submitKey("2026-W28", "zdenek@onvision.cz")]: "x" };
    const missing = missingAuthors(entries, submits, "2026-W28", AUTHORS);
    expect(missing).toEqual(["tereza@onvision.cz", "david@onvision.cz"]);
  });
  it("všichni odevzdali → prázdné", () => {
    const submits: OutlookSubmits = Object.fromEntries(AUTHORS.map((a) => [submitKey("2026-W28", a), "x"]));
    expect(missingAuthors(entries, submits, "2026-W28", AUTHORS)).toEqual([]);
  });
});

describe("pastSundayDeadline", () => {
  it("neděle 19:00 Praha (léto) → true", () => {
    // 5.7.2026 je neděle; 17:00Z = 19:00 CEST
    expect(pastSundayDeadline(new Date("2026-07-05T17:00:00Z"))).toBe(true);
  });
  it("neděle 15:00 Praha → false (před deadline)", () => {
    // 11:00Z = 13:00 CEST
    expect(pastSundayDeadline(new Date("2026-07-05T11:00:00Z"))).toBe(false);
  });
  it("pondělí → false", () => {
    expect(pastSundayDeadline(new Date("2026-07-06T17:00:00Z"))).toBe(false);
  });
});
