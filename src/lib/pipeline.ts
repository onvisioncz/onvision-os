/**
 * Lead pipeline — vážený forecast a konverze z obchodních příležitostí.
 *
 * Deal má hodnotu a pravděpodobnost (0–100). Vážená hodnota = kolik z
 * pipeline reálně „připluje", když se každý deal zváží svou šancí.
 * Čisté funkce, plně testovatelné.
 */

export type DealFaze = "Lead" | "Nabídka" | "Jednání" | "Podpis" | "Realizace" | "Dokončeno";

export interface PipelineDeal {
  faze: DealFaze;
  hodnota: number;
  pravdepodobnost: number;   // 0–100
}

/** Fáze, které znamenají uzavřený/vyhraný obchod (už nejsou „v jednání"). */
export const WON_FAZE: DealFaze = "Dokončeno";

/** Je deal ještě otevřený (v aktivním jednání)? */
export const isOpen = (d: { faze: DealFaze }) => d.faze !== WON_FAZE;

/** Vážená hodnota otevřené pipeline = Σ hodnota × pravděpodobnost/100. */
export function weightedPipeline(deals: PipelineDeal[]): number {
  return (deals ?? []).filter(isOpen).reduce((s, d) => s + (d.hodnota || 0) * Math.min(100, Math.max(0, d.pravdepodobnost || 0)) / 100, 0);
}

/** Celková (nevážená) hodnota otevřených dealů. */
export function openValue(deals: PipelineDeal[]): number {
  return (deals ?? []).filter(isOpen).reduce((s, d) => s + (d.hodnota || 0), 0);
}

/** Hodnota vyhraných (Dokončeno) dealů. */
export function wonValue(deals: PipelineDeal[]): number {
  return (deals ?? []).filter((d) => d.faze === WON_FAZE).reduce((s, d) => s + (d.hodnota || 0), 0);
}

export interface StageStat { faze: DealFaze; count: number; value: number; weighted: number }

/** Rozpad pipeline po fázích (počet, hodnota, vážená hodnota). */
export function byStage(deals: PipelineDeal[], order: DealFaze[]): StageStat[] {
  return order.map((faze) => {
    const inStage = (deals ?? []).filter((d) => d.faze === faze);
    return {
      faze,
      count: inStage.length,
      value: inStage.reduce((s, d) => s + (d.hodnota || 0), 0),
      weighted: inStage.reduce((s, d) => s + (d.hodnota || 0) * Math.min(100, Math.max(0, d.pravdepodobnost || 0)) / 100, 0),
    };
  });
}

/** Win rate = podíl vyhraných dealů na všech (0–100 %). Prázdno → 0. */
export function winRate(deals: PipelineDeal[]): number {
  const all = (deals ?? []).length;
  if (!all) return 0;
  const won = (deals ?? []).filter((d) => d.faze === WON_FAZE).length;
  return Math.round((won / all) * 100);
}
