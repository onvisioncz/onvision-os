/**
 * Loga klientů stažená z onvision.cz (bílé varianty pro tmavé UI),
 * uložená v /public/client-logos/. Matchování je odolné vůči právním
 * příponám (s.r.o., a.s., z.s.) a diakritice — hledá klíčové slovo v názvu.
 */
const LOGO_MAP: [RegExp, string][] = [
  [/senimed/i, "senimed.png"],
  [/imtos/i, "imtos.png"],
  [/power\s*plate/i, "powerplate.png"],
  [/yonex/i, "yonex.png"],
  [/pizza\s*hut/i, "pizza-hut.png"],
  [/akeso/i, "akeso.png"],
  [/i-?style/i, "istyle.png"],
  [/nera/i, "nera.png"],
  [/behej|běhej|beh ?brno/i, "behejbrno.png"],
  [/effect/i, "effect-clinic.png"],
  [/firesta/i, "firesta.png"],
  [/\bmtb\b|mtbcz/i, "mtbcz.png"],
  [/han[aá]k/i, "hanak.png"],
  [/stavos/i, "stavos.png"],
  [/toffi|cukr[aá]rna/i, "toffi.png"],
  [/east ?gate/i, "eastgate.png"],
  [/open ?game|opengame/i, "brnoopengame.png"],
  [/somfy/i, "somfy.png"],
  [/tekma/i, "tekma.png"],
  [/rematech/i, "rematech.svg"],
];

/** Vrátí cestu k logu klienta podle názvu, nebo null když není. */
export function clientLogo(name: string | undefined | null): string | null {
  if (!name) return null;
  for (const [re, file] of LOGO_MAP) {
    if (re.test(name)) return `/client-logos/${file}`;
  }
  return null;
}
