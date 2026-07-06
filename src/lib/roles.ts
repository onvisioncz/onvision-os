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
  /** Profilovka z onvision.cz (public/team/…) */
  photo?: string;
  /** Pozice dle webu (hezčí popis než interní role) */
  pozice?: string;
  /** Extra routy povolené konkrétně tomuto člověku (nad rámec jeho rolí). */
  extraRoutes?: string[];
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
    photo: "/team/adam-mendrek.jpg",
    pozice: "Jednatel · Komunikace & obchod",
  },
  {
    email: "jan@onvision.cz",
    displayName: "Jan Kříž",
    roles: ["admin"],
    clients: [],
    color: "oklch(0.72 0.2 310)",
    initials: "JK",
    aktivni: true,
    photo: "/team/jan-kriz.jpg",
    pozice: "Jednatel · Video & produkce",
  },
  {
    email: "fakturace@onvision.cz",
    displayName: "Dominika Mendrek",
    roles: ["fakturace"],
    clients: [],
    color: "oklch(0.67 0.155 155)",
    initials: "DM",
    aktivni: true,
    photo: "/team/dominika-mendrek.jpg",
    pozice: "Administrativa & fakturace",
  },
  {
    email: "zdenek@onvision.cz",
    displayName: "Zdeněk Dolíhal",
    roles: ["produkce", "smm"],
    clients: ["BEHEJ BRNO", "TOFFI", "SENIMED", "SK STAVOS BRNO SLATINA"],
    color: "oklch(0.75 0.19 48)",
    initials: "ZD",
    aktivni: true,
    photo: "/team/zdenek-dolihal.jpg",
    pozice: "Kreativec 3v1",
  },
  {
    email: "matej@onvision.cz",
    displayName: "Matěj Hořák",
    roles: ["produkce"],
    clients: ["EASTGATE BRNO", "IMTOS"],
    color: "oklch(0.68 0.18 180)",
    initials: "MH",
    aktivni: true,
    photo: "/team/matej-horak.jpg",
    pozice: "Video produkce",
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
    photo: "/team/patrik-petr.jpg",
    pozice: "Grafická tvorba",
  },
  {
    email: "tereza@onvision.cz",
    displayName: "Tereza Burianová",
    roles: ["smm"],
    clients: ["POWERPLATE", "SENIMED"],
    color: "oklch(0.70 0.18 0)",
    initials: "TB",
    aktivni: true,
    photo: "/team/tereza-burianova.jpg",
    pozice: "Content stratég",
  },
  {
    email: "david@onvision.cz",
    displayName: "David Máčala",
    roles: ["smm"],
    clients: ["EASTGATE BRNO"],
    color: "oklch(0.65 0.22 25)",
    initials: "DM",
    aktivni: true,
    photo: "/team/david-macala.jpg",
    pozice: "Social Media Manager",
  },
  {
    email: "martin@onvision.cz",
    displayName: "Martin Fiala",
    roles: ["pm"],
    clients: [],   // PM sees all
    color: "oklch(0.67 0.155 155)",
    initials: "MF",
    aktivni: true,
    photo: "/team/martin-fiala.jpg",
    pozice: "Foto postprodukce & grafika",
  },
  // ── Doplněno dle onvision.cz/o-nas (zatím bez přístupu do OS) ──
  {
    email: "jakub@onvision.cz",
    displayName: "Jakub Mendrek",
    roles: ["pm"],
    clients: [],
    color: "oklch(0.70 0.16 220)",
    initials: "JM",
    aktivni: true,
    photo: "/team/jakub-mendrek.jpg",
    pozice: "Klientská komunikace",
  },
  {
    email: "michael@onvision.cz",
    displayName: "Michael Weiser",
    roles: ["produkce"],
    clients: [],
    color: "oklch(0.72 0.17 140)",
    initials: "MW",
    aktivni: true,
    photo: "/team/michael-weiser.jpg",
    pozice: "Video produkce",
  },
  {
    email: "tomas@onvision.cz",
    displayName: "Tomáš Dang",
    roles: ["smm"],
    clients: [],
    color: "oklch(0.75 0.15 85)",
    initials: "TD",
    aktivni: true,
    photo: "/team/tomas-dang.jpg",
    pozice: "Data analytik",
    extraRoutes: ["/ads"],   // vyhodnocuje reklamy — přístup i bez admin role
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
  fakturace: ["/dnes", "/inbox", "/ukoly", "/dashboard", "/finance", "/fakturace", "/smlouvy", "/gdpr", "/klienti", "/odmeny", "/ziskovost", "/cashflow", "/vykazy", "/cile", "/parovani", "/upominky", "/fakturovat"],
  ucetni:    ["/dnes", "/inbox", "/dashboard", "/odmeny", "/fakturace", "/parovani", "/upominky"],
  produkce:  ["/dnes", "/inbox", "/dashboard", "/shooting", "/produkce", "/call-sheet", "/technika", "/lokace", "/vykazy", "/ukoly", "/outputs", "/delivery", "/klient-share", "/zapis", "/checklist", "/dovolena"],
  grafik:    ["/dnes", "/inbox", "/smm-studio", "/ukoly", "/outputs", "/technika", "/vykazy", "/delivery", "/zapis", "/dovolena", "/produkce"],
  smm:       ["/dnes", "/inbox", "/smm", "/smm-ai", "/smm-studio", "/tydenni-vyhled", "/calendar", "/outputs", "/reporty", "/technika", "/vykazy", "/delivery", "/klient-share", "/zapis", "/dovolena"],
  pm:        ["/dnes", "/inbox", "/smm", "/smm-ai", "/smm-studio", "/tydenni-vyhled", "/ukoly", "/outputs", "/technika", "/vykazy", "/klient-share", "/zapis", "/dovolena"],
};

/* ── Helper: can a user with these roles access a route ─────────────────────── */
/* ── Per-e-mail extra routy (kód, nezávislé na uloženém ov-user-roles) ──────────
 * Když je přístup pro konkrétní lidi nad rámec jejich rolí. Drží se v kódu, aby
 * fungoval i kdyby uložený seznam týmu byl neúplný. */
export const EXTRA_ROUTES_BY_EMAIL: Record<string, string[]> = {
  "tomas@onvision.cz": ["/ads"],   // vyhodnocuje reklamy
};

export function extraRoutesForEmail(email?: string | null): string[] {
  return EXTRA_ROUTES_BY_EMAIL[(email ?? "").toLowerCase()] ?? [];
}

export function canAccess(roles: Role[], pathname: string, extraRoutes: string[] = []): boolean {
  if (roles.includes("admin")) return true;
  const allowed = new Set([...roles.flatMap(r => ROLE_ROUTES[r]), ...extraRoutes]);
  return Array.from(allowed).some(p => pathname === p || pathname.startsWith(p + "/"));
}

/* ── Helper: all routes accessible by roles ─────────────────────────────────── */
export function getAllowedRoutes(roles: Role[]): string[] {
  if (roles.includes("admin")) return ["*"];
  const all = new Set(roles.flatMap(r => ROLE_ROUTES[r]));
  return Array.from(all);
}
