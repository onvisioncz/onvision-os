import { describe, it, expect } from "vitest";
import { buildPersonView, buildZdenekView, buildGraficView, cleanStatus, type RawZ, type RawG, type RawPending } from "./produkce-share";

const zEntries: RawZ[] = [
  { mesic: "Únor", datum: "10. 2.", projekt: "NERA", format: "CELODENNÍ", status: "✅", poznamka: "" },
  { mesic: "Leden", datum: "4. 1.", projekt: "SK Brno", format: "3 HOD", status: "✅", poznamka: "NEVYČERPANÉ" },
  { mesic: "Duben", datum: "15. 4.", projekt: "POWER PLATE", format: "CELODENNÍ", status: "✅", poznamka: "NADPRACOVANÉ" },
];
const pending: RawPending[] = [
  { type: "NADPRACOVANÉ", datum: "15. 4.", projekt: "POWER PLATE", mesicOrigin: "Duben", assignedMesic: "", settled: false },
  { type: "NADPRACOVANÉ", datum: "17. 4.", projekt: "FIRESTA", mesicOrigin: "Duben", assignedMesic: "", settled: false },
  { type: "NEVYČERPANÉ", datum: "4. 1.", projekt: "SK Brno", mesicOrigin: "Leden", assignedMesic: "", settled: false },
  { type: "NEVYČERPANÉ", datum: "1. 1.", projekt: "staré", mesicOrigin: "Leden", assignedMesic: "Únor", settled: true }, // vyřízené → nepočítá
];

describe("buildZdenekView", () => {
  const v = buildZdenekView(zEntries, pending);
  it("seskupí měsíce chronologicky", () => {
    expect(v.months.map((m) => m.mesic)).toEqual(["Leden", "Únor", "Duben"]);
  });
  it("bilance počítá jen nevyřízené dny", () => {
    expect(v.balance).toEqual({ nadpracovane: 2, nevycerpane: 1 });
  });
  it("neobsahuje žádné částky (jen bezpečná pole)", () => {
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/castka|Kč/);
    const keys = Object.keys(v.months[0].items[0]);
    expect(keys.sort()).toEqual(["datum", "detail", "poznamka", "projekt", "status"]);
  });
  it("neobsahuje žádné emoji ve stavu — jen čisté tokeny", () => {
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/[✅❓❌⚠️🎬]/u);
    for (const m of v.months) for (const it of m.items) {
      expect(["hotovo", "ceka", ""]).toContain(it.status);
    }
  });
  it("jméno a role z metadat", () => {
    expect(v.jmeno).toBe("Zdeněk Dolíhal");
    expect(v.zaznamu).toBe(3);
  });
});

describe("buildGraficView", () => {
  const g: RawG[] = [
    { grafik: "Monika", mesic: "Únor", datum: "", projekt: "EASTGATE", popis: "Projekt komplet", status: "✅", poznamka: "PROPLACENO" },
    { grafik: "Patrik", mesic: "Únor", datum: "", projekt: "YONEX", popis: "Carousel", status: "✅", poznamka: "" },
  ];
  it("filtruje sdílený klíč jen na daného grafika", () => {
    const monika = buildGraficView(g, "Monika");
    expect(monika.zaznamu).toBe(1);
    expect(monika.person).toBe("monika");
    expect(monika.months[0].items[0].projekt).toBe("EASTGATE");
  });
  it("grafik nemá bilanci dní (není paušál)", () => {
    expect(buildGraficView(g, "Patrik").balance).toBeNull();
  });
  it("detail nese popis grafiky, žádnou částku", () => {
    expect(JSON.stringify(buildGraficView(g, "Monika"))).not.toMatch(/castka|4500|Kč/);
  });
});

describe("buildPersonView dispečer", () => {
  it("prázdná data nespadnou", () => {
    for (const p of ["zdenek", "matej", "monika", "patrik"] as const) {
      const v = buildPersonView(p, {});
      expect(v.person).toBe(p);
      expect(v.months).toEqual([]);
      expect(v.zaznamu).toBe(0);
    }
  });
});

describe("cleanStatus", () => {
  it("mapuje emoji na čisté tokeny", () => {
    expect(cleanStatus("✅")).toBe("hotovo");
    expect(cleanStatus("❓")).toBe("ceka");
    expect(cleanStatus("")).toBe("");
    expect(cleanStatus("hotovo")).toBe("hotovo");
  });
});
