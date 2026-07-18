/**
 * Veřejný měsíční náhled produkce pro jednoho člověka (sdílený odkaz /z/[token]).
 *
 * Zaměstnanec si přes odkaz zkontroluje, co se natáčelo/dělalo a kolik má
 * nadpracovaných / nevyčerpaných dní. ŽÁDNÉ částky se ven neposílají — jen
 * záznamy práce a bilance dní. Čisté funkce, plně testovatelné.
 */

export type ProdPerson = "zdenek" | "matej" | "monika" | "patrik";

export const MONTHS_CZ = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

/* ── Vstupní tvary (strukturální, nezávislé na stránce) ─────────────────────── */
export interface RawZ { mesic: string; datum: string; projekt: string; format: string; status: string; poznamka: string }
export interface RawM { mesic: string; datum: string; projekt: string; format: string; status: string; poznamka: string }
export interface RawG { grafik: string; mesic: string; datum: string; projekt: string; popis: string; status: string; poznamka: string }
export interface RawPending { type: "NADPRACOVANÉ" | "NEVYČERPANÉ"; datum: string; projekt: string; mesicOrigin: string; assignedMesic: string; settled: boolean }

/* ── Výstupní tvar (bez částek) ─────────────────────────────────────────────── */
export interface ShareEntry { datum: string; projekt: string; detail: string; status: string; poznamka: string }
export interface ShareMonth { mesic: string; items: ShareEntry[] }
export interface DayBalance { nadpracovane: number; nevycerpane: number }
export interface PersonView {
  person: ProdPerson;
  jmeno: string;
  role: string;
  zaznamu: number;               // kolik položek práce celkem
  months: ShareMonth[];          // seskupeno po měsících (chronologicky)
  balance: DayBalance | null;    // bilance dní (jen paušál — Zdeněk)
  pendingList: { type: string; datum: string; projekt: string; mesicOrigin: string }[];
}

export const PERSON_META: Record<ProdPerson, { jmeno: string; role: string }> = {
  zdenek: { jmeno: "Zdeněk Dolíhal", role: "Produkce · natáčení" },
  matej: { jmeno: "Matěj Hořák", role: "Produkce · video" },
  monika: { jmeno: "Monika Weiser", role: "Grafika" },
  patrik: { jmeno: "Patrik", role: "Grafika · foto" },
};

const monthIdx = (m: string) => { const i = MONTHS_CZ.indexOf((m || "").trim()); return i < 0 ? 99 : i; };

/** Seskupí ploché záznamy po měsících v chronologickém pořadí. */
function groupByMonth(rows: ShareEntry[], months: string[]): ShareMonth[] {
  const map = new Map<string, ShareEntry[]>();
  rows.forEach((r, i) => {
    const m = months[i] || "—";
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(r);
  });
  return [...map.entries()]
    .sort((a, b) => monthIdx(a[0]) - monthIdx(b[0]))
    .map(([mesic, items]) => ({ mesic, items }));
}

/** Náhled pro Zdeňka — paušální dny + bilance nadpracovaných / nevyčerpaných. */
export function buildZdenekView(entries: RawZ[], pending: RawPending[]): PersonView {
  const rows: ShareEntry[] = (entries ?? []).map((e) => ({
    datum: e.datum, projekt: e.projekt, detail: e.format, status: e.status, poznamka: e.poznamka,
  }));
  const months = (entries ?? []).map((e) => e.mesic);
  const open = (pending ?? []).filter((p) => !p.settled);
  return {
    person: "zdenek", ...PERSON_META.zdenek,
    zaznamu: rows.length,
    months: groupByMonth(rows, months),
    balance: {
      nadpracovane: open.filter((p) => p.type === "NADPRACOVANÉ").length,
      nevycerpane: open.filter((p) => p.type === "NEVYČERPANÉ").length,
    },
    pendingList: open.map((p) => ({ type: p.type, datum: p.datum, projekt: p.projekt, mesicOrigin: p.mesicOrigin })),
  };
}

/** Náhled pro Matěje — seznam práce (bez částek). */
export function buildMatejView(entries: RawM[]): PersonView {
  const rows: ShareEntry[] = (entries ?? []).map((e) => ({
    datum: e.datum, projekt: e.projekt, detail: e.format, status: e.status, poznamka: e.poznamka,
  }));
  return {
    person: "matej", ...PERSON_META.matej,
    zaznamu: rows.length,
    months: groupByMonth(rows, (entries ?? []).map((e) => e.mesic)),
    balance: null,
    pendingList: [],
  };
}

/** Náhled pro grafika (Monika/Patrik) — filtruje sdílený klíč dle jména. */
export function buildGraficView(entries: RawG[], grafik: "Monika" | "Patrik"): PersonView {
  const mine = (entries ?? []).filter((e) => (e.grafik || "").toLowerCase() === grafik.toLowerCase());
  const rows: ShareEntry[] = mine.map((e) => ({
    datum: e.datum, projekt: e.projekt, detail: e.popis, status: e.status, poznamka: e.poznamka,
  }));
  const person: ProdPerson = grafik.toLowerCase() === "monika" ? "monika" : "patrik";
  return {
    person, ...PERSON_META[person],
    zaznamu: rows.length,
    months: groupByMonth(rows, mine.map((e) => e.mesic)),
    balance: null,
    pendingList: [],
  };
}

export interface ProdData { zdenek?: RawZ[]; matej?: RawM[]; grafici?: RawG[]; pending?: RawPending[] }

/** Dispečer: z osoby + surových dat vyrobí veřejný náhled bez částek. */
export function buildPersonView(person: ProdPerson, data: ProdData): PersonView {
  switch (person) {
    case "zdenek": return buildZdenekView(data.zdenek ?? [], data.pending ?? []);
    case "matej": return buildMatejView(data.matej ?? []);
    case "monika": return buildGraficView(data.grafici ?? [], "Monika");
    case "patrik": return buildGraficView(data.grafici ?? [], "Patrik");
  }
}
