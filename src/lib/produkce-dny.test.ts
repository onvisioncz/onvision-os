import { describe, it, expect } from "vitest";
import { tasksForDen, notifsForDen, odmenyByPerson, personDenView, publicDenView, type ProdukcniDen } from "./produkce-dny";

const den: ProdukcniDen = {
  id: 1, zdroj: "monthly", projekt: "IMTOS — natáčení", klient: "IMTOS",
  datum: "12. 8. 2026", popis: "Promo video CNC linky", lokace: "Moravany",
  people: [
    { jmeno: "Zdeněk", email: "zdenek@onvision.cz", ukol: "Kamera + světla", odmena: 4000 },
    { jmeno: "Matěj", email: "matej@onvision.cz", ukol: "Střih na místě", odmena: 3000 },
    { jmeno: "Michael", ukol: "Dron záběry", odmena: 5000 }, // externista bez účtu
  ],
  createdAt: "2026-08-01T10:00:00.000Z",
};

describe("tasksForDen", () => {
  const tasks = tasksForDen(den, 1000);
  it("vytvoří úkol pro každého člověka s vyplněným úkolem", () => {
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.prirazeno)).toEqual(["Zdeněk", "Matěj", "Michael"]);
  });
  it("úkol NEobsahuje žádnou částku ani odměnu", () => {
    const json = JSON.stringify(tasks);
    expect(json).not.toMatch(/odmena|4000|3000|5000|Kč/);
    expect(Object.keys(tasks[0]).sort()).toEqual(["deadline", "id", "nazev", "prirazeno", "priorita", "projekt", "status"].sort());
  });
  it("deadline = datum dne, projekt nese lokaci", () => {
    expect(tasks[0].deadline).toBe("12. 8. 2026");
    expect(tasks[0].projekt).toContain("Moravany");
  });
});

describe("notifsForDen", () => {
  const notifs = notifsForDen(den);
  it("cílí jen na lidi s e-mailem (účtem)", () => {
    expect(notifs).toHaveLength(2); // Michael bez e-mailu vynechán
    expect(notifs.map((n) => n.targetEmail)).toEqual(["zdenek@onvision.cz", "matej@onvision.cz"]);
  });
  it("notifikace nese úkol, ne celkovou cenu", () => {
    expect(notifs[0].body).toContain("Kamera");
    expect(JSON.stringify(notifs)).not.toMatch(/12000|celkem/);
  });
});

describe("odmenyByPerson", () => {
  const dny: ProdukcniDen[] = [
    den,
    { ...den, id: 2, datum: "20. 8. 2026", people: [{ jmeno: "Zdeněk", email: "zdenek@onvision.cz", ukol: "Focení", odmena: 2500 }] },
  ];
  it("sečte odměny a dny po lidech, seřadí sestupně", () => {
    const rows = odmenyByPerson(dny);
    const zdenek = rows.find((r) => r.jmeno === "Zdeněk")!;
    expect(zdenek.celkem).toBe(4000 + 2500);
    expect(zdenek.pocetDni).toBe(2);
    expect(rows[0].celkem).toBeGreaterThanOrEqual(rows[rows.length - 1].celkem);
  });
});

describe("personDenView — bez celkové ceny a cizích odměn", () => {
  it("vrátí jen můj úkol a moji odměnu", () => {
    const v = personDenView(den, "zdeněk")!;
    expect(v.mujUkol).toBe("Kamera + světla");
    expect(v.mojeOdmena).toBe(4000);
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/Matěj|Michael|3000|5000|12000/); // žádné cizí odměny/lidi
  });
  it("nepřiřazený člověk nevidí nic", () => {
    expect(personDenView(den, "Tereza")).toBeNull();
  });
});

describe("publicDenView — veřejný odkaz bez cenovek", () => {
  it("obsahuje logistiku + tým (jména+úkoly), ale ŽÁDNÉ odměny", () => {
    const v = publicDenView(den);
    expect(v.tym.map((t) => t.jmeno)).toEqual(["Zdeněk", "Matěj", "Michael"]);
    expect(Object.keys(v.tym[0]).sort()).toEqual(["jmeno", "ukol"]);
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/odmena|4000|3000|5000|Kč/); // žádné cenovky
  });
});
