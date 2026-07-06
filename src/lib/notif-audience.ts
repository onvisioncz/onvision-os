/* ── Cílení upozornění: kdo které upozornění vidí ─────────────────────────────
 * Každé upozornění nese „audience". Zaměstnanec (ne-admin) uvidí jen to, co se
 * ho týká: svoje přiřazené úkoly + upozornění pro jeho role (finance, obsah…).
 * Admin (jednatel) vidí vše. */

import type { Role } from "./roles";
import { isMine, firstName } from "./task-owner";

export type Audience =
  | { kind: "person"; name: string }          // jen přiřazená osoba (dle jména)
  | { kind: "email"; email: string | null }   // konkrétní e-mail (null = všem)
  | { kind: "roles"; roles: Role[] };          // dané role

export interface AudienceUser {
  roles: Role[];
  displayName: string;
  email: string;
}

export function notifVisibleFor(a: Audience | undefined, user: AudienceUser | null): boolean {
  // Během načítání uživatele neblokuj (data stejně chrání server); po načtení filtruj.
  if (!user) return true;
  if (user.roles.includes("admin")) return true;
  if (!a) return false; // neznámé cílení → jen admin (fail-closed)
  if (a.kind === "person") return isMine(a.name, firstName(user.displayName));
  if (a.kind === "email") return a.email === null || a.email.toLowerCase() === (user.email || "").toLowerCase();
  if (a.kind === "roles") return a.roles.some((r) => user.roles.includes(r));
  return false;
}

/* Přednastavené skupiny pro čitelnost generátorů. */
export const AUD_FINANCE: Audience = { kind: "roles", roles: ["admin", "fakturace", "ucetni"] };
export const AUD_BILLING: Audience = { kind: "roles", roles: ["admin", "fakturace"] };
export const AUD_CONTENT: Audience = { kind: "roles", roles: ["admin", "smm", "pm"] };
export const AUD_PRODUCTION: Audience = { kind: "roles", roles: ["admin", "produkce", "pm"] };
export const AUD_OUTPUTS: Audience = { kind: "roles", roles: ["admin", "produkce", "grafik", "smm", "pm"] };
