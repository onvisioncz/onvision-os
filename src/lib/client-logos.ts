/**
 * Loga klientů (bílé varianty z onvision.cz, /public/client-logos/) + brand
 * barva pozadí čtverečku. Matchování je odolné vůči právním příponám
 * (s.r.o., a.s., z.s.) a diakritice — hledá klíčové slovo v názvu.
 *
 * `bg` = brand barva pozadí dlaždice. Kde ji ještě nemáme, zůstane null a
 * použije se neutrální tmavý čtverec (doplníme, jak dorazí brand barvy).
 */
export interface ClientBrand {
  logo: string;
  bg: string | null;
}

const LOGO_MAP: { re: RegExp; logo: string; bg?: string }[] = [
  { re: /senimed/i, logo: "senimed.png", bg: "#7A2733" },
  { re: /imtos/i, logo: "imtos-color.svg", bg: "#2A2825" },
  { re: /power\s*plate/i, logo: "powerplate.png", bg: "#16181E" },
  { re: /yonex/i, logo: "yonex.png", bg: "#0F3A73" },
  { re: /pizza\s*hut/i, logo: "pizza-hut.png", bg: "#FFFFFF" },
  { re: /akeso/i, logo: "akeso.png", bg: "#16181E" },
  { re: /i-?style/i, logo: "istyle-color.svg", bg: "#16181E" },
  { re: /nera/i, logo: "nera.png", bg: "#16181E" },
  { re: /behej|běhej|beh ?brno/i, logo: "behej-color.png", bg: "#FFFFFF" },
  { re: /effect/i, logo: "effect-clinic.png", bg: "#16181E" },
  { re: /firesta/i, logo: "firesta-color.svg", bg: "#FFFFFF" },
  { re: /\bmtb\b|mtbcz/i, logo: "mtbcz.png", bg: "#16181E" },
  { re: /han[aá]k/i, logo: "hanak.png", bg: "#16181E" },
  { re: /stavos/i, logo: "stavos-color.png", bg: "#FFFFFF" },
  { re: /toffi|cukr[aá]rna/i, logo: "toffi.png", bg: "#285560" },
  { re: /east ?gate/i, logo: "eastgate.png", bg: "#3E2A16" },
  { re: /open ?game|opengame/i, logo: "brnoopengame.png", bg: "#16181E" },
  { re: /somfy/i, logo: "somfy-color.svg", bg: "#16181E" },
  { re: /tekma/i, logo: "tekma-color.svg", bg: "#FFFFFF" },
  { re: /rematech/i, logo: "rematech-color.svg", bg: "#FFFFFF" },
];

/** Vrátí logo + brand pozadí klienta podle názvu, nebo null když logo není. */
export function clientBrand(name: string | undefined | null): ClientBrand | null {
  if (!name) return null;
  for (const e of LOGO_MAP) {
    if (e.re.test(name)) return { logo: `/client-logos/${e.logo}`, bg: e.bg ?? null };
  }
  return null;
}

/** Zpětně kompatibilní: jen cesta k logu. */
export function clientLogo(name: string | undefined | null): string | null {
  return clientBrand(name)?.logo ?? null;
}
