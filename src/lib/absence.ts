/**
 * Dovolené / absence týmu — kdo je mimo a kdy, a jestli to nekoliduje
 * s naplánovaným natáčením nebo rezervací techniky.
 *
 * Čisté funkce, plně testovatelné. Data drží klíč `ov-absence`.
 * Datumy jsou ISO "YYYY-MM-DD" → lexikografické porovnání = chronologické.
 */

export type AbsenceTyp = "dovolená" | "nemoc" | "volno" | "homeoffice";

export interface Absence {
  id: number;
  name: string;          // displayName člena (shoduje se s clenove[] a rezervace.kdo)
  email?: string;
  typ: AbsenceTyp;
  od: string;            // ISO YYYY-MM-DD
  do: string;            // ISO YYYY-MM-DD (včetně)
  poznamka?: string;
}

export const ABSENCE_META: Record<AbsenceTyp, { label: string; color: string }> = {
  "dovolená":   { label: "Dovolená",   color: "oklch(0.7 0.17 155)" },
  "nemoc":      { label: "Nemoc",      color: "oklch(0.65 0.22 25)" },
  "volno":      { label: "Volno",      color: "oklch(0.75 0.15 60)" },
  "homeoffice": { label: "Home office", color: "oklch(0.7 0.16 265)" },
};

/** Překrývají se dva uzavřené intervaly [aOd,aDo] a [bOd,bDo]? */
export function rangeOverlap(aOd: string, aDo: string, bOd: string, bDo: string): boolean {
  if (!aOd || !aDo || !bOd || !bDo) return false;
  return aOd <= bDo && bOd <= aDo;
}

/** Je daný člověk (dle jména) v absenci na konkrétní den? */
export function isAbsentOn(absences: Absence[], name: string, dateISO: string): Absence | null {
  const n = (name || "").trim().toLowerCase();
  if (!n || !dateISO) return null;
  return absences.find(
    (a) => (a.name || "").trim().toLowerCase() === n && a.od <= dateISO && dateISO <= a.do
  ) ?? null;
}

/** Všechny absence, které se protínají s daným intervalem. */
export function absencesInRange(absences: Absence[], od: string, doDate: string): Absence[] {
  return absences.filter((a) => rangeOverlap(a.od, a.do, od, doDate));
}

/** Počet kalendářních dní absence (včetně obou konců). Záporné/nevalidní → 0. */
export function absenceDays(a: Absence): number {
  const od = Date.parse(a.od + "T00:00:00Z");
  const dd = Date.parse(a.do + "T00:00:00Z");
  if (!Number.isFinite(od) || !Number.isFinite(dd) || dd < od) return 0;
  return Math.round((dd - od) / 86_400_000) + 1;
}

export interface Collision {
  kind: "shooting" | "gear";
  name: string;
  datum: string;          // den kolize (u techniky start rezervace)
  detail: string;         // klient / název techniky apod.
  absenceTyp: AbsenceTyp;
}

interface ShootingLike { datum?: string; klient?: string; clenove?: string[] }
interface ReservationLike { kdo?: string; od?: string; do?: string; projekt?: string }

/**
 * Najdi kolize: člen naplánovaný na natáčení nebo držící rezervaci techniky
 * v době, kdy je zapsaný jako nepřítomný. Vrací jen budoucí/aktuální dění
 * (od `today` dál), aby staré záznamy nezaplevelovaly výstup.
 */
export function absenceCollisions(
  absences: Absence[],
  shootingDays: ShootingLike[],
  reservations: ReservationLike[],
  today: string
): Collision[] {
  const out: Collision[] = [];

  for (const d of shootingDays ?? []) {
    if (!d.datum || d.datum < today) continue;
    for (const member of d.clenove ?? []) {
      const a = isAbsentOn(absences, member, d.datum);
      if (a) out.push({ kind: "shooting", name: member, datum: d.datum, detail: d.klient || "natáčení", absenceTyp: a.typ });
    }
  }

  for (const r of reservations ?? []) {
    if (!r.kdo || !r.od || !r.do || r.do < today) continue;
    const hit = absences.find(
      (a) => (a.name || "").trim().toLowerCase() === (r.kdo || "").trim().toLowerCase() && rangeOverlap(a.od, a.do, r.od!, r.do!)
    );
    if (hit) out.push({ kind: "gear", name: r.kdo, datum: r.od, detail: r.projekt || "rezervace techniky", absenceTyp: hit.typ });
  }

  return out;
}
