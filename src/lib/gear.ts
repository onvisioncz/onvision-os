/**
 * Rezervace techniky — sklad + rezervace + hlídání kolizí.
 * Data v app_data: "ov-gear" (sklad) a "ov-gear-reservations" (rezervace).
 * Datumy jako "YYYY-MM-DD" (z <input type="date">) — porovnávají se lexikálně.
 */
export const GEAR_KEY = "ov-gear";
export const GEAR_RES_KEY = "ov-gear-reservations";

export const GEAR_KATEGORIE = ["Kamera", "Objektiv", "Stabilizace", "Zvuk", "Světlo", "Dron", "Ostatní"] as const;
export type GearKategorie = (typeof GEAR_KATEGORIE)[number];

export interface GearItem {
  id: number;
  nazev: string;
  kategorie: GearKategorie;
  poznamka: string;
}

export interface GearReservation {
  id: number;
  gearId: number;
  kdo: string;
  od: string;   // YYYY-MM-DD
  do: string;   // YYYY-MM-DD
  projekt: string;
  createdAt: string;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Překrývají se dvě období? (ISO datumy, lexikální porovnání) */
export function overlaps(aOd: string, aDo: string, bOd: string, bDo: string): boolean {
  return aOd <= bDo && bOd <= aDo;
}

/** Rezervace daného kusu, která zrovna dnes probíhá (nebo null). */
export function reservedNow(reservations: GearReservation[], gearId: number): GearReservation | undefined {
  const t = todayISO();
  return reservations.find((r) => r.gearId === gearId && r.od <= t && t <= r.do);
}

/** Koliduje požadované období s existující rezervací daného kusu? */
export function hasConflict(reservations: GearReservation[], gearId: number, od: string, do_: string, ignoreId?: number): GearReservation | undefined {
  if (!od || !do_) return undefined;
  return reservations.find((r) => r.gearId === gearId && r.id !== ignoreId && overlaps(od, do_, r.od, r.do));
}

/** Nejbližší budoucí rezervace kusu (pro info „volné do…"). */
export function nextReservation(reservations: GearReservation[], gearId: number): GearReservation | undefined {
  const t = todayISO();
  return reservations
    .filter((r) => r.gearId === gearId && r.do >= t)
    .sort((a, b) => a.od.localeCompare(b.od))[0];
}

export function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${+d}. ${+m}. ${y}`;
}
