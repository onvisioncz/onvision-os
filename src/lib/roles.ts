/* ── Role definitions for OnVision OS ─────────────────────────────────────── */

export type Role = "admin" | "fakturace" | "ucetni" | "produkce" | "grafik" | "smm" | "pm";

export interface UserConfig {
  email: string;
  displayName: string;
  roles: Role[];
  clients: string[];    // client names this user is responsible for
  color: string;        // OKLCH avatar color
  initials: string;
  aktivni: boolean;
}

/* ── Default users (seed) ───────────────────────────────────────────────────── */
export const DEFAULT_USERS: UserConfig[] = [
  {
    email: "info@onvision.cz",
    displayName: "Adam Mendrek",
    roles: ["admin", "smm"],
    clients: ["IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ"],
    color: "oklch(0.62 0.27 265)",
    initials: "AM",
    aktivni: true,
  },
  {
    email: "jan@onvision.cz",
    displayName: "Jan Kříž",
    roles: ["admin"],
    clients: [],
    color: "oklch(0.72 0.2 310)",
    initials: "JK",
    aktivni: true,
  },
  {
    email: "fakturace@onvision.cz",
    displayName: "Dominika Mendrek",
    roles: ["fakturace"],
    clients: [],
    color: "oklch(0.67 0.155 155)",
    initials: "DM",
    aktivni: true,
  },
  {
    email: "zdenek@onvision.cz",
    displayName: "Zdeněk Dolíhal",
    roles: ["produkce", "smm"],
    clients: ["BEHEJ BRNO", "TOFFI", "SENIMED", "SK STAVOS BRNO SLATINA"],
    color: "oklch(0.75 0.19 48)",
    initials: "ZD",
    aktivni: true,
  },
  {
    email: "matej@onvision.cz",
    displayName: "Matěj Hořák",
    roles: ["produkce"],
    clients: ["EASTGATE BRNO", "IMTOS"],
    color: "oklch(0.68 0.18 180)",
    initials: "MH",
    aktivni: true,
  },
  {
    email: "monika@onvision.cz",
    displayName: "Monika Kudličková",
    roles: ["grafik"],
    clients: [],
    color: "oklch(0.72 0.2 310)",
    initials: "MK",
    aktivni: true,
  },
  {
    email: "patrik@onvision.cz",
    displayName: "Patrik Petr",
    roles: ["grafik"],
    clients: [],
    color: "oklch(0.65 0.18 240)",
    initials: "PP",
    aktivni: true,
  },
  {
    email: "tereza@onvision.cz",
    displayName: "Tereza Burianová",
    roles: ["smm"],
    clients: ["POWERPLATE", "SENIMED"],
    color: "oklch(0.70 0.18 0)",
    initials: "TB",
    aktivni: true,
  },
  {
    email: "david@onvision.cz",
    displayName: "David Máčala",
    roles: ["smm"],
    clients: ["EASTGATE BRNO"],
    color: "oklch(0.65 0.22 25)",
    initials: "DM",
    aktivni: true,
  },
  {
    email: "martin@onvision.cz",
    displayName: "Martin Fiala",
    roles: ["pm"],
    clients: [],   // PM sees all
    color: "oklch(0.67 0.155 155)",
    initials: "MF",
    aktivni: true,
  },
];

/* ── Role labels ─────────────────────────────────────────────────────────────── */
export const ROLE_LABELS: Record<Role, string> = {
  admin:     "Jednatel",
  fakturace: "Fakturace",
  ucetni:    "Účetní",
  produkce:  "Produkce",
  grafik:    "Grafik",
  smm:       "SMM",
  pm:        "Projektový manažer",
};

export const ROLE_COLORS: Record<Role, string> = {
  admin:     "oklch(0.62 0.27 265)",
  fakturace: "oklch(0.67 0.155 155)",
  ucetni:    "oklch(0.70 0.14 195)",
  produkce:  "oklch(0.75 0.19 48)",
  grafik:    "oklch(0.72 0.2 310)",
  smm:       "oklch(0.65 0.22 25)",
  pm:        "oklch(0.78 0.18 180)",
};

/* ── Nav routes per role ─────────────────────────────────────────────────────── */
// "*" = all routes (admin only)
export const ROLE_ROUTES: Record<Role, string[]> = {
  admin:     ["*"],
  fakturace: ["/dashboard", "/finance", "/fakturace", "/klienti", "/odmeny", "/ziskovost", "/cashflow", "/vykazy"],
  ucetni:    ["/dashboard", "/odmeny", "/fakturace"],
  produkce:  ["/dashboard", "/shooting", "/produkce", "/call-sheet", "/technika", "/vykazy", "/ukoly", "/outputs", "/delivery"],
  grafik:    ["/ukoly", "/outputs", "/technika", "/vykazy", "/delivery"],
  smm:       ["/smm", "/calendar", "/outputs", "/reporty", "/technika", "/vykazy", "/delivery"],
  pm:        ["/smm", "/ukoly", "/outputs", "/technika", "/vykazy"],
};

/* ── Helper: can a user with these roles access a route ─────────────────────── */
export function canAccess(roles: Role[], pathname: string): boolean {
  if (roles.includes("admin")) return true;
  const allowed = new Set(roles.flatMap(r => ROLE_ROUTES[r]));
  return Array.from(allowed).some(p => pathname === p || pathname.startsWith(p + "/"));
}

/* ── Helper: all routes accessible by roles ─────────────────────────────────── */
export function getAllowedRoutes(roles: Role[]): string[] {
  if (roles.includes("admin")) return ["*"];
  const all = new Set(roles.flatMap(r => ROLE_ROUTES[r]));
  return Array.from(all);
}
