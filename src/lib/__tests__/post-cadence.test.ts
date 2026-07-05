import { describe, it, expect } from "vitest";
import { cadenceByClient, cadenceSummary, ymOf, type CadencePost, type CadenceClient } from "../post-cadence";

const clients: CadenceClient[] = [
  { name: "SENIMED", aktivni: true, postyMesic: 4 },
  { name: "TOFFI", aktivni: true },                 // default target
  { name: "TICHO s.r.o.", aktivni: true },          // žádné posty
  { name: "STARÝ", aktivni: false },                // neaktivní → vynechán
];

const posts: CadencePost[] = [
  { klient: "SENIMED", datum: "2026-07-03", status: "publikovano" },
  { klient: "SENIMED", datum: "2026-07-10", status: "publikovano" },
  { klient: "SENIMED", datum: "2026-07-20", status: "schvaleno" },   // naplánováno
  { klient: "TOFFI", datum: "2026-07-05", status: "publikovano" },
  { klient: "STARÝ", datum: "2026-07-05", status: "publikovano" },   // neaktivní klient
  { klient: "SENIMED", datum: "2026-06-30", status: "publikovano" }, // jiný měsíc
];

describe("ymOf", () => {
  it("vezme YYYY-MM z ISO", () => expect(ymOf("2026-07-20")).toBe("2026-07"));
});

describe("cadenceByClient", () => {
  const rows = cadenceByClient(posts, clients, "2026-07", 8);

  it("vynechá neaktivní klienty", () => {
    expect(rows.find((r) => r.klient === "STARÝ")).toBeUndefined();
    expect(rows).toHaveLength(3);
  });

  it("počítá publikováno vs naplánováno v daném měsíci", () => {
    const s = rows.find((r) => r.klient === "SENIMED")!;
    expect(s.publikovano).toBe(2);   // červnový se nepočítá
    expect(s.naplanovano).toBe(1);
    expect(s.celkem).toBe(3);
    expect(s.cil).toBe(4);           // vlastní cíl
    expect(s.band).toBe("pozadu");   // 3 < 4
  });

  it("klient bez postů = ticho", () => {
    expect(rows.find((r) => r.klient === "TICHO s.r.o.")!.band).toBe("ticho");
  });

  it("používá default cíl bez postyMesic", () => {
    expect(rows.find((r) => r.klient === "TOFFI")!.cil).toBe(8);
  });

  it("řadí nejrizikovější první (ticho → pozadu → ok)", () => {
    expect(rows[0].band).toBe("ticho");
  });
});

describe("cadenceSummary", () => {
  it("sečte pásma", () => {
    const s = cadenceSummary(cadenceByClient(posts, clients, "2026-07", 8));
    expect(s.klientu).toBe(3);
    expect(s.ticho).toBe(1);
    expect(s.pozadu).toBe(2);  // SENIMED (3<4) i TOFFI (1<8)
  });
});
