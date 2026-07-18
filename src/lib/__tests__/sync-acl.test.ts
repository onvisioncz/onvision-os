import { describe, it, expect } from "vitest";
import {
  KEY_WRITE_ROLES, KEY_READ_ROLES,
  canReadKey, canWriteKey, redactForRead, readNeedsRoles,
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
    expect(canReadKey("ov-odmeny", ["ucetni"], "u@onvision.cz")).toBe(true);
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
    for (const roles of [["fakturace"], ["ucetni"], ["admin"]] as Role[][]) {
      const out = redactForRead("ov-monthly-clients", clients, roles) as Record<string, unknown>[];
      expect(out[0].pausal).toBe(50000);
    }
  });

  it("nemění jiné klíče", () => {
    const tasks = [{ id: 1, nazev: "úkol" }];
    expect(redactForRead("ov-ukoly-tasks", tasks, ["smm"])).toBe(tasks);
  });
});

describe("readNeedsRoles", () => {
  it("gated a redagované klíče vyžadují role", () => {
    expect(readNeedsRoles("ov-odmeny")).toBe(true);
    expect(readNeedsRoles("ov-monthly-clients")).toBe(true);
    expect(readNeedsRoles("ov-ads")).toBe(true);
  });
  it("provozní klíče roli nevyžadují (rychlá cesta)", () => {
    expect(readNeedsRoles("ov-ukoly-tasks")).toBe(false);
    expect(readNeedsRoles("ov-outputs")).toBe(false);
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
