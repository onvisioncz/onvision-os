import { describe, it, expect } from "vitest";
import {
  KEY_WRITE_ROLES, KEY_READ_ROLES,
  canReadKey, canWriteKey, redactForRead, readNeedsRoles, mergeProtectedWrite,
} from "../sync-acl";
import type { Role } from "../roles";

describe("sync-acl invariant: read ⊇ write", () => {
  // Kdo smí zapisovat klíč, musí ho smět i číst — jinak načte prázdno a přepíše data.
  for (const [key, writeRoles] of Object.entries(KEY_WRITE_ROLES)) {
    it(`${key}: každá zapisující role smí číst`, () => {
      const readRoles = KEY_READ_ROLES[key];
      for (const wr of writeRoles) {
        if (wr === "admin") continue; // admin má vždy vše
        // buď klíč není čtecně gated (čte kdokoli), nebo je role v read-listu
        const allowed = !readRoles || readRoles.includes(wr);
        expect(allowed, `role "${wr}" zapisuje "${key}", ale nesmí číst`).toBe(true);
      }
    });
  }
});

describe("canReadKey", () => {
  it("admin přečte cokoli", () => {
    expect(canReadKey("ov-odmeny", ["admin"], "x@y.cz")).toBe(true);
    expect(canReadKey("ov-neznamy-klic", ["admin"], "x@y.cz")).toBe(true);
  });

  it("SMM nesmí číst výplaty ani ceny finance", () => {
    expect(canReadKey("ov-odmeny", ["smm"], "smm@onvision.cz")).toBe(false);
    expect(canReadKey("ov-finance-faktury", ["smm"], "smm@onvision.cz")).toBe(false);
    expect(canReadKey("ov-issued-invoices", ["smm"], "smm@onvision.cz")).toBe(false);
  });

  it("fakturace a účetní čtou finance", () => {
    expect(canReadKey("ov-odmeny", ["fakturace"], "f@onvision.cz")).toBe(true);
    expect(canReadKey("ov-odmeny", ["ucetni"], "u@onvision.cz")).toBe(false); // ucetni už finance nečte
    expect(canReadKey("ov-finance-faktury", ["fakturace"], "f@onvision.cz")).toBe(true);
  });

  it("provozní klíče čte kdokoli přihlášený", () => {
    expect(canReadKey("ov-ukoly-tasks", ["produkce"], "p@onvision.cz")).toBe(true);
    expect(canReadKey("ov-outputs", ["grafik"], "g@onvision.cz")).toBe(true);
    expect(canReadKey("ov-gear", ["smm"], "s@onvision.cz")).toBe(true);
  });

  it("reklamy: jen admin nebo povolený e-mail", () => {
    expect(canReadKey("ov-ads", ["smm"], "smm@onvision.cz")).toBe(false);
    expect(canReadKey("ov-ads", ["smm"], "tomas@onvision.cz")).toBe(true);
    expect(canReadKey("ov-ads", ["admin"], "kdokoli@x.cz")).toBe(true);
  });
});

describe("canWriteKey", () => {
  it("neznámý klíč smí zapsat jen admin", () => {
    expect(canWriteKey("ov-neznamy", ["smm"], "s@onvision.cz")).toBe(false);
    expect(canWriteKey("ov-neznamy", ["admin"], "a@onvision.cz")).toBe(true);
  });

  it("SMM nesmí zapsat finance, ale smí úkoly a příspěvky", () => {
    expect(canWriteKey("ov-finance-faktury", ["smm"], "s@onvision.cz")).toBe(false);
    expect(canWriteKey("ov-smm-posts", ["smm"], "s@onvision.cz")).toBe(true);
    expect(canWriteKey("ov-ukoly-tasks", ["smm"], "s@onvision.cz")).toBe(true);
  });
});

describe("redactForRead — ceny měsíčních klientů", () => {
  const clients = [
    { id: 1, name: "SENIMED s.r.o.", logo: "S", pausal: 50000, reklama: 8000, aktivni: true },
    { id: 2, name: "IMTOS", logo: "I", pausal: 35000, aktivni: true },
  ];

  it("SMM nevidí pausál ani cenu reklamy, ale vidí jméno", () => {
    const out = redactForRead("ov-monthly-clients", clients, ["smm"]) as Record<string, unknown>[];
    expect(out[0].name).toBe("SENIMED s.r.o.");
    expect(out[0].pausal).toBeUndefined();
    expect(out[0].reklama).toBeUndefined();
    expect(out[1].pausal).toBeUndefined();
  });

  it("fakturace, účetní a admin vidí ceny", () => {
    for (const roles of [["fakturace"], ["admin"]] as Role[][]) {
      const out = redactForRead("ov-monthly-clients", clients, roles) as Record<string, unknown>[];
      expect(out[0].pausal).toBe(50000);
    }
  });

  it("nemění nechráněné klíče", () => {
    const notes = [{ id: 1, text: "cokoliv" }];
    expect(redactForRead("ov-quick-notes", notes, ["smm"])).toBe(notes);
  });
});

describe("readNeedsRoles", () => {
  it("gated a redagované klíče vyžadují role", () => {
    expect(readNeedsRoles("ov-odmeny")).toBe(true);
    expect(readNeedsRoles("ov-monthly-clients")).toBe(true);
    expect(readNeedsRoles("ov-ads")).toBe(true);
  });
  it("provozní klíče roli nevyžadují (rychlá cesta)", () => {
    expect(readNeedsRoles("ov-outputs")).toBe(false);
    expect(readNeedsRoles("ov-gear")).toBe(false);
  });
});

describe("ov-notif-events: adminOnly redakce (selfcheck nálezy s částkami)", () => {
  const events = [
    { id: "t1", type: "task_assigned", title: "Úkol", targetEmail: "a@b.cz" },
    { id: "s1", type: "task_assigned", title: "Self-check", body: "Cash-gap: 120 000 Kč", targetEmail: null, adminOnly: true },
  ];
  it("ne-admin dostane eventy bez adminOnly položek", () => {
    const out = redactForRead("ov-notif-events", events, ["smm"]) as { id: string }[];
    expect(out.map((e) => e.id)).toEqual(["t1"]);
  });
  it("admin vidí vše", () => {
    const out = redactForRead("ov-notif-events", events, ["admin"]) as { id: string }[];
    expect(out).toHaveLength(2);
  });
  it("čtení eventů vyžaduje role (kvůli redakci), ale nezakazuje ne-adminům", () => {
    expect(readNeedsRoles("ov-notif-events")).toBe(true);
    expect(canReadKey("ov-notif-events", ["smm"], "x@y.cz")).toBe(true);
  });
});

describe("ov-oneoffs-projects: ceny jen jednatelé + fakturace", () => {
  const projects = [
    { id: 1, title: "Video", klient: "ACME", castka: 65000, checklist: [] },
    { id: 2, title: "Foceni", klient: "BETA", castka: 12000, checklist: [] },
  ];
  it("produkce dostane projekty BEZ castka", () => {
    const out = redactForRead("ov-oneoffs-projects", projects, ["produkce"]) as Record<string, unknown>[];
    expect(out[0].castka).toBeUndefined();
    expect(out[0].title).toBe("Video");
  });
  it("fakturace a admin vidí ceny", () => {
    for (const roles of [["fakturace"], ["admin"]] as Role[][]) {
      const out = redactForRead("ov-oneoffs-projects", projects, roles) as Record<string, unknown>[];
      expect(out[0].castka).toBe(65000);
    }
  });
  it("zápis od produkce nesmaže ceny — merge z existujících dat dle id", () => {
    const incoming = [
      { id: 1, title: "Video UPRAVENO", klient: "ACME", checklist: [{ text: "x", done: true }] }, // bez castka (redakce)
      { id: 3, title: "Novy projekt", klient: "GAMA" },                                          // nový — castka 0
    ];
    const out = mergeProtectedWrite("ov-oneoffs-projects", incoming, projects, ["produkce"]) as Record<string, unknown>[];
    expect(out[0].castka).toBe(65000);       // cena obnovena z DB
    expect(out[0].title).toBe("Video UPRAVENO"); // úpravy zůstaly
    expect(out[1].castka).toBe(0);           // nový projekt bez ceny
  });
  it("zápis od fakturace/admina projde beze změny", () => {
    const incoming = [{ id: 1, title: "Video", castka: 99000 }];
    for (const roles of [["fakturace"], ["admin"]] as Role[][]) {
      const out = mergeProtectedWrite("ov-oneoffs-projects", incoming, projects, roles) as Record<string, unknown>[];
      expect(out[0].castka).toBe(99000);
    }
  });
});

describe("přísné pravidlo: částky jen admin + fakturace", () => {
  it("finanční klíče nečte žádná jiná role", () => {
    const financeKeys = Object.entries(KEY_READ_ROLES).filter(([, roles]) => roles.length > 0);
    for (const [key, roles] of financeKeys) {
      const allowed = new Set(roles);
      // Jediné výjimky s vysvětlením: oneoffs (produkce čte, ale ceny se redagují)
      if (key === "ov-oneoffs-projects") { expect([...allowed].sort()).toEqual(["admin", "fakturace", "produkce"]); continue; }
      for (const r of allowed) {
        expect(["admin", "fakturace"].includes(r), `${key} povoluje roli ${r} — částky smí jen admin + fakturace`).toBe(true);
      }
    }
  });
});

describe("ov-ukoly-tasks: úkol vidí JEN adresát (+ admin/pm)", () => {
  const tasks = [
    { id: 1, nazev: "Vystavit fakturu (65 000 Kč)", prirazeno: "Dominika", status: "Nové" },
    { id: 2, nazev: "Natočit reels", prirazeno: "Zdeněk", status: "Nové" },
    { id: 3, nazev: "Grafika banner", prirazeno: "Matěj", status: "Nové" },
  ];

  it("zaměstnanec čte jen svoje přiřazené úkoly", () => {
    const out = redactForRead("ov-ukoly-tasks", tasks, ["produkce"], "zdeněk") as { id: number }[];
    expect(out.map((t) => t.id)).toEqual([2]);
  });
  it("Dominika (fakturace) vidí jen svoje — cizí ne", () => {
    const out = redactForRead("ov-ukoly-tasks", tasks, ["fakturace"], "dominika") as { id: number }[];
    expect(out.map((t) => t.id)).toEqual([1]);
  });
  it("admin a pm vidí všechny úkoly (koordinace)", () => {
    expect((redactForRead("ov-ukoly-tasks", tasks, ["admin"], "adam") as unknown[]).length).toBe(3);
    expect((redactForRead("ov-ukoly-tasks", tasks, ["pm"], "kdokoli") as unknown[]).length).toBe(3);
  });
  it("čtení úkolů vyžaduje identitu (kvůli filtru)", () => {
    expect(readNeedsRoles("ov-ukoly-tasks")).toBe(true);
  });
});

describe("ov-ukoly-tasks: zápis nesmí přepsat/smazat cizí úkoly", () => {
  const dbTasks = [
    { id: 1, nazev: "Fakturace", prirazeno: "Dominika" },
    { id: 2, nazev: "Reels", prirazeno: "Zdeněk" },
    { id: 3, nazev: "Banner", prirazeno: "Matěj" },
  ];

  it("Zdeněk uloží svoje + založí NOVÝ úkol Matějovi; cizí zůstanou z DB", () => {
    // Zdeněk viděl jen svůj úkol (id 2); přidá nový úkol pro Matěje (id 99).
    const incoming = [
      { id: 2, nazev: "Reels HOTOVO", prirazeno: "Zdeněk", status: "Hotovo" },
      { id: 99, nazev: "Nový úkol", prirazeno: "Matěj" },
    ];
    const out = mergeProtectedWrite("ov-ukoly-tasks", incoming, dbTasks, ["produkce"], "zdeněk") as Record<string, unknown>[];
    const byId = new Map(out.map((t) => [t.id, t]));
    expect(byId.get(1)?.nazev).toBe("Fakturace");      // Dominičin zůstal
    expect(byId.get(3)?.nazev).toBe("Banner");         // Matějův původní zůstal
    expect(byId.get(2)?.status).toBe("Hotovo");        // Zdeňkova úprava prošla
    expect(byId.get(99)?.nazev).toBe("Nový úkol");     // nový úkol založen
    expect(out).toHaveLength(4);
  });

  it("útok: nelze upravit cizí existující úkol (Matějův se z DB obnoví)", () => {
    const incoming = [{ id: 3, nazev: "PŘEPSÁNO ÚTOČNÍKEM", prirazeno: "Matěj" }];
    const out = mergeProtectedWrite("ov-ukoly-tasks", incoming, dbTasks, ["produkce"], "zdeněk") as Record<string, unknown>[];
    const banner = out.find((t) => t.id === 3);
    expect(banner?.nazev).toBe("Banner"); // původní text z DB, ne útočníkův
  });

  it("admin uloží cokoliv beze změny", () => {
    const incoming = [{ id: 1, nazev: "cokoliv", prirazeno: "kdokoli" }];
    expect(mergeProtectedWrite("ov-ukoly-tasks", incoming, dbTasks, ["admin"], "adam")).toBe(incoming);
  });
});
