/* ── Vlastnictví úkolů: kdo vidí co ───────────────────────────────────────────
 * Úkoly mají textové pole `prirazeno` (jméno). Zaměstnanec vidí na nástěnce jen
 * svoje přiřazené úkoly; přehledové role (admin, projektový manažer) vidí vše. */

import type { Role } from "@/lib/roles";

export const firstName = (s: string) => (s || "").trim().split(/\s+/)[0].toLowerCase();

/** Přezdívky křestních jmen (Jan = Honza apod.). */
export const NAME_ALIASES: Record<string, string[]> = { jan: ["jan", "honza"] };

/** Sedí přiřazené jméno na mé křestní jméno (vč. přezdívek)? */
export function isMine(assigned: string, myFirst: string): boolean {
  const a = firstName(assigned);
  return a === myFirst || (NAME_ALIASES[myFirst] ?? []).includes(a);
}

/** Role, které na nástěnce úkolů vidí VŠECHNY úkoly (koordinace/dohled).
 * Ostatní vidí jen svoje přiřazené. */
export const TASK_SEE_ALL_ROLES: Role[] = ["admin", "pm"];

export function canSeeAllTasks(roles: Role[] | undefined | null): boolean {
  if (!roles) return false;
  return roles.some((r) => TASK_SEE_ALL_ROLES.includes(r));
}
