import { describe, it, expect } from "vitest";
import {
  appendSnapshot, snapshotDaysAgo, mrrTrend, detectAnomalies, type MrrSnapshot,
} from "../mrr-history";

const S = (date: string, mrr: number, pohledavky = 0): MrrSnapshot => ({ date, mrr, klientu: 9, pohledavky, rizik: 0 });

describe("appendSnapshot", () => {
  it("nahradí snímek stejného dne (žádné duplicity)", () => {
    let h: MrrSnapshot[] = [];
    h = appendSnapshot(h, S("2026-07-01", 100));
    h = appendSnapshot(h, S("2026-07-01", 120));
    expect(h).toHaveLength(1);
    expect(h[0].mrr).toBe(120);
  });
  it("řadí chronologicky", () => {
    let h: MrrSnapshot[] = [];
    h = appendSnapshot(h, S("2026-07-03", 3));
    h = appendSnapshot(h, S("2026-07-01", 1));
    h = appendSnapshot(h, S("2026-07-02", 2));
    expect(h.map((s) => s.mrr)).toEqual([1, 2, 3]);
  });
});

describe("snapshotDaysAgo", () => {
  const h = [S("2026-06-01", 200), S("2026-06-20", 220), S("2026-07-01", 245)];
  it("najde snímek starý alespoň N dní", () => {
    expect(snapshotDaysAgo(h, 30)?.date).toBe("2026-06-01"); // 30 dní zpět od 1.7. = 1.6.
    expect(snapshotDaysAgo(h, 10)?.date).toBe("2026-06-20");
  });
});

describe("mrrTrend", () => {
  it("spočítá růst v % vůči starší hodnotě", () => {
    const h = [S("2026-06-01", 200), S("2026-07-01", 250)];
    const t = mrrTrend(h, 30)!;
    expect(t.deltaAbs).toBe(50);
    expect(t.deltaPct).toBe(25);
    expect(t.direction).toBe("up");
  });
  it("null když není starší snímek", () => {
    expect(mrrTrend([S("2026-07-01", 250)], 30)).toBeNull();
  });
});

describe("detectAnomalies", () => {
  it("odhalí propad MRR nad práh", () => {
    const h = [S("2026-07-01", 250000), S("2026-07-02", 200000)]; // -20 %
    const a = detectAnomalies(h, 5);
    expect(a.some((x) => x.metric === "mrr")).toBe(true);
  });
  it("ignoruje malý pohyb MRR", () => {
    const h = [S("2026-07-01", 250000), S("2026-07-02", 248000)]; // -0.8 %
    expect(detectAnomalies(h, 5).some((x) => x.metric === "mrr")).toBe(false);
  });
  it("odhalí skok pohledávek", () => {
    const h = [S("2026-07-01", 250000, 10000), S("2026-07-02", 250000, 60000)]; // +500 %
    expect(detectAnomalies(h).some((x) => x.metric === "pohledavky")).toBe(true);
  });
  it("prázdná/krátká historie → žádné anomálie", () => {
    expect(detectAnomalies([])).toEqual([]);
    expect(detectAnomalies([S("2026-07-01", 100)])).toEqual([]);
  });
});
