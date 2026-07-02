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
  { re: /imtos/i, logo: "imtos.png", bg: "#34312F" },
  { re: /power\s*plate/i, logo: "powerplate.png" },
  { re: /yonex/i, logo: "yonex.png" },
  { re: /pizza\s*hut/i, logo: "pizza-hut.png" },
  { re: /akeso/i, logo: "akeso.png" },
  { re: /i-?style/i, logo: "istyle.png" },
  { re: /nera/i, logo: "nera.png" },
  { re: /behej|běhej|beh ?brno/i, logo: "behejbrno.png" },
  { re: /effect/i, logo: "effect-clinic.png" },
  { re: /firesta/i, logo: "firesta.png", bg: "#45913E" },
  { re: /\bmtb\b|mtbcz/i, logo: "mtbcz.png", bg: "#16181E" },
  { re: /han[aá]k/i, logo: "hanak.png" },
  { re: /stavos/i, logo: "stavos.png" },
  { re: /toffi|cukr[aá]rna/i, logo: "toffi.png", bg: "#285560" },
  { re: /east ?gate/i, logo: "eastgate.png", bg: "#3E2A16" },
  { re: /open ?game|opengame/i, logo: "brnoopengame.png" },
  { re: /somfy/i, logo: "somfy.png" },
  { re: /tekma/i, logo: "tekma.png" },
  { re: /rematech/i, logo: "rematech.svg" },
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
