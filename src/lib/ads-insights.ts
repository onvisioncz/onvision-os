/**
 * Reklama insighty — agregace nad placenými kampaněmi pro měsíční klienty.
 * Z jednotlivých kampaní spočítá souhrn (spend, dosah, kliky, konverze,
 * průměrné CPC/CPM/CTR) a rozpady per formát a per klient, aby správci
 * sítí i jednatel viděli, co funguje.
 *
 * Čisté funkce, plně testovatelné.
 */

export interface AdLike {
  klient?: string;
  format?: string;
  castka?: string | number;   // "2 795 Kč" i číslo
  dosah?: number;
  kliky?: number;
  konverze?: number;
  stav?: string;
}

/** "2 795 Kč" → 2795. Zvládne nezlomitelné mezery, „Kč", desetinnou čárku. */
export function parseCastka(v: string | number | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const cleaned = String(v).replace(/ /g, "").replace(/\s/g, "").replace(/kč/gi, "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export interface AdsSummary {
  pocet: number;
  spend: number;
  dosah: number;
  kliky: number;
  konverze: number;
  cpc: number;    // spend / kliky
  cpm: number;    // spend / dosah * 1000
  ctr: number;    // kliky / dosah * 100 (%)
}

export function adsSummary(ads: AdLike[]): AdsSummary {
  const list = ads ?? [];
  const spend = list.reduce((s, a) => s + parseCastka(a.castka), 0);
  const dosah = list.reduce((s, a) => s + (a.dosah || 0), 0);
  const kliky = list.reduce((s, a) => s + (a.kliky || 0), 0);
  const konverze = list.reduce((s, a) => s + (a.konverze || 0), 0);
  return {
    pocet: list.length,
    spend, dosah, kliky, konverze,
    cpc: kliky > 0 ? spend / kliky : 0,
    cpm: dosah > 0 ? (spend / dosah) * 1000 : 0,
    ctr: dosah > 0 ? (kliky / dosah) * 100 : 0,
  };
}

export interface GroupStat extends AdsSummary { key: string }

function group(ads: AdLike[], keyOf: (a: AdLike) => string): GroupStat[] {
  const map = new Map<string, AdLike[]>();
  for (const a of ads ?? []) {
    const k = keyOf(a) || "—";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(a);
  }
  return [...map.entries()]
    .map(([key, list]) => ({ key, ...adsSummary(list) }))
    .sort((a, b) => b.spend - a.spend);
}

export const byFormat = (ads: AdLike[]): GroupStat[] => group(ads, (a) => a.format ?? "—");
export const byClient = (ads: AdLike[]): GroupStat[] => group(ads, (a) => a.klient ?? "—");

/**
 * Nejefektivnější formát = nejnižší CPC (jen formáty s aspoň 1 klikem).
 * Vrací null, když není z čeho vybírat.
 */
export function bestFormat(ads: AdLike[]): GroupStat | null {
  const withClicks = byFormat(ads).filter((g) => g.kliky > 0);
  if (!withClicks.length) return null;
  return withClicks.reduce((best, g) => (g.cpc < best.cpc ? g : best));
}
