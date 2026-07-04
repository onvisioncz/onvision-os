import { describe, it, expect } from "vitest";
import {
  isMergeableArray,
  threeWayMergeById,
  mergeForSync,
} from "../merge";

type T = { id: number; text?: string; done?: boolean };

describe("isMergeableArray", () => {
  it("true jen pro pole objektů s id", () => {
    expect(isMergeableArray([{ id: 1 }, { id: "a" }])).toBe(true);
    expect(isMergeableArray([])).toBe(true);
    expect(isMergeableArray([{ id: 1 }, { text: "x" }])).toBe(false);
    expect(isMergeableArray([{ id: null }])).toBe(false);
    expect(isMergeableArray("nope")).toBe(false);
    expect(isMergeableArray(42)).toBe(false);
    expect(isMergeableArray({ id: 1 })).toBe(false);
  });
});

describe("threeWayMergeById", () => {
  it("zachová cizí přírůstek + vlastní přírůstek (žádná ztráta)", () => {
    const base: T[] = [{ id: 1, text: "a" }];
    const local: T[] = [{ id: 1, text: "a" }, { id: 2, text: "moje" }];
    const remote: T[] = [{ id: 1, text: "a" }, { id: 3, text: "cizí" }];
    const out = threeWayMergeById(base, local, remote);
    const ids = out.map((x) => x.id).sort();
    expect(ids).toEqual([1, 2, 3]);
  });

  it("vlastní editace vyhrává na úrovni položky", () => {
    const base: T[] = [{ id: 1, text: "old" }];
    const local: T[] = [{ id: 1, text: "moje editace" }];
    const remote: T[] = [{ id: 1, text: "old" }];
    const out = threeWayMergeById(base, local, remote);
    expect(out).toEqual([{ id: 1, text: "moje editace" }]);
  });

  it("cizí editace se převezme, když ji lokál nesáhl", () => {
    const base: T[] = [{ id: 1, text: "old" }];
    const local: T[] = [{ id: 1, text: "old" }];
    const remote: T[] = [{ id: 1, text: "cizí editace" }];
    const out = threeWayMergeById(base, local, remote);
    expect(out).toEqual([{ id: 1, text: "cizí editace" }]);
  });

  it("smazání lokálem se respektuje (nevzkřísí se)", () => {
    const base: T[] = [{ id: 1 }, { id: 2 }];
    const local: T[] = [{ id: 1 }]; // lokál smazal 2
    const remote: T[] = [{ id: 1 }, { id: 2 }];
    const out = threeWayMergeById(base, local, remote);
    expect(out.map((x) => x.id)).toEqual([1]);
  });

  it("smazání remote se respektuje (nevzkřísí lokálem nezměněnou)", () => {
    const base: T[] = [{ id: 1 }, { id: 2 }];
    const local: T[] = [{ id: 1 }, { id: 2 }]; // lokál 2 nesáhl
    const remote: T[] = [{ id: 1 }]; // remote smazal 2
    const out = threeWayMergeById(base, local, remote);
    expect(out.map((x) => x.id)).toEqual([1]);
  });

  it("konkurenční přidání dvou různých položek — obě zůstanou", () => {
    const base: T[] = [];
    const local: T[] = [{ id: 10, text: "A" }];
    const remote: T[] = [{ id: 20, text: "B" }];
    const out = threeWayMergeById(base, local, remote);
    expect(out.map((x) => x.id).sort()).toEqual([10, 20]);
  });

  it("oba editovali stejnou položku → lokál vyhrává (bez pádu)", () => {
    const base: T[] = [{ id: 1, text: "base" }];
    const local: T[] = [{ id: 1, text: "local" }];
    const remote: T[] = [{ id: 1, text: "remote" }];
    const out = threeWayMergeById(base, local, remote);
    expect(out).toEqual([{ id: 1, text: "local" }]);
  });

  it("realistický scénář: A přidá komentář, B přesune jiný úkol", () => {
    const base: T[] = [
      { id: 1, text: "úkol1" },
      { id: 2, text: "úkol2" },
    ];
    // Lokál (A): přidal komentář k úkolu 1
    const local: T[] = [
      { id: 1, text: "úkol1+koment" },
      { id: 2, text: "úkol2" },
    ];
    // Remote (B): mezitím upravil úkol 2
    const remote: T[] = [
      { id: 1, text: "úkol1" },
      { id: 2, text: "úkol2-hotovo" },
    ];
    const out = threeWayMergeById(base, local, remote);
    expect(out.find((x) => x.id === 1)?.text).toBe("úkol1+koment"); // A neztraceno
    expect(out.find((x) => x.id === 2)?.text).toBe("úkol2-hotovo"); // B neztraceno
  });
});

describe("mergeForSync", () => {
  it("vrátí null pro nesloučitelné (číslo, objekt, pole bez id)", () => {
    expect(mergeForSync(1, 2, 3)).toBeNull();
    expect(mergeForSync({ a: 1 }, { a: 2 }, { a: 3 })).toBeNull();
    expect(mergeForSync([{ x: 1 }], [{ x: 2 }], [{ x: 3 }])).toBeNull();
  });
  it("sloučí pole s id", () => {
    const out = mergeForSync([], [{ id: 1 }], [{ id: 2 }]) as T[];
    expect(out.map((x) => x.id).sort()).toEqual([1, 2]);
  });
});
